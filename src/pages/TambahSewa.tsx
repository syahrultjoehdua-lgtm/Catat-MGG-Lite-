import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import BackHeader from '../components/BackHeader'
import DurasiStepper from '../components/DurasiStepper'
import { IconCamera } from '../components/icons'
import {
  db,
  tambahSewa,
  getOrCreateActiveSession,
  listUnitMaster,
  getKodeUnitSedangDisewa,
  getRiwayatNamaPelanggan
} from '../db/db'
import { formatRibuan, parseRibuan } from '../utils/format'
import { gabungMenitDetik } from '../utils/durasi'
import { kelompokkanKodeUnit } from '../utils/unitKategori'

const DURASI_DEFAULT = 25
const BAYAR_DEFAULT_PER_UNIT = 15000
const BAYAR_LANGKAH = 5000

export default function TambahSewa() {
  const navigate = useNavigate()
  const sesi = useLiveQuery(() => getOrCreateActiveSession(), [])
  const unitMaster = useLiveQuery(() => listUnitMaster(), []) ?? []
  const unitSedangDisewa = useLiveQuery(async () => {
    if (!sesi?.id) return []
    return getKodeUnitSedangDisewa(sesi.id)
  }, [sesi?.id]) ?? []
  const riwayatNama = useLiveQuery(() => getRiwayatNamaPelanggan(), []) ?? []

  const unitTersedia = useMemo(
    () => unitMaster.filter((u) => !unitSedangDisewa.includes(u.kodeUnit)),
    [unitMaster, unitSedangDisewa]
  )
  const kelompokUnit = useMemo(() => kelompokkanKodeUnit(unitTersedia.map((u) => u.kodeUnit)), [unitTersedia])

  const [kodeTerpilih, setKodeTerpilih] = useState<string[]>([])
  const [namaPelanggan, setNamaPelanggan] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [durasiMenit, setDurasiMenit] = useState(DURASI_DEFAULT)
  const [durasiDetik, setDurasiDetik] = useState(0)
  const [jumlahBayar, setJumlahBayar] = useState(BAYAR_DEFAULT_PER_UNIT)
  const [bayarDisentuhManual, setBayarDisentuhManual] = useState(false)
  const [statusBayar, setStatusBayar] = useState<'sudah' | 'belum'>('belum')
  const [nonTunai, setNonTunai] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Nilai awal Jumlah Bayar berlipat real-time sesuai jumlah unit terpilih (mis.
  // 2 unit -> Rp30.000, 3 unit -> Rp45.000) — durasi tetap di nilai default.
  // Berhenti mengikuti otomatis begitu user pernah mengubahnya sendiri secara manual.
  const jumlahBayarSaran = BAYAR_DEFAULT_PER_UNIT * Math.max(1, kodeTerpilih.length)
  const jumlahBayarTampil = bayarDisentuhManual ? jumlahBayar : jumlahBayarSaran

  function toggleUnit(kode: string) {
    setKodeTerpilih((prev) => (prev.includes(kode) ? prev.filter((k) => k !== kode) : [...prev, kode]))
  }

  function ubahJumlahBayarManual(nilai: number) {
    setBayarDisentuhManual(true)
    setJumlahBayar(nilai)
  }

  function batal() {
    navigate('/dashboard')
  }

  async function handleSimpan() {
    if (!sesi?.id) return
    if (kodeTerpilih.length === 0) {
      setError('Pilih minimal 1 kode unit.')
      return
    }
    const durasiTotal = gabungMenitDetik(durasiMenit, durasiDetik)
    if (durasiTotal <= 0) {
      setError('Durasi harus lebih dari 0.')
      return
    }
    setMenyimpan(true)
    setError(null)
    try {
      await tambahSewa({
        sesiId: sesi.id,
        kodeUnit: kodeTerpilih,
        namaPelanggan,
        fotoPelangganBlob: fotoFile ?? undefined,
        durasiMenit: durasiTotal,
        jumlahBayar: jumlahBayarTampil,
        statusBayar,
        nonTunai
      })
      navigate('/dashboard')
    } catch (e) {
      setError('Gagal menyimpan transaksi. Coba lagi.')
      console.error(e)
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <div className="app-shell">
      <BackHeader title="Tambah sewa" to="/dashboard" />
      <main className="app-content app-content-with-back-header">
        <div className="field">
          <p className="field-label">Kode unit</p>
          {unitTersedia.length === 0 ? (
            <p className="field-hint">Belum ada unit tersedia. Tambahkan dulu di Settings &rsaquo; Master unit.</p>
          ) : (
            kelompokUnit.map((kelompok) => (
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
            ))
          )}
          {kodeTerpilih.length > 1 && (
            <p className="field-hint">{kodeTerpilih.length} unit dijadikan 1 transaksi dengan 1 timer &amp; 1 pembayaran.</p>
          )}
        </div>

        <div className="field">
          <p className="field-label">Nama pelanggan (opsional)</p>
          <input
            list="riwayat-nama-pelanggan"
            value={namaPelanggan}
            onChange={(e) => setNamaPelanggan(e.target.value)}
            placeholder="Ketik atau pilih dari riwayat"
          />
          <datalist id="riwayat-nama-pelanggan">
            {riwayatNama.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <p className="field-label">Foto pelanggan (opsional, tersimpan lokal saja)</p>
          <label className="photo-input">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
              style={{ display: 'none' }}
            />
            {fotoFile ? fotoFile.name : (
              <span>
                <IconCamera width={18} height={18} /> Ambil foto
              </span>
            )}
          </label>
        </div>

        <div className="field">
          <p className="field-label">Durasi</p>
          <DurasiStepper menit={durasiMenit} detik={durasiDetik} onChange={(m, d) => { setDurasiMenit(m); setDurasiDetik(d) }} minMenit={0} />
        </div>

        <div className="field">
          <p className="field-label">Jumlah bayar</p>
          <div className="stepper">
            <button type="button" onClick={() => ubahJumlahBayarManual(Math.max(BAYAR_LANGKAH, jumlahBayarTampil - BAYAR_LANGKAH))}>
              &minus;
            </button>
            <input
              type="text"
              inputMode="numeric"
              className="stepper-input"
              value={formatRibuan(jumlahBayarTampil)}
              onChange={(e) => ubahJumlahBayarManual(parseRibuan(e.target.value))}
            />
            <button type="button" onClick={() => ubahJumlahBayarManual(jumlahBayarTampil + BAYAR_LANGKAH)}>
              +
            </button>
          </div>
          {!bayarDisentuhManual && kodeTerpilih.length > 1 && (
            <p className="field-hint">Otomatis {kodeTerpilih.length} &times; Rp{formatRibuan(BAYAR_DEFAULT_PER_UNIT)} — bisa diubah manual di atas.</p>
          )}
        </div>

        <div className="field">
          <p className="field-label">Status bayar</p>
          <div className="two-col">
            <button
              type="button"
              className={statusBayar === 'sudah' ? 'toggle-btn toggle-btn-active-success' : 'toggle-btn'}
              onClick={() => setStatusBayar('sudah')}
            >
              Sudah
            </button>
            <button
              type="button"
              className={statusBayar === 'belum' ? 'toggle-btn toggle-btn-active' : 'toggle-btn'}
              onClick={() => setStatusBayar('belum')}
            >
              Belum
            </button>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={nonTunai} onChange={(e) => setNonTunai(e.target.checked)} />
            Bayar dengan non-tunai
          </label>
        </div>

        {error && <p className="field-error">{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan || !sesi}>
            {menyimpan ? 'Menyimpan...' : 'Simpan sewa'}
          </button>
          <button style={{ width: '100%' }} onClick={batal} disabled={menyimpan}>
            Batal
          </button>
        </div>
      </main>
    </div>
  )
}
