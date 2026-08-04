# Spesifikasi Aplikasi — Catat MGG (Lite)

> Dokumen ini menjelaskan mekanisme dan fitur aplikasi pencatatan sewa unit
> versi sederhana (cadangan/backup) dari aplikasi utama "Maing Gali-gali".
> Tujuan dokumen: agar developer yang mengerjakan memahami ATURAN BISNIS
> dan LOGIKA aplikasi, bukan cuma daftar fitur.

## 1. Ringkasan

Catat MGG (Lite) adalah aplikasi pencatatan sewa unit (rental tracking)
untuk **1 lokasi, 1 peran user** (tidak ada Owner/karyawan terpisah, tidak
ada PIN). Semua pencatatan transaksi berjalan **offline penuh** di
perangkat; aplikasi hanya terhubung ke internet **satu kali per sesi**,
yaitu saat sesi diakhiri dan datanya dikirim ke Google Sheets sebagai
arsip.

- **Platform**: PWA murni (dipasang lewat "Tambahkan ke Layar Utama"),
  **bukan** dibungkus jadi APK.
- **Backend**: Google Apps Script + **1 Google Sheet bernama "Riwayat"**
  sebagai satu-satunya tempat penyimpanan server.
- **Stack yang disarankan** (boleh disesuaikan developer): React + Vite,
  `vite-plugin-pwa` untuk PWA, IndexedDB (mis. lewat Dexie) untuk
  penyimpanan lokal offline-first.

## 2. Peta Halaman

```
Splash Screen  →  Dashboard  ⇄  History
                       │
                       └── Settings
                             └── Master Data (Unit, Jenis Pengeluaran, QR)
```

Tidak ada: halaman pilih lokasi, halaman Owner, gerbang PIN.

## 3. Mekanisme per Bagian

### 3.1 Splash Screen

Tampil sebentar (logo/nama app), lalu otomatis masuk ke Dashboard —
**tanpa** ada pilihan apa pun bagi user (karena hanya ada 1 lokasi, tidak
perlu dijelaskan atau dibedakan sama sekali dalam aplikasi).

Saat splash berjalan, app mengecek local storage:
- Ada sesi yang belum diakhiri (`closedAt` masih kosong)? → lanjutkan
  sesi itu, langsung ke Dashboard dengan transaksi-transaksi lama masih
  tampil.
- Tidak ada sesi berjalan? → buat sesi baru secara otomatis (tanpa
  konfirmasi user), catat waktu mulainya.

### 3.2 Konsep "Sesi"

Satu **sesi** = satu periode kerja (biasanya 1 hari), dari saat pertama
kali app dibuka/sesi sebelumnya diakhiri, sampai user menekan **Akhiri
Sesi**. Semua transaksi sewa yang dibuat selama app berjalan menempel ke
sesi yang sedang aktif. Data sesi ini (transaksi, pengeluaran, saldo)
hidup **100% di penyimpanan lokal** device sampai sesi itu diakhiri —
tidak ada bagian datanya yang terkirim ke server lebih awal.

### 3.3 Dashboard

Halaman utama, isinya:
- **Daftar kartu unit yang sedang disewa** (transaksi aktif), diurutkan
  dari sisa waktu tersingkat ke terlama.
- Tiap kartu menampilkan: kode unit (bisa lebih dari satu unit dalam 1
  kartu — lihat multi-unit di bawah), sisa waktu (ring countdown), badge
  "Belum Bayar" kalau statusnya belum dibayar, tombol Perpanjangan, dan
  menu (titik tiga) untuk aksi lain.
- Tombol mengambang **"+ Tambah Sewa"** membuka form sewa baru.

**Form Sewa Baru** — field-nya:
| Field | Aturan |
|---|---|
| Kode Unit | Pilih 1 atau lebih dari Master Unit (data lokal); unit yang sedang aktif disewa otomatis disembunyikan dari pilihan |
| Nama Pelanggan | Opsional, dengan autocomplete dari nama-nama yang pernah dipakai (data lokal) |
| Foto Pelanggan | Ambil lewat kamera, disimpan lokal saja (tidak pernah diunggah ke server) |
| Durasi | Default 25 menit, bisa diubah naik/turun kelipatan 5 menit |
| Jumlah Bayar | Default Rp15.000, kelipatan naik/turun Rp5.000, ditampilkan dengan format titik ribuan |
| Status Bayar | Bisa langsung diisi "Sudah"/"Belum" saat form dibuat, termasuk tandai non-tunai |

**Transaksi Multi-Unit**: kalau user memilih lebih dari 1 Kode Unit dalam
satu form, semua unit itu jadi **1 transaksi** dengan **1 timer** dan
**1 pembayaran gabungan** (bukan per-unit). Kartunya di Dashboard tampil
sebagai 1 kartu berisi semua kode unit tsb. Sediakan cara untuk
memisahkan salah satu unit jadi transaksi berdiri sendiri, atau
menggabungkan transaksi yang sedang berjalan (opsional, sesuaikan
kompleksitas dengan kemampuan developer — ini fitur "nice to have", bukan
inti).

**Aksi per transaksi** (lewat menu kartu):
- **Perpanjangan** — tambah durasi, bukan mengubah waktu mulai (beda
  dari Edit)
- **Edit** — koreksi data transaksi yang salah input (nama, foto, sisa
  waktu, dll)
- **Tukar Unit** — ganti kode unit tanpa mereset timer yang sedang jalan
- **Jeda / Lanjut** — hentikan sementara hitung mundur, lalu lanjutkan
- **Batalkan/Hapus** — hapus transaksi secara permanen
- **Paksa Selesai** — tutup transaksi lebih awal sebelum waktu habis
- **Tandai "Sudah Dibayar"** — checkbox cepat tanpa perlu buka form Edit

**Alarm waktu habis**: kalau layar app sedang aktif/dilihat user saat
timer habis, cukup kartu berubah warna merah + tombol "Waktu Habis"
berkedip pelan (tidak perlu bunyi/getar). Kalau layar mati/terkunci atau
app di-background, munculkan alarm layar penuh (bunyi + getar + jaga
layar tetap menyala) sampai user membuka & meresponsnya.

**Alur bayar saat waktu habis**: kalau status bayar transaksi itu masih
"Belum", tampilkan gambar QR statis (yang sudah diset di Master Data)
sebelum transaksi bisa ditutup. Kalau sudah "Sudah Dibayar" sejak awal
atau dikoreksi lebih dulu, langkah ini dilewati.

### 3.4 History

- Daftar semua transaksi (yang masih aktif maupun yang sudah selesai)
  pada sesi berjalan, bisa juga menampilkan sesi-sesi sebelumnya kalau
  developer memutuskan untuk menyimpan riwayat lokal lebih dari 1 sesi.
- Transaksi bisa diedit dari sini juga, dengan catatan audit (apa yang
  berubah, kapan).
- Karena semua data ada lokal, halaman ini tidak perlu fetch apa pun ke
  server — cukup baca ulang dari penyimpanan lokal.

### 3.5 Settings → Master Data

Karena tidak ada Owner/PIN, semua Master Data bisa **diedit langsung**
oleh siapa pun yang pakai app tanpa proteksi tambahan:

- **Master Unit** — daftar kode unit yang tersedia untuk disewakan
  (tambah/edit/hapus).
- **Master Jenis Pengeluaran** — daftar jenis pengeluaran yang muncul
  sebagai pilihan saat Akhiri Sesi.
- **QR Pembayaran** — unggah/ganti gambar QR statis yang dipakai di alur
  bayar. Disimpan **lokal di device saja** (tidak perlu upload ke Google
  Drive seperti app utama, karena app ini asumsinya 1 device/1 lokasi).

**Penting**: karena Master Data ini murni lokal (tidak pernah sinkron ke
server), kalau user ganti HP atau install ulang app, semua Master Data
harus diisi ulang manual dari nol. Ini keterbatasan yang disengaja demi
kesederhanaan — sampaikan ke user/developer supaya tidak dikira bug.

Pengaturan tambahan yang bisa ditaruh di sini juga: volume/getar alarm,
tema terang/gelap (opsional, ikut sistem sebagai default).

### 3.6 Akhiri Sesi

Alur (mengikuti pola verifikasi 2 langkah):
1. User tekan tombol "Akhiri Sesi".
2. Isi/koreksi **Saldo Awal** (manual — tidak ada sumber otomatis dari
   server; bisa dibantu default = Saldo Akhir sesi sebelumnya kalau
   tersimpan lokal).
3. Isi **Pengeluaran** (pilih jenis dari Master Data + nominal, boleh
   lebih dari satu baris).
4. App menghitung otomatis **rincian pendapatan** dari semua transaksi
   di sesi ini.
5. Tampilkan **Saldo Akhir** = Saldo Awal + Pendapatan − Pengeluaran.
6. User tekan "Lanjutkan" → tampil draft ringkasan (read-only, tahap
   konfirmasi) → user tekan **"Ya, Selesaikan Sesi"** untuk benar-benar
   menyimpan.

Begitu dikonfirmasi:
1. **Semua data sesi ini** (setiap transaksi, setiap item pengeluaran,
   dan ringkasan saldo) dikirim dalam **satu kali kirim (batch)** ke
   backend Apps Script.
2. Apps Script menuliskannya sebagai baris-baris baru di sheet
   **"Riwayat"** (lihat struktur di bagian 4).
3. Sesi lokal ditandai selesai (`closedAt` terisi); Dashboard kembali
   kosong, siap untuk sesi baru berikutnya.

**Ini satu-satunya momen aplikasi mengakses internet.** Tidak ada
sinkronisasi berkala, tidak ada fetch di latar belakang di luar momen
ini.

**Kalau tidak ada internet saat Akhiri Sesi ditekan**: data tetap
tersimpan lokal dengan status "belum terkirim". Developer perlu membuat
mekanisme sederhana untuk mencoba kirim ulang otomatis begitu koneksi
kembali, atau minimal tombol manual "Kirim Ulang" (mis. di Settings/
History) — supaya data sesi yang sudah diakhiri tidak pernah hilang
begitu saja.

### 3.7 Export / Bagikan Laporan

Setelah sesi berhasil diakhiri (atau dari History untuk sesi lama),
buat gambar ringkasan laporan berisi Saldo Awal, Pendapatan, Pengeluaran,
Saldo Akhir — lalu sediakan tombol bagikan ke WhatsApp / simpan gambar ke
galeri perangkat.

## 4. Struktur Data di Backend (Sheet "Riwayat")

Karena **hanya ada 1 sheet** untuk semua jenis data, perlu 1 kolom
pembeda **"Tipe Baris"** supaya 1 sheet ini bisa menampung 3 jenis
catatan sekaligus:

| Tipe Baris | Isinya |
|---|---|
| `Transaksi` | 1 baris per unit per transaksi sewa (kode unit, nama pelanggan, waktu mulai, durasi, jumlah bayar, status bayar) |
| `Pengeluaran` | 1 baris per item pengeluaran (jenis, nominal) |
| `Ringkasan Sesi` | 1 baris penutup per sesi (tanggal sesi, saldo awal, total pendapatan, total pengeluaran, saldo akhir) |

Semua baris untuk 1 sesi (gabungan ketiga tipe di atas) dikirim
**sekaligus dalam 1 request** saat Akhiri Sesi dikonfirmasi — bukan
dikirim bertahap satu-satu.

Kolom yang disarankan (sesuaikan sesuai kebutuhan): `Tipe Baris`,
`Tanggal Sesi`, `Kode Unit`, `Nama Pelanggan`, `Waktu Mulai`, `Durasi`,
`Jumlah Bayar`, `Status Bayar`, `Jenis Pengeluaran`, `Nominal
Pengeluaran`, `Saldo Awal`, `Saldo Akhir`.

## 5. Backend (Google Apps Script)

- **Satu endpoint `doPost`** yang menerima payload JSON berisi array
  baris (gabungan transaksi + pengeluaran + ringkasan) dari 1 sesi.
- Apps Script meng-append semua baris itu ke sheet "Riwayat" (buat
  header otomatis kalau sheet-nya masih kosong/baru).
- Balikan harus selalu JSON — `{ok:true}` kalau sukses, `{ok:false,
  error:"..."}` kalau gagal — dibungkus try/catch supaya error tidak
  pernah balik sebagai halaman HTML error bawaan Google.
- **Tidak perlu endpoint GET apa pun** — tidak ada dashboard yang fetch
  data Live, tidak ada Master Data di server, tidak ada upload QR ke
  Drive.

## 6. Yang SENGAJA Tidak Ada (dibanding aplikasi utama "Maing Gali-gali")

Supaya tidak ada asumsi salah dari developer yang terbiasa dengan
aplikasi lain sejenis:

- ❌ Halaman Owner & gerbang PIN — tidak perlu proteksi karena app ini
  untuk 1 user.
- ❌ Halaman pilih lokasi & konsep multi-lokasi — app ini selalu asumsi
  1 lokasi.
- ❌ Sinkronisasi ringan/berkala ke server, prefetch saat startup, atau
  fetch latar belakang apa pun — satu-satunya komunikasi ke internet
  adalah saat Akhiri Sesi.
- ❌ Sentralisasi Master Data/QR lewat Sheets atau Google Drive — semua
  data master murni lokal per-device.
- ❌ Dibungkus jadi APK — app ini PWA saja.

## 7. Catatan Penting untuk Developer

- Karena tidak ada sinkronisasi selain saat Akhiri Sesi, **semua logika
  (timer, alarm, hitung saldo, dll) harus berjalan 100% dari data
  lokal**. Backend hanya berperan sebagai "gudang arsip" pasif yang
  menerima data, bukan sumber data yang dibaca app.
- App harus bisa dipulihkan kalau force-close di tengah sesi: saat
  dibuka lagi, harus melanjutkan sesi lokal yang sama (bukan membuat
  sesi baru), supaya data tidak hilang atau dobel.
- Siapkan mekanisme retry/queue sederhana untuk kasus internet mati
  tepat saat Akhiri Sesi ditekan.
