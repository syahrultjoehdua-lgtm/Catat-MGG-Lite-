# Riwayat Bug

Katalog bug yang pernah ditemukan selama pengembangan & testing, diurutkan
dari yang paling lama. Untuk tiap bug: **gejala** (apa yang terlihat user),
**akar masalah** (penjelasan teknis kenapa itu terjadi), dan **perbaikan**
(apa yang diubah). Ditulis detail dengan sengaja — supaya siapa pun yang baca
bisa belajar polanya, bukan cuma tahu "sudah dibetulkan".

---

## Bug #1 — Ikon tidak pernah tampil sama sekali

**Ditemukan saat**: revisi UI putaran pertama (bukan lewat laporan user,
ketemu sendiri saat mengerjakan permintaan lain).

**Gejala**: ikon kamera, QR code, dan alarm yang seharusnya muncul di
beberapa sheet — kosong, tidak ada apa-apa di sana.

**Akar masalah**: kode sempat memakai class seperti `<i className="ti
ti-camera">` — ini format dari library ikon **Tabler Icons** yang bekerja
lewat *icon font* (font khusus berisi simbol, ditampilkan lewat CSS
`content:` pseudo-element). Masalahnya: **stylesheet Tabler Icons-nya sendiri
tidak pernah disertakan** ke project — tidak ada `<link>` CDN atau import
CSS apa pun untuknya. Tanpa CSS itu, class `ti ti-camera` cuma jadi class
kosong tanpa efek visual apa pun — browser tidak akan error atau warning,
cuma diam-diam tidak menampilkan apa-apa.

**Perbaikan**: seluruh pemakaian `ti ti-*` diganti dengan SVG inline buatan
sendiri (`src/components/icons.tsx`) — komponen React yang langsung
mengembalikan elemen `<svg>` dengan `<path>` di dalamnya, tanpa bergantung
pada file/font eksternal apa pun. Ini sekaligus keputusan yang lebih tepat
untuk PWA offline-first — icon font dari CDN butuh koneksi internet saat
pertama dimuat, SVG inline tidak butuh apa-apa karena sudah jadi bagian dari
kode JavaScript itu sendiri.

**Pelajaran**: kalau pakai library berbasis CSS/font (icon font, dsb.), CSS
utamanya **wajib** ikut disertakan — gampang lupa karena tidak menghasilkan
error yang jelas, cuma "diam-diam tidak muncul".

---

## Bug #2 — Header, Bottom Nav, FAB ikut ter-scroll dan hilang

**Ditemukan saat**: testing manual di HP oleh pemilik project, setelah data
transaksi sudah banyak (lebih panjang dari layar).

**Gejala**: begitu daftar transaksi di Dashboard cukup panjang untuk di-scroll,
Header, Bottom Nav, dan tombol FAB ikut ter-scroll ke atas bersama konten —
seharusnya diam di tempat.

**Akar masalah**: ini bug CSS Flexbox klasik yang gampang terjadi tanpa
disadari. Struktur halamannya:

```css
.app-shell { min-height: 100%; display: flex; flex-direction: column; }
.app-content { flex: 1; overflow-y: auto; }  /* dimaksudkan sebagai area scroll */
```

Masalahnya ada di 2 tempat sekaligus:
1. `.app-shell` pakai `min-height: 100%` (BUKAN `height: 100%` tetap) — ini
   artinya `.app-shell` **boleh memanjang lebih dari tinggi layar** kalau
   isinya butuh ruang lebih banyak, alih-alih dipaksa pas satu layar.
2. `.app-content` yang `flex: 1; overflow-y: auto;` **tidak diberi
   `min-height: 0`**. Ini detail teknis Flexbox yang sering tidak diketahui:
   secara default, flex item punya `min-height: auto`, yang artinya elemen
   itu **tidak akan pernah menyusut lebih kecil dari ukuran kontennya
   sendiri** — walaupun sudah dikasih `flex: 1` dan `overflow-y: auto`.
   Akibatnya, `.app-content` malah ikut memanjang mengikuti seluruh daftar
   transaksi (bukan dipotong pas 1 layar lalu di-scroll internal), yang pada
   gilirannya bikin `.app-shell` ikut memanjang (karena poin 1), dan akhirnya
   **seluruh halaman** (bukan cuma `.app-content`) yang di-scroll oleh
   browser — menyeret Header/Nav/FAB ikut naik.

**Perbaikan**: `.app-shell` diubah jadi `height: 100dvh` (tinggi tetap,
bukan minimal) + `overflow: hidden`, dan `.app-content` diberi tambahan
`min-height: 0`. (Perbaikan ini kemudian disempurnakan lagi di Bug #4 di
bawah — jadi solusi akhir bukan persis ini.)

**Pelajaran**: kalau ada elemen `flex: 1; overflow-y: auto` yang seharusnya
jadi "area scroll internal" tapi malah ikut memanjang/tidak mau scroll
sendiri, **hampir selalu** solusinya menambahkan `min-height: 0` (atau
`min-width: 0` untuk flex-direction: row) ke elemen itu.

---

## Bug #3 — Ruang kosong di samping FAB

**Ditemukan saat**: testing manual, tepat setelah Bug #2 "diperbaiki".

**Gejala**: ada kotak putih kosong di sebelah kiri tombol FAB "+ Tambah
sewa", seukuran tinggi tombol itu sendiri.

**Akar masalah**: perbaikan Bug #2 di atas cuma membetulkan masalah
*scroll*-nya — tapi Header/Bottom Nav/FAB **masih jadi bagian dari flex
layout biasa** (dititipkan sebagai flex item di `.app-shell`), cuma
"kebetulan" tidak ikut ke-scroll lagi. Spesifik untuk FAB: elemen
pembungkusnya (`.fab-float`) di-styling `display: flex; justify-content:
flex-end;` supaya tombolnya rata kanan — tapi elemen pembungkus itu sendiri
tetap **selebar penuh baris** (block-level, lebar 100%). Jadi walau
tombolnya sendiri kecil dan rata kanan, elemen pembungkusnya tetap
menempati ruang selebar layar, dan ruang kosong di kiri tombol itu (bagian
dari elemen pembungkus yang transparan) yang terlihat sebagai "kotak putih
kosong".

**Perbaikan**: pendekatan diubah total — Header, Bottom Nav, DAN FAB semua
diubah jadi `position: fixed` **sungguhan** (lepas dari flex layout `.app-shell`
sama sekali), bukan cuma "diam karena scroll dibetulkan". Untuk FAB
khususnya, `.fab-float` tidak lagi `display: flex` selebar layar — sekarang
`position: fixed` dengan `right`/`bottom` langsung, ukurannya menyusut pas
mengikuti tombolnya saja (shrink-to-fit, seperti elemen `position: fixed`
tanpa `width` eksplisit pada umumnya). `.app-content` diberi
`padding-top`/`padding-bottom` secukupnya supaya kontennya tidak ketiban
elemen-elemen yang sekarang mengambang ini.

**Pelajaran**: "tidak ikut ter-scroll" dan "benar-benar lepas dari layout
normal" itu 2 hal berbeda. Kalau elemen nantinya perlu bisa
disembunyikan/muncul secara dinamis tanpa meninggalkan bekas ruang kosong,
harus `position: fixed`/`absolute` dari awal — bukan sekadar dibuat "diam"
lewat flex-shrink atau overflow trick.

---

## Bug #4 — Pop-up alarm cuma muncul kalau kebetulan sedang di Dashboard

**Ditemukan saat**: testing manual — user pindah ke halaman Riwayat/Settings
saat sebuah timer habis waktu, pop-up tidak muncul sama sekali.

**Akar masalah**: logika pengecekan "apakah ada transaksi yang waktunya
habis" (`setInterval` yang jalan tiap detik + `useState` untuk menyimpan
transaksi mana yang sedang dialarm) awalnya ditaruh **di dalam komponen
`Dashboard`**. Di React, begitu komponen di-unmount (misalnya karena user
pindah halaman lewat router), **semua `useEffect` di dalamnya ikut
dibersihkan** — termasuk `setInterval` yang sedang jalan. Jadi begitu user
pindah dari Dashboard, pengecekan alarm otomatis berhenti total sampai user
balik lagi ke Dashboard.

**Perbaikan**: logikanya dipindah ke komponen baru
`src/components/GlobalAlarmWatcher.tsx`, dipasang di `App.tsx` **sebagai
saudara dari `<Routes>`**, bukan di dalam salah satu halaman:

```tsx
return (
  <>
    <GlobalAlarmWatcher />  {/* tidak pernah unmount selama app terbuka */}
    <Routes>...</Routes>
  </>
)
```

Karena `GlobalAlarmWatcher` tidak pernah unmount (kecuali app-nya sendiri
ditutup), `setInterval` di dalamnya jalan terus apa pun halaman yang sedang
dibuka user.

**Pelajaran**: kalau ada logika yang harus terus jalan **tidak peduli
halaman mana yang sedang dibuka**, jangan ditaruh di dalam komponen halaman
tertentu — taruh di level yang lebih tinggi (di atas router) yang memang
didesain untuk hidup selama seluruh sesi pemakaian app.

---

## Bug #5 — Alarm sama sekali tidak bunyi

**Ditemukan saat**: testing manual — bahkan setelah Bug #4 diperbaiki (pop-up
sudah muncul), tidak ada suara sama sekali.

**Akar masalah**: browser modern (termasuk Chrome di Android) punya
kebijakan yang disebut ***autoplay policy*** — secara sengaja memblokir
suara apa pun yang dibunyikan oleh JavaScript **tanpa ada sentuhan/klik
pengguna secara langsung sebelumnya** di halaman itu. Ini fitur anti-gangguan
standar semua browser modern (supaya website tidak bisa random bunyi
sendiri tanpa diminta).

Alarm di app ini dipicu dari `setInterval` (jalan otomatis di background),
**bukan** dari user menekan sebuah tombol — jadi begitu kode mencoba
`new AudioContext()` lalu memutar suara, browser diam-diam menahannya
(`AudioContext` masuk state `'suspended'`) tanpa menampilkan error apa pun
yang terlihat di console sekalipun. Ini kenapa bug ini sempat sulit
dilacak — tidak ada pesan error yang menunjuk langsung ke penyebabnya.

**Perbaikan**: ditambahkan fungsi `primeAudio()` di `src/utils/alarm.ts`,
dipanggil dari `App.tsx` begitu user menyentuh layar **pertama kali** di
mana pun (event `pointerdown`/`touchstart`, langsung dilepas listener-nya
setelah terpanggil sekali):

```tsx
function unlockSekali() {
  primeAudio()  // bikin & resume AudioContext, dari dalam sentuhan asli user
  window.removeEventListener('pointerdown', unlockSekali)
  window.removeEventListener('touchstart', unlockSekali)
}
window.addEventListener('pointerdown', unlockSekali)
```

Karena `AudioContext` sudah pernah di-*resume* dari sentuhan pengguna asli
di awal pemakaian app, instance yang sama itu boleh dipakai lagi belakangan
oleh kode otomatis (`setInterval`) tanpa diblokir ulang — kuncinya
menggunakan **instance `AudioContext` yang sama** (satu variabel
module-level di `alarm.ts`), bukan bikin `new AudioContext()` baru tiap kali
alarm mau bunyi.

**Pelajaran**: kalau ada fitur yang butuh memutar suara secara otomatis
(bukan dari klik langsung), selalu "unlock" `AudioContext`-nya lebih dulu
dari sentuhan pengguna yang genuine di awal — jangan berharap browser
mengizinkan audio yang dipicu murni dari timer/kode.

---

## Bug #6 — Layar putih kosong, app "macet" di Dashboard

**Ditemukan saat**: testing manual, setelah Bug #4 & #5 di atas
diperbaiki (satu paket perubahan yang sama).

**Gejala**: Splash screen tampil normal, tapi begitu berpindah ke Dashboard,
layar jadi putih kosong total — tidak ada error yang terlihat di UI.

**Akar masalah**: ini `ReferenceError` di JavaScript, disebabkan oleh urutan
kode yang salah. Potongan kodenya (di `Dashboard.tsx`) waktu itu:

```tsx
export default function Dashboard() {
  // ...
  useEffect(() => {
    transaksiAktifRef.current = transaksiAktif ?? []
  }, [transaksiAktif])  // <-- (A) 'transaksiAktif' dipakai di sini

  // ...beberapa baris kode lain...

  const transaksiAktif = useLiveQuery(...)  // <-- (B) baru dideklarasikan di sini
```

Ini pelanggaran **Temporal Dead Zone (TDZ)** — aturan JavaScript bahwa
variabel `const`/`let` tidak boleh diakses sebelum baris deklarasinya
dieksekusi. Yang bikin ini gampang terlewat: isi *callback* `useEffect`
(bagian `() => { transaksiAktifRef.current = ... }`) memang baru benar-benar
dijalankan belakangan (setelah render selesai) — jadi sekilas terlihat aman.
**Tapi array dependency-nya** (`[transaksiAktif]`, argumen kedua) itu
**dievaluasi SAAT ITU JUGA**, sebagai bagian biasa dari memanggil fungsi
`useEffect(...)` — sama seperti argumen fungsi biasa lainnya, tidak
ditunda. Karena baris (A) dieksekusi sebelum baris (B), `transaksiAktif`
di titik itu belum ada — meledak jadi `ReferenceError: Cannot access
'transaksiAktif' before initialization`, dan React (yang tidak dibungkus
error boundary) langsung berhenti me-render seluruh komponen — hasilnya
layar putih kosong.

**Perbaikan**: `useEffect` di poin (A) dipindah ke **setelah** baris (B) —
urutan yang benar:

```tsx
const transaksiAktif = useLiveQuery(...)   // dideklarasikan dulu

useEffect(() => {
  transaksiAktifRef.current = transaksiAktif ?? []
}, [transaksiAktif])                        // baru dipakai di sini
```

Setelah perbaikan ini, dilakukan juga pengecekan otomatis (skrip Python
sederhana) ke **seluruh file** di project untuk pola serupa (dependency
array yang mereferensikan variabel yang dideklarasikan belakangan) — tidak
ditemukan kasus lain.

**Pelajaran — ini yang paling penting untuk diingat**: **dependency array
`useEffect`/`useMemo`/`useCallback` dievaluasi SEGERA (saat baris itu
dieksekusi), TIDAK ditunda seperti isi callback-nya.** Variabel apa pun yang
dipakai di dependency array harus SUDAH dideklarasikan (lewat `const`/`let`
di atasnya) sebelum baris hook itu, betapa pun "cuma dipakai belakangan"
terasanya isi callback-nya.

---

## Bug #7 — Kartu waktu habis kehilangan aksi lanjutan (regresi)

**Ditemukan saat**: testing manual, setelah revisi UI "seluruh kartu bisa
di-tap untuk buka Rincian Sewa" (menggantikan tombol Perpanjang & menu
titik-tiga yang dihapus).

**Gejala**: kartu yang waktunya sudah habis tidak lagi punya cara untuk
memicu alur bayar/tutup — tap kartu cuma buka menu umum "Rincian Sewa" yang
sama seperti kartu normal, tidak ada affordance jelas khusus untuk kondisi
"waktu habis, butuh tindakan sekarang".

**Akar masalah**: saat menyederhanakan kartu (menghapus tombol Perpanjang &
titik-tiga sesuai permintaan desain), logika "tap kartu saat habis langsung
memicu alur bayar/tutup" (yang sebelumnya ada lewat tombol "Waktu Habis"
terpisah) ikut hilang tanpa sengaja — semua kondisi kartu (normal maupun
habis) disatukan jadi satu `onClick` yang sama (buka Rincian Sewa).

**Perbaikan**: badge "Waktu Habis" yang tampil di kartu saat habis dibuat
jadi elemen yang bisa di-tap sendiri (`<button>` dengan
`e.stopPropagation()`, supaya tap di badge itu tidak ikut men-trigger
`onClick` kartu di luarnya) — memicu langsung alur pembayaran/penutupan,
terpisah dari tap di bagian kartu lainnya yang tetap membuka Rincian Sewa
seperti biasa.

**Pelajaran**: saat menyederhanakan UI (menghapus tombol-tombol terpisah
jadi satu area tap besar), mudah kebawa menghapus *perilaku* yang menempel
di tombol lama itu, bukan cuma tampilannya. Perlu dicek ulang: aksi apa saja
yang tadinya bisa dipicu lewat tombol yang dihapus, dan ke mana perginya
aksi itu di desain baru.

---

## Bug #8 — iOS PWA: Bottom Navigation menutupi Bottom Sheet

**Ditemukan saat**: pengujian nyata di perangkat iOS (Safari/PWA "Add to Home
Screen"), dilaporkan sebagai bug kritis karena menutupi tombol-tombol di
sheet "Tambah Sewa".

**Gejala**: khusus di iOS, elemen `.bottom-nav` (fixed, z-index 10) tampil DI
ATAS `.sheet-backdrop` (fixed, z-index 50) — padahal secara angka z-index
sheet jauh lebih tinggi. Di Android/Chrome perilakunya normal (sheet di atas
nav), cuma di WebKit/Safari iOS yang bermasalah.

**Akar masalah**: seluruh bottom sheet (`TambahSewaSheet`, `CardMenu`,
`PerpanjangSheet`, `EditSheet`, `TukarUnitSheet`, `PembayaranQrSheet`, dan
stub `GabungPembayaranStub` lama) dirender sebagai **children biasa** di
dalam `<AppShell>` — yang berarti mereka jadi descendant dari `.app-content`,
elemen dengan `overflow-y: auto` + `-webkit-overflow-scrolling: touch`. Di
WebKit/Safari iOS, `position: fixed` pada descendant dari elemen scrollable
seperti itu punya perilaku compositing/stacking-context yang berbeda dari
Chrome — walau z-index-nya lebih tinggi secara angka, urutan tampil terhadap
sibling fixed lain (seperti `.bottom-nav`, yang TIDAK bersarang di dalam
`.app-content`) bisa jadi salah.

**Perbaikan**: dibuat helper `src/utils/portal.tsx` (`toBody()`) yang
membungkus `createPortal(node, document.body)` — semua bottom sheet sekarang
dirender langsung sebagai child dari `<body>`, sejajar level root dengan
`.bottom-nav`/`.fab-float`, bukan bersarang di dalam `.app-content` lagi.
Ini memperbaiki masalahnya secara mendasar di semua sheet sekaligus (bukan
cuma pasang z-index lebih tinggi lagi, yang tidak akan menyelesaikan akar
masalah stacking-context iOS-nya).

**Pelajaran**: kalau ada elemen `position: fixed` yang perilakunya aneh
khusus di iOS Safari padahal z-index sudah benar, curigai dulu apakah
elemen itu bersarang di dalam kontainer yang punya `overflow` +
`-webkit-overflow-scrolling: touch` — WebKit terkenal punya banyak quirk di
kombinasi ini. Solusi paling robust: portal ke `document.body`, bukan
otak-atik angka z-index.

---

## Bug #9 — iOS PWA: alarm tidak bunyi/getar sama sekali

**Ditemukan saat**: pengujian nyata di iOS PWA (setelah Bug #8 diperbaiki).

**Gejala**: saat waktu habis, `AlarmOverlay` tetap muncul (visual OK) tapi
**tidak ada bunyi maupun getar sama sekali** — bukan cuma pelan, betul-betul
diam total.

**Akar masalah (2 hal terpisah, digabung jadi 1 laporan)**:

1. **Bunyi**: `primeAudio()` (unlock `AudioContext` dari sentuhan pertama
   user) di versi sebelumnya memakai listener yang **melepas dirinya sendiri
   setelah 1x terpakai**. Ini cukup untuk kebanyakan browser, tapi TIDAK
   cukup untuk iOS Safari — WebKit dikenal suka menangguhkan (`suspend`)
   `AudioContext` lagi kalau tidak ada suara diputar dalam beberapa saat.
   Karena listener sudah lepas, tidak ada kesempatan re-unlock lagi setelah
   context tertangguh — dan `resume()` yang dipanggil dari alarm (dipicu
   `setInterval`, bukan sentuhan langsung) gagal diam-diam di WebKit.
2. **Getar**: iOS Safari **tidak mengimplementasikan Vibration API sama
   sekali**, di browser tab maupun mode PWA "Add to Home Screen" sekalipun.
   Ini bukan bug — `'vibrate' in navigator` memang selalu `false` di iOS,
   jadi ini keterbatasan platform dari Apple, tidak ada workaround dari
   kode web murni.

**Perbaikan**:
- Listener sentuhan di `App.tsx` sekarang permanen (tidak melepas diri),
  memanggil `primeAudio()` di **setiap** sentuhan sepanjang app dipakai.
- Ditambahkan `mulaiKeepAliveAudio()` di `src/utils/alarm.ts` — bunyi
  nyaris-hening (20Hz, di luar jangkauan dengar, gain ~0) tiap 4 detik
  selagi ada minimal 1 transaksi aktif, supaya `AudioContext` tidak pernah
  sempat idle & ditangguhkan sistem sejak awal. Dikendalikan dari
  `GlobalAlarmWatcher` berdasarkan ada-tidaknya transaksi aktif.
- `beepSekali()` sekarang benar-benar menunggu (`await`) `ctx.resume()`
  selesai dulu sebelum memutar oscillator, bukan menembak `osc.start()`
  langsung tanpa menunggu context selesai resume (race condition kecil yang
  bisa bikin suara pertama hilang di browser yang lebih ketat seperti
  WebKit).
- Getar: **tidak diperbaiki karena memang tidak bisa** — didokumentasikan
  dengan jelas di komentar kode & di sini supaya tidak dikira bug lagi di
  masa depan. Getar tetap berfungsi normal di Android.

**Pelajaran**: kalau alarm/notifikasi berbasis Web Audio API "kadang bunyi
kadang tidak" khusus di iOS Safari, curigai dulu apakah `AudioContext`
sempat idle terlalu lama sebelum dipicu — WebKit menangguhkannya lebih
agresif dari browser lain. Solusi paling andal bukan "unlock sekali di
awal", tapi **jaga context tetap aktif terus-menerus** selama fitur itu
relevan dipakai (di sini: selama ada transaksi aktif yang bisa habis waktu
sewaktu-waktu).

---

## Ringkasan pola yang berulang

Kalau dilihat lagi, sebagian besar bug di atas berasal dari 3 sumber
berulang yang layak diwaspadai di pengembangan berikutnya:

1. **Menghapus/menyederhanakan komponen tanpa melacak semua perilaku yang
   menempel padanya** (Bug #1, #7)
2. **Detail teknis platform yang gampang tidak disadari** (Flexbox
   `min-height: 0`, `position: fixed` vs flex, autoplay policy,
   `useEffect` dependency timing) — semua ini bukan bug "logika salah",
   tapi kurang tahu perilaku spesifik platform/library (Bug #2, #3, #5, #6)
3. **Logika yang harus "hidup selamanya" ditaruh di komponen yang bisa
   unmount** (Bug #4)
