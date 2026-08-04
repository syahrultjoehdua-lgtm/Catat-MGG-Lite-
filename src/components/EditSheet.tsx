import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, editTransaksi, tukarUnit, listUnitMaster, type TransaksiRecord } from '../db/db'
import { sisaWaktuMs } from '../utils/time'
import { formatRibuan, parseRibuan } from '../utils/format'

export default function EditSheet({ transaksi, onClose }: { transaksi: TransaksiRecord; onClose: () => void }) {
  const now = Date.now()
  const sisaMenitAwal = Math.max(0, Math.round(sisaWaktuMs(transaksi, now) / 60_000))

  const [namaPelanggan, setNamaPelanggan] = useState(transaksi.namaPelanggan ?? '')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [kodeTerpilih, setKodeTerpilih] = useState<string[]>(transaksi.kodeUnit)
  const [sisaMenit, setSisaMenit] = useState(sisaMenitAwal)
  const [jumlahBayar, setJumlahBayar] = useState(transaksi.jumlahBayar)
  const [statusBayar, setStatusBayar] = useState(transaksi.statusBayar)
  const [nonTunai, setNonTunai] = useState(transaksi.nonTunai ?? false)
  const [menyimpan, setMenyimpan] = useState(false)

  const unitMaster = useLiveQuery(() => listUnitMaster(), []) ?? []
  // Unit yang lagi dipakai transaksi AKTIF LAIN (bukan transaksi ini sendiri) — tidak boleh dipilih ganda.
  const unitDipakaiLain = useLiveQuery(async () => {
    const semua = await db.transaksi.filter((t) => !t.selesai && !t.dibatalkan && t.id !== transaksi.id).toArray()
    return semua.flatMap((t) => t.kodeUnit)
  }, [transaksi.id]) ?? []

  const opsiUnit = useMemo(() => {
    const bebas = unitMaster.filter((u) => !unitDipakaiLain.includes(u.kodeUnit)).map((u) => u.kodeUnit)
    return Array.from(new Set([...transaksi.kodeUnit, ...bebas]))
  }, [unitMaster, unitDipakaiLain, transaksi.kodeUnit])

  function toggleUnit(kode: string) {
    setKodeTerpilih((prev) => (prev.includes(kode) ? prev.filter((k) => k !== kode) : [...prev, kode]))
  }

  async function handleSimpan() {
    if (!transaksi.id || kodeTerpilih.length === 0) return
    setMenyimpan(true)
    await editTransaksi(
      transaksi.id,
      { namaPelanggan, fotoPelangganBlob: fotoFile ?? undefined, sisaMenitBaru: sisaMenit, jumlahBayar, statusBayar, nonTunai },
      now
    )
    const unitBerubah =
      kodeTerpilih.length !== transaksi.kodeUnit.length || kodeTerpilih.some((k) => !transaksi.kodeUnit.includes(k))
    if (unitBerubah) await tukarUnit(transaksi.id, kodeTerpilih)
    setMenyimpan(false)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Edit transaksi</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <p className="field-label">Kode unit</p>
            <div className="chip-row">
              {opsiUnit.map((kode) => (
                <button
                  key={kode}
                  type="button"
                  className={kodeTerpilih.includes(kode) ? 'chip chip-selected' : 'chip'}
                  onClick={() => toggleUnit(kode)}
                >
                  {kode}
                  {kodeTerpilih.includes(kode) && <span> &#10003;</span>}
                </button>
              ))}
            </div>
            <p className="field-hint">Tambah/hapus unit di sini tidak memengaruhi timer yang sedang berjalan.</p>
          </div>

          <div className="field">
            <p className="field-label">Nama pelanggan</p>
            <input value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} />
          </div>

          <div className="field">
            <p className="field-label">Foto pelanggan</p>
            <label className="photo-input">
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
              {fotoFile ? fotoFile.name : 'Ganti foto'}
            </label>
          </div>

          <div className="field">
            <p className="field-label">Sisa waktu</p>
            <div className="stepper">
              <button type="button" onClick={() => setSisaMenit((m) => Math.max(0, m - 5))}>&minus;</button>
              <input
                type="number"
                className="stepper-input"
                value={sisaMenit}
                onChange={(e) => setSisaMenit(Math.max(0, Number(e.target.value)))}
              />
              <button type="button" onClick={() => setSisaMenit((m) => m + 5)}>+</button>
            </div>
          </div>

          <div className="field">
            <p className="field-label">Jumlah bayar</p>
            <div className="stepper">
              <button type="button" onClick={() => setJumlahBayar((j) => Math.max(0, j - 5000))}>&minus;</button>
              <input
                type="text"
                inputMode="numeric"
                className="stepper-input"
                value={formatRibuan(jumlahBayar)}
                onChange={(e) => setJumlahBayar(parseRibuan(e.target.value))}
              />
              <button type="button" onClick={() => setJumlahBayar((j) => j + 5000)}>+</button>
            </div>
          </div>

          <div className="field">
            <p className="field-label">Status bayar</p>
            <div className="two-col">
              <button type="button" className={statusBayar === 'sudah' ? 'toggle-btn toggle-btn-active-success' : 'toggle-btn'} onClick={() => setStatusBayar('sudah')}>Sudah</button>
              <button type="button" className={statusBayar === 'belum' ? 'toggle-btn toggle-btn-active' : 'toggle-btn'} onClick={() => setStatusBayar('belum')}>Belum</button>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={nonTunai} onChange={(e) => setNonTunai(e.target.checked)} />
              Bayar dengan non-tunai
            </label>
          </div>

          <button className="fab" style={{ width: '100%' }} onClick={handleSimpan} disabled={menyimpan || kodeTerpilih.length === 0}>
            {menyimpan ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}
