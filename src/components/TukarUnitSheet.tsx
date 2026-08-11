import { useMemo, useState } from 'react'
import type { TransaksiRecord, UnitMaster } from '../db/db'
import { tukarUnit } from '../db/db'
import { toBody } from '../utils/portal'
import { kelompokkanKodeUnit } from '../utils/unitKategori'
import { IconSwap } from './icons'

interface TukarUnitSheetProps {
  transaksi: TransaksiRecord
  unitBisaDipilih: UnitMaster[] // unit master yang sedang tidak dipakai transaksi lain
  onClose: () => void
}

/**
 * Tukar unit per-slot: setiap unit LAMA di transaksi ini dapat 1 dropdown sendiri
 * untuk pilih unit BARU penggantinya (default = unit itu sendiri, alias tidak
 * ditukar). Ini beda dari versi lama yang cuma satu daftar chip campur aduk
 * (unit lama + unit baru jadi satu), yang bikin orang bisa asal pilih banyak
 * unit baru untuk 1 slot lama — bukan "menukar" lagi namanya.
 */
export default function TukarUnitSheet({ transaksi, unitBisaDipilih, onClose }: TukarUnitSheetProps) {
  // slotBaru[i] = kode unit baru untuk slot ke-i dari transaksi.kodeUnit
  const [slotBaru, setSlotBaru] = useState<string[]>(transaksi.kodeUnit)
  const [menyimpan, setMenyimpan] = useState(false)

  const unitLama = transaksi.kodeUnit
  const kodeTersedia = useMemo(() => unitBisaDipilih.map((u) => u.kodeUnit), [unitBisaDipilih])

  // Opsi untuk slot ke-i: unit lama di slot itu sendiri + unit-unit lama lain milik
  // transaksi ini (kalau mau ditukar silang antar sesama slot) + unit yang sedang
  // kosong — TAPI dikurangi unit yang sudah dipilih di slot lain, supaya 1 unit
  // baru tidak bisa dobel dipakai di 2 slot sekaligus.
  function opsiUntukSlot(index: number): string[] {
    const dipakaiSlotLain = slotBaru.filter((_, i) => i !== index)
    const kandidat = Array.from(new Set([...unitLama, ...kodeTersedia]))
    return kandidat.filter((k) => k === slotBaru[index] || !dipakaiSlotLain.includes(k))
  }

  function ubahSlot(index: number, kodeBaru: string) {
    setSlotBaru((prev) => prev.map((k, i) => (i === index ? kodeBaru : k)))
  }

  const adaPerubahan = slotBaru.some((k, i) => k !== unitLama[i])

  async function handleSimpan() {
    if (!transaksi.id) return
    setMenyimpan(true)
    await tukarUnit(transaksi.id, slotBaru)
    setMenyimpan(false)
    onClose()
  }

  return toBody(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Tukar unit</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="sheet-body">
          <p className="field-hint" style={{ marginTop: -8 }}>Timer tidak berubah — cuma kode unitnya yang diganti.</p>

          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {unitLama.map((kodeLama, i) => (
              <div key={i} className="tukar-unit-row">
                <div className="tukar-unit-slot">
                  <p className="field-label" style={{ marginBottom: 4 }}>Sebelum</p>
                  <div className="tukar-unit-badge tukar-unit-badge-lama">{kodeLama}</div>
                </div>
                <span className="tukar-unit-arrow"><IconSwap width={16} height={16} /></span>
                <div className="tukar-unit-slot">
                  <p className="field-label" style={{ marginBottom: 4 }}>Sesudah</p>
                  <select value={slotBaru[i]} onChange={(e) => ubahSlot(i, e.target.value)}>
                    {kelompokkanKodeUnit(opsiUntukSlot(i)).map((kelompok) => (
                      <optgroup key={kelompok.kategori} label={kelompok.kategori}>
                        {kelompok.kodeList.map((kode) => (
                          <option key={kode} value={kode}>
                            {kode}{kode === kodeLama ? ' (tetap)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {unitBisaDipilih.length === 0 && (
            <p className="field-hint">Tidak ada unit lain yang sedang kosong untuk ditukar.</p>
          )}

          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan || !adaPerubahan}>
            {menyimpan ? 'Menyimpan...' : adaPerubahan ? 'Simpan pertukaran' : 'Belum ada perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}
