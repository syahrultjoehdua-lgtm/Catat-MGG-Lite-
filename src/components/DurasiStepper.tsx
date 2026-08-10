import { langkahMenit } from '../utils/durasi'

interface DurasiStepperProps {
  menit: number
  detik: number
  onChange: (menit: number, detik: number) => void
  /** Batas bawah nilai menit itu sendiri (default 0) — dipakai supaya "Tambah
   * durasi" di Perpanjangan tidak bisa turun ke 0 kalau memang harus minimal 1. */
  minMenit?: number
}

/** Stepper durasi 2 bagian: menit (langkah pintar — lihat utils/durasi.ts) di kiri,
 * detik (langkah kelipatan 10, tetap bisa diketik manual) di kanan. */
export default function DurasiStepper({ menit, detik, onChange, minMenit = 0 }: DurasiStepperProps) {
  function ubahMenitManual(teks: string) {
    const angka = teks.replace(/\D/g, '')
    onChange(angka ? Math.max(minMenit, Number(angka)) : minMenit, detik)
  }

  function ubahDetikManual(teks: string) {
    const angka = teks.replace(/\D/g, '')
    const d = Math.min(59, angka ? Number(angka) : 0)
    onChange(menit, d)
  }

  function langkahDetik(arah: 1 | -1) {
    let d = detik + arah * 10
    let m = menit
    if (d >= 60) {
      d -= 60
      m += 1
    } else if (d < 0) {
      if (m > minMenit) {
        d += 60
        m -= 1
      } else {
        d = 0
      }
    }
    onChange(m, d)
  }

  return (
    <div className="durasi-row">
      <div className="durasi-col">
        <div className="stepper">
          <button type="button" onClick={() => onChange(langkahMenit(menit, -1, minMenit), detik)}>&minus;</button>
          <input type="text" inputMode="numeric" className="stepper-input" value={menit} onChange={(e) => ubahMenitManual(e.target.value)} />
          <button type="button" onClick={() => onChange(langkahMenit(menit, 1, minMenit), detik)}>+</button>
        </div>
        <p className="durasi-caption">menit</p>
      </div>
      <div className="durasi-col">
        <div className="stepper">
          <button type="button" onClick={() => langkahDetik(-1)}>&minus;</button>
          <input type="text" inputMode="numeric" className="stepper-input" value={detik} onChange={(e) => ubahDetikManual(e.target.value)} />
          <button type="button" onClick={() => langkahDetik(1)}>+</button>
        </div>
        <p className="durasi-caption">detik</p>
      </div>
    </div>
  )
}
