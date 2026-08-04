import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo/logo-utama-lockup-dark.png'
import { getOrCreateActiveSession } from '../db/db'
import { cobaKirimSemuaSesiBelumTerkirim } from '../services/sync'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const minTampil = new Promise((resolve) => setTimeout(resolve, 700))
    Promise.all([getOrCreateActiveSession(), minTampil]).then(() => {
      cobaKirimSemuaSesiBelumTerkirim() // fire-and-forget, tidak menunda navigasi
      navigate('/dashboard', { replace: true })
    })
  }, [navigate])

  return (
    <div className="splash-screen">
      <img src={logo} alt="Catat MGG" className="splash-logo" />
    </div>
  )
}
