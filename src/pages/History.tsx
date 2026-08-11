import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import AppShell from '../components/AppShell'
import HistoryRincianSheet from '../components/HistoryRincianSheet'
import { db, listPengeluaranSesi, type TransaksiRecord } from '../db/db'
import { formatDurasi } from '../utils/durasi'
import { buatGambarLaporanSesi, bagikanAtauUnduhGambar, type DataLaporanSesi } from '../utils/laporanGambar'

function formatJam(iso?: string) {
  if (!iso) return '\u2013'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function formatTanggalSesi(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

function BarisTransaksi({ t, onTap }: { t: TransaksiRecord; onTap: () => void }) {
  const bayarNanti = !!t.selesai && t.statusBayar === 'belum'
  return (
    <div className="history-row" onClick={onTap}>
      <div className="history-row-top">
        <p className="unit-card-kode">{t.kodeUnit.join(', ')}</p>
        <span className="history-row-bayar">Rp{t.jumlahBayar.toLocaleString('id-ID')}</span>
      </div>
      <p className="field-hint">
        {formatJam(t.waktuMulai)} &rarr; {formatJam(t.waktuSelesai)} &middot; {formatDurasi(t.durasiMenit)}
      </p>
      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
        {bayarNanti && <span className="badge badge-warning">Bayar nanti</span>}
        {t.statusBayar === 'sudah' && (
          <span className="badge badge-success">Sudah bayar{t.nonTunai ? ' \u00b7 non-tunai' : ''}</span>
        )}
      </div>
    </div>
  )
}

export default function History() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'aktif' | 'selesai'>('aktif')
  const [transaksiDilihat, setTransaksiDilihat] = useState<TransaksiRecord | null>(null)
  const [membagikan, setMembagikan] = useState(false)

  async function bagikanLaporan(data: DataLaporanSesi) {
    setMembagikan(true)
    try {
      const blob = await buatGambarLaporanSesi(data)
      await bagikanAtauUnduhGambar(blob, `ringkasan-sesi-${data.tanggalSesi.slice(0, 10)}.png`)
    } finally {
      setMembagikan(false)
    }
  }

  const sesiAktif = useLiveQuery(async () => {
    const semua = await db.sesi.toArray()
    return semua.find((s) => !s.closedAt) ?? null
  }, [])

  // Sengaja hanya transaksi yang SUDAH selesai — timer yang masih berjalan tidak masuk sini.
  const transaksiSesiAktif = useLiveQuery(async () => {
    if (!sesiAktif?.id) return []
    return db.transaksi.where('sesiId').equals(sesiAktif.id).filter((t) => !!t.selesai).toArray()
  }, [sesiAktif?.id])

  // SEMUA transaksi sesi aktif (aktif maupun selesai) — dipakai khusus untuk
  // hitung ringkasan "unit selesai vs unit belum", bukan untuk daftar baris.
  const semuaTransaksiSesiAktif = useLiveQuery(async () => {
    if (!sesiAktif?.id) return []
    return db.transaksi.where('sesiId').equals(sesiAktif.id).filter((t) => !t.dibatalkan).toArray()
  }, [sesiAktif?.id])

  const kelompokSelesai = useLiveQuery(async () => {
    const sesiSelesai = (await db.sesi.toArray())
      .filter((s) => s.closedAt)
      .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime())
    const hasil: {
      sesiId: number
      startedAt: string
      closedAt: string
      saldoAwal?: number
      saldoAkhir?: number
      pengeluaran: number
      transaksi: TransaksiRecord[]
    }[] = []
    for (const s of sesiSelesai) {
      const t = await db.transaksi.where('sesiId').equals(s.id!).filter((x) => !!x.selesai).toArray()
      const pengeluaranItems = await listPengeluaranSesi(s.id!)
      if (t.length > 0) {
        hasil.push({
          sesiId: s.id!,
          startedAt: s.startedAt,
          closedAt: s.closedAt!,
          saldoAwal: s.saldoAwal,
          saldoAkhir: s.saldoAkhir,
          pengeluaran: pengeluaranItems.reduce((sum, p) => sum + p.nominal, 0),
          transaksi: t
        })
      }
    }
    return hasil
  }, [])

  const terurutAktif = useMemo(() => {
    if (!transaksiSesiAktif) return []
    return [...transaksiSesiAktif].sort((a, b) => new Date(b.waktuMulai).getTime() - new Date(a.waktuMulai).getTime())
  }, [transaksiSesiAktif])

  // Ringkasan untuk tab yang sedang dilihat: berapa unit sudah selesai vs masih
  // berjalan, berapa pendapatan yang sudah masuk vs masih belum dibayar, dan
  // total keseluruhan (masuk + belum dibayar).
  const ringkasan = useMemo(() => {
    const kosong = { unitSelesai: 0, unitBelumSelesai: 0, pendapatanMasuk: 0, pendapatanBelumDibayar: 0, totalPendapatan: 0 }
    const sumberTransaksi: TransaksiRecord[] =
      tab === 'aktif' ? semuaTransaksiSesiAktif ?? [] : kelompokSelesai?.flatMap((g) => g.transaksi) ?? []

    return sumberTransaksi.reduce((acc, t) => {
      const jumlahUnit = t.kodeUnit.length
      if (t.selesai) acc.unitSelesai += jumlahUnit
      else acc.unitBelumSelesai += jumlahUnit

      if (t.statusBayar === 'sudah') acc.pendapatanMasuk += t.jumlahBayar
      else acc.pendapatanBelumDibayar += t.jumlahBayar

      acc.totalPendapatan += t.jumlahBayar
      return acc
    }, kosong)
  }, [tab, semuaTransaksiSesiAktif, kelompokSelesai])

  return (
    <AppShell title="Riwayat" subtitle={`Total pendapatan: ${rupiah(ringkasan.totalPendapatan)}`}>
      <div className="tab-row tab-row-sticky">
        <button className={tab === 'aktif' ? 'tab-item tab-item-active' : 'tab-item'} onClick={() => setTab('aktif')}>
          Sesi aktif
        </button>
        <button className={tab === 'selesai' ? 'tab-item tab-item-active' : 'tab-item'} onClick={() => setTab('selesai')}>
          Sesi selesai
        </button>
      </div>

      <div className="card ringkasan-mini-grid">
        <div className="ringkasan-mini-item">
          <p className="ringkasan-mini-label">Unit selesai</p>
          <p className="ringkasan-mini-nilai">{ringkasan.unitSelesai}</p>
        </div>
        <div className="ringkasan-mini-item">
          <p className="ringkasan-mini-label">Unit masih berjalan</p>
          <p className="ringkasan-mini-nilai">{ringkasan.unitBelumSelesai}</p>
        </div>
        <div className="ringkasan-mini-item">
          <p className="ringkasan-mini-label">Pendapatan masuk</p>
          <p className="ringkasan-mini-nilai">{rupiah(ringkasan.pendapatanMasuk)}</p>
        </div>
        <div className="ringkasan-mini-item">
          <p className="ringkasan-mini-label">Belum dibayar</p>
          <p className="ringkasan-mini-nilai">{rupiah(ringkasan.pendapatanBelumDibayar)}</p>
        </div>
        <div className="ringkasan-mini-item ringkasan-mini-total">
          <p className="ringkasan-mini-label">Total pendapatan</p>
          <p className="ringkasan-mini-nilai">{rupiah(ringkasan.totalPendapatan)}</p>
        </div>
      </div>

      {tab === 'aktif' ? (
        terurutAktif.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada transaksi yang selesai di sesi ini.</p>
            <p className="empty-state-hint">Timer yang masih berjalan tidak ditampilkan di sini.</p>
          </div>
        ) : (
          <div className="history-list">
            {terurutAktif.map((t) => (
              <BarisTransaksi key={t.id} t={t} onTap={() => setTransaksiDilihat(t)} />
            ))}
          </div>
        )
      ) : !kelompokSelesai || kelompokSelesai.length === 0 ? (
        <div className="empty-state">
          <p>Belum ada sesi yang diakhiri.</p>
        </div>
      ) : (
        <div>
          {kelompokSelesai.map((grup) => (
            <div key={grup.sesiId}>
              <div className="history-group-header">
                <p className="settings-section-label" style={{ margin: 0 }}>
                  {formatTanggalSesi(grup.startedAt)}
                </p>
                <button
                  className="history-bagikan-btn"
                  disabled={membagikan}
                  onClick={() =>
                    bagikanLaporan({
                      tanggalSesi: grup.closedAt,
                      saldoAwal: grup.saldoAwal ?? 0,
                      pendapatan: grup.transaksi.reduce((s, t) => s + t.jumlahBayar, 0),
                      pendapatanTunai: grup.transaksi.filter((t) => !t.nonTunai).reduce((s, t) => s + t.jumlahBayar, 0),
                      pendapatanNonTunai: grup.transaksi.filter((t) => t.nonTunai).reduce((s, t) => s + t.jumlahBayar, 0),
                      pengeluaran: grup.pengeluaran,
                      saldoAkhir: grup.saldoAkhir ?? 0,
                      jumlahUnitDisewa: grup.transaksi.reduce((s, t) => s + t.kodeUnit.length, 0)
                    })
                  }
                >
                  {membagikan ? '...' : 'Bagikan laporan'}
                </button>
              </div>
              <div className="history-list">
                {[...grup.transaksi]
                  .sort((a, b) => new Date(b.waktuMulai).getTime() - new Date(a.waktuMulai).getTime())
                  .map((t) => (
                    <BarisTransaksi key={t.id} t={t} onTap={() => setTransaksiDilihat(t)} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {transaksiDilihat && (
        <HistoryRincianSheet
          transaksi={transaksiDilihat}
          onClose={() => setTransaksiDilihat(null)}
          onEdit={() => transaksiDilihat.id && navigate(`/edit-transaksi/${transaksiDilihat.id}`)}
        />
      )}
    </AppShell>
  )
}
