import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BackHeader from '../../components/BackHeader'
import { addJenisPengeluaran, deleteJenisPengeluaran, listJenisPengeluaran } from '../../db/db'

export default function MasterExpenseType() {
  const daftar = useLiveQuery(() => listJenisPengeluaran(), []) ?? []
  const [namaBaru, setNamaBaru] = useState('')

  async function handleTambah() {
    if (!namaBaru.trim()) return
    await addJenisPengeluaran(namaBaru)
    setNamaBaru('')
  }

  return (
    <div className="app-shell">
      <BackHeader title="Jenis pengeluaran" />
      <main className="app-content app-content-with-back-header">
        <div className="field" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={namaBaru}
            onChange={(e) => setNamaBaru(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTambah()}
            placeholder="Mis. Listrik, konsumsi"
          />
          <button onClick={handleTambah}>Tambah</button>
        </div>

        {daftar.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada jenis pengeluaran terdaftar.</p>
            <p className="empty-state-hint">Daftar ini akan jadi pilihan saat Akhiri Sesi.</p>
          </div>
        ) : (
          <div className="list-rows">
            {daftar.map((j) => (
              <div key={j.id} className="list-row">
                <span>{j.nama}</span>
                <button onClick={() => j.id && deleteJenisPengeluaran(j.id)} aria-label={`Hapus ${j.nama}`}>
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
