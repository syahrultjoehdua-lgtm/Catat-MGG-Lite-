# Checklist testing akhir — Catat MGG (Lite)

Semua fitur di spesifikasi sudah diimplementasikan lewat 8 sesi pengembangan.
Karena sandbox pengembangan ini tidak punya akses internet untuk `npm install`
atau menjalankan browser sungguhan, checklist ini perlu dijalankan manual di
HP/browser kamu sebelum dianggap benar-benar selesai.

## Setup awal
- [ ] `npm install` berhasil tanpa error
- [ ] `npm run dev` bisa dibuka di browser HP (atau `npm run build` + `npm run preview`)
- [ ] "Tambahkan ke Layar Utama" berhasil dari browser (Chrome/Safari) — ikon & nama app benar
- [ ] Splash screen muncul sebentar, logo tampil, lanjut ke Dashboard otomatis

## Alur inti
- [ ] Master Unit: tambah beberapa kode unit
- [ ] Tambah Sewa: pilih 1 unit → transaksi muncul di Dashboard dengan timer jalan
- [ ] Tambah Sewa multi-unit: pilih 2+ unit → jadi 1 kartu, 1 timer
- [ ] Ring countdown berubah warna hijau → merah mendekati waktu habis
- [ ] Tap badge "Waktu habis" saat waktu habis → muncul alur bayar QR atau konfirmasi tutup
- [ ] Rincian Sewa (tap kartu): Perpanjangan, Edit, Tukar unit, Jeda/Lanjutkan, Bayar sekarang, Paksa selesai, Batalkan — semua jalan
- [ ] Saat dijeda: kartu tampil ikon "Lanjutkan", timer tidak berkurang
- [ ] Alarm layar penuh: kunci layar HP saat ada timer berjalan, tunggu sampai habis, buka lagi HP-nya — alarm bunyi+getar harus muncul
- [ ] Alarm foreground: biarkan app tetap di layar sampai waktu habis — cukup kartu merah + badge berkedip, TANPA bunyi/getar

## History & Master Data
- [ ] Tab "Sesi aktif" hanya menampilkan transaksi yang sudah selesai (bukan yang masih jalan)
- [ ] Tab "Sesi selesai" muncul setelah minimal 1 sesi diakhiri, dikelompokkan per tanggal
- [ ] Master Jenis Pengeluaran & QR Pembayaran: tambah/ganti/hapus berhasil

## Akhiri Sesi
- [ ] Tombol Lanjutkan terkunci kalau masih ada unit aktif
- [ ] Saldo Awal, Pendapatan, Pengeluaran, Saldo Akhir terhitung benar
- [ ] Setelah "Ya, Selesaikan Sesi" → layar sukses muncul, Dashboard kembali kosong setelahnya
- [ ] Tombol "Bagikan laporan" — gambar ringkasan muncul & bisa dibagikan/diunduh

## Backend
- [ ] Data di sheet "Riwayat Sesi" & "Riwayat Sewa" sesuai setelah Akhiri Sesi (sudah dikonfirmasi jalan)
- [ ] Matikan internet HP saat Akhiri Sesi → badge "belum terkirim" muncul di Settings → nyalakan internet lagi → data terkirim otomatis / lewat tombol "Kirim ulang data sesi"

## Pengaturan
- [ ] Slider volume alarm berbunyi contoh sesuai level saat digeser
- [ ] Toggle getar & tema gelap tersimpan dan tetap kepakai setelah app ditutup-buka lagi

## Hal yang perlu kamu putuskan sendiri (di luar kendali saya dari sandbox)
- Font Poppins perlu internet saat pertama kali dibuka (dari Google Fonts) — kalau mau 100% offline dari awal, perlu font di-bundle lokal
- Fitur "Gabung pembayaran" masih placeholder, menunggu penjelasan alur kerja dari kamu
