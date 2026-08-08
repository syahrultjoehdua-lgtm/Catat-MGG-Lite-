import { useEffect, useState } from 'react'
import type { TransaksiRecord } from '../db/db'
import { gabungkanTransaksi, listKandidatGabungPembayaran, listAnggotaGrup } from '../db/db'
import { toBody } from '../utils/portal'

interface GabungPembayaranSheetProps {
  transaksi: TransaksiRecord
  onClose: () => void
}

function rupiah(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

function BarisPilih({
  t,
  dipilih,
  onToggle,
  statusLabel
}: {
  t: TransaksiRecord
  dipilih: boolean
  onToggle: () => void
  statusLabel: string
}) {
  return (
    <label className="list-row" style={{ cursor: 'pointer' }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 500 }}>{t.kodeUnit.join(', ')}{t.namaPelanggan ? ` \u00b7 ${t.namaPelanggan}` : ''}</span>
        <span className="field-hint">{statusLabel} &middot; {rupiah(t.jumlahBayar)}</span>
      </span>
      <input type="checkbox" checked={dipilih} onChange={onToggle} style={{ width: 18, height: 18, flexShrink: 0 }} />
    </label>
  )
}

/**
 * Bottom Sheet pilih timer lain untuk digabung jadi 1 kartu pembayaran.
 * Urutan tampilan sesuai permintaan: timer aktif -> timer selesai belum bayar ->
 * timer selesai & sudah bayar. Menggabungkan TIDAK menyatukan logika transaksi —
 * cuma menandai groupId yang sama supaya tampil sebagai 1 kartu; masing-masing
 * tetap punya Rincian Sewa & tombol aksi sendiri-sendiri.
 */
export default function GabungPembayaranSheet({ transaksi, onClose }: GabungPembayaranSheetProps) {
  const [kandidat, setKandidat] = useState<{
    aktif: TransaksiRecord[]
    selesaiBelumBayar: TransaksiRecord[]
    selesaiSudahBayar: TransaksiRecord[]
  } | null>(null)
  const [terpilih, setTerpilih] = useState<Set<number>>(new Set())
  const [menyimpan, setMenyimpan] = useState(false)

  useEffect(() => {
    if (!transaksi.id) return
    ;(async () => {
      const hasil = await listKandidatGabungPembayaran(transaksi.sesiId, transaksi.id!)
      setKandidat(hasil)
      // Kalau transaksi ini sudah tergabung di sebuah grup, pre-select anggota grup itu.
      if (transaksi.groupId) {
        const anggota = await listAnggotaGrup(transaksi.groupId)
        setTerpilih(new Set(anggota.filter((a) => a.id !== transaksi.id).map((a) => a.id!)))
      }
    })()
  }, [transaksi.id, transaksi.sesiId, transaksi.groupId])

  function toggle(id?: number) {
    if (!id) return
    setTerpilih((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSimpan() {
    if (!transaksi.id) return
    setMenyimpan(true)
    await gabungkanTransaksi(transaksi.id, [...terpilih])
    setMenyimpan(false)
    onClose()
  }

  const kosong =
    kandidat && kandidat.aktif.length === 0 && kandidat.selesaiBelumBayar.length === 0 && kandidat.selesaiSudahBayar.length === 0

  return toBody(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Gabung pembayaran</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="sheet-body">
          <p className="field-hint" style={{ marginTop: -8 }}>
            Pilih timer lain di sesi ini untuk digabung tampilannya dengan {transaksi.kodeUnit.join(', ')} jadi 1 kartu.
          </p>

          {!kandidat ? (
            <p className="field-hint">Memuat...</p>
          ) : kosong ? (
            <p className="field-hint">Tidak ada timer lain di sesi ini untuk digabung.</p>
          ) : (
            <>
              {kandidat.aktif.length > 0 && (
                <div className="field">
                  <p className="field-label">Timer aktif</p>
                  <div className="list-rows">
                    {kandidat.aktif.map((t) => (
                      <BarisPilih key={t.id} t={t} dipilih={terpilih.has(t.id!)} onToggle={() => toggle(t.id)} statusLabel="Sedang berjalan" />
                    ))}
                  </div>
                </div>
              )}
              {kandidat.selesaiBelumBayar.length > 0 && (
                <div className="field">
                  <p className="field-label">Timer selesai &middot; belum bayar</p>
                  <div className="list-rows">
                    {kandidat.selesaiBelumBayar.map((t) => (
                      <BarisPilih key={t.id} t={t} dipilih={terpilih.has(t.id!)} onToggle={() => toggle(t.id)} statusLabel="Belum bayar" />
                    ))}
                  </div>
                </div>
              )}
              {kandidat.selesaiSudahBayar.length > 0 && (
                <div className="field">
                  <p className="field-label">Timer selesai &middot; sudah bayar</p>
                  <div className="list-rows">
                    {kandidat.selesaiSudahBayar.map((t) => (
                      <BarisPilih key={t.id} t={t} dipilih={terpilih.has(t.id!)} onToggle={() => toggle(t.id)} statusLabel="Sudah bayar" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan || terpilih.size === 0}>
            {menyimpan ? 'Menyimpan...' : terpilih.size === 0 ? 'Pilih minimal 1 timer' : `Gabungkan ${terpilih.size + 1} timer`}
          </button>
        </div>
      </div>
    </div>
  )
}
