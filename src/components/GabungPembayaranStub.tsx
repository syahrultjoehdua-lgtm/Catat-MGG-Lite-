import type { TransaksiRecord } from '../db/db'

/** Placeholder — logika "Gabung Pembayaran" (menggabungkan beberapa transaksi jadi
 * satu pembayaran) belum ditentukan alurnya, menyusul di sesi berikutnya. */
export default function GabungPembayaranStub({ transaksi, onClose }: { transaksi: TransaksiRecord; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Gabung pembayaran</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="sheet-body">
          <p className="field-hint">
            Untuk {transaksi.kodeUnit.join(', ')} — fitur menggabungkan beberapa transaksi jadi satu pembayaran
            masih dalam perancangan, menyusul di sesi berikutnya.
          </p>
          <button style={{ width: '100%' }} onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
