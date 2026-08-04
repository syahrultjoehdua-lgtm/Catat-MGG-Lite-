import type { TransaksiRecord } from '../db/db'
import { sisaWaktuMs, formatCountdown, proporsiSisaRing, warnaRing } from '../utils/time'
import { IconPlay } from './icons'

interface UnitCardProps {
  transaksi: TransaksiRecord
  now: number
  onTapKartu: () => void // buka "Rincian Sewa"
  onLanjutkan: () => void // resume cepat saat dijeda
  onWaktuHabis: () => void // tap badge "Waktu habis" -> langsung pop-up penutupan/bayar
}

export default function UnitCard({ transaksi, now, onTapKartu, onLanjutkan, onWaktuHabis }: UnitCardProps) {
  const sisaMs = sisaWaktuMs(transaksi, now)
  const habis = sisaMs <= 0
  const proporsiSisa = proporsiSisaRing(transaksi, now)
  const persenSisa = Math.round(proporsiSisa * 100)
  const warna = warnaRing(proporsiSisa)

  const ringStyle = {
    background: habis
      ? 'var(--color-danger)'
      : transaksi.dijeda
        ? 'var(--color-border-strong)'
        : `conic-gradient(${warna} 0% ${persenSisa}%, var(--color-border) ${persenSisa}% 100%)`
  }

  return (
    <div
      className={habis ? 'unit-card unit-card-habis' : 'unit-card'}
      role="button"
      tabIndex={0}
      onClick={onTapKartu}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTapKartu()}
    >
      <div className="unit-card-ring" style={ringStyle}>
        <div className="unit-card-ring-inner">{transaksi.dijeda ? '\u23F8' : formatCountdown(sisaMs)}</div>
      </div>
      <div className="unit-card-info">
        <p className="unit-card-kode">{transaksi.kodeUnit.join(', ')}</p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {habis && (
            <button
              className="badge-waktu-habis"
              onClick={(e) => {
                e.stopPropagation()
                onWaktuHabis()
              }}
            >
              Waktu habis
            </button>
          )}
          {transaksi.statusBayar === 'belum' && <span className="badge badge-warning">Belum bayar</span>}
          {transaksi.dijeda && <span className="badge badge-warning">Dijeda</span>}
        </div>
        {transaksi.namaPelanggan && <p className="unit-card-nama">{transaksi.namaPelanggan}</p>}
      </div>
      {transaksi.dijeda && (
        <button
          className="unit-card-resume"
          aria-label="Lanjutkan"
          onClick={(e) => {
            e.stopPropagation()
            onLanjutkan()
          }}
        >
          <IconPlay width={18} height={18} />
        </button>
      )}
    </div>
  )
}
