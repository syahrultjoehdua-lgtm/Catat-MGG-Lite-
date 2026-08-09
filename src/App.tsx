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
import { jalankanSeedAwalJikaPerlu } from './db/seed'
import { primeAudio } from './utils/alarm'
import GlobalAlarmWatcher from './components/GlobalAlarmWatcher'

export default function App() {
  useEffect(() => {
    jalankanSeedAwalJikaPerlu()
  }, [])

  useEffect(() => {
    // Coba kirim ulang begitu koneksi internet kembali (spesifikasi 3.6).
    window.addEventListener('online', cobaKirimSemuaSesiBelumTerkirim)
    return () => window.removeEventListener('online', cobaKirimSemuaSesiBelumTerkirim)
  }, [])

  useEffect(() => {
    // Unlock/resume AudioContext di TIAP sentuhan (bukan cuma sentuhan pertama) —
    // ini perbaikan bug "alarm tidak bunyi sama sekali" di iOS. Sebelumnya listener
    // ini melepas dirinya sendiri setelah 1x tersentuh, padahal iOS Safari
    // menangguhkan (suspend) AudioContext lagi setelah beberapa saat tidak
    // memutar suara — dan resume() yang dipanggil belakangan dari alarm yang
    // dipicu OTOMATIS oleh timer (bukan dari sentuhan langsung) akan gagal diam-
    // diam di iOS. Dengan re-unlock di tiap sentuhan, context jauh lebih sering
    // dalam keadaan "running" saat alarm betulan perlu bunyi. Lihat juga
    // utils/alarm.ts (mulaiKeepAliveAudio) untuk mitigasi keduanya.
    window.addEventListener('pointerdown', primeAudio)
    window.addEventListener('touchstart', primeAudio)
    // Saat PWA dibuka lagi dari background (mis. user kunci layar lalu buka lagi),
    // coba unlock ulang juga — walau di iOS resume() di luar sentuhan langsung
    // tidak selalu berhasil, ini tidak merugikan dan membantu di browser lain.
    function saatKembaliTerlihat() {
      if (document.visibilityState === 'visible') primeAudio()
    }
    document.addEventListener('visibilitychange', saatKembaliTerlihat)
    return () => {
      window.removeEventListener('pointerdown', primeAudio)
      window.removeEventListener('touchstart', primeAudio)
      document.removeEventListener('visibilitychange', saatKembaliTerlihat)
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
