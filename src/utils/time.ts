import type { TransaksiRecord } from '../db/db'

/** Sisa waktu dalam milidetik. Negatif berarti sudah lewat waktu habis.
 * Kalau transaksi sedang dijeda, hitungan dibekukan di titik waktu jeda dimulai. */
export function sisaWaktuMs(t: TransaksiRecord, now: number): number {
  const mulai = new Date(t.waktuMulai).getTime()
  const jedaMs = (t.totalMenitJeda ?? 0) * 60_000
  const selesaiTarget = mulai + t.durasiMenit * 60_000 + jedaMs
  const acuanWaktu = t.dijeda && t.waktuJedaMulai ? new Date(t.waktuJedaMulai).getTime() : now
  return selesaiTarget - acuanWaktu
}

/** Format mm:ss (atau -mm:ss kalau sudah lewat). */
export function formatCountdown(ms: number): string {
  const negatif = ms < 0
  const totalDetik = Math.floor(Math.abs(ms) / 1000)
  const menit = Math.floor(totalDetik / 60)
  const detik = totalDetik % 60
  const teks = `${menit}:${detik.toString().padStart(2, '0')}`
  return negatif ? `-${teks}` : teks
}

/** Proporsi waktu terpakai, 0-1, dibatasi maksimal 1. Dipakai untuk ring countdown. */
export function proporsiTerpakai(t: TransaksiRecord, now: number): number {
  const totalMs = t.durasiMenit * 60_000
  const sisaMs = Math.max(0, sisaWaktuMs(t, now))
  return Math.min(1, 1 - sisaMs / totalMs)
}

/** Skala referensi ring countdown: 30 menit = lingkaran penuh, terlepas dari durasi
 * transaksi yang di-set. Kalau durasi lebih dari 30 menit, ring tetap penuh (dibatasi). */
const SKALA_RING_MS = 30 * 60_000

export function proporsiSisaRing(t: TransaksiRecord, now: number): number {
  const sisaMs = Math.max(0, sisaWaktuMs(t, now))
  return Math.min(1, sisaMs / SKALA_RING_MS)
}

/** Interpolasi warna hijau -> merah berdasarkan proporsi sisa waktu (1 = hijau penuh, 0 = merah). */
export function warnaRing(proporsiSisa: number): string {
  const hijau = { r: 28, g: 138, b: 75 } // --color-success
  const merah = { r: 200, g: 52, b: 31 } // --color-danger
  const t = Math.max(0, Math.min(1, proporsiSisa))
  const r = Math.round(merah.r + (hijau.r - merah.r) * t)
  const g = Math.round(merah.g + (hijau.g - merah.g) * t)
  const b = Math.round(merah.b + (hijau.b - merah.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}
