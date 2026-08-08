# Migrasi ke Android native (Capacitor)

Project web-nya (React + Vite) **tidak berubah sama sekali** — Capacitor cuma
"membungkus" hasil build-nya jadi APK. Workflow `npm run dev` di desktop kamu
tetap persis seperti biasa untuk kerja sehari-hari.

Semua langkah di bawah **wajib dijalankan di komputermu sendiri** — sandbox
saya tidak punya akses internet maupun Android SDK/Android Studio, jadi saya
tidak bisa menjalankan atau menguji langkah-langkah ini dari sini.

## 0. Prasyarat (install sekali di awal)

- **Node.js** — sudah pasti ada karena sudah pakai `npm run dev` sebelumnya
- **JDK 17** — Capacitor 6 butuh ini. Cek dengan `java -version`
- **Android Studio** — sudah termasuk Android SDK. Unduh di
  [developer.android.com/studio](https://developer.android.com/studio)
- Saat pertama buka Android Studio, ikuti wizard setup-nya (unduh SDK, emulator,
  dll) — sekali saja

## 1. Install dependency & buat platform Android

```bash
npm install
npx cap add android
```

`npx cap add android` men-generate folder `android/` (project native Gradle
lengkap) berdasarkan `capacitor.config.ts` yang sudah saya siapkan. Ini
langkah **sekali saja** — kalau sudah ada folder `android/`, tidak perlu
diulang lagi (kecuali folder itu dihapus).

## 2. Build & sinkronkan tiap kali kode web berubah

```bash
npm run cap:sync
```

Ini akan `npm run build` dulu (hasil ke `dist/`), lalu menyalin hasilnya ke
project native Android. Jalankan ini setiap kali sudah selesai satu batch
perubahan kode dan mau dicoba di APK.

## 3. Testing instan (live reload) — tetap secepat sekarang

Supaya tidak perlu build+sync tiap kali ganti kode saat masih coba-coba, pakai
mode live-reload: HP/emulator langsung nge-load dari Vite dev server kamu,
persis kayak browser desktop sekarang.

**a. Jalankan Vite supaya bisa diakses dari HP:**
```bash
npm run dev -- --host
```
Catat alamat "Network" yang muncul, bentuknya `http://192.168.x.x:5173`.

**b. Tambahkan blok ini ke `capacitor.config.ts` SEMENTARA (hapus lagi sebelum build rilis):**
```ts
server: {
  url: 'http://192.168.x.x:5173', // ganti sesuai alamat di langkah a
  cleartext: true
}
```

**c. Sinkronkan sekali supaya native shell tahu harus load dari situ:**
```bash
npx cap sync android
```

**d. Jalankan ke HP (sambungkan HP via USB, aktifkan USB debugging) atau emulator:**
```bash
npx cap run android
```

Setelah ini, tiap kamu save kode di editor, tampilan di HP ikut ter-refresh
otomatis — sama seperti browser desktop, cuma sekarang tampilannya jendela
native tanpa address bar.

**Penting:** hapus blok `server: {...}` di atas sebelum build APK untuk
dibagikan/dipasang permanen (langkah 4) — kalau tidak dihapus, APK hasil
build akan terus mencoba load dari komputer kamu, bukan dari file yang
dibundel di dalam APK.

## 4. Build APK untuk sideload (install manual, tanpa Play Store)

Cara termudah untuk pemakaian pribadi — **APK debug**, tidak perlu bikin
keystore/signing:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Hasilnya ada di `android/app/build/outputs/apk/debug/app-debug.apk`. Salin
file ini ke HP (lewat kabel USB, Google Drive, dsb.), buka lewat aplikasi
File Manager di HP, lalu install. Kalau muncul peringatan "Install dari
sumber tidak dikenal", izinkan untuk aplikasi File Manager yang kamu pakai.

APK debug ini **sepenuhnya bisa dipakai sehari-hari** untuk kebutuhan
internal — tidak ada batasan fungsi dibanding APK release, cuma tidak
ditandatangani dengan key production (tidak masalah selama tidak diunggah
ke Play Store).

Kalau nanti mau APK yang ditandatangani (release, untuk dibagikan lebih
luas/upload ke Play Store), bisa lewat Android Studio: `npx cap open android`
→ **Build › Generate Signed Bundle / APK**.

## Troubleshooting umum

- **Gradle sync error saat pertama buka di Android Studio** — biasanya soal
  versi JDK. Pastikan Android Studio pakai JDK 17 (Settings › Build Tools ›
  Gradle › Gradle JDK)
- **HP tidak kedeteksi `npx cap run android`** — pastikan USB debugging aktif
  (Settings HP › About Phone › tap "Build number" 7x untuk buka Developer
  Options › aktifkan USB debugging)
- **Live reload tidak connect ke IP lokal** — pastikan HP & komputer di WiFi
  yang sama, dan firewall komputer tidak memblokir port 5173

## Ikon & splash screen native (opsional, boleh menyusul)

Ikon PWA yang sudah ada (`public/icons/`) bisa dipakai ulang untuk ikon app
native lewat tool `@capacitor/assets` — ini bisa dikerjakan belakangan
setelah APK dasarnya sudah jalan, tidak menghalangi testing awal.
