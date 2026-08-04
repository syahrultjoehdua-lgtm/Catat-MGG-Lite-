import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import AppShell from '../components/AppShell'
import EditSheet from '../components/EditSheet'
import { db, listPengeluaranSesi, type TransaksiRecord } from '../db/db'
import { buatGambarLaporanSesi, bagikanAtauUnduhGambar, type DataLaporanSesi } from '../utils/laporanGambar'

function formatJam(iso?: string) {
  if (!iso) return '\u2013'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function formatTanggalSesi(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function BarisTransaksi({ t, onTap }: { t: TransaksiRecord; onTap: () => void }) {
  return (
    <div className="history-row" onClick={onTap}>
      <div className="history-row-top">
        <p className="unit-card-kode">{t.kodeUnit.join(', ')}</p>
        <span className="history-row-bayar">Rp{t.jumlahBayar.toLocaleString('id-ID')}</span>
      </div>
      <p className="field-hint">
        {formatJam(t.waktuMulai)} &rarr; {formatJam(t.waktuSelesai)} &middot; {t.durasiMenit} menit
      </p>
      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
        {t.statusBayar === 'belum' && <span className="badge badge-warning">Belum bayar</span>}
        {t.statusBayar === 'sudah' && (
          <span className="badge badge-success">Sudah bayar{t.nonTunai ? ' \u00b7 non-tunai' : ''}</span>
        )}
      </div>
      {t.riwayatEdit && t.riwayatEdit.length > 0 && (
        <details onClick={(e) => e.stopPropagation()}>
          <summary className="field-hint">{t.riwayatEdit.length} perubahan tercatat</summary>
          <ul className="audit-list">
            {t.riwayatEdit.map((r, i) => (
              <li key={i}>
                {formatJam(r.waktu)} &middot; {r.ringkasan}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export default function History() {
  const [tab, setTab] = useState<'aktif' | 'selesai'>('aktif')
  const [transaksiDiedit, setTransaksiDiedit] = useState<TransaksiRecord | null>(null)
  const [membagikan, setMembagikan] = useState(false)

  async function bagikanLaporan(data: DataLaporanSesi) {
    setMembagikan(true)
    try {
      const blob = await buatGambarLaporanSesi(data)
      await bagikanAtauUnduhGambar(blob, `ringkasan-sesi-${data.tanggalSesi.slice(0, 10)}.png`)
    } finally {
      setMembagikan(false)
    }
  }

  const sesiAktif = useLiveQuery(async () => {
    const semua = await db.sesi.toArray()
    return semua.find((s) => !s.closedAt) ?? null
  }, [])

  // Sengaja hanya transaksi yang SUDAH selesai — timer yang masih berjalan tidak masuk sini.
  const transaksiSesiAktif = useLiveQuery(async () => {
    if (!sesiAktif?.id) return []
    return db.transaksi.where('sesiId').equals(sesiAktif.id).filter((t) => !!t.selesai).toArray()
  }, [sesiAktif?.id])

  const kelompokSelesai = useLiveQuery(async () => {
    const sesiSelesai = (await db.sesi.toArray())
      .filter((s) => s.closedAt)
      .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime())
    const hasil: {
      sesiId: number
      startedAt: string
      closedAt: string
      saldoAwal?: number
      saldoAkhir?: number
      pengeluaran: number
      transaksi: TransaksiRecord[]
    }[] = []
    for (const s of sesiSelesai) {
      const t = await db.transaksi.where('sesiId').equals(s.id!).filter((x) => !!x.selesai).toArray()
      const pengeluaranItems = await listPengeluaranSesi(s.id!)
      if (t.length > 0) {
        hasil.push({
          sesiId: s.id!,
          startedAt: s.startedAt,
          closedAt: s.closedAt!,
          saldoAwal: s.saldoAwal,
          saldoAkhir: s.saldoAkhir,
          pengeluaran: pengeluaranItems.reduce((sum, p) => sum + p.nominal, 0),
          transaksi: t
        })
      }
    }
    return hasil
  }, [])

  const terurutAktif = useMemo(() => {
    if (!transaksiSesiAktif) return []
    return [...transaksiSesiAktif].sort((a, b) => new Date(b.waktuMulai).getTime() - new Date(a.waktuMulai).getTime())
  }, [transaksiSesiAktif])

  return (
    <AppShell title="Riwayat" subtitle="Baca langsung dari penyimpanan lokal, tanpa fetch ke server">
      <div className="tab-row">
        <button className={tab === 'aktif' ? 'tab-item tab-item-active' : 'tab-item'} onClick={() => setTab('aktif')}>
          Sesi aktif
        </button>
        <button className={tab === 'selesai' ? 'tab-item tab-item-active' : 'tab-item'} onClick={() => setTab('selesai')}>
          Sesi selesai
        </button>
      </div>

      {tab === 'aktif' ? (
        terurutAktif.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada transaksi yang selesai di sesi ini.</p>
            <p className="empty-state-hint">Timer yang masih berjalan tidak ditampilkan di sini.</p>
          </div>
        ) : (
          <div className="history-list">
            {terurutAktif.map((t) => (
              <BarisTransaksi key={t.id} t={t} onTap={() => setTransaksiDiedit(t)} />
            ))}
          </div>
        )
      ) : !kelompokSelesai || kelompokSelesai.length === 0 ? (
        <div className="empty-state">
          <p>Belum ada sesi yang diakhiri.</p>
        </div>
      ) : (
        <div>
          {kelompokSelesai.map((grup) => (
            <div key={grup.sesiId}>
              <div className="history-group-header">
                <p className="settings-section-label" style={{ margin: 0 }}>
                  {formatTanggalSesi(grup.startedAt)}
                </p>
                <button
                  className="history-bagikan-btn"
                  disabled={membagikan}
                  onClick={() =>
                    bagikanLaporan({
                      tanggalSesi: grup.closedAt,
                      saldoAwal: grup.saldoAwal ?? 0,
                      pendapatan: grup.transaksi.reduce((s, t) => s + t.jumlahBayar, 0),
                      pengeluaran: grup.pengeluaran,
                      saldoAkhir: grup.saldoAkhir ?? 0,
                      jumlahUnitDisewa: grup.transaksi.reduce((s, t) => s + t.kodeUnit.length, 0)
                    })
                  }
                >
                  {membagikan ? '...' : 'Bagikan laporan'}
                </button>
              </div>
              <div className="history-list">
                {[...grup.transaksi]
                  .sort((a, b) => new Date(b.waktuMulai).getTime() - new Date(a.waktuMulai).getTime())
                  .map((t) => (
                    <BarisTransaksi key={t.id} t={t} onTap={() => setTransaksiDiedit(t)} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {transaksiDiedit && <EditSheet transaksi={transaksiDiedit} onClose={() => setTransaksiDiedit(null)} />}
    </AppShell>
  )
}
