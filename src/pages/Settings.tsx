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
  getSaldoTunaiAkhirSesiSebelumnya
} from '../db/db'
import { cobaKirimSemuaSesiBelumTerkirim } from '../services/sync'
import { mulaiAlarm, hentikanAlarm } from '../utils/alarm'
import { formatRibuan, parseRibuan } from '../utils/format'

export default function Settings() {
  const belumTerkirim = useLiveQuery(() => listSesiBelumTerkirim(), []) ?? []
  const pengaturan = useLiveQuery(() => getAppSettings(), [])
  const sesiAktif = useLiveQuery(() => getOrCreateActiveSession(), [])
  const [saldoAwalDraft, setSaldoAwalDraft] = useState<number | null>(null)
  const [saldoSebelumnya, setSaldoSebelumnya] = useState<number | null>(null)
  const [statusSimpanSaldo, setStatusSimpanSaldo] = useState<'idle' | 'menyimpan' | 'tersimpan'>('idle')

  useEffect(() => {
    getSaldoTunaiAkhirSesiSebelumnya().then(setSaldoSebelumnya)
  }, [])

  // Sinkron dari DB ke draft, tapi cuma kalau draft belum pernah disentuh user
  // (supaya live query lain tidak menimpa ketikan yang belum disimpan).
  useEffect(() => {
    if (sesiAktif && saldoAwalDraft === null) setSaldoAwalDraft(sesiAktif.saldoAwal ?? 0)
  }, [sesiAktif, saldoAwalDraft])

  const saldoTersimpan = sesiAktif?.saldoAwal ?? 0
  const saldoBelumDisimpan = saldoAwalDraft !== null && saldoAwalDraft !== saldoTersimpan

  // Sengaja TIDAK auto-save tiap ketik — user diminta menekan tombol "Simpan"
  // sendiri, supaya salah ketik tidak langsung tersimpan ke sesi aktif.
  async function simpanSaldoAwal() {
    if (saldoAwalDraft === null) return
    setStatusSimpanSaldo('menyimpan')
    await setSaldoAwalSesiAktif(saldoAwalDraft)
    setStatusSimpanSaldo('tersimpan')
    setTimeout(() => setStatusSimpanSaldo('idle'), 1500)
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
          value={formatRibuan(saldoAwalDraft ?? 0)}
          onChange={(e) => setSaldoAwalDraft(parseRibuan(e.target.value))}
        />
        <p className="field-hint">
          Otomatis terisi dari saldo TUNAI akhir sesi sebelumnya (di luar non-tunai) begitu sesi baru mulai —
          bisa diubah manual kapan saja sebelum sesi ini diakhiri. Jangan lupa ketuk "Simpan" setelah mengetik.
        </p>
        {saldoSebelumnya !== null && (
          <button style={{ marginTop: 8 }} onClick={() => setSaldoAwalDraft(saldoSebelumnya)}>
            Isi otomatis dari saldo tunai sesi sebelumnya (Rp{formatRibuan(saldoSebelumnya)})
          </button>
        )}
        <button
          className="fab"
          style={{ width: '100%', marginTop: 8 }}
          onClick={simpanSaldoAwal}
          disabled={!saldoBelumDisimpan || statusSimpanSaldo === 'menyimpan'}
        >
          {statusSimpanSaldo === 'menyimpan' ? 'Menyimpan...' : statusSimpanSaldo === 'tersimpan' ? 'Tersimpan \u2713' : 'Simpan saldo awal'}
        </button>
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
