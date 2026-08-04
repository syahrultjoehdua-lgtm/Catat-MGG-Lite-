import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { TransaksiRecord } from '../db/db'
import { db, tandaiSudahDibayar, tutupTransaksi } from '../db/db'
import FullQrView from './FullQrView'

interface PembayaranQrSheetProps {
  transaksi: TransaksiRecord
  /** true: dipakai saat menutup transaksi (waktu habis / paksa selesai) — transaksi
   * langsung ditutup setelah dibayar. false: "Bayar sekarang" dari Rincian Sewa,
   * transaksi tetap berjalan, cuma status bayarnya yang berubah. */
  tutupSetelahBayar: boolean
  onClose: () => void
}

/** Alur bayar sebelum transaksi ditutup, saat statusBayar masih "belum" (spesifikasi 3.3). */
export default function PembayaranQrSheet({ transaksi, tutupSetelahBayar, onClose }: PembayaranQrSheetProps) {
  const qr = useLiveQuery(() => db.qrSetting.toCollection().first(), [])
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [nonTunai, setNonTunai] = useState(transaksi.nonTunai ?? false)
  const [tampilkanFull, setTampilkanFull] = useState(false)
  const [memproses, setMemproses] = useState(false)

  useEffect(() => {
    if (!qr) return
    const url = URL.createObjectURL(qr.gambarBlob)
    setQrUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [qr])

  async function handleSudahDibayar() {
    if (!transaksi.id) return
    setMemproses(true)
    await tandaiSudahDibayar(transaksi.id, nonTunai)
    if (tutupSetelahBayar) await tutupTransaksi(transaksi.id)
    setMemproses(false)
    onClose()
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-header">
            <h2>Pembayaran</h2>
            <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
          </div>
          <div className="sheet-body" style={{ textAlign: 'center' }}>
            <p className="field-label">{transaksi.kodeUnit.join(', ')} &middot; belum dibayar</p>
            <h2 style={{ margin: '4px 0 16px' }}>Rp{transaksi.jumlahBayar.toLocaleString('id-ID')}</h2>
            <div className="qr-box" onClick={() => qrUrl && setTampilkanFull(true)} style={{ cursor: qrUrl ? 'zoom-in' : 'default' }}>
              {qrUrl ? (
                <img src={qrUrl} alt="QR pembayaran" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <>
                  <p className="field-hint">Belum ada QR diset. Atur di Settings &rsaquo; QR pembayaran.</p>
                </>
              )}
            </div>
            {qrUrl && <p className="field-hint">Ketuk gambar untuk memperbesar</p>}

            <label className="checkbox-row" style={{ justifyContent: 'center', marginTop: 12 }}>
              <input type="checkbox" checked={nonTunai} onChange={(e) => setNonTunai(e.target.checked)} />
              Bayar dengan non-tunai
            </label>

            <div className="two-col" style={{ marginTop: 16 }}>
              <button onClick={onClose}>Batal</button>
              <button className="fab" onClick={handleSudahDibayar} disabled={memproses}>
                {memproses ? 'Menyimpan...' : 'Sudah dibayar'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {tampilkanFull && qrUrl && <FullQrView url={qrUrl} onClose={() => setTampilkanFull(false)} />}
    </>
  )
}
