import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NewInvoice from './pages/NewInvoice'
import Bulk from './pages/Bulk'
import Register from './pages/Register'
import Bills from './pages/Bills'
import Clients from './pages/Clients'
import SettingsPage from './pages/Settings'
import Splash from './components/Splash'
import { onSyncStatus, type SyncStatus } from './store/github'

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/new', label: 'New Invoice' },
  { to: '/bulk', label: 'Bulk' },
  { to: '/bills', label: 'Bills' },
  { to: '/register', label: 'Register' },
  { to: '/clients', label: 'Clients' },
  { to: '/settings', label: 'Settings' },
]

function SyncBadge() {
  const [s, setS] = useState<SyncStatus>({ state: 'off' })
  useEffect(() => onSyncStatus(setS), [])
  const map = {
    off: ['bg-neutral-400', 'Local only'],
    synced: ['bg-green-500', 'Synced'],
    pending: ['bg-amber-500', s.state === 'pending' ? `${s.count} pending` : ''],
    error: ['bg-red-500', 'Sync error'],
  } as const
  const [dot, label] = map[s.state]
  return (
    <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export default function App() {
  const [splash, setSplash] = useState(true)
  const [dark, setDark] = useState(() => localStorage.getItem('ycb_theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('ycb_theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <HashRouter>
      {splash && <Splash onDone={() => setSplash(false)} />}
      <div className="app-chrome min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white text-sm font-black">YC</span>
              <div className="leading-tight">
                <div className="text-sm font-bold tracking-wide">YouthClub Billing</div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 tracking-wider">SECURITIES SERVICES</div>
              </div>
            </div>
            <nav className="ml-4 hidden md:flex items-center gap-1">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      isActive ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <SyncBadge />
              <button
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                onClick={() => setDark(!dark)}
                title="Light / Dark"
              >
                {dark ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
          <nav className="flex md:hidden gap-1 overflow-x-auto px-3 pb-2">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${isActive ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200' : 'text-neutral-600 dark:text-neutral-300'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<NewInvoice />} />
            <Route path="/bulk" element={<Bulk />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/register" element={<Register />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        <footer className="border-t border-neutral-200 dark:border-neutral-800 py-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Designed &amp; built by <span className="font-semibold text-neutral-700 dark:text-neutral-200">मुंशी Munshi Labs</span> · IIT Madras
        </footer>
      </div>
    </HashRouter>
  )
}
