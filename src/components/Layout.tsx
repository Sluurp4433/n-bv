import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Badge, Button, cn } from './ui'
import { BrandMark } from './BrandMark'

type NavItem = { to: string; label: string; adminOnly?: boolean; end?: boolean }

const NAV: NavItem[] = [
  { to: '/hem', label: 'Hem' },
  { to: '/loggbok', label: 'Loggbok' },
  { to: '/observation/ny', label: 'Ny observation' },
  { to: '/sok', label: 'Sök' },
  { to: '/fordon', label: 'Fordon' },
  { to: '/admin', label: 'Administration', adminOnly: true },
]

export function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const items = NAV.filter((i) => !i.adminOnly || isAdmin)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-600/60 hover:text-white'
    )

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-brand-800 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <NavLink to="/hem" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <BrandMark className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">N-BV</span>
          </NavLink>

          {/* Desktop-navigering */}
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} className={linkClass} end={i.end}>
                {i.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <NavLink
              to="/profil"
              className="flex items-center gap-2 text-sm text-brand-100 hover:text-white"
            >
              <span className="max-w-[10rem] truncate">{profile?.name || profile?.email}</span>
              {isAdmin && <Badge color="green">Admin</Badge>}
            </NavLink>
            <Button variant="secondary" size="md" onClick={handleSignOut}>
              Logga ut
            </Button>
          </div>

          {/* Mobil hamburgarknapp */}
          <button
            className="rounded-lg p-2 text-white hover:bg-brand-600/60 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Meny"
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobilmeny */}
        {menuOpen && (
          <nav className="border-t border-brand-600/50 px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-1">
              {items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.end}
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {i.label}
                </NavLink>
              ))}
              <NavLink to="/profil" className={linkClass} onClick={() => setMenuOpen(false)}>
                Min profil
              </NavLink>
              <button
                className="mt-2 rounded-lg bg-white px-3 py-2 text-left text-sm font-medium text-brand-800"
                onClick={handleSignOut}
              >
                Logga ut
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400">
        N-BV · Internt medlemsverktyg · Behandla personuppgifter varsamt enligt föreningens GDPR-rutiner.
      </footer>
    </div>
  )
}
