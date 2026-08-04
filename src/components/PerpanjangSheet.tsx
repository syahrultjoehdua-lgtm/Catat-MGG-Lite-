import { useState } from 'react'
import { perpanjangDurasi } from '../db/db'

const LANGKAH = 5

export default function PerpanjangSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const [tambahan, setTambahan] = useState(LANGKAH)
  const [menyimpan, setMenyimpan] = useState(false)

  async function handleSimpan() {
    setMenyimpan(true)
    await perpanjangDurasi(id, tambahan)
    setMenyimpan(false)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Perpanjangan</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <p className="field-label">Tambah durasi</p>
            <div className="stepper">
              <button type="button" onClick={() => setTambahan((d) => Math.max(LANGKAH, d - LANGKAH))}>&minus;</button>
              <span>{tambahan} menit</span>
              <button type="button" onClick={() => setTambahan((d) => d + LANGKAH)}>+</button>
            </div>
          </div>
          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan}>
            {menyimpan ? 'Menyimpan...' : `Tambah ${tambahan} menit`}
          </button>
        </div>
      </div>
    </div>
  )
}
