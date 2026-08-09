// Alarm layar penuh: bunyi (Web Audio API, tanpa file eksternal), getar, dan wake lock
// supaya layar tetap menyala — dipakai saat transaksi habis waktu.
//
// CATATAN PENTING soal bunyi & bug "tidak bunyi sama sekali di iOS PWA":
// Browser memblokir AudioContext yang dibuat/dibunyikan TANPA sentuhan pengguna
// langsung sebelumnya (autoplay policy) — primeAudio() di App.tsx menangani unlock
// awal ini. TAPI di iOS Safari ada masalah kedua yang lebih sering jadi penyebab
// "diam total": AudioContext otomatis DITANGGUHKAN (state jadi 'suspended') lagi
// oleh sistem setelah beberapa saat TIDAK memutar suara sama sekali — dan alarm
// di app ini dipicu dari timer (GlobalAlarmWatcher), BUKAN dari sentuhan langsung,
// jadi resume() yang dipanggil saat itu sering gagal diam-diam di WebKit karena
// bukan berada di dalam "gesture langsung" pengguna.
//
// Mitigasi (2 lapis):
// 1. mulaiKeepAliveAudio() — bunyi nyaris-hening (di luar jangkauan dengar) tiap
//    beberapa detik selagi ada transaksi aktif, supaya AudioContext TIDAK PERNAH
//    sempat idle & ditangguhkan sejak awal — jadi saat alarm sungguhan perlu
//    bunyi, context sudah dalam keadaan 'running'. Ini pola standar yang dipakai
//    banyak app timer/alarm PWA di iOS.
// 2. App.tsx sekarang re-unlock (panggil primeAudio) di SETIAP sentuhan layar,
//    bukan cuma sentuhan pertama saja seperti sebelumnya.
//
// Soal GETAR: iOS Safari (termasuk PWA "Add to Home Screen") TIDAK mengimplementasi
// Vibration API sama sekali — ini keterbatasan platform dari Apple, bukan bug di
// kode ini. `'vibrate' in navigator` akan selalu false di iOS, jadi kode di bawah
// otomatis tidak melakukan apa-apa di sana (tidak error), tapi juga tidak akan
// pernah bisa benar-benar menggetarkan HP lewat web di iOS.

let audioCtx: AudioContext | null = null
let beepInterval: ReturnType<typeof setInterval> | null = null
let keepAliveInterval: ReturnType<typeof setInterval> | null = null
let wakeLockSentinel: WakeLockSentinel | null = null

function pastikanAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
  } catch {
    return null
  }
}

/** Panggil dari sentuhan/tap user di app (lihat App.tsx, dipanggil di TIAP
 * sentuhan bukan cuma yang pertama) supaya AudioContext ter-unlock/resume lebih
 * awal, sebelum alarm dipicu otomatis nanti oleh timer. */
export function primeAudio(): void {
  const ctx = pastikanAudioCtx()
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
}

async function beepSekali(volume: number) {
  const ctx = pastikanAudioCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') await ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 880
    const puncak = Math.max(0.001, volume * 0.25)
    gain.gain.setValueAtTime(puncak, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    // abaikan — getar & popup tetap jalan meski suara gagal
  }
}

/** Bunyi nyaris-hening (20Hz, di bawah jangkauan dengar manusia, gain nyaris 0)
 * tiap beberapa detik — satu-satunya tujuannya menjaga AudioContext tetap
 * 'running' di iOS supaya tidak ditangguhkan sistem karena idle. TIDAK terdengar,
 * cuma "olahraga ringan" untuk context-nya. */
function keepAliveBlip() {
  const ctx = pastikanAudioCtx()
  if (!ctx || ctx.state === 'suspended') return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0.00001
    osc.frequency.value = 20
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.05)
  } catch {
    // abaikan
  }
}

/** Mulai jaga AudioContext tetap aktif — panggil selagi ada minimal 1 transaksi
 * aktif berjalan (lihat GlobalAlarmWatcher). Aman dipanggil berkali-kali. */
export function mulaiKeepAliveAudio(): void {
  if (keepAliveInterval) return
  keepAliveBlip()
  keepAliveInterval = setInterval(keepAliveBlip, 4000)
}

/** Hentikan keep-alive — panggil saat tidak ada transaksi aktif lagi, supaya
 * tidak boros baterai/CPU tanpa alasan. */
export function hentikanKeepAliveAudio(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
  }
}

export interface OpsiAlarm {
  volume: number // 0-1, dari pengaturan
  getarAktif: boolean
}

export function mulaiAlarm(opsi: OpsiAlarm): void {
  if (beepInterval) return
  if (opsi.volume > 0) {
    beepSekali(opsi.volume)
    beepInterval = setInterval(() => beepSekali(opsi.volume), 900)
  }
  if (opsi.getarAktif && 'vibrate' in navigator) {
    navigator.vibrate?.([400, 200, 400, 200, 400])
  }
  if ('wakeLock' in navigator) {
    navigator.wakeLock?.request('screen').then((s) => (wakeLockSentinel = s)).catch(() => {})
  }
}

export function hentikanAlarm(): void {
  if (beepInterval) {
    clearInterval(beepInterval)
    beepInterval = null
  }
  if ('vibrate' in navigator) navigator.vibrate?.(0)
  wakeLockSentinel?.release().catch(() => {})
  wakeLockSentinel = null
}
