import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import AppShell from '../components/AppShell'
import {
  getAppSettings,
  listSesiBelumTerkirim,
  setAppSettings,
  getOrCreateActiveSession,
  setSaldoAwalSesiAktif,
  getSaldoAkhirSesiSebelumnya
} from '../db/db'
import { cobaKirimSemuaSesiBelumTerkirim } from '../services/sync'
import { mulaiAlarm, hentikanAlarm } from '../utils/alarm'
import { formatRibuan, parseRibuan } from '../utils/format'

export default function Settings() {
  const belumTerkirim = useLiveQuery(() => listSesiBelumTerkirim(), []) ?? []
  const pengaturan = useLiveQuery(() => getAppSettings(), [])
  const sesiAktif = useLiveQuery(() => getOrCreateActiveSession(), [])
  const [saldoAwalInput, setSaldoAwalInput] = useState<number | null>(null)
  const [saldoSebelumnya, setSaldoSebelumnya] = useState<number | null>(null)

  useEffect(() => {
    getSaldoAkhirSesiSebelumnya().then(setSaldoSebelumnya)
  }, [])

  // Sinkron dari DB ke input, tapi cuma kalau user belum sedang mengetik nilai
  // baru sendiri (supaya live query lain tidak menimpa ketikan yang sedang jalan).
  useEffect(() => {
    if (sesiAktif && saldoAwalInput === null) setSaldoAwalInput(sesiAktif.saldoAwal ?? 0)
  }, [sesiAktif, saldoAwalInput])

  async function simpanSaldoAwal(nilai: number) {
    setSaldoAwalInput(nilai)
    await setSaldoAwalSesiAktif(nilai)
  }

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

      <p className="settings-section-label">Sesi berjalan</p>
      <div className="field" style={{ margin: '0 16px 16px' }}>
        <p className="field-label">Saldo awal</p>
        <input
          type="text"
          inputMode="numeric"
          value={formatRibuan(saldoAwalInput ?? 0)}
          onChange={(e) => simpanSaldoAwal(parseRibuan(e.target.value))}
        />
        <p className="field-hint">
          Otomatis terisi dari saldo akhir sesi sebelumnya begitu sesi baru mulai — bisa diubah manual kapan
          saja sebelum sesi ini diakhiri.
        </p>
        {saldoSebelumnya !== null && (
          <button style={{ marginTop: 8 }} onClick={() => simpanSaldoAwal(saldoSebelumnya)}>
            Isi otomatis dari sesi sebelumnya (Rp{formatRibuan(saldoSebelumnya)})
          </button>
        )}
      </div>

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
