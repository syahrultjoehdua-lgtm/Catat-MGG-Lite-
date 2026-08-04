/** Format angka jadi string dengan titik pemisah ribuan ala Indonesia, mis. 15000 -> "15.000". */
export function formatRibuan(n: number): string {
  if (!Number.isFinite(n)) return ''
  return Math.round(n).toLocaleString('id-ID')
}

/** Kebalikan formatRibuan — ambil digit saja dari input yang mungkin berisi "Rp", titik, dll. */
export function parseRibuan(s: string): number {
  const digitSaja = s.replace(/\D/g, '')
  return digitSaja ? Number(digitSaja) : 0
}
