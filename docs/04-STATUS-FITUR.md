# Status Fitur

Checklist ini memetakan setiap bagian spesifikasi asli
(`spesifikasi-catat-mgg-lite.md`) ke status implementasi sekarang, plus daftar
perubahan/penambahan yang muncul di luar spesifikasi awal (hasil revisi
setelah testing).

Legenda: ✅ Selesai · ⚠️ Selesai dengan catatan · ⏸️ Placeholder/ditunda

## Sesuai spesifikasi asli

| Bagian spesifikasi | Status | Catatan |
|---|---|---|
| 3.1 Splash Screen | ✅ | Cek/lanjutkan sesi otomatis via `getOrCreateActiveSession()` |
| 3.2 Konsep Sesi | ✅ | |
| 3.3 Dashboard — daftar kartu unit | ✅ | Diurutkan sisa waktu tersingkat |
| 3.3 Form Sewa Baru | ✅ | Sekarang halaman PENUH (`/tambah-sewa`, bukan bottom sheet lagi). Kode unit dikelompokkan per kategori (Excavator/Dump Truck/Loader/Forklift). Jumlah Bayar nilai awal berlipat real-time sesuai jumlah unit dipilih (Rp15.000/unit) |
| 3.3 Transaksi Multi-Unit | ✅ | 1 transaksi/1 timer/1 pembayaran |
| 3.3 Aksi per transaksi (Perpanjangan, Edit, Tukar Unit, Jeda/Lanjut, Batalkan, Paksa Selesai, Tandai Sudah Dibayar) | ✅ | Semua ada, diakses lewat sheet "Rincian Sewa". Perpanjangan: nilai awal 25 menit & Rp15.000/unit (berlipat sesuai jumlah unit transaksi), durasi bisa diketik manual (minimal 1 menit), ada ringkasan "Total waktu"/"Total tagihan" real-time. Tukar Unit per-slot (Sebelum/Sesudah per unit), dropdown dikelompokkan per kategori. Edit sekarang halaman PENUH (`/edit-transaksi/:id`, bukan bottom sheet), dipakai dari Dashboard maupun History |
| 3.3 Alarm waktu habis (foreground vs background) | ✅ | Foreground: kartu merah + badge berkedip + bunyi + wake lock ✅ — termasuk perbaikan bug "diam total di iOS" (keep-alive audio + re-unlock tiap sentuhan, lihat `06-RIWAYAT-BUG.md` Bug #9). Getar: berfungsi di Android, **tidak bisa** di iOS (Vibration API tidak diimplementasi WebKit — keterbatasan platform, bukan bug). Background (layar mati/terkunci): **tidak bisa diandalkan** dari PWA murni — lihat `02-LOGIKA-BISNIS.md` §7.3 |
| 3.3 Alur bayar QR saat waktu habis | ✅ | Plus ditambah: bisa dipicu manual ("Bayar sekarang") tanpa harus nunggu waktu habis; plus opsi "Bayar nanti" (tutup transaksi tanpa bayar dulu, ditagih & ditandai lunas belakangan dari History) |
| 3.4 History | ✅ | Didesain ulang total dari spesifikasi asli (jadi 2 tab: Sesi aktif/Sesi selesai, hanya berisi transaksi yang SUDAH SELESAI). Tap kartu membuka Rincian Sewa versi History (`HistoryRincianSheet`), kartu ringkasan (unit selesai/masih berjalan, pendapatan masuk/belum dibayar, total pendapatan) tampil di atas daftar per tab, bug tab bar ikut ter-scroll sudah diperbaiki (`position: sticky`) |
| 3.5 Master Data (Unit, Jenis Pengeluaran, QR) | ✅ | Semua CRUD lengkap |
| 3.6 Akhiri Sesi (2 langkah) | ✅ | Plus ditambah langkah ke-3: layar sukses dengan tombol bagikan laporan. Input Saldo Awal pakai format titik ribuan, rincian pendapatan menampilkan sub-total Tunai vs Non-tunai |
| 3.6 Retry/queue offline | ✅ | Otomatis saat buka app & saat online, plus tombol manual |
| 3.7 Export/Bagikan laporan gambar | ✅ | Pakai Canvas API, Web Share API dengan fallback unduh |
| 4. Struktur data backend | ⚠️ | **Diubah dari spesifikasi**: jadi 2 sheet terpisah (bukan 1 sheet + kolom Tipe Baris) — permintaan pemilik project di tengah pengembangan |
| 5. Backend Apps Script (`doPost`, JSON, try/catch) | ✅ | |
| 6. Yang sengaja tidak ada (Owner/PIN, multi-lokasi, sync berkala, dst.) | ✅ | Semua tetap tidak ada sesuai spesifikasi |

## Penambahan di luar spesifikasi asli (hasil revisi/diskusi)

Ini bukan bagian dari dokumen spesifikasi awal, tapi diminta/disepakati
selama pengembangan:

- **Desain visual lengkap** — flat design fintech-style, warna dari aset
  logo resmi, font Poppins, ikon SVG custom bergaya iOS (kotak sudut sangat
  lengkung) untuk grid aksi di Rincian Sewa
- **Bottom Nav & FAB mengambang** (`position: fixed`) — bukan bagian dari
  spesifikasi awal, murni keputusan desain
- **Ring countdown skala tetap 30 menit + gradasi warna hijau→merah**
- **Checkbox "Bayar dengan non-tunai"** — selalu tampil di form, bukan cuma
  saat status "Sudah"
- **Field Kode Unit di form Edit** — redundan dengan Tukar Unit tapi sengaja
  ditambahkan untuk kemudahan koreksi cepat
- **Format titik ribuan** untuk input nominal manual
- **Pengaturan Volume/Getar Alarm & Tema Gelap** — tersimpan di IndexedDB,
  dipakai nyata (bukan cuma UI kosong)
- **Fitur "Gabung Pembayaran"** — selesai diimplementasikan. Menggabungkan
  tampilan beberapa transaksi (aktif maupun sudah selesai) dalam 1 sesi jadi
  1 kartu di Dashboard (`GroupUnitCard`), lewat field `groupId` di
  `TransaksiRecord` (lihat `03-SKEMA-DATA.md`). Grouping murni tampilan —
  tiap anggota tetap punya Rincian Sewa & tombol aksi sendiri-sendiri.
  Kartu gabungan punya tombol "Lihat Data Pembayaran" yang membuka rincian
  durasi & jumlah bayar per unit, bisa dibayar satu-satu atau sekaligus
- **Perbaikan bug kritis iOS: Bottom Sheet vs Bottom Nav** — semua bottom
  sheet sekarang dirender lewat React portal ke `document.body`
  (`src/utils/portal.tsx`), bukan lagi bersarang di `.app-content` — lihat
  `06-RIWAYAT-BUG.md` Bug #8
- **Saldo awal bisa diatur dari Settings** — otomatis terisi dari saldo TUNAI
  akhir sesi sebelumnya (non-tunai tidak ikut, lihat `02-LOGIKA-BISNIS.md`
  §15) saat sesi baru mulai, bisa dikoreksi manual kapan saja lewat Settings
  (bukan cuma saat Akhiri Sesi), dengan tombol Simpan eksplisit
- **Seed data awal aplikasi** — Master Unit (13 kode), Master Jenis
  Pengeluaran (3 jenis), dan QR pembayaran default (gambar QRIS resmi)
  otomatis terisi sekali saat app pertama kali dibuka, tetap bisa
  dihapus/diubah manual — lihat `02-LOGIKA-BISNIS.md` §10.2
- **Perbaikan bug "alarm diam total di iOS PWA"** — keep-alive audio +
  re-unlock AudioContext di tiap sentuhan, lihat `06-RIWAYAT-BUG.md` Bug #9.
  Getar tetap tidak bisa di iOS (keterbatasan platform WebKit, bukan bug)
- **Tambah Sewa & Edit Transaksi jadi halaman penuh** (bukan bottom sheet
  lagi), kode unit dikelompokkan per kategori alat berat, Jumlah Bayar
  berlipat otomatis sesuai jumlah unit — lihat `02-LOGIKA-BISNIS.md` §12-14

## Session log (untuk konteks historis)

Pengembangan dilakukan bertahap lewat sesi-sesi chat terpisah (kuota Claude
gratis terbatas 10 permintaan/5 jam):

1. Wireframe desain (fintech flat design)
2. Setup project (React+Vite+PWA+Dexie), routing, skeleton halaman
3. Dashboard + logika transaksi inti (tambah sewa, timer, multi-unit)
4. Aksi kartu lanjutan (Perpanjangan, Edit, Tukar Unit, Jeda/Lanjut) + alarm dasar
5. History + Master Data CRUD penuh
6. Akhiri Sesi lengkap + retry/queue offline
7. Backend Google Apps Script (2 sheet, sesuai permintaan revisi)
8. Export laporan gambar + pengaturan alarm/tema + polish PWA + testing checklist

Setelah sesi 8, ada **banyak ronde perbaikan bug** hasil testing nyata di HP
(layout scroll, alarm tidak bunyi, pop-up cuma di Dashboard, dll.) — detail
lengkapnya di `06-RIWAYAT-BUG.md`, BUKAN diulang di sini supaya dokumen ini
tetap fokus ke status fitur, bukan riwayat debugging.

Setelah itu sempat dimulai **migrasi ke Capacitor (Android native)** — status:
**ditunda**, lihat `05-RENCANA-LANJUTAN.md`.

Sesi lanjutan berikutnya (setelah dokumentasi `docs/` ini pertama kali
dibuat): perbaikan bug kritis iOS bottom sheet, penambahan field jumlah bayar
di Perpanjangan, rombak Tukar Unit jadi per-slot, fitur "Bayar nanti", Rincian
Sewa versi History, sub-total header Riwayat, format ribuan & sub-total
tunai/non-tunai di Akhiri Sesi, dan implementasi penuh fitur "Gabung
Pembayaran" yang sebelumnya masih placeholder — lihat `06-RIWAYAT-BUG.md`
Bug #8 untuk detail bug iOS-nya.

Sesi lanjutan ketiga: nilai awal & real-time total di Perpanjangan, menu
Saldo Awal di Settings, seed data awal (Master Unit, Jenis Pengeluaran, QR
default), perbaikan bug alarm diam total di iOS (`06-RIWAYAT-BUG.md` Bug #9).

Sesi lanjutan keempat: langkah stepper durasi pintar (di bawah 5 menit lompat
per 1), field detik di semua Field Durasi (`DurasiStepper.tsx`, lihat
`02-LOGIKA-BISNIS.md` §11), kunci pinch-zoom/double-tap-zoom (viewport meta +
`touch-action` CSS + pencegahan gestur JS, khusus mengatasi iOS yang
mengabaikan `user-scalable=no`), tombol Simpan eksplisit di Settings Saldo
Awal (sebelumnya auto-save tiap ketik), dan rincian Tunai/Non-tunai
ditambahkan ke gambar Laporan Akhir Sesi (`laporanGambar.ts`).

Sesi lanjutan kelima: ringkasan sub-total di History dirombak dari 1 baris
"Total masuk" jadi kartu ringkasan 5 variabel (unit selesai, unit masih
berjalan, pendapatan masuk, belum dibayar, total pendapatan) — dipindah dari
subtitle header (yang punya batas tinggi tetap, `min-height: 82px`) ke kartu
di bawah tab bar, supaya tidak berisiko tumpang tindih dengan konten di
bawahnya kalau teksnya jadi panjang. Lihat `02-LOGIKA-BISNIS.md` §3.4.

Sesi lanjutan keenam: bug fix — Edit Transaksi gagal simpan total saat status
bayar tetap "Sudah" tapi metode dibah Tunai↔Non-tunai (lihat
`06-RIWAYAT-BUG.md` Bug #10).

Sesi lanjutan ketujuh: Tambah Sewa & Edit Transaksi diubah dari bottom sheet
jadi halaman penuh (`/tambah-sewa`, `/edit-transaksi/:id`); kode unit
dikelompokkan per kategori alat berat (Excavator/Dump Truck/Loader/Forklift,
lewat `utils/unitKategori.ts`, juga diterapkan ke dropdown Tukar Unit); Jumlah
Bayar di Tambah Sewa & Perpanjangan berlipat otomatis sesuai jumlah unit
(Rp15.000/unit); Saldo Awal diubah dari berbasis saldo akhir TOTAL jadi
berbasis saldo akhir TUNAI SAJA (non-tunai tidak ikut terhitung). Lihat
`02-LOGIKA-BISNIS.md` §12-15.
