# Catat MGG (Lite)

PWA pencatatan sewa unit — versi sederhana dari "Maing Gali-gali".
Spesifikasi lengkap: lihat `spesifikasi-catat-mgg-lite.md` di project ini.

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
