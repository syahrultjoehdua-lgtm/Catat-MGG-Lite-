# Arsitektur

## 1. Apa aplikasi ini, dalam satu paragraf

Catat MGG (Lite) adalah **PWA (Progressive Web App)** — aplikasi web yang bisa
di-"install" ke HP lewat "Tambahkan ke Layar Utama", tampil dan terasa seperti
app native, tapi sebenarnya cuma halaman web yang jalan di browser (Chrome di
Android). Dipakai oleh **1 orang, di 1 lokasi**, untuk mencatat sewa unit
per jam/menit — bukan multi-cabang, bukan multi-user dengan peran berbeda.

## 2. Kenapa PWA, bukan app native dari awal?

Karena jauh lebih cepat dikembangkan (satu basis kode web biasa), tidak perlu
publish ke Play Store untuk mulai dipakai, dan cukup untuk kebutuhan versi
"Lite" ini. Konsekuensinya: beberapa kemampuan HP (terutama alarm/notifikasi
saat layar mati) jadi terbatas — ini didokumentasikan di
`05-RENCANA-LANJUTAN.md` beserta rencana migrasi ke native (Capacitor) yang
sempat dimulai lalu **ditunda** karena setup-nya dirasa terlalu rumit.

## 3. Prinsip desain paling penting: Offline-first

Ini prinsip yang membentuk hampir semua keputusan teknis di app ini:

- **Semua pencatatan transaksi (buka sewa, timer, bayar, dll) terjadi 100% di
  penyimpanan lokal HP** — tidak pernah fetch/kirim data ke server saat itu
  terjadi.
- **Satu-satunya momen app butuh internet**: saat tombol "Akhiri Sesi" ditekan
  dan dikonfirmasi. Di titik itu, seluruh data sesi (transaksi + pengeluaran +
  ringkasan) dikirim **sekali, sekaligus** (bukan bertahap) ke backend.
- Kalau internet tidak ada saat itu, data **tidak hilang** — tetap tersimpan
  lokal dengan status "belum terkirim", dan akan dicoba kirim ulang otomatis
  begitu koneksi kembali (atau lewat tombol manual di Settings).

Ini kenapa app ini dipilihkan **Dexie (pembungkus IndexedDB)** sebagai
"database"-nya, bukan langsung fetch ke server tiap ada perubahan data.

## 4. Stack teknologi

| Bagian | Teknologi | Kenapa dipilih |
|---|---|---|
| UI framework | React 18 + TypeScript | Standar, banyak dokumentasi, cocok untuk state management yang cukup kompleks (banyak bottom sheet, banyak state transaksi) |
| Build tool | Vite | Dev server cepat, HMR instan — penting karena banyak sesi pengembangan iteratif |
| Routing | `react-router-dom`, pakai **`HashRouter`** (bukan `BrowserRouter`) | HashRouter menghasilkan URL seperti `/#/dashboard` — ini sengaja, supaya app bisa di-hosting di static hosting apa pun (termasuk `file://` via Capacitor nanti) tanpa perlu konfigurasi server-side rewrite/redirect untuk routing |
| Database lokal | **Dexie** (pembungkus IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) | IndexedDB itu API browser bawaan tapi sangat verbose/ribet dipakai langsung. Dexie menyederhanakannya, dan `useLiveQuery` bikin komponen React otomatis re-render begitu data di database berubah — tanpa itu, developer harus manual refetch tiap ada perubahan |
| PWA/offline shell | `vite-plugin-pwa` (berbasis Workbox) | Otomatis generate service worker yang meng-cache seluruh app shell (JS/CSS/HTML/ikon) saat build, supaya app tetap bisa dibuka walau offline setelah pernah dibuka sekali |
| Font | Poppins, dimuat dari Google Fonts CDN | Butuh internet saat pertama kali dibuka; di-cache lewat Workbox runtime caching supaya load berikutnya tetap benar walau offline. Belum di-bundle lokal — lihat `05-RENCANA-LANJUTAN.md` |
| Ikon | SVG inline buatan sendiri (`src/components/icons.tsx`) | **Bukan** icon font dari CDN — supaya benar-benar jalan offline tanpa bergantung request eksternal. (Ada cerita di baliknya: awalnya sempat pakai class `ti ti-*` dari Tabler Icons tanpa CSS-nya disertakan, jadi tidak pernah tampil sama sekali — lihat `06-RIWAYAT-BUG.md`) |
| Gambar laporan | Canvas API browser bawaan (`src/utils/laporanGambar.ts`) | Tidak pakai library seperti html2canvas — cukup pakai `<canvas>` + `ctx.fillText()` dll secara manual, lebih ringan & tidak nambah dependency |
| Backend arsip | Google Apps Script (`backend/Code.gs`) + Google Sheets | Backend "pasif" — cuma nerima data lewat 1 endpoint `doPost`, tidak pernah dibaca balik oleh app. Dipilih karena gratis, tidak perlu server sendiri, dan Google Sheets familiar buat pemilik bisnis untuk lihat rekap manual |
| Pembungkus native (opsional) | Capacitor — **migrasi ditunda** | Lihat `05-RENCANA-LANJUTAN.md` |

## 5. Struktur folder

```
catat-mgg-lite/
├── docs/                     ← Dokumentasi ini
├── backend/                  ← Kode & panduan backend Google Apps Script
│   ├── Code.gs
│   └── CARA_DEPLOY.md
├── public/
│   └── icons/                ← Ikon PWA (dari aset logo resmi)
├── src/
│   ├── main.tsx               ← Entry point, pasang HashRouter
│   ├── App.tsx                ← Routing + GlobalAlarmWatcher + tema gelap + retry sync
│   ├── config.ts              ← Tempat isi APPS_SCRIPT_URL
│   │
│   ├── db/
│   │   ├── db.ts               ← SATU file ini isinya: skema Dexie + SEMUA fungsi
│   │   │                          baca/tulis data (getOrCreateActiveSession,
│   │   │                          tambahSewa, perpanjangDurasi, akhiriSesi, dst.)
│   │   └── seed.ts             ← Isi data awal (Master Unit, Jenis Pengeluaran, QR
│   │                               default) sekali saat app pertama kali dibuka
│   │
│   ├── services/
│   │   └── sync.ts             ← Susun payload & kirim data sesi ke backend + retry
│   │
│   ├── pages/                  ← 1 file = 1 halaman/rute
│   │   ├── Splash.tsx
│   │   ├── Dashboard.tsx
│   │   ├── History.tsx
│   │   ├── Settings.tsx
│   │   ├── AkhiriSesi.tsx
│   │   └── MasterData/
│   │       ├── MasterUnit.tsx
│   │       ├── MasterExpenseType.tsx
│   │       └── MasterQr.tsx
│   │
│   ├── components/              ← Komponen re-usable, kebanyakan "bottom sheet"
│   │   ├── AppShell.tsx          ← Layout bersama: header + bottom nav + FAB
│   │   ├── BackHeader.tsx        ← Header "← Kembali" untuk halaman non-AppShell
│   │   ├── UnitCard.tsx          ← Kartu unit tunggal di Dashboard
│   │   ├── GroupUnitCard.tsx     ← Kartu gabungan (fitur Gabung Pembayaran)
│   │   ├── CardMenu.tsx          ← Sheet "Rincian Sewa" (semua aksi transaksi, transaksi aktif)
│   │   ├── HistoryRincianSheet.tsx ← Sheet "Rincian Sewa" versi History (transaksi selesai)
│   │   ├── TambahSewaSheet.tsx   ← Form sewa baru
│   │   ├── EditSheet.tsx         ← Form edit transaksi
│   │   ├── PerpanjangSheet.tsx
│   │   ├── TukarUnitSheet.tsx    ← Tukar unit per-slot (Sebelum/Sesudah)
│   │   ├── PembayaranQrSheet.tsx ← Termasuk opsi "Bayar nanti"
│   │   ├── FullQrView.tsx        ← QR full-screen
│   │   ├── GabungPembayaranSheet.tsx   ← Pilih timer lain untuk digabung
│   │   ├── DataPembayaranGrupSheet.tsx ← "Lihat Data Pembayaran" kartu gabungan
│   │   ├── AlarmOverlay.tsx      ← Tampilan pop-up alarm layar penuh
│   │   ├── GlobalAlarmWatcher.tsx← "Otak" pendeteksi waktu habis, jalan di App.tsx
│   │   └── icons.tsx             ← Semua ikon SVG inline
│   │
│   ├── utils/
│   │   ├── time.ts               ← Hitung sisa waktu, warna ring, dll
│   │   ├── format.ts             ← Format angka jadi "Rp15.000"
│   │   ├── portal.tsx            ← Helper createPortal(node, document.body) — dipakai semua bottom sheet, perbaikan bug iOS (lihat 06-RIWAYAT-BUG.md Bug #8)
│   │   ├── alarm.ts              ← Bunyi (Web Audio API) + getar + wake lock
│   │   └── laporanGambar.ts      ← Generate gambar ringkasan sesi (Canvas)
│   │
│   └── styles/
│       ├── tokens.css            ← Variabel CSS: warna, radius, font
│       └── global.css            ← Semua style, tidak pakai CSS Modules/Tailwind
│
├── capacitor.config.ts        ← Konfigurasi pembungkusan native (migrasi ditunda)
└── CAPACITOR_SETUP.md
```

**Pola penting**: hampir semua "aksi" (tambah sewa, edit, hapus, dst.) itu
strukturnya SELALU sama — *komponen UI* (di `components/`) yang menampilkan
form, memanggil *fungsi* di `db/db.ts` untuk baca/tulis data. Komponen UI
sendiri **tidak pernah** langsung memanggil `db.transaksi.add(...)` dsb. —
selalu lewat fungsi bernama di `db.ts` (mis. `tambahSewa()`,
`perpanjangDurasi()`). Ini memudahkan audit: semua aturan bisnis soal
"bagaimana data boleh berubah" terpusat di satu file.

## 6. Peta halaman & routing

```
Splash (/)
  → otomatis redirect ke Dashboard setelah cek/buat sesi

Dashboard (/dashboard)  ⇄  Riwayat (/history)  ⇄  Settings (/settings)
   (3 tab di Bottom Nav, semua pakai komponen <AppShell>)

Settings juga punya sub-halaman (pakai <BackHeader>, bukan <AppShell>):
  /akhiri-sesi
  /settings/units           (Master Unit)
  /settings/expense-types   (Master Jenis Pengeluaran)
  /settings/qr              (Master QR Pembayaran)
```

Semua transaksi (Tambah Sewa, Rincian Sewa, Edit, dst.) **bukan halaman
terpisah** — itu semua "bottom sheet" (modal yang muncul dari bawah layar) di
atas halaman Dashboard, dikelola lewat 1 state `sheet` di `Dashboard.tsx`.

## 7. Kenapa `GlobalAlarmWatcher` dipasang di `App.tsx`, bukan di `Dashboard.tsx`?

Ini penting untuk dipahami karena pernah jadi bug (lihat `06-RIWAYAT-BUG.md`).
Awalnya, pengecekan "apakah ada timer yang sudah habis waktunya" ditaruh di
dalam komponen `Dashboard`. Masalahnya: begitu user pindah ke halaman Riwayat
atau Settings, React **meng-unmount** komponen Dashboard — termasuk
`useEffect`/`setInterval` di dalamnya ikut berhenti. Akibatnya pop-up alarm
cuma bisa muncul kalau kebetulan sedang di halaman Dashboard.

Solusinya: `GlobalAlarmWatcher` dipasang sebagai *saudara* dari `<Routes>` di
`App.tsx` (lihat kode di bawah), bukan di dalam salah satu halaman — jadi dia
**tidak pernah ikut unmount** selama app masih terbuka, apa pun halaman yang
sedang dilihat user.

```tsx
// App.tsx (disederhanakan)
return (
  <>
    <GlobalAlarmWatcher />   {/* selalu hidup, di luar routing */}
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      {/* ...halaman lain... */}
    </Routes>
  </>
)
```

## 8. Sumber warna & identitas visual

Semua warna brand diambil langsung dari file aset logo resmi yang diberikan
pemilik bisnis (bukan dipilih sembarang):

| Token CSS | Nilai | Diambil dari |
|---|---|---|
| `--color-text-primary` (navy/charcoal) | `#1e2226` | Warna dominan logo `Maing Gali-gali` |
| `--color-accent` (oranye) | `#e65c0c` | Warna aksen "LAPANGAN" di logo |
| `--color-bg` (krem) | `#faf8f5` | Warna latar splash screen resmi |

Warna sukses/gagal/warning (hijau/merah/kuning) itu pilihan generik standar UI
(bukan dari brand), didefinisikan di `src/styles/tokens.css`.

## 9. Kenapa `position: fixed` untuk Header/Bottom Nav/FAB (bukan flex biasa)?

Ini pernah 2 kali salah desain sebelum ketemu bentuk final-nya — ceritanya
lengkap di `06-RIWAYAT-BUG.md` (poin "Layout scroll & FAB"). Kesimpulan
akhirnya: Header, Bottom Nav, dan tombol FAB "+ Tambah sewa" semuanya
`position: fixed`, benar-benar lepas dari alur normal halaman (bukan
dititipkan sebagai bagian dari `display:flex` yang cuma "kebetulan" tidak
ikut scroll). Konsekuensi bagusnya: elemen-elemen ini bisa disembunyikan
kapan saja di masa depan tanpa meninggalkan bekas ruang kosong.
