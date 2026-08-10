import { useEffect, useState } from 'react'
import type { TransaksiRecord } from '../db/db'
import { listAnggotaGrup, tandaiSudahDibayar } from '../db/db'
import { formatDurasi } from '../utils/durasi'
import { toBody } from '../utils/portal'

interface DataPembayaranGrupSheetProps {
  groupId: string
  onClose: () => void
}

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

/**
 * "Lihat Data Pembayaran" — rincian per-unit dari 1 kartu gabungan: durasi sewa &
 * jumlah bayar masing-masing, bisa dibayar sendiri-sendiri atau sekaligus.
 */
export default function DataPembayaranGrupSheet({ groupId, onClose }: DataPembayaranGrupSheetProps) {
  const [anggota, setAnggota] = useState<TransaksiRecord[] | null>(null)
  const [memproses, setMemproses] = useState<number | 'semua' | null>(null)

  async function muatUlang() {
    setAnggota(await listAnggotaGrup(groupId))
  }

  useEffect(() => {
    muatUlang()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  async function bayarSatu(id?: number) {
    if (!id) return
    setMemproses(id)
    await tandaiSudahDibayar(id)
    await muatUlang()
    setMemproses(null)
  }

  async function bayarSemua() {
    if (!anggota) return
    setMemproses('semua')
    for (const t of anggota) {
      if (t.statusBayar === 'belum' && t.id) await tandaiSudahDibayar(t.id)
    }
    await muatUlang()
    setMemproses(null)
  }

  const totalBayar = anggota?.reduce((s, t) => s + t.jumlahBayar, 0) ?? 0
  const totalBelum = anggota?.filter((t) => t.statusBayar === 'belum') ?? []

  return toBody(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Data pembayaran</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="sheet-body">
          {!anggota ? (
            <p className="field-hint">Memuat...</p>
          ) : (
            <>
              <div className="list-rows">
                {anggota.map((t) => (
                  <div key={t.id} className="card" style={{ padding: 12 }}>
                    <div className="rincian-row" style={{ padding: '0 0 4px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{t.kodeUnit.join(', ')}</span>
                      <span>{formatDurasi(t.durasiMenit)}</span>
                    </div>
                    <div className="rincian-row" style={{ padding: '0 0 8px', borderBottom: 'none' }}>
                      <span>{t.namaPelanggan || '\u2013'}</span>
                      <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{rupiah(t.jumlahBayar)}</span>
                    </div>
                    {t.statusBayar === 'sudah' ? (
                      <span className="badge badge-success">Sudah bayar{t.nonTunai ? ' \u00b7 non-tunai' : ''}</span>
                    ) : (
                      <button
                        style={{ width: '100%' }}
                        onClick={() => bayarSatu(t.id)}
                        disabled={memproses !== null}
                      >
                        {memproses === t.id ? 'Menyimpan...' : 'Bayar unit ini'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="ringkasan-row ringkasan-row-total"><span>Total semua unit</span><span>{rupiah(totalBayar)}</span></div>
              </div>

              {totalBelum.length > 0 && (
                <button className="fab" style={{ width: '100%' }} onClick={bayarSemua} disabled={memproses !== null}>
                  {memproses === 'semua' ? 'Menyimpan...' : `Bayar sekaligus (${totalBelum.length} unit)`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
