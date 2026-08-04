import { useState } from 'react'
import type { TransaksiRecord, UnitMaster } from '../db/db'
import { tukarUnit } from '../db/db'

interface TukarUnitSheetProps {
  transaksi: TransaksiRecord
  unitBisaDipilih: UnitMaster[] // unit master yang sedang tidak dipakai transaksi lain
  onClose: () => void
}

export default function TukarUnitSheet({ transaksi, unitBisaDipilih, onClose }: TukarUnitSheetProps) {
  const [terpilih, setTerpilih] = useState<string[]>(transaksi.kodeUnit)
  const [menyimpan, setMenyimpan] = useState(false)

  // Unit milik transaksi ini sendiri tetap boleh dipilih, ditambah unit master yang lagi kosong.
  const opsi = Array.from(new Set([...transaksi.kodeUnit, ...unitBisaDipilih.map((u) => u.kodeUnit)]))

  function toggle(kode: string) {
    setTerpilih((prev) => (prev.includes(kode) ? prev.filter((k) => k !== kode) : [...prev, kode]))
  }

  async function handleSimpan() {
    if (terpilih.length === 0 || !transaksi.id) return
    setMenyimpan(true)
    await tukarUnit(transaksi.id, terpilih)
    setMenyimpan(false)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Tukar unit</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <p className="field-label">Kode unit (timer tidak berubah)</p>
            <div className="chip-row">
              {opsi.map((kode) => (
                <button
                  key={kode}
                  type="button"
                  className={terpilih.includes(kode) ? 'chip chip-selected' : 'chip'}
                  onClick={() => toggle(kode)}
                >
                  {kode}
                  {terpilih.includes(kode) && <span> &#10003;</span>}
                </button>
              ))}
            </div>
          </div>
          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan || terpilih.length === 0}>
            {menyimpan ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
