# Dokumentasi Catat MGG (Lite)

Folder `docs/` ini adalah catatan lengkap tentang aplikasi ini — dibuat supaya
siapa pun (termasuk kamu sendiri beberapa bulan lagi, atau developer lain yang
baru gabung) bisa paham cara kerja app ini **tanpa perlu baca ulang seluruh
riwayat chat pengembangannya**.

## Cara pakai dokumentasi ini

Baca urut sesuai nomor kalau kamu baru pertama kali kenal project ini:

1. **[01-ARSITEKTUR.md](./01-ARSITEKTUR.md)** — Gambaran besar: teknologi apa
   saja yang dipakai, kenapa dipilih, dan bagaimana semua bagian saling
   terhubung. Mulai dari sini.
2. **[02-LOGIKA-BISNIS.md](./02-LOGIKA-BISNIS.md)** — Aturan main aplikasi:
   apa itu "Sesi", bagaimana timer bekerja, semua aksi yang bisa dilakukan ke
   transaksi, dan kenapa aturannya begitu.
3. **[03-SKEMA-DATA.md](./03-SKEMA-DATA.md)** — Struktur data lengkap: tabel
   apa saja yang tersimpan di HP (IndexedDB) dan di Google Sheets, beserta
   arti tiap kolom.
4. **[04-STATUS-FITUR.md](./04-STATUS-FITUR.md)** — Checklist fitur: mana yang
   sudah selesai, mana yang belum, dipetakan ke spesifikasi asli.
5. **[05-RENCANA-LANJUTAN.md](./05-RENCANA-LANJUTAN.md)** — Pekerjaan yang
   sengaja ditunda atau masih perlu keputusan/kejelasan sebelum dikerjakan.
6. **[06-RIWAYAT-BUG.md](./06-RIWAYAT-BUG.md)** — Katalog bug yang pernah
   terjadi selama pengembangan: gejalanya apa, akar masalahnya apa, dan
   bagaimana cara memperbaikinya. Sangat berguna supaya tidak mengulang
   kesalahan yang sama.

## Dokumen lain di root project (bukan di folder `docs/`)

- **`spesifikasi-catat-mgg-lite.md`** — Dokumen spesifikasi ASLI dari pemilik
  bisnis, sebelum pengembangan dimulai. Ini "sumber kebenaran" awal — kalau
  ada pertentangan antara dokumen ini dan `docs/`, anggap `docs/` yang lebih
  baru & akurat (karena mencatat perubahan/koreksi yang terjadi selama
  pengembangan), tapi `spesifikasi-catat-mgg-lite.md` tetap penting untuk tahu
  **niat awal** di balik sebuah aturan.
- **`README.md`** — Ringkasan singkat status project + cara menjalankan
  (`npm install`, `npm run dev`). Untuk overview cepat, bukan detail.
- **`CAPACITOR_SETUP.md`** — Panduan teknis migrasi ke APK Android native
  (statusnya: **ditunda**, lihat `05-RENCANA-LANJUTAN.md`).
- **`TESTING_CHECKLIST.md`** — Daftar cek manual untuk testing di HP.
- **`backend/CARA_DEPLOY.md`** — Panduan deploy backend Google Apps Script.

## Ringkasan super singkat (kalau cuma punya waktu 30 detik)

Catat MGG (Lite) adalah PWA (aplikasi web yang bisa di-install ke HP) untuk
mencatat sewa unit di 1 lokasi oleh 1 orang penjaga. Semua pencatatan
transaksi jalan **offline** di HP (data tersimpan di IndexedDB lewat Dexie).
Cuma ada **satu momen** app ini butuh internet: saat "Akhiri Sesi" ditekan,
data sesi dikirim sekali ke Google Sheets lewat backend Google Apps Script
sebagai arsip. Kalau gagal kirim (tidak ada internet), data tetap aman
tersimpan lokal dan akan dicoba kirim ulang otomatis nanti.
