import type { TransaksiRecord } from '../db/db'
import { sisaWaktuMs, formatCountdown } from '../utils/time'
import { IconClockPlus, IconEdit, IconSwap, IconPause, IconPlay, IconCheck, IconFlag, IconTrash, IconMerge } from './icons'
import { toBody } from '../utils/portal'

interface CardMenuProps {
  transaksi: TransaksiRecord
  now: number
  onClose: () => void
  onPerpanjangan: () => void
  onEdit: () => void
  onTukarUnit: () => void
  onJedaLanjut: () => void
  onBayarSekarang: () => void
  onGabungPembayaran: () => void
  onPaksaSelesai: () => void
  onBatalkan: () => void
}

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export default function CardMenu({
  transaksi,
  now,
  onClose,
  onPerpanjangan,
  onEdit,
  onTukarUnit,
  onJedaLanjut,
  onBayarSekarang,
  onGabungPembayaran,
  onPaksaSelesai,
  onBatalkan
}: CardMenuProps) {
  const sisaMs = sisaWaktuMs(transaksi, now)
  const habis = sisaMs <= 0

  return toBody(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Rincian sewa</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>

        <div className="rincian-group">
          <div className="rincian-row"><span>Kode unit</span><span>{transaksi.kodeUnit.join(', ')}</span></div>
          <div className="rincian-row"><span>Nama pelanggan</span><span>{transaksi.namaPelanggan || '\u2013'}</span></div>
          <div className="rincian-row"><span>Waktu mulai</span><span>{new Date(transaksi.waktuMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div className="rincian-row">
            <span>{habis ? 'Lewat waktu' : 'Sisa waktu'}</span>
            <span>{transaksi.dijeda ? 'Dijeda' : formatCountdown(sisaMs)}</span>
          </div>
          <div className="rincian-row"><span>Jumlah bayar</span><span>{rupiah(transaksi.jumlahBayar)}</span></div>
          <div className="rincian-row">
            <span>Status bayar</span>
            <span>{transaksi.statusBayar === 'sudah' ? `Sudah${transaksi.nonTunai ? ' \u00b7 non-tunai' : ''}` : 'Belum'}</span>
          </div>
        </div>

        <p className="settings-section-label" style={{ margin: '18px 4px 10px' }}>Aksi</p>
        <div className="aksi-grid">
          <button className="aksi-item" onClick={onPerpanjangan}>
            <span className="aksi-icon"><IconClockPlus /></span>
            Perpanjangan
          </button>
          <button className="aksi-item" onClick={onEdit}>
            <span className="aksi-icon"><IconEdit /></span>
            Edit
          </button>
          <button className="aksi-item" onClick={onTukarUnit}>
            <span className="aksi-icon"><IconSwap /></span>
            Tukar unit
          </button>
          <button className="aksi-item" onClick={onJedaLanjut}>
            <span className="aksi-icon">{transaksi.dijeda ? <IconPlay /> : <IconPause />}</span>
            {transaksi.dijeda ? 'Lanjutkan' : 'Jeda'}
          </button>
          {transaksi.statusBayar === 'belum' && (
            <button className="aksi-item" onClick={onBayarSekarang}>
              <span className="aksi-icon"><IconCheck /></span>
              Bayar sekarang
            </button>
          )}
          <button className="aksi-item" onClick={onGabungPembayaran}>
            <span className="aksi-icon"><IconMerge /></span>
            Gabung pembayaran
          </button>
          <button className="aksi-item" onClick={onPaksaSelesai}>
            <span className="aksi-icon"><IconFlag /></span>
            {habis ? 'Selesaikan' : 'Paksa selesai'}
          </button>
          <button className="aksi-item" onClick={onBatalkan}>
            <span className="aksi-icon aksi-icon-danger"><IconTrash /></span>
            Batalkan
          </button>
        </div>
      </div>
    </div>
  )
}
