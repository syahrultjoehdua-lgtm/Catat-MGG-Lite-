import { useEffect, useState } from 'react'
import { tambahSewa, type UnitMaster } from '../db/db'
import { IconCamera } from './icons'
import { formatRibuan, parseRibuan } from '../utils/format'

interface TambahSewaSheetProps {
  sesiId: number
  unitTersedia: UnitMaster[]
  riwayatNama: string[]
  onClose: () => void
  onSaved: () => void
}

const DURASI_DEFAULT = 25
const DURASI_LANGKAH = 5
const BAYAR_DEFAULT = 15000
const BAYAR_LANGKAH = 5000

export default function TambahSewaSheet({ sesiId, unitTersedia, riwayatNama, onClose, onSaved }: TambahSewaSheetProps) {
  const [kodeTerpilih, setKodeTerpilih] = useState<string[]>([])
  const [namaPelanggan, setNamaPelanggan] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [durasi, setDurasi] = useState(DURASI_DEFAULT)
  const [jumlahBayar, setJumlahBayar] = useState(BAYAR_DEFAULT)
  const [statusBayar, setStatusBayar] = useState<'sudah' | 'belum'>('belum')
  const [nonTunai, setNonTunai] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function toggleUnit(kode: string) {
    setKodeTerpilih((prev) => (prev.includes(kode) ? prev.filter((k) => k !== kode) : [...prev, kode]))
  }

  async function handleSimpan() {
    if (kodeTerpilih.length === 0) {
      setError('Pilih minimal 1 kode unit.')
      return
    }
    setMenyimpan(true)
    setError(null)
    try {
      await tambahSewa({
        sesiId,
        kodeUnit: kodeTerpilih,
        namaPelanggan,
        fotoPelangganBlob: fotoFile ?? undefined,
        durasiMenit: durasi,
        jumlahBayar,
        statusBayar,
        nonTunai
      })
      onSaved()
    } catch (e) {
      setError('Gagal menyimpan transaksi. Coba lagi.')
      console.error(e)
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Tambah sewa</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">
            &times;
          </button>
        </div>

        <div className="sheet-body">
          <div className="field">
            <p className="field-label">Kode unit</p>
            {unitTersedia.length === 0 ? (
              <p className="field-hint">
                Belum ada unit tersedia. Tambahkan dulu di Settings &rsaquo; Master unit.
              </p>
            ) : (
              <div className="chip-row">
                {unitTersedia.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={kodeTerpilih.includes(u.kodeUnit) ? 'chip chip-selected' : 'chip'}
                    onClick={() => toggleUnit(u.kodeUnit)}
                  >
                    {u.kodeUnit}
                    {kodeTerpilih.includes(u.kodeUnit) && <span> &#10003;</span>}
                  </button>
                ))}
              </div>
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
            <p className="field-label">Durasi (menit)</p>
            <div className="stepper">
              <button type="button" onClick={() => setDurasi((d) => Math.max(DURASI_LANGKAH, d - DURASI_LANGKAH))}>
                &minus;
              </button>
              <input
                type="number"
                className="stepper-input"
                value={durasi}
                onChange={(e) => setDurasi(Math.max(1, Number(e.target.value)))}
              />
              <button type="button" onClick={() => setDurasi((d) => d + DURASI_LANGKAH)}>
                +
              </button>
            </div>
          </div>

          <div className="field">
            <p className="field-label">Jumlah bayar</p>
            <div className="stepper">
              <button type="button" onClick={() => setJumlahBayar((j) => Math.max(BAYAR_LANGKAH, j - BAYAR_LANGKAH))}>
                &minus;
              </button>
              <input
                type="text"
                inputMode="numeric"
                className="stepper-input"
                value={formatRibuan(jumlahBayar)}
                onChange={(e) => setJumlahBayar(parseRibuan(e.target.value))}
              />
              <button type="button" onClick={() => setJumlahBayar((j) => j + BAYAR_LANGKAH)}>
                +
              </button>
            </div>
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

          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan}>
            {menyimpan ? 'Menyimpan...' : 'Simpan sewa'}
          </button>
        </div>
      </div>
    </div>
  )
}
