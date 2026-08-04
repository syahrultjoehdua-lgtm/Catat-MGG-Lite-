# Cara pasang backend (Google Apps Script)

Ini harus dilakukan manual lewat akun Google-mu sendiri — tidak bisa diotomatisasi dari sini.

## 1. Buat Google Sheet baru
- Buka [sheets.google.com](https://sheets.google.com), buat spreadsheet baru
- Beri nama bebas, mis. "Catat MGG - Data"
- Sheet "Riwayat Sesi" dan "Riwayat Sewa" akan **dibuat otomatis** oleh script saat pertama kali menerima data — tidak perlu dibuat manual.

## 2. Tempel script
- Di spreadsheet itu: menu **Extensions › Apps Script**
- Hapus isi default `Code.gs`, ganti dengan seluruh isi file `backend/Code.gs` di project ini
- Simpan (ikon disket / Ctrl+S)

## 3. Deploy sebagai Web App
- Klik **Deploy › New deployment**
- Klik ikon gear di samping "Select type" → pilih **Web app**
- Isi:
  - **Execute as**: Me (akun Google-mu)
  - **Who has access**: **Anyone** (supaya app bisa kirim data tanpa login Google di HP)
- Klik **Deploy**
- Google akan minta izin akses — klik **Authorize access**, pilih akun, klik **Advanced › Go to (nama project) (unsafe)** kalau muncul peringatan, lalu **Allow**
- Setelah deploy selesai, **copy URL Web App**-nya (bentuknya `https://script.google.com/macros/s/xxxxx/exec`)

## 4. Tempel URL ke project
- Buka `src/config.ts` di project
- Ganti nilai `APPS_SCRIPT_URL` dengan URL yang baru di-copy
- Simpan, build ulang (`npm run build`) — atau kalau masih `npm run dev`, cukup refresh

## 5. Update kalau script diubah lagi nanti
- Setiap kali isi `Code.gs` diubah, harus **Deploy › Manage deployments › (pilih deployment) › Edit (ikon pensil) › Version: New version › Deploy** lagi
- URL Web App-nya biasanya tetap sama, tidak perlu diganti di `config.ts` selama pakai deployment yang sama

## Uji coba cepat
- Di app: catat 1 transaksi sewa → Akhiri Sesi sampai selesai
- Buka spreadsheet-nya, sheet "Riwayat Sesi" dan "Riwayat Sewa" harus sudah terisi baris baru
- Kalau belum masuk: buka Settings di app → cek badge "belum terkirim", atau lihat log error di Apps Script (**Executions** di menu kiri editor script)
