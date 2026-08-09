import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import AppShell from '../components/AppShell'
import UnitCard from '../components/UnitCard'
import GroupUnitCard from '../components/GroupUnitCard'
import TambahSewaSheet from '../components/TambahSewaSheet'
import CardMenu from '../components/CardMenu'
import PerpanjangSheet from '../components/PerpanjangSheet'
import EditSheet from '../components/EditSheet'
import TukarUnitSheet from '../components/TukarUnitSheet'
import PembayaranQrSheet from '../components/PembayaranQrSheet'
import GabungPembayaranSheet from '../components/GabungPembayaranSheet'
import DataPembayaranGrupSheet from '../components/DataPembayaranGrupSheet'
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
  | { jenis: 'dataPembayaran'; groupId: string }
  | null

export default function Dashboard() {
  const [sesi, setSesi] = useState<SesiRecord | null>(null)
  const [sheet, setSheet] = useState<SheetAktif>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    getOrCreateActiveSession().then(setSesi)
  }, [])

  useEffect(() => {
    // Tick tiap detik untuk tampilan countdown di kartu. Deteksi alarm "waktu habis"
    // sekarang ditangani GlobalAlarmWatcher (App.tsx) supaya tetap jalan di halaman
    // manapun, bukan cuma saat Dashboard ini sedang dibuka.
    const interval = setInterval(() => setNow(Date.now()), 1000)
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

  const unitMaster = useLiveQuery(() => listUnitMaster(), []) ?? []

  const unitSedangDisewa = useLiveQuery(async () => {
    if (!sesi?.id) return []
    return getKodeUnitSedangDisewa(sesi.id)
  }, [sesi?.id, transaksiAktif]) ?? []

  const riwayatNama = useLiveQuery(() => getRiwayatNamaPelanggan(), [transaksiAktif]) ?? []

  // Jumlah anggota grup yang sudah selesai (tidak masuk daftar aktif) — dihitung
  // supaya kartu gabungan tetap menampilkan total unit yang benar walau sebagian
  // anggotanya sudah tidak berjalan lagi.
  const jumlahSelesaiPerGroup = useLiveQuery(async () => {
    const semuaBerGrup = await db.transaksi.filter((t) => !!t.groupId && !!t.selesai && !t.dibatalkan).toArray()
    const peta = new Map<string, number>()
    for (const t of semuaBerGrup) {
      if (!t.groupId) continue
      peta.set(t.groupId, (peta.get(t.groupId) ?? 0) + 1)
    }
    return peta
  }, []) ?? new Map<string, number>()

  const unitTersedia = useMemo(
    () => unitMaster.filter((u) => !unitSedangDisewa.includes(u.kodeUnit)),
    [unitMaster, unitSedangDisewa]
  )

  const daftarTerurut = useMemo(() => {
    if (!transaksiAktif) return []
    return [...transaksiAktif].sort((a, b) => sisaWaktuMs(a, now) - sisaWaktuMs(b, now))
  }, [transaksiAktif, now])

  // Kelompokkan transaksi aktif berdasarkan groupId untuk kartu gabungan
  // (Gabung Pembayaran) — urutan tampil tetap mengikuti daftarTerurut (paling
  // mendesak dulu), grup ditempatkan di posisi anggota pertamanya yang muncul.
  const itemTampil = useMemo(() => {
    const hasil: ({ tipe: 'tunggal'; t: TransaksiRecord } | { tipe: 'grup'; groupId: string; anggota: TransaksiRecord[] })[] = []
    const sudahDitampilkan = new Set<string>()
    for (const t of daftarTerurut) {
      if (t.groupId) {
        if (sudahDitampilkan.has(t.groupId)) continue
        sudahDitampilkan.add(t.groupId)
        const anggota = daftarTerurut.filter((x) => x.groupId === t.groupId)
        hasil.push({ tipe: 'grup', groupId: t.groupId, anggota })
      } else {
        hasil.push({ tipe: 'tunggal', t })
      }
    }
    return hasil
  }, [daftarTerurut])

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
          {itemTampil.map((item) =>
            item.tipe === 'tunggal' ? (
              <UnitCard
                key={item.t.id}
                transaksi={item.t}
                now={now}
                onTapKartu={() => setSheet({ jenis: 'menu', t: item.t })}
                onLanjutkan={() => handleJedaLanjut(item.t)}
                onWaktuHabis={() => handleWaktuHabis(item.t)}
              />
            ) : (
              <GroupUnitCard
                key={item.groupId}
                anggotaAktif={item.anggota}
                jumlahAnggotaLain={jumlahSelesaiPerGroup.get(item.groupId) ?? 0}
                now={now}
                onTapAnggota={(t) => setSheet({ jenis: 'menu', t })}
                onLanjutkanAnggota={(t) => handleJedaLanjut(t)}
                onWaktuHabisAnggota={(t) => handleWaktuHabis(t)}
                onLihatDataPembayaran={() => setSheet({ jenis: 'dataPembayaran', groupId: item.groupId })}
              />
            )
          )}
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

      {sheet?.jenis === 'perpanjang' && (
        <PerpanjangSheet transaksi={sheet.t} onClose={() => setSheet(null)} />
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

      {sheet?.jenis === 'gabungBayar' && <GabungPembayaranSheet transaksi={sheet.t} onClose={() => setSheet(null)} />}

      {sheet?.jenis === 'dataPembayaran' && (
        <DataPembayaranGrupSheet groupId={sheet.groupId} onClose={() => setSheet(null)} />
      )}
    </AppShell>
  )
}
