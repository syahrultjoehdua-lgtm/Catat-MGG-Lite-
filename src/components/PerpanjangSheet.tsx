import { useState } from 'react'
import { perpanjangDurasi } from '../db/db'
import { formatRibuan, parseRibuan } from '../utils/format'
import { toBody } from '../utils/portal'

const LANGKAH_MENIT = 5
const LANGKAH_BAYAR = 5000

export default function PerpanjangSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const [tambahan, setTambahan] = useState(LANGKAH_MENIT)
  const [tambahBayar, setTambahBayar] = useState(0)
  const [menyimpan, setMenyimpan] = useState(false)

  async function handleSimpan() {
    setMenyimpan(true)
    await perpanjangDurasi(id, tambahan, tambahBayar)
    setMenyimpan(false)
    onClose()
  }

  return toBody(
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
              <button type="button" onClick={() => setTambahan((d) => Math.max(LANGKAH_MENIT, d - LANGKAH_MENIT))}>&minus;</button>
              <span>{tambahan} menit</span>
              <button type="button" onClick={() => setTambahan((d) => d + LANGKAH_MENIT)}>+</button>
            </div>
          </div>

          <div className="field">
            <p className="field-label">Tambah jumlah bayar (opsional)</p>
            <div className="stepper">
              <button type="button" onClick={() => setTambahBayar((j) => Math.max(0, j - LANGKAH_BAYAR))}>&minus;</button>
              <input
                type="text"
                inputMode="numeric"
                className="stepper-input"
                value={formatRibuan(tambahBayar)}
                onChange={(e) => setTambahBayar(parseRibuan(e.target.value))}
              />
              <button type="button" onClick={() => setTambahBayar((j) => j + LANGKAH_BAYAR)}>+</button>
            </div>
            <p className="field-hint">Dijumlahkan ke Jumlah Bayar transaksi ini. Biarkan 0 kalau perpanjangan gratis atau bayar dicatat terpisah.</p>
          </div>

          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan}>
            {menyimpan
              ? 'Menyimpan...'
              : tambahBayar > 0
                ? `Tambah ${tambahan} menit \u00b7 +Rp${formatRibuan(tambahBayar)}`
                : `Tambah ${tambahan} menit`}
          </button>
        </div>
      </div>
    </div>
  )
}
