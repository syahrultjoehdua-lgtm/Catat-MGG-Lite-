import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import BackHeader from '../components/BackHeader'
import {
  db,
  getOrCreateActiveSession,
  hitungPendapatanSesi,
  getSaldoAkhirSesiSebelumnya,
  akhiriSesi,
  listJenisPengeluaran,
  listTransaksiSesi,
  type SesiRecord
} from '../db/db'
import { cobaKirimSemuaSesiBelumTerkirim } from '../services/sync'
import { buatGambarLaporanSesi, bagikanAtauUnduhGambar } from '../utils/laporanGambar'
import { formatRibuan, parseRibuan } from '../utils/format'

interface BarisPengeluaran {
  id: string
  jenis: string
  nominal: number
}

function rupiah(n: number) {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`
}

export default function AkhiriSesi() {
  const navigate = useNavigate()
  const [sesi, setSesi] = useState<SesiRecord | null>(null)
  const [langkah, setLangkah] = useState<'input' | 'konfirmasi' | 'selesai'>('input')
  const [saldoAwal, setSaldoAwal] = useState(0)
  const [pendapatan, setPendapatan] = useState(0)
  const [pendapatanTunai, setPendapatanTunai] = useState(0)
  const [pendapatanNonTunai, setPendapatanNonTunai] = useState(0)
  const [jumlahUnitAktif, setJumlahUnitAktif] = useState(0)
  const [jumlahUnitDisewa, setJumlahUnitDisewa] = useState(0)
  const [baris, setBaris] = useState<BarisPengeluaran[]>([])
  const [menyimpan, setMenyimpan] = useState(false)
  const [membagikan, setMembagikan] = useState(false)
  const [tanggalSesiSelesai, setTanggalSesiSelesai] = useState<string>('')

  const jenisPengeluaran = useLiveQuery(() => listJenisPengeluaran(), []) ?? []

  useEffect(() => {
    ;(async () => {
      const s = await getOrCreateActiveSession()
      setSesi(s)
      if (!s.id) return
      const [p, transaksiAktif, semuaTransaksi] = await Promise.all([
        hitungPendapatanSesi(s.id),
        db.transaksi.where('sesiId').equals(s.id).filter((t) => !t.selesai && !t.dibatalkan).toArray(),
        listTransaksiSesi(s.id)
      ])
      setPendapatan(p)
      setSaldoAwal(s.saldoAwal ?? (await getSaldoAkhirSesiSebelumnya()) ?? 0)
      setJumlahUnitAktif(transaksiAktif.length)
      setJumlahUnitDisewa(semuaTransaksi.filter((t) => !t.dibatalkan).reduce((n, t) => n + t.kodeUnit.length, 0))
      const transaksiDihitung = semuaTransaksi.filter((t) => !t.dibatalkan)
      setPendapatanNonTunai(transaksiDihitung.filter((t) => t.nonTunai).reduce((s, t) => s + t.jumlahBayar, 0))
      setPendapatanTunai(transaksiDihitung.filter((t) => !t.nonTunai).reduce((s, t) => s + t.jumlahBayar, 0))
    })()
  }, [])

  const totalPengeluaran = useMemo(() => baris.reduce((s, b) => s + (b.nominal || 0), 0), [baris])
  const saldoAkhir = saldoAwal + pendapatan - totalPengeluaran

  function tambahBaris() {
    setBaris((prev) => [...prev, { id: crypto.randomUUID(), jenis: jenisPengeluaran[0]?.nama ?? '', nominal: 0 }])
  }
  function hapusBaris(id: string) {
    setBaris((prev) => prev.filter((b) => b.id !== id))
  }
  function updateBaris(id: string, patch: Partial<BarisPengeluaran>) {
    setBaris((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  async function handleSelesaikan() {
    if (!sesi?.id) return
    setMenyimpan(true)
    const sekarang = new Date().toISOString()
    await akhiriSesi(sesi.id, {
      saldoAwal,
      pengeluaran: baris.filter((b) => b.nominal > 0).map((b) => ({ jenis: b.jenis, nominal: b.nominal }))
    })
    await getOrCreateActiveSession() // langsung siapkan sesi baru
    cobaKirimSemuaSesiBelumTerkirim()
    setTanggalSesiSelesai(sekarang)
    setMenyimpan(false)
    setLangkah('selesai')
  }

  async function handleBagikan() {
    setMembagikan(true)
    try {
      const blob = await buatGambarLaporanSesi({
        tanggalSesi: tanggalSesiSelesai,
        saldoAwal,
        pendapatan,
        pendapatanTunai,
        pendapatanNonTunai,
        pengeluaran: totalPengeluaran,
        saldoAkhir,
        jumlahUnitDisewa
      })
      await bagikanAtauUnduhGambar(blob, `ringkasan-sesi-${tanggalSesiSelesai.slice(0, 10)}.png`)
    } finally {
      setMembagikan(false)
    }
  }

  if (!sesi) return null

  return (
    <div className="app-shell">
      <BackHeader title="Akhiri sesi" to="/dashboard" />
      <main className="app-content app-content-with-back-header">
        {langkah === 'input' && (
          <div className="sheet-body">
            {jumlahUnitAktif > 0 && (
              <p className="warning-banner">
                Masih ada {jumlahUnitAktif} unit sedang disewa. Selesaikan atau batalkan dulu transaksinya di
                Dashboard sebelum akhiri sesi.
              </p>
            )}

            <div className="field">
              <p className="field-label">Saldo awal</p>
              <input
                type="text"
                inputMode="numeric"
                value={formatRibuan(saldoAwal)}
                onChange={(e) => setSaldoAwal(parseRibuan(e.target.value))}
              />
            </div>

            <div className="field">
              <p className="field-label">Pengeluaran</p>
              {baris.length === 0 && <p className="field-hint">Belum ada pengeluaran ditambahkan.</p>}
              <div className="list-rows">
                {baris.map((b) => (
                  <div key={b.id} className="pengeluaran-row">
                    <select value={b.jenis} onChange={(e) => updateBaris(b.id, { jenis: e.target.value })}>
                      {jenisPengeluaran.length === 0 && <option value="">Belum ada jenis</option>}
                      {jenisPengeluaran.map((j) => (
                        <option key={j.id} value={j.nama}>
                          {j.nama}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Nominal"
                      value={b.nominal || ''}
                      onChange={(e) => updateBaris(b.id, { nominal: Number(e.target.value) })}
                    />
                    <button onClick={() => hapusBaris(b.id)} aria-label="Hapus baris">&times;</button>
                  </div>
                ))}
              </div>
              <button style={{ width: '100%', marginTop: 8 }} onClick={tambahBaris}>
                + Tambah pengeluaran
              </button>
            </div>

            <div className="card">
              <div className="ringkasan-row"><span>Pendapatan</span><span>{rupiah(pendapatan)}</span></div>
              <div className="ringkasan-row" style={{ paddingLeft: 10 }}><span>&middot; Tunai</span><span>{rupiah(pendapatanTunai)}</span></div>
              <div className="ringkasan-row" style={{ paddingLeft: 10 }}><span>&middot; Non-tunai</span><span>{rupiah(pendapatanNonTunai)}</span></div>
              <div className="ringkasan-row ringkasan-row-total"><span>Saldo akhir</span><span>{rupiah(saldoAkhir)}</span></div>
            </div>

            <button className="fab" style={{ width: '100%' }} disabled={jumlahUnitAktif > 0} onClick={() => setLangkah('konfirmasi')}>
              Lanjutkan
            </button>
          </div>
        )}

        {langkah === 'konfirmasi' && (
          <div className="sheet-body">
            <p className="field-hint">
              Sesi {new Date(sesi.startedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <div className="card">
              <div className="ringkasan-row"><span>Saldo awal</span><span>{rupiah(saldoAwal)}</span></div>
              <div className="ringkasan-row"><span>Pendapatan</span><span>{rupiah(pendapatan)}</span></div>
              <div className="ringkasan-row" style={{ paddingLeft: 10 }}><span>&middot; Tunai</span><span>{rupiah(pendapatanTunai)}</span></div>
              <div className="ringkasan-row" style={{ paddingLeft: 10 }}><span>&middot; Non-tunai</span><span>{rupiah(pendapatanNonTunai)}</span></div>
              <div className="ringkasan-row"><span>Pengeluaran</span><span>-{rupiah(totalPengeluaran)}</span></div>
              <div className="ringkasan-row ringkasan-row-total"><span>Saldo akhir</span><span>{rupiah(saldoAkhir)}</span></div>
            </div>
            <button className="fab" style={{ width: '100%' }} onClick={handleSelesaikan} disabled={menyimpan}>
              {menyimpan ? 'Menyimpan...' : 'Ya, selesaikan sesi'}
            </button>
            <button style={{ width: '100%' }} onClick={() => setLangkah('input')} disabled={menyimpan}>
              Kembali
            </button>
          </div>
        )}

        {langkah === 'selesai' && (
          <div className="sheet-body">
            <div className="selesai-check">
              <span>&#10003;</span>
            </div>
            <p style={{ textAlign: 'center', fontWeight: 500, fontSize: 16 }}>Sesi berhasil diakhiri</p>
            <div className="card">
              <div className="ringkasan-row"><span>Saldo awal</span><span>{rupiah(saldoAwal)}</span></div>
              <div className="ringkasan-row"><span>Pendapatan</span><span>{rupiah(pendapatan)}</span></div>
              <div className="ringkasan-row" style={{ paddingLeft: 10 }}><span>&middot; Tunai</span><span>{rupiah(pendapatanTunai)}</span></div>
              <div className="ringkasan-row" style={{ paddingLeft: 10 }}><span>&middot; Non-tunai</span><span>{rupiah(pendapatanNonTunai)}</span></div>
              <div className="ringkasan-row"><span>Pengeluaran</span><span>-{rupiah(totalPengeluaran)}</span></div>
              <div className="ringkasan-row ringkasan-row-total"><span>Saldo akhir</span><span>{rupiah(saldoAkhir)}</span></div>
            </div>
            <button className="fab" style={{ width: '100%' }} onClick={handleBagikan} disabled={membagikan}>
              {membagikan ? 'Menyiapkan gambar...' : 'Bagikan laporan'}
            </button>
            <button style={{ width: '100%' }} onClick={() => navigate('/dashboard', { replace: true })}>
              Ke Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
