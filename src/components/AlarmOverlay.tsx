import { useEffect } from 'react'
import type { TransaksiRecord } from '../db/db'
import { getAppSettings } from '../db/db'
import { mulaiAlarm, hentikanAlarm } from '../utils/alarm'
import { IconAlarm } from './icons'

interface AlarmOverlayProps {
  transaksi: TransaksiRecord
  onTangani: () => void
}

/** Alarm layar penuh — muncul saat app dibuka kembali setelah ada transaksi yang
 * habis waktu selagi layar mati/terkunci/di-background (spesifikasi 3.3). */
export default function AlarmOverlay({ transaksi, onTangani }: AlarmOverlayProps) {
  useEffect(() => {
    let batal = false
    getAppSettings().then((s) => {
      if (!batal) mulaiAlarm({ volume: s.volumeAlarm, getarAktif: s.getarAktif })
    })
    return () => {
      batal = true
      hentikanAlarm()
    }
  }, [])

  function handleTangani() {
    hentikanAlarm()
    onTangani()
  }

  return (
    <div className="alarm-overlay">
      <IconAlarm width={44} height={44} />
      <h1 style={{ color: '#fff', margin: '12px 0 4px' }}>Waktu habis</h1>
      <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 24 }}>{transaksi.kodeUnit.join(', ')}</p>
      <button className="fab" onClick={handleTangani}>Tangani sekarang</button>
    </div>
  )
}
