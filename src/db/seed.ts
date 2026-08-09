import { getAppSettings, setAppSettings, addUnitMaster, addJenisPengeluaran, setQrSetting } from './db'
import qrisDefaultUrl from '../assets/qr/qris-default.jpg'

const UNIT_AWAL = ['E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'T03', 'T04', 'T05', 'T06', 'L01', 'L02', 'F01']
const JENIS_PENGELUARAN_AWAL = ['Pajak & Distribusi', 'Listrik', 'Konsumsi']

/**
 * Isi data awal (Master Unit, Master Jenis Pengeluaran, QR pembayaran default)
 * SEKALI saja saat aplikasi pertama kali dibuka/dipasang di device — supaya user
 * tidak perlu mengetik ulang semuanya dari nol. Semua tetap bisa dihapus/diubah
 * manual sesudahnya lewat menu Settings masing-masing.
 *
 * Ditandai lewat `seedAwalSelesai` di appSettings, BUKAN dicek dari kosongnya
 * tabel — supaya kalau user sengaja menghapus semua unit/jenis pengeluaran nanti,
 * data itu tidak diam-diam muncul lagi tiap kali app dibuka ulang.
 */
export async function jalankanSeedAwalJikaPerlu(): Promise<void> {
  const pengaturan = await getAppSettings()
  if (pengaturan.seedAwalSelesai) return

  for (const kode of UNIT_AWAL) {
    await addUnitMaster(kode)
  }
  for (const nama of JENIS_PENGELUARAN_AWAL) {
    await addJenisPengeluaran(nama)
  }
  try {
    const res = await fetch(qrisDefaultUrl)
    const blob = await res.blob()
    await setQrSetting(blob)
  } catch {
    // Gagal muat gambar QR bawaan (jarang terjadi, cuma soal fetch aset lokal) —
    // bukan fatal, user tetap bisa unggah manual lewat Master QR kapan saja.
  }

  // Ditandai selesai TERAKHIR & terpisah dari loop di atas, supaya kalau ada 1
  // langkah gagal di tengah jalan, seed masih akan dicoba ulang di percobaan buka
  // app berikutnya alih-alih dianggap "sudah selesai" padahal belum lengkap.
  await setAppSettings({ seedAwalSelesai: true })
}
