# Logika Bisnis & Aturan

Dokumen ini menjelaskan **kenapa** aplikasi berperilaku seperti sekarang —
bukan cuma "apa fiturnya", tapi aturan di baliknya. Kalau mau mengubah
perilaku, baca dulu bagian relevan di sini supaya tidak merusak aturan yang
sengaja dibuat.

## 1. Konsep "Sesi"

**Sesi** = satu periode kerja, biasanya 1 hari. Aturan intinya:

- **Selalu ada TEPAT SATU sesi aktif** (`closedAt` masih kosong) setiap saat
  app dibuka. Fungsi `getOrCreateActiveSession()` di `db.ts` yang menjamin ini
  — dipanggil di `Splash.tsx` saat app dibuka pertama kali, dan juga di
  `Dashboard.tsx`/`AkhiriSesi.tsx` sebagai jaga-jaga.
- Kalau ada sesi lama yang belum ditutup (`closedAt` kosong), app **melanjutkan**
  sesi itu — bukan bikin baru. Ini penting: kalau app force-close di tengah
  hari kerja lalu dibuka lagi, transaksi yang sedang berjalan tidak hilang.
- Sesi baru otomatis dibuat kalau memang belum ada sesi aktif sama sekali
  (pertama kali app dipakai, atau tepat setelah sesi sebelumnya diakhiri).
- **Tidak ada halaman untuk "pilih sesi"** atau ganti sesi manual — semuanya
  otomatis berdasarkan status `closedAt`.

## 2. Konsep "Transaksi" & multi-unit

Satu transaksi = satu kali sewa, bisa berisi **1 atau lebih kode unit**
sekaligus (fitur "multi-unit"). Aturannya:

- Kalau user pilih lebih dari 1 kode unit di form Tambah Sewa, semuanya
  digabung jadi **1 transaksi** dengan **1 waktu mulai, 1 durasi/timer, dan 1
  jumlah bayar** — bukan per-unit terpisah.
- Field `kodeUnit` di database berbentuk **array string**, misalnya
  `["A3", "A4"]`, bukan satu string.
- Unit yang sedang aktif di satu transaksi otomatis **disembunyikan** dari
  pilihan unit di form Tambah Sewa lain (tidak mungkin unit yang sama disewa
  dobel) — logikanya ada di `getKodeUnitSedangDisewa()`.
- **Tukar Unit** (salah satu aksi di Rincian Sewa) memang sengaja dibuat
  terpisah dari "Edit" — supaya ganti kode unit **tidak mereset timer** yang
  sedang berjalan. UI-nya **per-slot**: tiap unit lama yang menempel di
  transaksi dapat 1 baris "Sebelum → Sesudah" sendiri (dropdown), jadi tidak
  mungkin 1 unit baru dipilih dobel untuk 2 slot berbeda, dan jelas terlihat
  unit mana ditukar jadi apa. Ini murni untuk kasus **tukar 1-ke-1** — kalau
  mau menambah/mengurangi jumlah unit dalam transaksi (bukan sekadar tukar),
  itu lewat form Edit langsung (field kode unit di sana tetap freeform
  multi-select) — baik dari Edit maupun dari Tukar Unit, keduanya sama-sama
  memanggil fungsi `tukarUnit()` di `db.ts`, jadi tidak ada duplikasi logika,
  cuma duplikasi akses di UI untuk 2 kebutuhan yang beda (tukar murni vs
  ubah bebas).

## 3. Timer & Ring Countdown

### 3.1 Cara menghitung sisa waktu

Fungsi inti: `sisaWaktuMs(transaksi, now)` di `src/utils/time.ts`.

```
targetSelesai = waktuMulai + durasiMenit + totalMenitJeda (akumulasi jeda)
sisaMs = targetSelesai − (waktu sekarang, ATAU waktu mulai jeda kalau sedang dijeda)
```

Poin penting: kalau transaksi **sedang dijeda**, perhitungan "waktu sekarang"
dibekukan di titik `waktuJedaMulai` — jadi selama dijeda, sisa waktu tidak
terus berkurang. Begitu dilanjutkan (`lanjutkanTransaksi()`), selisih waktu
selama jeda ditambahkan ke `totalMenitJeda`, dan hitungan mundur lanjut dari
titik semula.

### 3.2 Ring visual: kenapa skalanya tetap 30 menit?

Ini keputusan desain hasil revisi (bukan dari spesifikasi awal). Awalnya ring
mengisi penuh sesuai durasi transaksi (kalau di-set 25 menit, ring penuh =
25 menit). Tapi ini bikin **setiap transaksi baru selalu terlihat "penuh"**
tidak peduli berapa lama durasinya — jadi tidak ada rasa urgensi visual yang
konsisten.

Solusi: skala ring **selalu dihitung dari referensi tetap 30 menit**
(`SKALA_RING_MS` di `time.ts`), bukan dari durasi transaksi itu sendiri.

- Transaksi dengan durasi 25 menit → ring-nya TIDAK PERNAH terlihat 100% penuh
  (maksimum ~83%), karena skalanya dibandingkan ke 30 menit.
- Kalau durasi diperpanjang jadi lebih dari 30 menit, ring dibatasi
  (clamped) tetap terlihat penuh — tidak "meluap".
- **Warna** ring diinterpolasi hijau → merah berdasarkan proporsi sisa waktu
  yang sama (fungsi `warnaRing()`) — makin dekat 0, makin merah.

### 3.3 Kartu "Waktu Habis"

Begitu `sisaWaktuMs <= 0`:
- Kartu berubah warna merah (`unit-card-habis`)
- Badge "Waktu habis" muncul, **bisa di-tap langsung** (tanpa perlu buka
  Rincian Sewa dulu) untuk memicu alur penutupan transaksi — lihat bagian 5.

## 4. Semua aksi terhadap transaksi

Diakses lewat 2 cara: tap badge "Waktu habis" (khusus saat sudah habis), atau
tap kartu untuk buka sheet "Rincian Sewa" yang berisi semua aksi berikut:

| Aksi | Fungsi di `db.ts` | Catatan |
|---|---|---|
| **Perpanjangan** | `perpanjangDurasi(id, tambahMenit, tambahBayar?)` | Menambah `durasiMenit`, **tidak** mengubah `waktuMulai`. `PerpanjangSheet` nilai awalnya sengaja 25 menit & Rp15.000 (bisa diubah), field durasi bisa diketik manual (minimal 1 menit), dan menampilkan "Total waktu"/"Total tagihan" real-time (durasi & jumlah bayar transaksi asal + yang ditambahkan) sebelum disimpan. Jumlah bayar tetap opsional — boleh 0 |
| **Edit** | `editTransaksi(id, patch, now)` | Bisa ubah nama, foto, sisa waktu, jumlah bayar, status bayar, DAN kode unit (lihat poin 2 di atas). Tiap perubahan dicatat ke `riwayatEdit` (audit trail) |
| **Tukar unit** | `tukarUnit(id, kodeBaru[])` | Ganti kode unit tanpa reset timer. UI-nya **per-slot** (`TukarUnitSheet`): tiap unit lama di transaksi dapat 1 dropdown "Sesudah" sendiri, bukan 1 daftar chip campur — supaya tidak bisa asal pilih banyak unit baru untuk 1 slot lama (lihat `06-RIWAYAT-BUG.md` konteks perbaikannya) |
| **Jeda** | `jedaTransaksi(id)` | Set `dijeda: true`, catat `waktuJedaMulai` |
| **Lanjutkan** | `lanjutkanTransaksi(id, now)` | Akumulasikan waktu jeda ke `totalMenitJeda`, set `dijeda: false` |
| **Bayar sekarang** | (buka `PembayaranQrSheet` dengan `tutupSetelahBayar={false}`) | Transaksi **tetap berjalan** setelah dibayar — beda dari alur "waktu habis" |
| **Bayar nanti** | `tutupTransaksiBayarNanti(id)` | Tutup transaksi TANPA menandai lunas — dipicu dari `PembayaranQrSheet` saat waktu habis. `statusBayar` tetap `'belum'`, muncul di History dengan badge "Bayar nanti", ditagih & ditandai lunas belakangan lewat `HistoryRincianSheet` |
| **Gabung pembayaran** | `gabungkanTransaksi(idUtama, idLain[])` | Set `groupId` sama ke beberapa transaksi (aktif maupun sudah selesai) di 1 sesi, supaya tampil jadi 1 kartu gabungan (`GroupUnitCard`) di Dashboard. Murni tampilan — tidak menggabung logika/aksi transaksi masing-masing. Lihat §6 di bawah |
| **Paksa selesai** | `tutupTransaksi(id)` (langsung, atau lewat `PembayaranQrSheet` dulu kalau belum bayar) | Menutup transaksi sebelum/tanpa menunggu waktu habis |
| **Batalkan/Hapus** | `hapusTransaksi(id)` | **Hapus permanen** dari database (bukan soft-delete/flag) — makanya selalu diminta konfirmasi (`confirm()` browser) sebelum eksekusi |

## 5. Alur penutupan transaksi & pembayaran QR

Ada 3 pintu masuk yang semuanya berujung ke `PembayaranQrSheet`, tapi dengan
maksud beda (dibedakan lewat prop `tutupSetelahBayar`):

1. **Tap badge "Waktu Habis" di kartu** → `tutupSetelahBayar: true` (kalau
   status masih "Belum" bayar). Kalau statusnya sudah "Sudah" bayar, langsung
   `confirm()` + `tutupTransaksi()` tanpa perlu buka sheet QR lagi.
2. **"Paksa selesai" di Rincian Sewa** (transaksi belum habis waktu, mau
   ditutup manual) → sama, `tutupSetelahBayar: true` kalau belum bayar.
3. **"Bayar sekarang" di Rincian Sewa** (transaksi masih berjalan, cuma mau
   dicatat sudah dibayar duluan) → `tutupSetelahBayar: false`, transaksi
   TIDAK ditutup, cuma `statusBayar` yang berubah jadi "sudah".

Saat `tutupSetelahBayar: true`, `PembayaranQrSheet` menampilkan 3 pilihan:
**"Sudah dibayar"** (tandai lunas + tutup), **"Bayar nanti"** (tutup transaksi
tapi `statusBayar` dibiarkan `'belum'` — lewat `tutupTransaksiBayarNanti()`,
ditagih belakangan dari History), atau **"Batal"** (transaksi tetap terbuka,
tidak ada yang berubah).

Di dalam `PembayaranQrSheet`:
- Menampilkan gambar QR dari `qrSetting` (kalau sudah diset di Master QR) —
  kalau belum ada, tampil placeholder + arahan ke Settings.
- Checkbox **"Bayar dengan non-tunai"** — hasilnya disimpan ke field
  `nonTunai` transaksi.
- Gambar QR bisa di-tap untuk lihat 100% layar (`FullQrView.tsx`) — tap
  sekali untuk tombol tutup, usap ke bawah untuk langsung keluar.

## 6. Gabung Pembayaran

**Tujuan**: kadang beberapa unit disewa oleh 1 pelanggan yang sama tapi
dicatat sebagai transaksi terpisah (misalnya beda waktu mulai, atau
awalnya dikira pelanggan berbeda) — fitur ini menggabungkan **tampilannya**
saja di Dashboard jadi 1 kartu, supaya lebih mudah dilihat & ditagih
sekaligus, TANPA menggabungkan logika/data transaksinya.

**Cara kerja**:
1. Dari Rincian Sewa transaksi manapun, tombol "Gabung pembayaran" membuka
   `GabungPembayaranSheet` — daftar transaksi lain di sesi yang sama,
   dikelompokkan & diurutkan: **timer aktif → timer selesai belum bayar →
   timer selesai sudah bayar**.
2. Setelah dipilih & disimpan, `gabungkanTransaksi()` menandai transaksi
   utama + semua yang dipilih dengan `groupId` yang sama (UUID). Kalau ada
   anggota yang ternyata sudah tergabung ke grup lain sebelumnya, seluruh
   anggota grup lama itu ikut ditarik masuk ke grup baru — supaya tidak ada
   grup yang "terbelah" jadi 2.
3. Di Dashboard, transaksi aktif yang berbagi `groupId` sama dirender lewat
   `GroupUnitCard` (bukan `UnitCard` biasa) — 1 kartu berisi beberapa baris
   mini, satu per anggota aktif. **Tiap baris tetap membuka `CardMenu`
   (Rincian Sewa) miliknya sendiri saat diketuk** — grouping ini murni
   tampilan, tombol aksi (Perpanjangan, Jeda, Tukar Unit, dst.) tetap
   per-transaksi individual, tidak disatukan.
4. Anggota grup yang **sudah selesai** (timernya sudah ditutup) tidak ikut
   tampil sebagai baris di `GroupUnitCard` Dashboard (karena Dashboard cuma
   menampilkan transaksi aktif) — tapi tetap terhitung di judul kartu
   ("Gabungan pembayaran · N unit") dan tetap muncul di sheet "Lihat Data
   Pembayaran".
5. Tombol **"Lihat data pembayaran"** di kartu gabungan membuka
   `DataPembayaranGrupSheet`, yang memuat SEMUA anggota grup lewat
   `listAnggotaGrup(groupId)` (aktif maupun selesai) — masing-masing baris
   menampilkan durasi & jumlah bayar, dengan tombol "Bayar unit ini" sendiri
   (memanggil `tandaiSudahDibayar()` untuk 1 transaksi itu saja), plus
   tombol "Bayar sekaligus" yang menandai lunas semua anggota yang masih
   `statusBayar: 'belum'` dalam satu aksi.

**Yang sengaja TIDAK dilakukan**: menggabungkan `jumlahBayar` beberapa
transaksi jadi 1 angka, atau membuat 1 timer gabungan. Tiap transaksi tetap
independen sepenuhnya di database — `groupId` cuma penanda "tampilkan
bersebelahan", bukan penggabungan data.

## 7. Sistem Alarm

### 7.1 Kapan alarm muncul

`GlobalAlarmWatcher` (lihat `01-ARSITEKTUR.md` bagian 7) mengecek **setiap
detik** apakah ada transaksi aktif yang `sisaWaktuMs <= 0` DAN belum pernah
dialarm sebelumnya (dilacak lewat `Set<number>` berisi id transaksi yang
sudah pernah memicu alarm, supaya tidak berulang-ulang untuk transaksi yang
sama). Begitu ketemu, muncul `AlarmOverlay` — pop-up layar penuh dengan bunyi
+ getar + wake lock (layar dipaksa tetap menyala).

### 7.2 Kenapa alarm sempat tidak bunyi sama sekali (dan cara memperbaikinya)

Browser modern **memblokir suara yang dibunyikan otomatis** oleh JavaScript
tanpa sentuhan pengguna langsung sebelumnya (disebut *autoplay policy*).
Karena alarm kita dipicu otomatis dari `setInterval` (bukan dari tap
langsung), `AudioContext` browser diam-diam ditolak bunyi tanpa error yang
terlihat.

**Perbaikan tahap 1** (`primeAudio()` di `App.tsx`): begitu user menyentuh
layar app, `AudioContext` dibuat & di-*resume*. Ini cukup untuk kebanyakan
browser — tapi TIDAK cukup untuk iOS Safari, lihat di bawah.

**Bug lanjutan khusus iOS**: sekalipun sudah pernah di-*unlock*, iOS Safari
punya kebiasaan **menangguhkan (`suspend`) `AudioContext` lagi** kalau tidak
ada suara diputar dalam beberapa saat — dan `resume()` yang dipanggil
belakangan dari kode yang **bukan** dipicu sentuhan langsung (seperti alarm
dari `setInterval`) sering gagal diam-diam di WebKit. Versi awal kode ini
juga melepas listener sentuhannya setelah 1x terpakai, jadi tidak ada
kesempatan re-unlock sama sekali setelah sentuhan pertama — kombinasi 2 hal
ini yang bikin laporan "tidak bunyi/getar sama sekali" di iOS PWA.

**Perbaikan tahap 2** (2 lapis, lihat `src/utils/alarm.ts` & `App.tsx`):
1. Listener sentuhan di `App.tsx` sekarang **tidak pernah melepas dirinya
   sendiri** — tiap sentuhan layar (bukan cuma yang pertama) memanggil
   `primeAudio()` lagi, memaksimalkan peluang context sudah `'running'` saat
   alarm betulan perlu bunyi.
2. `mulaiKeepAliveAudio()` — selagi ada minimal 1 transaksi aktif berjalan
   (dipantau `GlobalAlarmWatcher`), diputar bunyi nyaris-hening (20Hz, gain
   ~0, di luar jangkauan dengar) tiap 4 detik — **satu-satunya tujuannya**
   supaya `AudioContext` tidak pernah sempat idle & ditangguhkan sistem sejak
   awal. `hentikanKeepAliveAudio()` dipanggil lagi begitu tidak ada transaksi
   aktif, supaya tidak boros baterai tanpa alasan.

**Soal getar**: iOS Safari (termasuk mode PWA "Add to Home Screen") **tidak
mengimplementasikan Vibration API sama sekali** — ini keterbatasan resmi dari
Apple/WebKit, bukan bug yang bisa diperbaiki dari kode web manapun.
`'vibrate' in navigator` akan selalu `false` di iOS, jadi kode alarm otomatis
tidak melakukan apa-apa di sana (tidak error, cuma memang tidak bisa
menggetarkan HP). Di Android, getar tetap berfungsi normal.

### 7.3 Batasan besar: TIDAK bisa bunyi/muncul saat layar HP benar-benar mati

Ini sudah didiskusikan panjang dengan pemilik project — rangkumannya:

- Begitu layar HP mati, JavaScript di halaman web **berhenti total**. Tidak
  ada trik apa pun di level web/PWA yang bisa membunyikan suara atau
  menampilkan pop-up saat itu.
- Satu-satunya jalan yang secara teknis mungkin adalah **notifikasi sistem
  via Push API**, tapi itu **wajib dipicu dari server** (perlu infrastruktur
  push sungguhan yang tahu persis kapan tiap timer habis) — bukan sesuatu
  yang bisa dilakukan app lokal-only seperti ini tanpa perombakan arsitektur
  besar.
- Bahkan kalau itu dibangun, banyak HP Android (terutama Samsung/Xiaomi)
  membatasi notifikasi dari PWA cuma tampil di status bar, bukan pop-up
  heads-up yang benar-benar membangunkan perhatian user.
- Solusi paling andal adalah aplikasi native Android sungguhan (pakai
  `AlarmManager` asli) — ini alasan utama kenapa migrasi ke Capacitor sempat
  dimulai (lihat `05-RENCANA-LANJUTAN.md`).
- Mitigasi yang realistis dalam kemampuan PWA murni: minta **Screen Wake
  Lock terus-menerus** selama ada transaksi aktif (bukan cuma setelah waktu
  habis seperti sekarang), supaya layar tidak sempat mati sama sekali selagi
  dipakai kerja. **Ini belum diimplementasikan** — idenya baru sebatas
  didiskusikan.

## 8. Akhiri Sesi

Alur 2 langkah, sesuai spesifikasi asli bagian 3.6:

**Langkah 1 — Input:**
- Saldo Awal (manual, default = saldo akhir sesi sebelumnya yang tersimpan
  lokal, kalau ada)
- Pengeluaran (0 atau lebih baris: pilih jenis dari Master + nominal)
- Pendapatan dihitung **otomatis** = jumlah `jumlahBayar` semua transaksi
  (tidak termasuk yang dihapus/dibatalkan) di sesi ini
- Saldo Akhir = Saldo Awal + Pendapatan − Total Pengeluaran
- **Tombol "Lanjutkan" terkunci** kalau masih ada transaksi yang belum
  selesai/dibatalkan — sesi tidak boleh diakhiri selagi ada unit yang masih
  disewa

**Langkah 2 — Konfirmasi:** ringkasan read-only, baru benar-benar tersimpan
setelah tekan "Ya, Selesaikan Sesi".

**Setelah dikonfirmasi** (fungsi `akhiriSesi()` di `db.ts`):
1. Semua baris pengeluaran disimpan ke tabel `pengeluaran`
2. Sesi ditandai `closedAt`, `saldoAwal`, `saldoAkhir` terisi, `synced: false`
3. Sesi baru langsung dibuat (`getOrCreateActiveSession()`) supaya Dashboard
   siap dipakai lagi tanpa jeda
4. Percobaan kirim ke backend dipicu (lihat bagian 8)
5. Layar sukses muncul dengan tombol "Bagikan laporan" (gambar PNG, dibuat
   lewat Canvas API — lihat `laporanGambar.ts`)

## 9. Sinkronisasi ke backend (Google Sheets)

- Payload disusun oleh `susunPayloadSesi()` di `src/services/sync.ts`,
  formatnya mengikuti struktur 2 sheet di `03-SKEMA-DATA.md`.
- Fungsi `kirimSesi()` **sengaja tidak mencoba fetch sama sekali** kalau
  `APPS_SCRIPT_URL` masih kosong atau `navigator.onLine` bernilai false —
  supaya tidak menghasilkan error percuma.
- Kalau kirim gagal/tidak dicoba, sesi tetap berstatus `synced: false` di
  database lokal — **tidak ada data yang hilang**.
- Percobaan kirim ulang otomatis terjadi di 2 momen: saat app dibuka
  (`Splash.tsx`) dan saat event `online` browser terpicu (`App.tsx`). Juga
  ada tombol manual "Kirim ulang data sesi" di Settings (cuma muncul kalau
  memang ada sesi berstatus belum terkirim).

## 10. Saldo awal sesi & seed data awal aplikasi

### 10.1 Saldo awal — bisa diatur dari Settings, bukan cuma saat Akhiri Sesi

Sebelumnya, field "Saldo awal" cuma bisa diisi saat proses **Akhiri Sesi**
(prefill dari `getSaldoAkhirSesiSebelumnya()`). Sekarang alurnya:

1. `getOrCreateActiveSession()` — begitu sesi BARU dibuat (bukan lanjut sesi
   lama), `saldoAwal`-nya otomatis langsung diisi dari saldo akhir sesi
   sebelumnya (kalau ada sesi yang pernah ditutup).
2. Nilai ini bisa dikoreksi manual **kapan saja selama sesi masih berjalan**
   lewat menu Settings ("Saldo awal") — lewat fungsi `setSaldoAwalSesiAktif()`.
   Ada juga tombol pintasan "Isi otomatis dari sesi sebelumnya" untuk
   mengembalikan ke nilai saldo akhir sesi sebelumnya kapan pun.
3. Layar Akhiri Sesi tetap menampilkan & mengizinkan koreksi field ini di
   langkah terakhir sebelum sesi resmi ditutup — membaca `sesi.saldoAwal`
   yang sudah tersimpan (bukan menghitung ulang dari nol).

### 10.2 Seed data awal — Master Unit, Jenis Pengeluaran, QR default

`src/db/seed.ts` (`jalankanSeedAwalJikaPerlu()`, dipanggil sekali dari
`App.tsx` saat mount) mengisi data awal berikut **HANYA pada saat aplikasi
pertama kali dibuka/dipasang di 1 device**:

- **Master Unit**: E02, E03, E04, E05, E06, E07, T03, T04, T05, T06, L01,
  L02, F01
- **Master Jenis Pengeluaran**: Pajak & Distribusi, Listrik, Konsumsi
- **QR pembayaran default**: gambar QRIS resmi "Maing Gali Gali"
  (`src/assets/qr/qris-default.jpg`, dibundel ke dalam aplikasi saat build)

Semua tetap bisa dihapus/diubah/ditambah manual sesudahnya lewat menu
Settings masing-masing seperti biasa. Ditandai lewat flag
`seedAwalSelesai` di `appSettings` (BUKAN dicek dari kosongnya tabel) —
supaya kalau user sengaja menghapus salah satu data bawaan ini nanti, data
itu **tidak diam-diam muncul lagi** tiap kali app dibuka ulang. Flag ini
cuma diset `true` di baris paling akhir fungsi, jadi kalau ada 1 langkah
gagal di tengah (misalnya gagal fetch gambar QR bawaan), seed akan dicoba
lagi secara utuh di percobaan buka app berikutnya.
