import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TransaksiRecord } from '../db/db'
import { sisaWaktuMs } from '../utils/time'
import { mulaiKeepAliveAudio, hentikanKeepAliveAudio } from '../utils/alarm'
import AlarmOverlay from './AlarmOverlay'

/** Watcher alarm level-app — sengaja dipasang di App.tsx (bukan di dalam Dashboard),
 * supaya pop-up "waktu habis" tetap muncul walau user sedang di halaman
 * Riwayat/Settings/dll, bukan cuma saat Dashboard sedang dibuka. */
export default function GlobalAlarmWatcher() {
  const navigate = useNavigate()
  const location = useLocation()

  const transaksiAktif = useLiveQuery(async () => {
    const sesiAktif = (await db.sesi.toArray()).find((s) => !s.closedAt)
    if (!sesiAktif?.id) return []
    return db.transaksi
      .where('sesiId')
      .equals(sesiAktif.id)
      .filter((t) => !t.selesai && !t.dibatalkan)
      .toArray()
  }, [])

  const transaksiAktifRef = useRef<TransaksiRecord[]>([])
  useEffect(() => {
    transaksiAktifRef.current = transaksiAktif ?? []
  }, [transaksiAktif])

  useEffect(() => {
    // Jaga AudioContext tetap 'running' selagi ada minimal 1 transaksi aktif —
    // mitigasi bug "alarm tidak bunyi sama sekali di iOS" (lihat utils/alarm.ts).
    // Dimatikan lagi kalau tidak ada transaksi aktif supaya hemat baterai.
    if (transaksiAktif && transaksiAktif.length > 0) mulaiKeepAliveAudio()
    else hentikanKeepAliveAudio()
  }, [transaksiAktif])

  const [alarmUntuk, setAlarmUntuk] = useState<TransaksiRecord | null>(null)
  const alarmUntukRef = useRef<TransaksiRecord | null>(null)
  useEffect(() => {
    alarmUntukRef.current = alarmUntuk
  }, [alarmUntuk])

  const sudahDialarmRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const interval = setInterval(() => {
      if (alarmUntukRef.current) return
      const sekarang = Date.now()
      const kandidat = transaksiAktifRef.current.find(
        (t) => t.id && !sudahDialarmRef.current.has(t.id) && !t.dijeda && sisaWaktuMs(t, sekarang) <= 0
      )
      if (kandidat?.id) {
        sudahDialarmRef.current.add(kandidat.id)
        setAlarmUntuk(kandidat)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!alarmUntuk) return null

  return (
    <AlarmOverlay
      transaksi={alarmUntuk}
      onTangani={() => {
        setAlarmUntuk(null)
        if (location.pathname !== '/dashboard') navigate('/dashboard')
      }}
    />
  )
}
