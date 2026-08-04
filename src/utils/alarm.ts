// Alarm layar penuh: bunyi (Web Audio API, tanpa file eksternal), getar, dan wake lock
// supaya layar tetap menyala — dipakai saat transaksi habis waktu.
//
// CATATAN PENTING soal bunyi: browser memblokir AudioContext yang dibuat/dibunyikan
// TANPA sentuhan pengguna langsung sebelumnya (autoplay policy). Alarm ini sering
// dipicu otomatis dari timer (setInterval) / pergantian tab — bukan dari tap langsung —
// jadi kalau AudioContext belum pernah "di-unlock" oleh sentuhan pengguna, browser akan
// diam-diam menolak memutar suara tanpa error yang terlihat. primeAudio() dipanggil dari
// sentuhan pertama di App.tsx untuk unlock AudioContext ini di awal, supaya alarm yang
// dipicu belakangan (otomatis) tetap bisa bunyi.

let audioCtx: AudioContext | null = null
let beepInterval: ReturnType<typeof setInterval> | null = null
let wakeLockSentinel: WakeLockSentinel | null = null

function pastikanAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

/** Panggil sekali dari sentuhan/tap pertama user di app (lihat App.tsx) supaya
 * AudioContext ter-unlock lebih awal, sebelum alarm dipicu otomatis nanti. */
export function primeAudio(): void {
  pastikanAudioCtx()
}

function beepSekali(volume: number) {
  const ctx = pastikanAudioCtx()
  if (!ctx) return
  try {
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
