# Catat MGG (Lite)

PWA pencatatan sewa unit — versi sederhana dari "Maing Gali-gali".
Spesifikasi lengkap: lihat `spesifikasi-catat-mgg-lite.md` di project ini.

📖 **Dokumentasi lengkap** (arsitektur, logika bisnis, skema data, status
fitur, rencana lanjutan, riwayat bug) ada di folder **[`docs/`](./docs/00-DAFTAR-ISI.md)**
— mulai dari situ kalau baru pertama kali kenal project ini.

## Status: Semua 8 sesi selesai + perbaikan bug hasil testing

Fitur inti lengkap: Splash → Dashboard (transaksi, timer, semua aksi kartu, alarm) →
History (2 tab) → Settings (Master Data, pengaturan, Akhiri Sesi) → backend Google
Apps Script (2 sheet, **sudah dikonfirmasi jalan**) → export/bagikan laporan gambar.

**Perbaikan bug hasil testing terakhir:**
- **Bug scroll fatal**: Header, Bottom Nav, dan FAB dulu ikut ter-scroll dan hilang saat
  daftar transaksi panjang. Penyebabnya `.app-shell` pakai `min-height: 100%` (bisa
  memanjang mengikuti konten) dan `.app-content` tidak punya `min-height: 0` (syarat
  wajib flexbox supaya area scroll internal benar-benar terkurung). Sudah diperbaiki:
  `.app-shell` sekarang `height: 100dvh` tetap + `overflow: hidden`; hanya
  `.app-content` yang scroll. Header/Bottom Nav/FAB sekarang diam di tempat.
- **Pop-up otomatis saat waktu habis**: sebelumnya alarm/popup cuma muncul saat app
  dibuka lagi setelah di-background. Sekarang dicek tiap detik — popup muncul otomatis
  begitu timer menyentuh nol, baik app sedang dibuka (foreground) maupun baru dibuka
  lagi.
- **Bug alarm tidak bunyi**: kemungkinan besar karena `AudioContext` diblokir browser
  (autoplay policy) sebab alarm dipicu otomatis dari timer, bukan dari tap langsung.
  Diperbaiki dengan "unlock" `AudioContext` dari sentuhan pertama user di app
  (`primeAudio()` di `App.tsx`), plus `resume()` defensif tiap kali alarm mau bunyi.

## Menjalankan

```bash
npm install
npm run dev
```

## Bug kritis yang baru diperbaiki: Dashboard blank putih
Saat menambahkan pengecekan alarm tiap detik, satu `useEffect` sempat menaruh
`transaksiAktif` di dependency array-nya **sebelum** variabel itu dideklarasikan
di kode (`const transaksiAktif = useLiveQuery(...)` ada di baris setelahnya).
Dependency array dievaluasi langsung saat baris itu dieksekusi (beda dengan isi
callback effect yang baru jalan belakangan), jadi Dashboard langsung
`ReferenceError` begitu dirender — React crash jadi layar putih kosong. Sudah
dipindah ke posisi yang benar. Sudah dicek juga ke seluruh file lain untuk pola
yang sama, tidak ditemukan bug serupa di tempat lain.

## Bug layout: Header/Bottom Nav/FAB sekarang benar-benar mengambang
Perbaikan sebelumnya cuma membetulkan area scroll (`min-height:0`), tapi Header,
Bottom Nav, dan FAB masih jadi bagian dari layout flex biasa — jadi FAB yang
lebar barisnya penuh (walau tombolnya rata kanan) menyisakan ruang kosong
kosong di sisinya. Sekarang ketiganya betul-betul `position: fixed`, lepas dari
alur normal halaman:
- `.app-header` & `.bottom-nav` — fixed di atas/bawah, diberi background solid
  supaya konten yang scroll di baliknya tidak tembus pandang
- `.fab-float` — fixed langsung membungkus tombolnya saja (tidak lagi jadi baris
  selebar layar), jadi tidak ada lagi ruang kosong di sampingnya
- `.app-content` diberi padding atas/bawah secukupnya supaya konten tidak
  ketiban elemen yang mengambang ini
- Halaman dengan `BackHeader` (Akhiri Sesi, Master Data) ikut disamakan
  polanya supaya konsisten

Konsekuensinya persis seperti yang diminta: kalau nanti Header/Nav/FAB perlu
disembunyikan, tidak akan ada bekas ruang kosong sama sekali — karena mereka
sudah lepas dari flow, bukan dititipkan lewat flex.

## Bug: pop-up "waktu habis" cuma muncul di Dashboard (diperbaiki)
Logika deteksi alarm sebelumnya ada di dalam komponen `Dashboard`, jadi otomatis
berhenti begitu Dashboard di-unmount (user pindah ke Riwayat/Settings). Sekarang
dipindah ke `src/components/GlobalAlarmWatcher.tsx`, dipasang di `App.tsx` di luar
`<Routes>` — jalan terus di halaman manapun, tidak bergantung halaman mana yang
sedang dibuka.

**Soal alarm saat layar mati/terkunci**: sudah dijawab ke user bahwa ini di luar
kemampuan PWA murni tanpa infrastruktur push server sungguhan, dan bahkan dengan
itu pun tidak terjamin (banyak Android — terutama Samsung/Xiaomi — membatasi
notifikasi PWA cuma muncul di status bar, bukan heads-up). Solusi andal perlu
aplikasi native. Mitigasi yang realistis dalam kemampuan PWA: minta Screen Wake
Lock terus-menerus selama ada transaksi aktif (bukan cuma setelah waktu habis),
supaya layar tidak sempat mati sama sekali selagi dipakai — **belum
diimplementasikan**, menunggu konfirmasi user apakah mau dikerjakan.

## Bug diketahui, DITUNDA sampai user minta (jangan dikerjakan dulu)
- Tab section "Sesi aktif / Sesi selesai" di halaman Riwayat seharusnya juga
  mengambang/fixed di posisinya (ikut ter-scroll saat ini). Sekalian nanti hapus
  teks keterangan "Baca langsung dari penyimpanan lokal, tanpa fetch ke server"
  di bagian atas halaman Riwayat.

## Migrasi ke native Android (Capacitor) — sedang berjalan
Project ini sedang dibungkus jadi APK Android (lewat Capacitor) supaya bisa
dapat kemampuan native (termasuk solusi alarm layar mati/terkunci lewat Local
Notifications, dibahas setelah APK dasar terpasang & jalan baik). **Lihat
`CAPACITOR_SETUP.md`** untuk langkah lengkapnya — bagian ini wajib dijalankan
sendiri di komputer kamu (perlu Android Studio + SDK yang tidak tersedia di
sandbox pengembangan saya).

Yang sudah disiapkan di sisi project:
- `capacitor.config.ts` — konfigurasi dasar (appId, nama app, warna native)
- `package.json` — dependency Capacitor + script `cap:sync`, `cap:android`, `cap:open:android`
- `.gitignore` — sudah diperbarui untuk artefak build Android

Yang masih perlu kamu jalankan sendiri (lihat `CAPACITOR_SETUP.md`):
1. `npx cap add android` — generate project native (sekali saja)
2. Build & sinkronkan setiap ada perubahan kode
3. Build APK debug untuk sideload

**Workflow desktop (`npm run dev`) sama sekali tidak berubah** — tetap cara
utama kerja sehari-hari; Capacitor cuma langkah tambahan di akhir kalau mau
dibungkus ulang jadi APK.

## Yang masih terbuka
- Logika "Gabung pembayaran" — masih placeholder, menunggu penjelasan alur dari kamu
- Font Poppins masih via Google Fonts CDN (perlu internet saat load pertama) — bisa
  di-bundle lokal kalau mau 100% offline sejak awal
- Jalankan `TESTING_CHECKLIST.md` di HP untuk verifikasi menyeluruh, terutama alarm
  bunyi & pop-up waktu habis yang baru diperbaiki di atas

## Struktur proyek
- `src/pages/` — halaman (Dashboard, History, Settings, AkhiriSesi, Master Data)
- `src/components/` — kartu unit, semua bottom sheet aksi, ikon SVG inline
- `src/db/db.ts` — skema & helper IndexedDB (Dexie)
- `src/services/sync.ts` — kirim data sesi ke backend + retry/queue offline
- `src/config.ts` — tempat isi `APPS_SCRIPT_URL`
- `backend/` — script Google Apps Script + panduan deploy
- `capacitor.config.ts`, `CAPACITOR_SETUP.md` — pembungkusan ke APK Android native
