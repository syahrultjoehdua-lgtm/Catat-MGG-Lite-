import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BackHeader from '../../components/BackHeader'
import { addUnitMaster, deleteUnitMaster, listUnitMaster } from '../../db/db'

export default function MasterUnit() {
  const unitList = useLiveQuery(() => listUnitMaster(), []) ?? []
  const [kodeBaru, setKodeBaru] = useState('')

  async function handleTambah() {
    if (!kodeBaru.trim()) return
    await addUnitMaster(kodeBaru)
    setKodeBaru('')
  }

  return (
    <div className="app-shell">
      <BackHeader title="Master unit" />
      <main className="app-content">
        <div className="field" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={kodeBaru}
            onChange={(e) => setKodeBaru(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTambah()}
            placeholder="Kode unit, mis. A3"
          />
          <button onClick={handleTambah}>Tambah</button>
        </div>

        {unitList.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada kode unit terdaftar.</p>
            <p className="empty-state-hint">Tambahkan kode unit supaya bisa dipilih saat membuat transaksi sewa.</p>
          </div>
        ) : (
          <div className="list-rows">
            {unitList.map((u) => (
              <div key={u.id} className="list-row">
                <span>{u.kodeUnit}</span>
                <button onClick={() => u.id && deleteUnitMaster(u.id)} aria-label={`Hapus ${u.kodeUnit}`}>
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
