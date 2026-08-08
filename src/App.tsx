import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Splash from './pages/Splash'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Settings from './pages/Settings'
import AkhiriSesi from './pages/AkhiriSesi'
import MasterUnit from './pages/MasterData/MasterUnit'
import MasterExpenseType from './pages/MasterData/MasterExpenseType'
import MasterQr from './pages/MasterData/MasterQr'
import { cobaKirimSemuaSesiBelumTerkirim } from './services/sync'
import { getAppSettings } from './db/db'
import { primeAudio } from './utils/alarm'
import GlobalAlarmWatcher from './components/GlobalAlarmWatcher'

export default function App() {
  useEffect(() => {
    // Coba kirim ulang begitu koneksi internet kembali (spesifikasi 3.6).
    window.addEventListener('online', cobaKirimSemuaSesiBelumTerkirim)
    return () => window.removeEventListener('online', cobaKirimSemuaSesiBelumTerkirim)
  }, [])

  useEffect(() => {
    // Unlock AudioContext dari sentuhan pertama user, supaya alarm yang dipicu
    // otomatis belakangan (bukan dari tap langsung) tetap bisa bunyi.
    function unlockSekali() {
      primeAudio()
      window.removeEventListener('pointerdown', unlockSekali)
      window.removeEventListener('touchstart', unlockSekali)
    }
    window.addEventListener('pointerdown', unlockSekali)
    window.addEventListener('touchstart', unlockSekali)
    return () => {
      window.removeEventListener('pointerdown', unlockSekali)
      window.removeEventListener('touchstart', unlockSekali)
    }
  }, [])

  const pengaturan = useLiveQuery(() => getAppSettings(), [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', pengaturan?.temaGelap ? 'dark' : 'light')
  }, [pengaturan?.temaGelap])

  return (
    <>
      <GlobalAlarmWatcher />
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/akhiri-sesi" element={<AkhiriSesi />} />
        <Route path="/settings/units" element={<MasterUnit />} />
        <Route path="/settings/expense-types" element={<MasterExpenseType />} />
        <Route path="/settings/qr" element={<MasterQr />} />
      </Routes>
    </>
  )
}
