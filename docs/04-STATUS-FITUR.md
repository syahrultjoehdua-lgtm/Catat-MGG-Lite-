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
| 3.3 Form Sewa Baru | ✅ | Semua field sesuai (kode unit, nama, foto, durasi, jumlah bayar, status bayar) |
| 3.3 Transaksi Multi-Unit | ✅ | 1 transaksi/1 timer/1 pembayaran |
| 3.3 Aksi per transaksi (Perpanjangan, Edit, Tukar Unit, Jeda/Lanjut, Batalkan, Paksa Selesai, Tandai Sudah Dibayar) | ✅ | Semua ada, diakses lewat sheet "Rincian Sewa" |
| 3.3 Alarm waktu habis (foreground vs background) | ⚠️ | Foreground: kartu merah + badge berkedip ✅. Background (layar mati/terkunci): **tidak bisa diandalkan** dari PWA murni — lihat `02-LOGIKA-BISNIS.md` §6.3 dan `05-RENCANA-LANJUTAN.md` |
| 3.3 Alur bayar QR saat waktu habis | ✅ | Plus ditambah: bisa dipicu manual ("Bayar sekarang") tanpa harus nunggu waktu habis |
| 3.4 History | ⚠️ | Didesain ulang total dari spesifikasi asli (jadi 2 tab: Sesi aktif/Sesi selesai, hanya berisi transaksi yang SUDAH SELESAI) — lihat `02-LOGIKA-BISNIS.md`. Ada bug kecil belum dibetulkan, lihat `05-RENCANA-LANJUTAN.md` |
| 3.5 Master Data (Unit, Jenis Pengeluaran, QR) | ✅ | Semua CRUD lengkap |
| 3.6 Akhiri Sesi (2 langkah) | ✅ | Plus ditambah langkah ke-3: layar sukses dengan tombol bagikan laporan |
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
- **Tombol "Gabung pembayaran"** — placeholder, menunggu penjelasan alur
  kerja dari pemilik project (lihat `05-RENCANA-LANJUTAN.md`)

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
