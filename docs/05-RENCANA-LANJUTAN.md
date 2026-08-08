# Rencana Lanjutan & Pekerjaan Tertunda

Ini daftar hal-hal yang **sengaja belum dikerjakan** — baik karena menunggu
keputusan/penjelasan dari pemilik project, atau karena user secara eksplisit
minta ditunda dulu. **Jangan kerjakan salah satu dari ini tanpa diminta
langsung** — beberapa di antaranya butuh klarifikasi dulu supaya tidak salah
arah.

## 1. Migrasi ke Android native (Capacitor) — DITUNDA

**Status**: baru tahap persiapan konfigurasi (`capacitor.config.ts`,
dependency di `package.json`, panduan di `CAPACITOR_SETUP.md`). Langkah
`npx cap add android` (generate project native) **belum berhasil
dijalankan** oleh pemilik project — sempat dicoba tapi setup-nya (Android
Studio, JDK, ADB, dsb.) dirasa terlalu rumit untuk dikerjakan sendiri saat
itu.

**Kenapa migrasi ini tadinya diusulkan**: satu-satunya cara realistis supaya
alarm bisa muncul saat layar HP mati/terkunci adalah lewat kemampuan native
Android (plugin **Capacitor Local Notifications**, yang di baliknya pakai
`AlarmManager` asli) — PWA murni tidak bisa melakukan ini (lihat
`02-LOGIKA-BISNIS.md` §7.3 untuk penjelasan teknis lengkapnya).

**Kalau mau dilanjutkan lagi nanti**, ini urutan yang masuk akal:
1. Pastikan dulu prasyarat software terpasang (Android Studio + JDK 17) —
   ini murni instalasi software, tidak butuh coding
2. Jalankan `npx cap add android` sampai berhasil generate folder `android/`
3. Baru lanjut ke live-reload testing & build APK (lihat `CAPACITOR_SETUP.md`)
4. **Setelah APK dasar terpasang & terbukti jalan baik** — baru bahas
   penambahan plugin Local Notifications untuk alarm

**Alternatif kalau migrasi ini dirasa terlalu berat**: tetap sebagai PWA,
dengan mitigasi "Screen Wake Lock terus-menerus selama ada transaksi aktif"
(lihat poin 2 di bawah) — bukan solusi sekuat native, tapi jauh lebih
sederhana untuk dikerjakan.

## 2. Wake Lock terus-menerus selama ada transaksi aktif — belum dikerjakan

**Status**: baru ide/usulan, belum ada kode sama sekali.

**Konteks**: saat ini, `navigator.wakeLock` cuma diminta **setelah** alarm
sudah terlanjur bunyi (di `AlarmOverlay.tsx`) — terlambat kalau layar sudah
keburu mati/terkunci sebelum itu. Idenya: minta wake lock begitu ada minimal
1 transaksi aktif berjalan (bukan dijeda), lepas begitu tidak ada transaksi
aktif sama sekali — supaya layar tidak sempat mati sama sekali selagi dipakai
kerja aktif.

**Catatan implementasi kalau nanti dikerjakan**: Wake Lock API otomatis
dilepas browser kalau tab di-background/user pindah app lain — jadi tetap
tidak 100% menjamin (mitigasi, bukan solusi penuh).

## 3. Font Poppins belum di-bundle lokal

**Status**: masih dimuat dari Google Fonts CDN (`index.html`), di-cache lewat
Workbox runtime caching setelah load pertama.

**Konsekuensi**: butuh koneksi internet saat app **pertama kali** dibuka di
device baru. Setelah itu (asal browser tidak membersihkan cache), font tetap
tampil benar walau offline.

**Kalau mau 100% offline dari awal**: perlu unduh file font Poppins (format
`.woff2`, lisensi Open Font License — gratis dipakai), taruh di
`src/assets/fonts/`, lalu ganti `<link>` Google Fonts di `index.html` dengan
`@font-face` lokal di `src/styles/tokens.css`.

## 4. Testing checklist manual — belum sepenuhnya dijalankan

Lihat `TESTING_CHECKLIST.md` di root project. Perlu ditambah poin-poin baru
untuk fitur yang baru selesai dikerjakan (lihat `06-RIWAYAT-BUG.md` &
`04-STATUS-FITUR.md`): fix bottom sheet iOS (portal ke body), Perpanjangan
+jumlah bayar, Tukar Unit per-slot, Bayar Nanti, Rincian Sewa versi History,
sub-total header Riwayat, format ribuan Saldo Awal, sub-total tunai/non-tunai
Akhiri Sesi, dan fitur Gabung Pembayaran secara menyeluruh (termasuk kondisi
1 unit dalam grup sudah selesai sedangkan lainnya masih berjalan).

## 5. Export Riwayat Sewa — 1 baris per transaksi, bukan per unit

Lihat catatan di `03-SKEMA-DATA.md` bagian sheet "Riwayat Sewa". Saat ini
kalau 1 transaksi punya kode unit `["A3", "A4"]`, itu ditulis sebagai 1 baris
dengan kolom Kode Unit berisi `"A3, A4"` (digabung koma) — BUKAN 2 baris
terpisah. Belum dikonfirmasi apakah ini sudah sesuai keinginan pemilik
project atau perlu diubah jadi 1 baris per unit (perlu klarifikasi kalau
pemilik project menemukan ini kurang sesuai saat baca data di Sheets-nya).

Kolom groupId (fitur Gabung Pembayaran, lihat `03-SKEMA-DATA.md`) BELUM
diekspor ke Google Sheets sama sekali — masih murni data lokal. Kalau nanti
pemilik project ingin tahu unit mana saja yang dulu digabung pembayarannya
dari data arsip Sheets, perlu tambah kolom baru di sheet "Riwayat Sewa" dan
di payload `sync.ts`.
