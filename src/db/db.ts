// Skema & helper database lokal (IndexedDB via Dexie).
// Backend Apps Script hanya jadi "gudang arsip" pasif (lihat spesifikasi bagian 7) —
// semua query & logika di sini berjalan 100% lokal.

import Dexie, { type Table } from 'dexie'

export interface SesiRecord {
  id?: number
  startedAt: string
  closedAt?: string | null
  saldoAwal?: number
  saldoAkhir?: number
  synced?: boolean
}

export interface RiwayatEditEntry {
  waktu: string
  ringkasan: string
}

export interface TransaksiRecord {
  id?: number
  sesiId: number
  kodeUnit: string[]
  namaPelanggan?: string
  fotoPelangganBlob?: Blob
  waktuMulai: string // ISO
  waktuSelesai?: string // ISO, diisi saat transaksi ditutup — dipakai untuk export "Riwayat Sewa"
  durasiMenit: number
  jumlahBayar: number
  statusBayar: 'sudah' | 'belum'
  nonTunai?: boolean
  dijeda?: boolean
  waktuJedaMulai?: string | null
  totalMenitJeda?: number
  selesai?: boolean
  dibatalkan?: boolean
  riwayatEdit?: RiwayatEditEntry[]
}

export interface PengeluaranRecord {
  id?: number
  sesiId: number
  jenis: string
  nominal: number
}

export interface UnitMaster {
  id?: number
  kodeUnit: string
}

export interface JenisPengeluaranMaster {
  id?: number
  nama: string
}

export interface QrSetting {
  id?: number
  gambarBlob: Blob
}

export interface AppSettingsRecord {
  id?: number
  volumeAlarm: number // 0-1
  getarAktif: boolean
  temaGelap: boolean
}

class CatatMggDB extends Dexie {
  sesi!: Table<SesiRecord, number>
  transaksi!: Table<TransaksiRecord, number>
  pengeluaran!: Table<PengeluaranRecord, number>
  unitMaster!: Table<UnitMaster, number>
  jenisPengeluaranMaster!: Table<JenisPengeluaranMaster, number>
  qrSetting!: Table<QrSetting, number>
  appSettings!: Table<AppSettingsRecord, number>

  constructor() {
    super('catat-mgg-lite')
    this.version(1).stores({
      sesi: '++id, closedAt',
      transaksi: '++id, sesiId, selesai, dibatalkan',
      pengeluaran: '++id, sesiId',
      unitMaster: '++id, kodeUnit',
      jenisPengeluaranMaster: '++id, nama',
      qrSetting: '++id'
    })
    this.version(2).stores({
      appSettings: '++id'
    })
  }
}

export const db = new CatatMggDB()

// ---------- Sesi ----------

/** Lanjutkan sesi yang belum diakhiri (closedAt kosong), atau buat sesi baru otomatis. */
export async function getOrCreateActiveSession(): Promise<SesiRecord> {
  const semuaSesi = await db.sesi.toArray()
  const aktif = semuaSesi.find((s) => !s.closedAt)
  if (aktif) return aktif

  const id = await db.sesi.add({ startedAt: new Date().toISOString(), closedAt: null })
  return (await db.sesi.get(id))!
}

// ---------- Unit master & ketersediaan ----------

export async function listUnitMaster(): Promise<UnitMaster[]> {
  return db.unitMaster.orderBy('kodeUnit').toArray()
}

export async function addUnitMaster(kodeUnit: string): Promise<void> {
  const kode = kodeUnit.trim().toUpperCase()
  if (!kode) return
  const sudahAda = await db.unitMaster.where('kodeUnit').equals(kode).count()
  if (sudahAda > 0) return
  await db.unitMaster.add({ kodeUnit: kode })
}

export async function deleteUnitMaster(id: number): Promise<void> {
  await db.unitMaster.delete(id)
}

/** Kode unit yang sedang menempel ke transaksi aktif (belum selesai & belum dibatalkan). */
export async function getKodeUnitSedangDisewa(sesiId: number): Promise<string[]> {
  const transaksiAktif = await db.transaksi
    .where('sesiId')
    .equals(sesiId)
    .filter((t) => !t.selesai && !t.dibatalkan)
    .toArray()
  return transaksiAktif.flatMap((t) => t.kodeUnit)
}

// ---------- Transaksi ----------

export async function listTransaksiAktif(sesiId: number): Promise<TransaksiRecord[]> {
  return db.transaksi
    .where('sesiId')
    .equals(sesiId)
    .filter((t) => !t.selesai && !t.dibatalkan)
    .toArray()
}

export interface TambahSewaInput {
  sesiId: number
  kodeUnit: string[]
  namaPelanggan?: string
  fotoPelangganBlob?: Blob
  durasiMenit: number
  jumlahBayar: number
  statusBayar: 'sudah' | 'belum'
  nonTunai?: boolean
}

export async function tambahSewa(input: TambahSewaInput): Promise<number> {
  return db.transaksi.add({
    sesiId: input.sesiId,
    kodeUnit: input.kodeUnit,
    namaPelanggan: input.namaPelanggan?.trim() || undefined,
    fotoPelangganBlob: input.fotoPelangganBlob,
    waktuMulai: new Date().toISOString(),
    durasiMenit: input.durasiMenit,
    jumlahBayar: input.jumlahBayar,
    statusBayar: input.statusBayar,
    nonTunai: input.nonTunai ?? false,
    dijeda: false,
    totalMenitJeda: 0,
    selesai: false,
    dibatalkan: false
  })
}

/** Nama pelanggan yang pernah dipakai (semua sesi), untuk autocomplete. Terbaru dulu. */
export async function getRiwayatNamaPelanggan(): Promise<string[]> {
  const semua = await db.transaksi.orderBy('id').reverse().toArray()
  const unik: string[] = []
  for (const t of semua) {
    if (t.namaPelanggan && !unik.includes(t.namaPelanggan)) unik.push(t.namaPelanggan)
  }
  return unik
}

// ---------- Aksi kartu lanjutan (sesi 4) ----------

async function catatAudit(id: number, ringkasan: string): Promise<void> {
  const t = await db.transaksi.get(id)
  if (!t) return
  const riwayat = [...(t.riwayatEdit ?? []), { waktu: new Date().toISOString(), ringkasan }]
  await db.transaksi.update(id, { riwayatEdit: riwayat })
}

/** Perpanjangan — tambah durasi, TIDAK mengubah waktu mulai. */
export async function perpanjangDurasi(id: number, tambahMenit: number): Promise<void> {
  const t = await db.transaksi.get(id)
  if (!t) return
  await db.transaksi.update(id, { durasiMenit: t.durasiMenit + tambahMenit })
  await catatAudit(id, `Perpanjangan +${tambahMenit} menit`)
}

export interface EditTransaksiInput {
  namaPelanggan?: string
  fotoPelangganBlob?: Blob
  sisaMenitBaru?: number
  jumlahBayar?: number
  statusBayar?: 'sudah' | 'belum'
  nonTunai?: boolean
}

/** Edit — koreksi data transaksi (nama, foto, sisa waktu, jumlah bayar, status bayar). */
export async function editTransaksi(id: number, patch: EditTransaksiInput, now: number): Promise<void> {
  const t = await db.transaksi.get(id)
  if (!t) return
  const perubahan: string[] = []
  const update: Partial<TransaksiRecord> = {}

  if (patch.namaPelanggan !== undefined && patch.namaPelanggan !== (t.namaPelanggan ?? '')) {
    update.namaPelanggan = patch.namaPelanggan || undefined
    perubahan.push('nama pelanggan')
  }
  if (patch.fotoPelangganBlob) {
    update.fotoPelangganBlob = patch.fotoPelangganBlob
    perubahan.push('foto pelanggan')
  }
  if (patch.jumlahBayar !== undefined && patch.jumlahBayar !== t.jumlahBayar) {
    update.jumlahBayar = patch.jumlahBayar
    perubahan.push('jumlah bayar')
  }
  if (patch.statusBayar !== undefined && patch.statusBayar !== t.statusBayar) {
    update.statusBayar = patch.statusBayar
    update.nonTunai = patch.nonTunai ?? false
    perubahan.push('status bayar')
  }
  if (patch.sisaMenitBaru !== undefined) {
    const mulai = new Date(t.waktuMulai).getTime()
    const jedaMs = (t.totalMenitJeda ?? 0) * 60_000
    const elapsedMenit = Math.max(0, (now - mulai - jedaMs) / 60_000)
    const durasiBaru = Math.max(1, Math.round(elapsedMenit + patch.sisaMenitBaru))
    if (durasiBaru !== t.durasiMenit) {
      update.durasiMenit = durasiBaru
      perubahan.push('sisa waktu')
    }
  }

  if (Object.keys(update).length === 0) return
  await db.transaksi.update(id, update)
  await catatAudit(id, `Edit: ${perubahan.join(', ')}`)
}

/** Tukar Unit — ganti kode unit tanpa mereset timer yang sedang berjalan. */
export async function tukarUnit(id: number, kodeUnitBaru: string[]): Promise<void> {
  const t = await db.transaksi.get(id)
  if (!t) return
  await db.transaksi.update(id, { kodeUnit: kodeUnitBaru })
  await catatAudit(id, `Tukar unit: ${t.kodeUnit.join(', ')} \u2192 ${kodeUnitBaru.join(', ')}`)
}

/** Jeda — hentikan sementara hitung mundur. */
export async function jedaTransaksi(id: number): Promise<void> {
  await db.transaksi.update(id, { dijeda: true, waktuJedaMulai: new Date().toISOString() })
  await catatAudit(id, 'Dijeda')
}

/** Lanjut — lanjutkan hitung mundur, akumulasikan waktu jeda. */
export async function lanjutkanTransaksi(id: number, now: number): Promise<void> {
  const t = await db.transaksi.get(id)
  if (!t || !t.waktuJedaMulai) return
  const elapsedMenit = (now - new Date(t.waktuJedaMulai).getTime()) / 60_000
  await db.transaksi.update(id, {
    dijeda: false,
    waktuJedaMulai: null,
    totalMenitJeda: (t.totalMenitJeda ?? 0) + elapsedMenit
  })
  await catatAudit(id, 'Dilanjutkan')
}

/** Tandai "Sudah Dibayar" — checkbox cepat tanpa buka form Edit. */
export async function tandaiSudahDibayar(id: number, nonTunai = false): Promise<void> {
  await db.transaksi.update(id, { statusBayar: 'sudah', nonTunai })
  await catatAudit(id, 'Ditandai sudah dibayar')
}

/** Tutup transaksi (dipakai oleh Paksa Selesai maupun penutupan normal setelah alur bayar). */
export async function tutupTransaksi(id: number): Promise<void> {
  await db.transaksi.update(id, { selesai: true, waktuSelesai: new Date().toISOString() })
  await catatAudit(id, 'Transaksi ditutup')
}

/** Batalkan/Hapus — hapus transaksi secara permanen. */
export async function hapusTransaksi(id: number): Promise<void> {
  await db.transaksi.delete(id)
}

// ---------- Master jenis pengeluaran (sesi 5) ----------

export async function listJenisPengeluaran(): Promise<JenisPengeluaranMaster[]> {
  return db.jenisPengeluaranMaster.orderBy('nama').toArray()
}

export async function addJenisPengeluaran(nama: string): Promise<void> {
  const n = nama.trim()
  if (!n) return
  const ada = await db.jenisPengeluaranMaster.where('nama').equals(n).count()
  if (ada > 0) return
  await db.jenisPengeluaranMaster.add({ nama: n })
}

export async function deleteJenisPengeluaran(id: number): Promise<void> {
  await db.jenisPengeluaranMaster.delete(id)
}

// ---------- QR pembayaran (sesi 5) ----------

export async function getQrSetting(): Promise<QrSetting | undefined> {
  return db.qrSetting.toCollection().first()
}

/** Simpan lokal di device saja (sesuai spesifikasi 3.5) — selalu ganti yang lama. */
export async function setQrSetting(gambarBlob: Blob): Promise<void> {
  await db.qrSetting.clear()
  await db.qrSetting.add({ gambarBlob })
}

export async function hapusQrSetting(): Promise<void> {
  await db.qrSetting.clear()
}

// ---------- History (sesi 5) ----------

/** Semua sesi (aktif & sudah diakhiri), terbaru dulu. */
export async function listSemuaSesi(): Promise<SesiRecord[]> {
  return db.sesi.orderBy('id').reverse().toArray()
}

/** Semua transaksi 1 sesi — aktif maupun selesai — untuk ditampilkan di History. */
export async function listTransaksiSesi(sesiId: number): Promise<TransaksiRecord[]> {
  return db.transaksi.where('sesiId').equals(sesiId).toArray()
}

// ---------- Akhiri Sesi (sesi 6) ----------

/** Total pendapatan sesi = jumlah bayar semua transaksi yang tidak dibatalkan. */
export async function hitungPendapatanSesi(sesiId: number): Promise<number> {
  const semua = await db.transaksi.where('sesiId').equals(sesiId).filter((t) => !t.dibatalkan).toArray()
  return semua.reduce((total, t) => total + t.jumlahBayar, 0)
}

/** Saldo akhir sesi terakhir yang sudah ditutup — dipakai sebagai default Saldo Awal. */
export async function getSaldoAkhirSesiSebelumnya(): Promise<number | null> {
  const semua = await db.sesi.orderBy('id').reverse().toArray()
  const terakhirDitutup = semua.find((s) => s.closedAt)
  return terakhirDitutup?.saldoAkhir ?? null
}

export async function listPengeluaranSesi(sesiId: number): Promise<PengeluaranRecord[]> {
  return db.pengeluaran.where('sesiId').equals(sesiId).toArray()
}

export interface AkhiriSesiInput {
  saldoAwal: number
  pengeluaran: { jenis: string; nominal: number }[]
}

/** Simpan pengeluaran, hitung saldo akhir, dan tandai sesi selesai (closedAt terisi). */
export async function akhiriSesi(sesiId: number, input: AkhiriSesiInput): Promise<number> {
  const pendapatan = await hitungPendapatanSesi(sesiId)
  const totalPengeluaran = input.pengeluaran.reduce((s, p) => s + p.nominal, 0)
  const saldoAkhir = input.saldoAwal + pendapatan - totalPengeluaran

  await db.transaction('rw', db.sesi, db.pengeluaran, async () => {
    for (const p of input.pengeluaran) {
      if (p.nominal > 0) await db.pengeluaran.add({ sesiId, jenis: p.jenis, nominal: p.nominal })
    }
    await db.sesi.update(sesiId, {
      closedAt: new Date().toISOString(),
      saldoAwal: input.saldoAwal,
      saldoAkhir,
      synced: false
    })
  })

  return saldoAkhir
}

/** Sesi yang sudah diakhiri tapi datanya belum berhasil terkirim ke backend. */
export async function listSesiBelumTerkirim(): Promise<SesiRecord[]> {
  const semua = await db.sesi.toArray()
  return semua.filter((s) => s.closedAt && !s.synced)
}

export async function tandaiSesiTerkirim(sesiId: number): Promise<void> {
  await db.sesi.update(sesiId, { synced: true })
}

// ---------- Pengaturan aplikasi (sesi 8) ----------

const DEFAULT_SETTINGS: AppSettingsRecord = { volumeAlarm: 0.7, getarAktif: true, temaGelap: false }

export async function getAppSettings(): Promise<AppSettingsRecord> {
  const ada = await db.appSettings.toCollection().first()
  return ada ?? DEFAULT_SETTINGS
}

export async function setAppSettings(patch: Partial<AppSettingsRecord>): Promise<AppSettingsRecord> {
  const sekarang = await getAppSettings()
  const baru = { ...sekarang, ...patch }
  const ada = await db.appSettings.toCollection().first()
  if (ada?.id) await db.appSettings.update(ada.id, baru)
  else await db.appSettings.add(baru)
  return baru
}
