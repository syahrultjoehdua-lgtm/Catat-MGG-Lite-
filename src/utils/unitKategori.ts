/**
 * Pengelompokan kode unit jadi kategori alat berat, berdasarkan huruf pertama
 * kodenya — dipakai di semua field pemilihan kode unit (Tambah Sewa, Edit
 * Transaksi, Tukar Unit) supaya daftar unit yang panjang lebih mudah dipindai.
 *
 * Kode contoh: E02-E07 (Excavator), T03-T06 (Dump Truck), L01-L02 (Loader),
 * F01 (Forklift) — lihat seed.ts. Sengaja dikelompokkan dari HURUF PERTAMA kode
 * (bukan daftar kode tetap yang di-hardcode), supaya unit baru yang ditambah
 * user nanti (mis. E08) otomatis masuk kategori yang benar tanpa perlu update
 * kode ini. Kode dengan huruf awal yang tidak dikenali masuk kategori "Lainnya".
 */
const KATEGORI_LABEL: Record<string, string> = {
  E: 'Excavator',
  T: 'Dump Truck',
  L: 'Loader',
  F: 'Forklift'
}

const LAINNYA = 'Lainnya'
const URUTAN_KATEGORI = ['Excavator', 'Dump Truck', 'Loader', 'Forklift', LAINNYA]

export function kategoriDariKode(kode: string): string {
  const huruf = kode.trim().charAt(0).toUpperCase()
  return KATEGORI_LABEL[huruf] ?? LAINNYA
}

export interface KelompokKodeUnit {
  kategori: string
  kodeList: string[]
}

/** Kelompokkan daftar kode unit jadi per-kategori, dalam urutan tampil tetap
 * (Excavator, Dump Truck, Loader, Forklift, lalu Lainnya kalau ada). Urutan
 * kode DI DALAM tiap kategori mengikuti urutan input apa adanya. */
export function kelompokkanKodeUnit(kodeList: string[]): KelompokKodeUnit[] {
  const peta = new Map<string, string[]>()
  for (const kode of kodeList) {
    const kategori = kategoriDariKode(kode)
    if (!peta.has(kategori)) peta.set(kategori, [])
    peta.get(kategori)!.push(kode)
  }
  return URUTAN_KATEGORI.filter((k) => peta.has(k)).map((kategori) => ({ kategori, kodeList: peta.get(kategori)! }))
}
