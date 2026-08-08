import type { TransaksiRecord } from '../db/db'
import { sisaWaktuMs, formatCountdown, proporsiSisaRing, warnaRing } from '../utils/time'
import { IconPlay } from './icons'

interface GroupUnitCardProps {
  anggotaAktif: TransaksiRecord[] // anggota grup yang timernya masih aktif (belum selesai)
  jumlahAnggotaLain: number // anggota grup yang sudah selesai (tidak tampil sbg baris di sini)
  now: number
  onTapAnggota: (t: TransaksiRecord) => void
  onLanjutkanAnggota: (t: TransaksiRecord) => void
  onWaktuHabisAnggota: (t: TransaksiRecord) => void
  onLihatDataPembayaran: () => void
}

function MiniRing({ transaksi, now }: { transaksi: TransaksiRecord; now: number }) {
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
    <div className="unit-card-ring" style={{ ...ringStyle, width: 44, height: 44 }}>
      <div className="unit-card-ring-inner" style={{ width: 34, height: 34, fontSize: 10 }}>
        {transaksi.dijeda ? '\u23F8' : formatCountdown(sisaMs)}
      </div>
    </div>
  )
}

/** Kartu gabungan untuk beberapa transaksi dengan groupId sama (fitur Gabung
 * Pembayaran). Masing-masing baris tetap membuka Rincian Sewa-nya sendiri saat
 * diketuk — grouping ini murni tampilan, bukan penggabungan logika transaksi. */
export default function GroupUnitCard({
  anggotaAktif,
  jumlahAnggotaLain,
  now,
  onTapAnggota,
  onLanjutkanAnggota,
  onWaktuHabisAnggota,
  onLihatDataPembayaran
}: GroupUnitCardProps) {
  return (
    <div className="card group-card">
      <p className="field-label" style={{ marginBottom: 8 }}>
        Gabungan pembayaran &middot; {anggotaAktif.length + jumlahAnggotaLain} unit
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {anggotaAktif.map((t) => {
          const habis = sisaWaktuMs(t, now) <= 0
          return (
            <div
              key={t.id}
              className={habis ? 'unit-card unit-card-habis group-card-row' : 'unit-card group-card-row'}
              role="button"
              tabIndex={0}
              onClick={() => onTapAnggota(t)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTapAnggota(t)}
            >
              <MiniRing transaksi={t} now={now} />
              <div className="unit-card-info">
                <p className="unit-card-kode">{t.kodeUnit.join(', ')}</p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {habis && (
                    <button
                      className="badge-waktu-habis"
                      onClick={(e) => {
                        e.stopPropagation()
                        onWaktuHabisAnggota(t)
                      }}
                    >
                      Waktu habis
                    </button>
                  )}
                  {t.statusBayar === 'belum' && <span className="badge badge-warning">Belum bayar</span>}
                  {t.dijeda && <span className="badge badge-warning">Dijeda</span>}
                </div>
              </div>
              {t.dijeda && (
                <button
                  className="unit-card-resume"
                  aria-label="Lanjutkan"
                  onClick={(e) => {
                    e.stopPropagation()
                    onLanjutkanAnggota(t)
                  }}
                >
                  <IconPlay width={16} height={16} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button style={{ width: '100%', marginTop: 10 }} onClick={onLihatDataPembayaran}>
        Lihat data pembayaran
      </button>
    </div>
  )
}
