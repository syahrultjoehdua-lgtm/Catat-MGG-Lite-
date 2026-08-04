import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import AppShell from '../components/AppShell'
import UnitCard from '../components/UnitCard'
import TambahSewaSheet from '../components/TambahSewaSheet'
import CardMenu from '../components/CardMenu'
import PerpanjangSheet from '../components/PerpanjangSheet'
import EditSheet from '../components/EditSheet'
import TukarUnitSheet from '../components/TukarUnitSheet'
import PembayaranQrSheet from '../components/PembayaranQrSheet'
import GabungPembayaranStub from '../components/GabungPembayaranStub'
import AlarmOverlay from '../components/AlarmOverlay'
import {
  db,
  getOrCreateActiveSession,
  listUnitMaster,
  getKodeUnitSedangDisewa,
  getRiwayatNamaPelanggan,
  jedaTransaksi,
  lanjutkanTransaksi,
  tutupTransaksi,
  hapusTransaksi,
  type SesiRecord,
  type TransaksiRecord
} from '../db/db'
import { sisaWaktuMs } from '../utils/time'

type SheetAktif =
  | { jenis: 'tambah' }
  | { jenis: 'menu'; t: TransaksiRecord }
  | { jenis: 'perpanjang'; t: TransaksiRecord }
  | { jenis: 'edit'; t: TransaksiRecord }
  | { jenis: 'tukarUnit'; t: TransaksiRecord }
  | { jenis: 'bayarQr'; t: TransaksiRecord; tutupSetelahBayar: boolean }
  | { jenis: 'gabungBayar'; t: TransaksiRecord }
  | null

export default function Dashboard() {
  const [sesi, setSesi] = useState<SesiRecord | null>(null)
  const [sheet, setSheet] = useState<SheetAktif>(null)
  const [now, setNow] = useState(() => Date.now())
  const [alarmUntuk, setAlarmUntuk] = useState<TransaksiRecord | null>(null)
  const sudahDialarmRef = useRef<Set<number>>(new Set())
  const transaksiAktifRef = useRef<TransaksiRecord[]>([])
  const alarmUntukRef = useRef<TransaksiRecord | null>(null)

  useEffect(() => {
    getOrCreateActiveSession().then(setSesi)
  }, [])

  useEffect(() => {
    alarmUntukRef.current = alarmUntuk
  }, [alarmUntuk])

  useEffect(() => {
    const interval = setInterval(() => {
      const sekarang = Date.now()
      setNow(sekarang)

      // Cek tiap detik (bukan cuma saat app dibuka lagi) supaya popup+alarm muncul
      // otomatis begitu ada transaksi yang waktunya habis — baik app sedang dibuka
      // (foreground) maupun baru dibuka lagi setelah sempat di-background/terkunci.
      if (!alarmUntukRef.current) {
        const kandidat = transaksiAktifRef.current.find(
          (t) => t.id && !sudahDialarmRef.current.has(t.id) && !t.dijeda && sisaWaktuMs(t, sekarang) <= 0
        )
        if (kandidat?.id) {
          sudahDialarmRef.current.add(kandidat.id)
          setAlarmUntuk(kandidat)
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const transaksiAktif = useLiveQuery(async () => {
    if (!sesi?.id) return []
    return db.transaksi
      .where('sesiId')
      .equals(sesi.id)
      .filter((t) => !t.selesai && !t.dibatalkan)
      .toArray()
  }, [sesi?.id])

  useEffect(() => {
    transaksiAktifRef.current = transaksiAktif ?? []
  }, [transaksiAktif])

  const unitMaster = useLiveQuery(() => listUnitMaster(), []) ?? []

  const unitSedangDisewa = useLiveQuery(async () => {
    if (!sesi?.id) return []
    return getKodeUnitSedangDisewa(sesi.id)
  }, [sesi?.id, transaksiAktif]) ?? []

  const riwayatNama = useLiveQuery(() => getRiwayatNamaPelanggan(), [transaksiAktif]) ?? []

  const unitTersedia = useMemo(
    () => unitMaster.filter((u) => !unitSedangDisewa.includes(u.kodeUnit)),
    [unitMaster, unitSedangDisewa]
  )

  const daftarTerurut = useMemo(() => {
    if (!transaksiAktif) return []
    return [...transaksiAktif].sort((a, b) => sisaWaktuMs(a, now) - sisaWaktuMs(b, now))
  }, [transaksiAktif, now])

  // Alarm layar penuh dipicu dari pengecekan tiap detik di atas (bukan lagi dari
  // visibilitychange saja) — lihat komentar di useEffect interval.

  const memuat = !sesi || transaksiAktif === undefined

  async function handleJedaLanjut(t: TransaksiRecord) {
    if (!t.id) return
    if (t.dijeda) await lanjutkanTransaksi(t.id, Date.now())
    else await jedaTransaksi(t.id)
    setSheet(null)
  }

  function handleWaktuHabis(t: TransaksiRecord) {
    if (!t.id) return
    if (t.statusBayar === 'belum') {
      setSheet({ jenis: 'bayarQr', t, tutupSetelahBayar: true })
      return
    }
    if (confirm(`Tutup transaksi ${t.kodeUnit.join(', ')}? Waktu sudah habis.`)) {
      tutupTransaksi(t.id)
    }
  }

  async function handlePaksaSelesai(t: TransaksiRecord) {
    if (!t.id) return
    if (t.statusBayar === 'belum') {
      setSheet({ jenis: 'bayarQr', t, tutupSetelahBayar: true })
      return
    }
    if (confirm(`Selesaikan transaksi ${t.kodeUnit.join(', ')}?`)) {
      await tutupTransaksi(t.id)
    }
    setSheet(null)
  }

  async function handleBatalkan(t: TransaksiRecord) {
    if (!t.id) return
    if (confirm(`Hapus transaksi ${t.kodeUnit.join(', ')} secara permanen? Aksi ini tidak bisa dibatalkan.`)) {
      await hapusTransaksi(t.id)
    }
    setSheet(null)
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle={
        sesi
          ? `Sesi aktif \u00b7 mulai ${new Date(sesi.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
          : 'Memuat sesi...'
      }
      fab={
        <button className="fab" onClick={() => setSheet({ jenis: 'tambah' })} disabled={!sesi}>
          + Tambah sewa
        </button>
      }
    >
      {memuat ? null : daftarTerurut.length === 0 ? (
        <div className="empty-state">
          <p>Belum ada unit yang sedang disewa.</p>
          <p className="empty-state-hint">Ketuk &ldquo;+ Tambah sewa&rdquo; untuk mencatat transaksi baru.</p>
        </div>
      ) : (
        <div className="unit-card-list">
          {daftarTerurut.map((t) => (
            <UnitCard
              key={t.id}
              transaksi={t}
              now={now}
              onTapKartu={() => setSheet({ jenis: 'menu', t })}
              onLanjutkan={() => handleJedaLanjut(t)}
              onWaktuHabis={() => handleWaktuHabis(t)}
            />
          ))}
        </div>
      )}

      {sheet?.jenis === 'tambah' && sesi?.id && (
        <TambahSewaSheet
          sesiId={sesi.id}
          unitTersedia={unitTersedia}
          riwayatNama={riwayatNama}
          onClose={() => setSheet(null)}
          onSaved={() => setSheet(null)}
        />
      )}

      {sheet?.jenis === 'menu' && (
        <CardMenu
          transaksi={sheet.t}
          now={now}
          onClose={() => setSheet(null)}
          onPerpanjangan={() => setSheet({ jenis: 'perpanjang', t: sheet.t })}
          onEdit={() => setSheet({ jenis: 'edit', t: sheet.t })}
          onTukarUnit={() => setSheet({ jenis: 'tukarUnit', t: sheet.t })}
          onJedaLanjut={() => handleJedaLanjut(sheet.t)}
          onBayarSekarang={() => setSheet({ jenis: 'bayarQr', t: sheet.t, tutupSetelahBayar: false })}
          onGabungPembayaran={() => setSheet({ jenis: 'gabungBayar', t: sheet.t })}
          onPaksaSelesai={() => handlePaksaSelesai(sheet.t)}
          onBatalkan={() => handleBatalkan(sheet.t)}
        />
      )}

      {sheet?.jenis === 'perpanjang' && sheet.t.id && (
        <PerpanjangSheet id={sheet.t.id} onClose={() => setSheet(null)} />
      )}

      {sheet?.jenis === 'edit' && <EditSheet transaksi={sheet.t} onClose={() => setSheet(null)} />}

      {sheet?.jenis === 'tukarUnit' && (
        <TukarUnitSheet transaksi={sheet.t} unitBisaDipilih={unitTersedia} onClose={() => setSheet(null)} />
      )}

      {sheet?.jenis === 'bayarQr' && (
        <PembayaranQrSheet
          transaksi={sheet.t}
          tutupSetelahBayar={sheet.tutupSetelahBayar}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet?.jenis === 'gabungBayar' && <GabungPembayaranStub transaksi={sheet.t} onClose={() => setSheet(null)} />}

      {alarmUntuk && (
        <AlarmOverlay
          transaksi={alarmUntuk}
          onTangani={() => {
            const t = alarmUntuk
            setAlarmUntuk(null)
            setSheet(t.statusBayar === 'belum' ? { jenis: 'bayarQr', t, tutupSetelahBayar: true } : { jenis: 'menu', t })
          }}
        />
      )}
    </AppShell>
  )
}
