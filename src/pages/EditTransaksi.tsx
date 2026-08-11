import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import BackHeader from '../components/BackHeader'
import DurasiStepper from '../components/DurasiStepper'
import { db, editTransaksi, tukarUnit, listUnitMaster } from '../db/db'
import { sisaWaktuMs } from '../utils/time'
import { formatRibuan, parseRibuan } from '../utils/format'
import { gabungMenitDetik, pecahMenitDetik } from '../utils/durasi'
import { kelompokkanKodeUnit } from '../utils/unitKategori'

export default function EditTransaksi() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const transaksiId = Number(id)

  const transaksi = useLiveQuery(() => db.transaksi.get(transaksiId), [transaksiId])
  const unitMaster = useLiveQuery(() => listUnitMaster(), []) ?? []
  // Unit yang lagi dipakai transaksi AKTIF LAIN (bukan transaksi ini sendiri) — tidak boleh dipilih ganda.
  const unitDipakaiLain = useLiveQuery(async () => {
    const semua = await db.transaksi.filter((t) => !t.selesai && !t.dibatalkan && t.id !== transaksiId).toArray()
    return semua.flatMap((t) => t.kodeUnit)
  }, [transaksiId]) ?? []

  const opsiUnit = useMemo(() => {
    if (!transaksi) return []
    const bebas = unitMaster.filter((u) => !unitDipakaiLain.includes(u.kodeUnit)).map((u) => u.kodeUnit)
    return Array.from(new Set([...transaksi.kodeUnit, ...bebas]))
  }, [unitMaster, unitDipakaiLain, transaksi])
  const kelompokUnit = useMemo(() => kelompokkanKodeUnit(opsiUnit), [opsiUnit])

  const [siap, setSiap] = useState(false)
  const [namaPelanggan, setNamaPelanggan] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [kodeTerpilih, setKodeTerpilih] = useState<string[]>([])
  const [sisaMenit, setSisaMenit] = useState(0)
  const [sisaDetik, setSisaDetik] = useState(0)
  const [jumlahBayar, setJumlahBayar] = useState(0)
  const [statusBayar, setStatusBayar] = useState<'sudah' | 'belum'>('belum')
  const [nonTunai, setNonTunai] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)

  // Isi form dari data transaksi begitu pertama kali termuat — sengaja cuma
  // sekali (bukan tiap kali live query lain refresh) supaya tidak menimpa
  // ketikan user yang sedang berjalan.
  useEffect(() => {
    if (!transaksi || siap) return
    const sisaMenitAwal = Math.max(0, sisaWaktuMs(transaksi, Date.now()) / 60_000)
    const { menit, detik } = pecahMenitDetik(sisaMenitAwal)
    setNamaPelanggan(transaksi.namaPelanggan ?? '')
    setKodeTerpilih(transaksi.kodeUnit)
    setSisaMenit(menit)
    setSisaDetik(detik)
    setJumlahBayar(transaksi.jumlahBayar)
    setStatusBayar(transaksi.statusBayar)
    setNonTunai(transaksi.nonTunai ?? false)
    setSiap(true)
  }, [transaksi, siap])

  function toggleUnit(kode: string) {
    setKodeTerpilih((prev) => (prev.includes(kode) ? prev.filter((k) => k !== kode) : [...prev, kode]))
  }

  function batal() {
    navigate(-1)
  }

  async function handleSimpan() {
    if (!transaksi?.id || kodeTerpilih.length === 0) return
    setMenyimpan(true)
    await editTransaksi(
      transaksi.id,
      {
        namaPelanggan,
        fotoPelangganBlob: fotoFile ?? undefined,
        sisaMenitBaru: gabungMenitDetik(sisaMenit, sisaDetik),
        jumlahBayar,
        statusBayar,
        nonTunai
      },
      Date.now()
    )
    const unitBerubah =
      kodeTerpilih.length !== transaksi.kodeUnit.length || kodeTerpilih.some((k) => !transaksi.kodeUnit.includes(k))
    if (unitBerubah) await tukarUnit(transaksi.id, kodeTerpilih)
    setMenyimpan(false)
    navigate(-1)
  }

  if (!transaksi || !siap) {
    return (
      <div className="app-shell">
        <BackHeader title="Edit transaksi" to="/dashboard" />
        <main className="app-content app-content-with-back-header">
          <p className="field-hint">Memuat...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <BackHeader title="Edit transaksi" to="/dashboard" />
      <main className="app-content app-content-with-back-header">
        <div className="field">
          <p className="field-label">Kode unit</p>
          {kelompokUnit.map((kelompok) => (
            <div key={kelompok.kategori} style={{ marginBottom: 10 }}>
              <p className="field-hint" style={{ marginBottom: 6 }}>{kelompok.kategori}</p>
              <div className="chip-row">
                {kelompok.kodeList.map((kode) => (
                  <button
                    key={kode}
                    type="button"
                    className={kodeTerpilih.includes(kode) ? 'chip chip-selected' : 'chip'}
                    onClick={() => toggleUnit(kode)}
                  >
                    {kode}
                    {kodeTerpilih.includes(kode) && <span> &#10003;</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="field-hint">Tambah/hapus unit di sini tidak memengaruhi timer yang sedang berjalan.</p>
        </div>

        <div className="field">
          <p className="field-label">Nama pelanggan</p>
          <input value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} />
        </div>

        <div className="field">
          <p className="field-label">Foto pelanggan</p>
          <label className="photo-input">
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
            {fotoFile ? fotoFile.name : 'Ganti foto'}
          </label>
        </div>

        <div className="field">
          <p className="field-label">Sisa waktu</p>
          <DurasiStepper menit={sisaMenit} detik={sisaDetik} onChange={(m, d) => { setSisaMenit(m); setSisaDetik(d) }} minMenit={0} />
        </div>

        <div className="field">
          <p className="field-label">Jumlah bayar</p>
          <div className="stepper">
            <button type="button" onClick={() => setJumlahBayar((j) => Math.max(0, j - 5000))}>&minus;</button>
            <input
              type="text"
              inputMode="numeric"
              className="stepper-input"
              value={formatRibuan(jumlahBayar)}
              onChange={(e) => setJumlahBayar(parseRibuan(e.target.value))}
            />
            <button type="button" onClick={() => setJumlahBayar((j) => j + 5000)}>+</button>
          </div>
        </div>

        <div className="field">
          <p className="field-label">Status bayar</p>
          <div className="two-col">
            <button type="button" className={statusBayar === 'sudah' ? 'toggle-btn toggle-btn-active-success' : 'toggle-btn'} onClick={() => setStatusBayar('sudah')}>Sudah</button>
            <button type="button" className={statusBayar === 'belum' ? 'toggle-btn toggle-btn-active' : 'toggle-btn'} onClick={() => setStatusBayar('belum')}>Belum</button>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={nonTunai} onChange={(e) => setNonTunai(e.target.checked)} />
            Bayar dengan non-tunai
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan || kodeTerpilih.length === 0}>
            {menyimpan ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
          <button style={{ width: '100%' }} onClick={batal} disabled={menyimpan}>
            Batal
          </button>
        </div>
      </main>
    </div>
  )
}
