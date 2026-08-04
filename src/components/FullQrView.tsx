import { useRef, useState } from 'react'
import { IconX } from './icons'

/** Tampilan QR 100% layar. Ketuk sekali untuk memunculkan tombol tutup,
 * usap ke bawah untuk langsung keluar. */
export default function FullQrView({ url, onClose }: { url: string; onClose: () => void }) {
  const [tampilkanTombolTutup, setTampilkanTombolTutup] = useState(false)
  const touchStartY = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    touchStartY.current = null
    if (deltaY > 70) {
      onClose()
      return
    }
    setTampilkanTombolTutup((v) => !v)
  }

  return (
    <div
      className="full-qr-view"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => setTampilkanTombolTutup((v) => !v)}
    >
      <img src={url} alt="QR pembayaran ukuran penuh" className="full-qr-img" />
      {tampilkanTombolTutup && (
        <button
          className="full-qr-close"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="Tutup"
        >
          <IconX width={20} height={20} />
        </button>
      )}
    </div>
  )
}
