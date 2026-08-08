import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BackHeader from '../../components/BackHeader'
import { getQrSetting, hapusQrSetting, setQrSetting } from '../../db/db'

export default function MasterQr() {
  const qr = useLiveQuery(() => getQrSetting(), [])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)

  useEffect(() => {
    if (!qr) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(qr.gambarBlob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [qr])

  async function handlePilihFile(file: File | null) {
    if (!file) return
    setMenyimpan(true)
    await setQrSetting(file)
    setMenyimpan(false)
  }

  return (
    <div className="app-shell">
      <BackHeader title="QR pembayaran" />
      <main className="app-content app-content-with-back-header">
        {previewUrl ? (
          <div className="qr-box" style={{ width: '100%', height: 220, marginBottom: 16 }}>
            <img src={previewUrl} alt="QR pembayaran" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div className="empty-state">
            <p>Belum ada gambar QR yang diset.</p>
            <p className="empty-state-hint">Gambar disimpan lokal di perangkat ini saja.</p>
          </div>
        )}

        <label className="photo-input" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handlePilihFile(e.target.files?.[0] ?? null)}
            style={{ display: 'none' }}
          />
          {menyimpan ? 'Menyimpan...' : previewUrl ? 'Ganti gambar QR' : 'Unggah gambar QR'}
        </label>

        {previewUrl && (
          <button style={{ width: '100%' }} onClick={() => hapusQrSetting()}>
            Hapus QR
          </button>
        )}
      </main>
    </div>
  )
}
