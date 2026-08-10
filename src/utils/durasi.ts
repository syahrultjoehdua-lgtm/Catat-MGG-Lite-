/**
 * Loncatan tombol +/- pada field durasi (menit): kelipatan 5 sebagai langkah
 * normal (5, 10, 15, ...), TAPI begitu nilainya masuk rentang di bawah 5 menit,
 * langkahnya diperkecil jadi 1 — supaya bisa diatur presisi (1, 2, 3, 4) alih-alih
 * lompat besar dari/ke 0 atau 10.
 */
export function langkahMenit(nilai: number, arah: 1 | -1, minMenit = 0): number {
  if (arah > 0) return nilai < 5 ? nilai + 1 : nilai + 5
  return nilai <= 5 ? Math.max(minMenit, nilai - 1) : Math.max(minMenit, nilai - 5)
}

/** Gabung menit + detik jadi 1 angka desimal menit (mis. 25 menit 30 detik -> 25.5). */
export function gabungMenitDetik(menit: number, detik: number): number {
  return menit + detik / 60
}

/** Kebalikan gabungMenitDetik — pecah angka desimal menit jadi {menit, detik} bulat. */
export function pecahMenitDetik(totalMenitDesimal: number): { menit: number; detik: number } {
  const totalDetik = Math.round(totalMenitDesimal * 60)
  return { menit: Math.floor(totalDetik / 60), detik: totalDetik % 60 }
}

/** Bulatkan angka desimal menit ke detik terdekat — menghindari sisa desimal
 * mengambang dari operasi penjumlahan/pengurangan berulang. */
export function bulatkanKeDetik(totalMenitDesimal: number): number {
  return Math.round(totalMenitDesimal * 60) / 60
}

/** Format tampilan durasi jadi teks, mis. "25 menit" atau "25 menit 30 detik"
 * (detik cuma ditampilkan kalau tidak nol, supaya tampilan tetap ringkas untuk
 * durasi bulat seperti biasanya). */
export function formatDurasi(totalMenitDesimal: number): string {
  const { menit, detik } = pecahMenitDetik(totalMenitDesimal)
  return detik === 0 ? `${menit} menit` : `${menit} menit ${detik} detik`
}
