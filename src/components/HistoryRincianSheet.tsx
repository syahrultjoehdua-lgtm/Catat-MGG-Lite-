import { useState } from 'react'
import type { TransaksiRecord } from '../db/db'
import { tandaiSudahDibayar } from '../db/db'
import { toBody } from '../utils/portal'
import { IconEdit, IconCheck } from './icons'

interface HistoryRincianSheetProps {
  transaksi: TransaksiRecord
  onClose: () => void
  onEdit: () => void
}

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}
function formatJam(iso?: string) {
  if (!iso) return '\u2013'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

/** Versi "Rincian Sewa" yang disesuaikan untuk transaksi yang SUDAH SELESAI (dibuka
 * dari kartu di layar Riwayat) — fokus ke data, bukan aksi timer yang sudah tidak
 * relevan lagi (Perpanjangan, Jeda, Tukar unit, Paksa selesai semua tidak berlaku
 * untuk transaksi yang sudah ditutup). */
export default function HistoryRincianSheet({ transaksi, onClose, onEdit }: HistoryRincianSheetProps) {
  const [memproses, setMemproses] = useState(false)
  const bayarNanti = transaksi.statusBayar === 'belum'

  async function handleTandaiLunas() {
    if (!transaksi.id) return
    setMemproses(true)
    await tandaiSudahDibayar(transaksi.id)
    setMemproses(false)
    onClose()
  }

  return toBody(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Rincian sewa</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>

        {bayarNanti && <p className="badge badge-warning" style={{ marginBottom: 12 }}>Bayar nanti \u00b7 belum ditagih</p>}

        <div className="rincian-group">
          <div className="rincian-row"><span>Kode unit</span><span>{transaksi.kodeUnit.join(', ')}</span></div>
          <div className="rincian-row"><span>Nama pelanggan</span><span>{transaksi.namaPelanggan || '\u2013'}</span></div>
          <div className="rincian-row"><span>Waktu mulai</span><span>{formatJam(transaksi.waktuMulai)}</span></div>
          <div className="rincian-row"><span>Waktu selesai</span><span>{formatJam(transaksi.waktuSelesai)}</span></div>
          <div className="rincian-row"><span>Durasi</span><span>{transaksi.durasiMenit} menit</span></div>
          <div className="rincian-row"><span>Jumlah bayar</span><span>{rupiah(transaksi.jumlahBayar)}</span></div>
          <div className="rincian-row">
            <span>Status bayar</span>
            <span>{transaksi.statusBayar === 'sudah' ? `Sudah${transaksi.nonTunai ? ' \u00b7 non-tunai' : ''}` : 'Belum'}</span>
          </div>
        </div>

        {transaksi.riwayatEdit && transaksi.riwayatEdit.length > 0 && (
          <>
            <p className="settings-section-label" style={{ margin: '14px 4px 6px' }}>Riwayat perubahan</p>
            <ul className="audit-list">
              {transaksi.riwayatEdit.map((r, i) => (
                <li key={i}>{formatJam(r.waktu)} &middot; {r.ringkasan}</li>
              ))}
            </ul>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          {bayarNanti && (
            <button className="fab" onClick={handleTandaiLunas} disabled={memproses}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}>
                <IconCheck width={16} height={16} /> {memproses ? 'Menyimpan...' : 'Tandai sudah dibayar'}
              </span>
            </button>
          )}
          <button onClick={onEdit}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}>
              <IconEdit width={16} height={16} /> Edit transaksi
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
