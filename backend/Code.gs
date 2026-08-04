/**
 * Backend Catat MGG (Lite) — Google Apps Script.
 * Satu endpoint doPost menerima payload 1 sesi (Riwayat Sesi + Riwayat Sewa)
 * dan menuliskannya sebagai baris baru ke 2 sheet terpisah.
 * Sesuai spesifikasi bagian 5 & permintaan tambahan: 2 sheet, bukan 1 sheet "Riwayat".
 *
 * Cara pasang: lihat backend/CARA_DEPLOY.md di project ini.
 */

var SHEET_SESI = 'Riwayat Sesi';
var SHEET_SEWA = 'Riwayat Sewa';

var HEADER_SESI = ['ID Sesi', 'Tanggal Sesi', 'Saldo Awal', 'Pendapatan', 'Pengeluaran', 'Saldo Akhir', 'Jumlah Unit Disewa'];
var HEADER_SEWA = ['ID Sesi', 'No Urut', 'Kode Unit', 'Lama Sewa (menit)', 'Waktu Mulai', 'Waktu Selesai', 'Jumlah Bayar'];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'Body request kosong' });
    }
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    tulisRiwayatSesi(ss, data.riwayatSesi);
    tulisRiwayatSewa(ss, data.riwayatSewa || []);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function tulisRiwayatSesi(ss, r) {
  if (!r) return;
  var sheet = getOrCreateSheet(ss, SHEET_SESI, HEADER_SESI);
  sheet.appendRow([
    r.idSesi,
    r.tanggalSesi ? new Date(r.tanggalSesi) : '',
    r.saldoAwal !== undefined ? r.saldoAwal : '',
    r.pendapatan || 0,
    r.pengeluaran || 0,
    r.saldoAkhir !== undefined ? r.saldoAkhir : '',
    r.jumlahUnitDisewa || 0
  ]);
}

function tulisRiwayatSewa(ss, daftar) {
  if (!daftar || daftar.length === 0) return;
  var sheet = getOrCreateSheet(ss, SHEET_SEWA, HEADER_SEWA);
  var baris = daftar.map(function (row) {
    return [
      row.idSesi,
      row.noUrut,
      row.kodeUnit,
      row.lamaSewaMenit,
      row.waktuMulai ? new Date(row.waktuMulai) : '',
      row.waktuSelesai ? new Date(row.waktuSelesai) : '',
      row.jumlahBayar
    ];
  });
  // Tulis sekaligus (bukan satu-satu) supaya lebih cepat kalau 1 sesi punya banyak transaksi.
  sheet.getRange(sheet.getLastRow() + 1, 1, baris.length, HEADER_SEWA.length).setValues(baris);
}

function getOrCreateSheet(ss, name, header) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
