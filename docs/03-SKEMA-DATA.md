# Skema Data

Ada 2 "tempat" data tersimpan: **lokal di HP** (IndexedDB lewat Dexie — tempat
utama, semua logika baca dari sini) dan **Google Sheets** (arsip pasif, cuma
ditulisi sekali di akhir sesi, tidak pernah dibaca balik oleh app).

## 1. Database lokal (Dexie / IndexedDB)

Didefinisikan di `src/db/db.ts`. Nama database: `catat-mgg-lite`.

### Tabel `sesi`

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | number (auto) | Primary key |
| `startedAt` | string (ISO) | Waktu sesi mulai |
| `closedAt` | string (ISO) \| null | Kosong = sesi masih aktif. Terisi = sudah diakhiri |
| `saldoAwal` | number? | Diisi saat Akhiri Sesi |
| `saldoAkhir` | number? | Diisi saat Akhiri Sesi |
| `synced` | boolean? | `false` = belum berhasil terkirim ke backend |

### Tabel `transaksi`

Ini tabel paling sering diakses — 1 baris = 1 transaksi sewa (bisa
multi-unit).

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | number (auto) | Primary key |
| `sesiId` | number | FK ke `sesi.id` |
| `kodeUnit` | string[] | **Array**, bisa lebih dari 1 unit (multi-unit) |
| `namaPelanggan` | string? | Opsional |
| `fotoPelangganBlob` | Blob? | Foto dari kamera, tersimpan lokal sebagai Blob — **tidak pernah** diupload ke server |
| `waktuMulai` | string (ISO) | |
| `waktuSelesai` | string (ISO)? | Diisi saat `tutupTransaksi()` dipanggil (ditambahkan sesi 5, untuk kebutuhan export ke sheet "Riwayat Sewa") |
| `durasiMenit` | number | Bisa berubah lewat Perpanjangan/Edit |
| `jumlahBayar` | number | |
| `statusBayar` | `'sudah'` \| `'belum'` | |
| `nonTunai` | boolean? | Cuma relevan kalau `statusBayar === 'sudah'` |
| `dijeda` | boolean? | |
| `waktuJedaMulai` | string (ISO) \| null? | Cuma terisi selagi `dijeda: true` |
| `totalMenitJeda` | number? | Akumulasi menit selama dijeda (lihat `02-LOGIKA-BISNIS.md` §3.1) |
| `selesai` | boolean? | `true` = transaksi sudah ditutup |
| `dibatalkan` | boolean? | **Catatan**: field ini ADA di skema tapi tidak pernah dipakai — aksi "Batalkan" langsung `db.transaksi.delete()` (hapus permanen), bukan set flag ini. Dibiarkan di skema untuk kompatibilitas masa depan kalau nanti mau diubah jadi soft-delete |
| `riwayatEdit` | `{waktu, ringkasan}[]`? | Audit trail — diisi otomatis tiap kali `editTransaksi()`, `perpanjangDurasi()`, `tukarUnit()`, `jedaTransaksi()`, dll dipanggil |

### Tabel `pengeluaran`

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | number (auto) | |
| `sesiId` | number | FK ke `sesi.id` |
| `jenis` | string | Nama jenis pengeluaran (bebas teks, biasanya dari Master) |
| `nominal` | number | |

### Tabel `unitMaster`

| Field | Tipe |
|---|---|
| `id` | number (auto) |
| `kodeUnit` | string |

### Tabel `jenisPengeluaranMaster`

| Field | Tipe |
|---|---|
| `id` | number (auto) |
| `nama` | string |

### Tabel `qrSetting`

Cuma diisi **1 baris** (selalu di-`clear()` dulu sebelum insert baru — lihat
`setQrSetting()`).

| Field | Tipe |
|---|---|
| `id` | number (auto) |
| `gambarBlob` | Blob |

### Tabel `appSettings`

Juga cuma 1 baris. Ditambahkan di sesi 8 (versi skema Dexie naik ke versi 2).

| Field | Tipe | Default |
|---|---|---|
| `id` | number (auto) | |
| `volumeAlarm` | number (0–1) | 0.7 |
| `getarAktif` | boolean | true |
| `temaGelap` | boolean | false |

### Catatan versi skema Dexie

```ts
this.version(1).stores({ sesi, transaksi, pengeluaran, unitMaster, jenisPengeluaranMaster, qrSetting })
this.version(2).stores({ appSettings: '++id' })
```

Kalau nanti perlu nambah tabel/field baru lagi, **jangan edit `version(1)`
langsung** — tambahkan `this.version(3).stores({...})` baru, cuma isi
tabel/perubahan yang baru (Dexie otomatis mewariskan tabel yang tidak
disebut dari versi sebelumnya). Ini standar cara Dexie menangani migrasi
skema di HP user yang sudah punya data lama.

## 2. Backend — Google Sheets (2 sheet)

**Catatan penting**: ini BEDA dari spesifikasi awal (`spesifikasi-catat-mgg-lite.md`
bagian 4) yang aslinya minta 1 sheet dengan kolom "Tipe Baris". Di tengah
pengembangan, pemilik project **mengubah keputusan** jadi 2 sheet terpisah —
dan itu yang jadi acuan final (`backend/Code.gs`).

### Sheet "Riwayat Sesi"

1 baris per sesi yang diakhiri.

| Kolom | Sumber data |
|---|---|
| ID Sesi | `sesi.id` |
| Tanggal Sesi | `sesi.closedAt` (fallback ke `startedAt`) |
| Saldo Awal | `sesi.saldoAwal` |
| Pendapatan | Jumlah `jumlahBayar` semua transaksi valid di sesi itu |
| Pengeluaran | Jumlah `nominal` semua baris pengeluaran di sesi itu |
| Saldo Akhir | `sesi.saldoAkhir` |
| Jumlah Unit Disewa | Total `kodeUnit.length` dari semua transaksi valid |

### Sheet "Riwayat Sewa"

1 baris per **unit per transaksi** — kalau 1 transaksi punya 2 kode unit,
tetap ditulis sebagai... **cek implementasi**: saat ini `susunPayloadSesi()`
di `sync.ts` menulis kode unit sebagai **1 string gabungan** (mis. `"A3, A4"`)
per transaksi, BUKAN 1 baris per unit. Ini sedikit beda dari permintaan asli
("1 baris per unit per transaksi") — kalau butuh benar-benar 1 baris per
unit, ini yang perlu disesuaikan di `sync.ts` fungsi `susunPayloadSesi()`
(pecah `t.kodeUnit` jadi beberapa baris, bukan digabung `.join(', ')`).

| Kolom | Sumber data |
|---|---|
| ID Sesi | `sesi.id` |
| No Urut | Urutan transaksi dalam sesi (1, 2, 3, ...) |
| Kode Unit | `transaksi.kodeUnit.join(', ')` |
| Lama Sewa (menit) | `transaksi.durasiMenit` |
| Waktu Mulai | `transaksi.waktuMulai` |
| Waktu Selesai | `transaksi.waktuSelesai` |
| Jumlah Bayar | `transaksi.jumlahBayar` |

### Cara backend menerima data

`backend/Code.gs` — 1 endpoint `doPost` yang menerima JSON `{riwayatSesi,
riwayatSewa}`, otomatis membuat kedua sheet di atas (beserta header) kalau
belum ada, lalu `appendRow`/`setValues` sekaligus (bukan satu-satu). Balikan
selalu JSON (`{ok:true}` atau `{ok:false, error:"..."}`), dibungkus
try/catch supaya tidak pernah balik sebagai halaman error HTML bawaan
Google.
