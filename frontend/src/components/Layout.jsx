import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { loginAs } from '../api/auth.js'
import { clearAuthSession, getAuthUser } from '../api/client.js'

const linkClass = ({ isActive }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
  ].join(' ')

/**
 * App shell: responsive top bar + main content. Keeps navigation consistent across pages.
 */
export function Layout() {
  const [usernameInput, setUsernameInput] = useState('')
  const [currentUser, setCurrentUser] = useState(getAuthUser())
  const [authMsg, setAuthMsg] = useState('')

  const onLogin = async () => {
    const username = usernameInput.trim()
    if (!username) {
      setAuthMsg('Enter a username')
      return
    }
    try {
      const session = await loginAs(username)
      setCurrentUser(session.username)
      setUsernameInput('')
      setAuthMsg(`Signed in as ${session.username}`)
    } catch (e) {
      setAuthMsg(e?.response?.data?.detail || 'Login failed')
    }
  }

  const onLogout = () => {
    clearAuthSession()
    setCurrentUser('')
    setAuthMsg('Signed out')
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/" className="text-lg font-semibold tracking-tight text-white">
              Interactive 3D Product Platform
            </Link>
            <p className="text-xs text-slate-400">
              Browse, view, and customize glTF product models
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <nav className="flex flex-wrap gap-1 sm:gap-2">
              <NavLink to="/" end className={linkClass}>
                Gallery
              </NavLink>
              <NavLink to="/upload" className={linkClass}>
                Upload Product
              </NavLink>
              <NavLink to="/about" className={linkClass}>
                About Project
              </NavLink>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              {currentUser ? (
                <>
                  <span className="text-xs text-emerald-300">Signed in: {currentUser}</span>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="username"
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={onLogin}
                    className="rounded-lg bg-indigo-600 px-2 py-1 text-xs text-white"
                  >
                    Demo login
                  </button>
                </>
              )}
            </div>
            {authMsg && <p className="text-[11px] text-slate-400">{authMsg}</p>}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Local demo — FastAPI + React + React Three Fiber
      </footer>
    </div>
  )
}
