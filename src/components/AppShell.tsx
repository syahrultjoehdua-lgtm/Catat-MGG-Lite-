import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IconHome, IconHistory, IconSettings } from './icons'

interface AppShellProps {
  title: string
  subtitle?: string
  fab?: ReactNode
  children: ReactNode
}

export default function AppShell({ title, subtitle, fab, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          {subtitle && <p className="app-header-subtitle">{subtitle}</p>}
          <h1>{title}</h1>
        </div>
      </header>
      <main className="app-content app-content-with-header app-content-with-nav">{children}</main>

      {fab && <div className="fab-float">{fab}</div>}

      <nav className="bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <IconHome width={19} height={19} />
          Dashboard
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <IconHistory width={19} height={19} />
          Riwayat
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <IconSettings width={19} height={19} />
          Settings
        </NavLink>
      </nav>
    </div>
  )
}
