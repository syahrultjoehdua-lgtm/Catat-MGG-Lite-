import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import AppShell from '../components/AppShell'
import { getAppSettings, listSesiBelumTerkirim, setAppSettings } from '../db/db'
import { cobaKirimSemuaSesiBelumTerkirim } from '../services/sync'
import { mulaiAlarm, hentikanAlarm } from '../utils/alarm'

export default function Settings() {
  const belumTerkirim = useLiveQuery(() => listSesiBelumTerkirim(), []) ?? []
  const pengaturan = useLiveQuery(() => getAppSettings(), [])

  function cobaBunyi(volume: number, getarAktif: boolean) {
    mulaiAlarm({ volume, getarAktif })
    setTimeout(hentikanAlarm, 900)
  }

  return (
    <AppShell title="Settings">
      <Link className="settings-menu-item" to="/akhiri-sesi" style={{ color: 'var(--color-danger)', fontWeight: 500 }}>
        Akhiri sesi <span>&rsaquo;</span>
      </Link>

      {belumTerkirim.length > 0 && (
        <div className="settings-menu-item" onClick={() => cobaKirimSemuaSesiBelumTerkirim()} style={{ cursor: 'pointer' }}>
          <span>
            Kirim ulang data sesi <span className="sync-badge">{belumTerkirim.length} belum terkirim</span>
          </span>
          <span>&rsaquo;</span>
        </div>
      )}

      <p className="settings-section-label">Master data</p>
      <Link className="settings-menu-item" to="/settings/units">
        Master unit <span>&rsaquo;</span>
      </Link>
      <Link className="settings-menu-item" to="/settings/expense-types">
        Jenis pengeluaran <span>&rsaquo;</span>
      </Link>
      <Link className="settings-menu-item" to="/settings/qr">
        QR pembayaran <span>&rsaquo;</span>
      </Link>

      <p className="settings-section-label">Preferensi</p>

      {pengaturan && (
        <>
          <div className="pref-row">
            <div className="pref-row-top">
              <span>Volume alarm</span>
              <span className="field-hint">{Math.round(pengaturan.volumeAlarm * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(pengaturan.volumeAlarm * 100)}
              onChange={async (e) => {
                const volume = Number(e.target.value) / 100
                await setAppSettings({ volumeAlarm: volume })
                cobaBunyi(volume, pengaturan.getarAktif)
              }}
              className="pref-slider"
            />
          </div>

          <div className="settings-menu-item">
            <span>Getar saat alarm</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={pengaturan.getarAktif}
                onChange={(e) => setAppSettings({ getarAktif: e.target.checked })}
              />
              <span className="switch-track" />
            </label>
          </div>

          <div className="settings-menu-item">
            <span>Tema gelap</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={pengaturan.temaGelap}
                onChange={(e) => setAppSettings({ temaGelap: e.target.checked })}
              />
              <span className="switch-track" />
            </label>
          </div>
        </>
      )}
    </AppShell>
  )
}
