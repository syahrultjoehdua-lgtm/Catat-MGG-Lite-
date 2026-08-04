// Pengiriman data sesi ke backend Apps Script + mekanisme retry/queue sederhana
// (spesifikasi 3.6 & 7). Backend: lihat backend/Code.gs & backend/CARA_DEPLOY.md.
// URL Web App diisi di src/config.ts — selama masih kosong, sesi yang sudah
// diakhiri tetap tersimpan lokal dengan status "belum terkirim", tidak ada yang hilang.

import {
  listSesiBelumTerkirim,
  listTransaksiSesi,
  listPengeluaranSesi,
  tandaiSesiTerkirim,
  type SesiRecord
} from '../db/db'
import { APPS_SCRIPT_URL } from '../config'

export interface RiwayatSesiRow {
  idSesi: number
  tanggalSesi: string
  pendapatan: number
  pengeluaran: number
  jumlahUnitDisewa: number
  saldoAwal?: number
  saldoAkhir?: number
}

export interface RiwayatSewaRow {
  idSesi: number
  noUrut: number
  kodeUnit: string
  lamaSewaMenit: number
  waktuMulai: string
  waktuSelesai?: string
  jumlahBayar: number
}

/** Susun payload sesuai struktur 2 sheet backend: "Riwayat Sesi" & "Riwayat Sewa". */
export async function susunPayloadSesi(sesi: SesiRecord) {
  const transaksi = await listTransaksiSesi(sesi.id!)
  const pengeluaranItems = await listPengeluaranSesi(sesi.id!)
  const totalPengeluaran = pengeluaranItems.reduce((s, p) => s + p.nominal, 0)
  const transaksiValid = transaksi.filter((t) => !t.dibatalkan)

  const riwayatSesi: RiwayatSesiRow = {
    idSesi: sesi.id!,
    tanggalSesi: sesi.closedAt ?? sesi.startedAt,
    pendapatan: transaksiValid.reduce((s, t) => s + t.jumlahBayar, 0),
    pengeluaran: totalPengeluaran,
    jumlahUnitDisewa: transaksiValid.reduce((s, t) => s + t.kodeUnit.length, 0),
    saldoAwal: sesi.saldoAwal,
    saldoAkhir: sesi.saldoAkhir
  }

  const riwayatSewa: RiwayatSewaRow[] = transaksiValid.map((t, i) => ({
    idSesi: sesi.id!,
    noUrut: i + 1,
    kodeUnit: t.kodeUnit.join(', '),
    lamaSewaMenit: t.durasiMenit,
    waktuMulai: t.waktuMulai,
    waktuSelesai: t.waktuSelesai,
    jumlahBayar: t.jumlahBayar
  }))

  return { riwayatSesi, riwayatSewa }
}

/** Kirim 1 sesi ke backend. Kalau URL belum dikonfigurasi atau sedang offline,
 * tidak mencoba fetch (supaya tidak gagal percuma) — sesi tetap "belum terkirim". */
export async function kirimSesi(sesi: SesiRecord): Promise<boolean> {
  if (!sesi.id || !APPS_SCRIPT_URL || !navigator.onLine) return false

  try {
    const payload = await susunPayloadSesi(sesi)
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.ok) {
      await tandaiSesiTerkirim(sesi.id)
      return true
    }
    return false
  } catch {
    return false
  }
}

/** Coba kirim ulang semua sesi yang sudah diakhiri tapi belum terkirim.
 * Dipanggil saat app dibuka & saat koneksi internet kembali. */
export async function cobaKirimSemuaSesiBelumTerkirim(): Promise<void> {
  const daftar = await listSesiBelumTerkirim()
  for (const sesi of daftar) {
    await kirimSesi(sesi)
  }
}
