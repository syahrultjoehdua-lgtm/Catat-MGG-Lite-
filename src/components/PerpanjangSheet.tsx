import { useState } from 'react'
import type { TransaksiRecord } from '../db/db'
import { perpanjangDurasi } from '../db/db'
import { formatRibuan, parseRibuan } from '../utils/format'
import { toBody } from '../utils/portal'

const DURASI_AWAL = 25 // menit — nilai awal saat sheet dibuka
const BAYAR_AWAL = 15000 // Rp — nilai awal saat sheet dibuka
const LANGKAH_BAYAR = 5000
const DURASI_MINIMAL = 1 // menit — batas minimal kalau diisi manual

export default function PerpanjangSheet({ transaksi, onClose }: { transaksi: TransaksiRecord; onClose: () => void }) {
  const [tambahan, setTambahan] = useState(DURASI_AWAL)
  const [tambahBayar, setTambahBayar] = useState(BAYAR_AWAL)
  const [menyimpan, setMenyimpan] = useState(false)

  const tambahanValid = Number.isFinite(tambahan) && tambahan >= DURASI_MINIMAL
  const totalWaktu = transaksi.durasiMenit + (tambahanValid ? tambahan : 0)
  const totalTagihan = transaksi.jumlahBayar + tambahBayar

  function ubahDurasiManual(teks: string) {
    const angka = teks.replace(/\D/g, '')
    setTambahan(angka ? Number(angka) : 0)
  }

  async function handleSimpan() {
    if (!transaksi.id || !tambahanValid) return
    setMenyimpan(true)
    await perpanjangDurasi(transaksi.id, tambahan, tambahBayar)
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
            <p className="field-label">Tambah durasi (menit)</p>
            <div className="stepper">
              <button type="button" onClick={() => setTambahan((d) => Math.max(DURASI_MINIMAL, d - 5))}>&minus;</button>
              <input
                type="text"
                inputMode="numeric"
                className="stepper-input"
                value={tambahan}
                onChange={(e) => ubahDurasiManual(e.target.value)}
              />
              <button type="button" onClick={() => setTambahan((d) => (Number.isFinite(d) ? d : 0) + 5)}>+</button>
            </div>
            {!tambahanValid && <p className="field-error">Durasi minimal {DURASI_MINIMAL} menit</p>}
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
            <p className="field-hint">Dijumlahkan ke Jumlah Bayar transaksi ini. Boleh diubah jadi 0 kalau perpanjangan gratis atau bayar dicatat terpisah.</p>
          </div>

          <div className="card">
            <div className="ringkasan-row"><span>Total waktu setelah perpanjangan</span><span>{totalWaktu} menit</span></div>
            <div className="ringkasan-row ringkasan-row-total"><span>Total tagihan setelah perpanjangan</span><span>Rp{formatRibuan(totalTagihan)}</span></div>
          </div>

          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan || !tambahanValid}>
            {menyimpan ? 'Menyimpan...' : `Tambah ${tambahan || 0} menit \u00b7 +Rp${formatRibuan(tambahBayar)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
