import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database.types'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isActive: boolean
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Dit lösenordsåterställningens e-postlänk pekar. Hash-route funkar på GitHub Pages.
function passwordRedirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}#/aterstall-losenord`
}

// Loggar automatiskt ut efter en period av inaktivitet, t.ex. om datorn delas
// med familjemedlemmar. Tidsstämpeln sparas i localStorage (inte bara i minnet)
// så att den även gäller om man stänger fliken/datorn och kommer tillbaka.
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000
const LAST_ACTIVITY_KEY = 'nbv-last-activity'

function recordActivity() {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
  } catch {
    // localStorage kan vara blockerat (privat läge m.m.) – då gäller bara
    // inaktivitet inom samma flikladdning, vilket är ett rimligt fallback.
  }
}

function getLastActivity(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
    return raw ? Number(raw) : Date.now()
  } catch {
    return Date.now()
  }
}

function clearActivity() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY)
  } catch {
    // se recordActivity()
  }
}

// Flagga som inloggningssidan läser av för att visa "du loggades ut pga
// inaktivitet" istället för att det bara ser ut som en vanlig utloggning.
const AUTO_LOGOUT_KEY = 'nbv-auto-logout'

function markAutoLogout() {
  try {
    localStorage.setItem(AUTO_LOGOUT_KEY, '1')
  } catch {
    // se recordActivity()
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const hasSession = Boolean(session)

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data ?? null)
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      // Har det gått för lång tid sedan senaste aktivitet (t.ex. datorn stängd
      // sedan länge) loggas man ut direkt istället för att återuppta den gamla
      // sessionen.
      if (data.session && Date.now() - getLastActivity() > INACTIVITY_LIMIT_MS) {
        await supabase.auth.signOut()
        clearActivity()
        markAutoLogout()
        setSession(null)
        setProfile(null)
        setLoading(false)
        return
      }
      recordActivity()
      setSession(data.session)
      if (data.session?.user) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '#/aterstall-losenord'
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Håller reda på om man är aktiv (musrörelse, tangenttryck, scroll m.m.) och
  // loggar ut automatiskt efter INACTIVITY_LIMIT_MS utan aktivitet – även om
  // fliken står öppen hela tiden. Registreras bara medan man är inloggad, och
  // en gång per inloggning (inte vid varje bakgrundsuppdatering av sessionen).
  useEffect(() => {
    if (!hasSession) return

    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    const onActivity = () => recordActivity()
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

    const interval = window.setInterval(() => {
      if (Date.now() - getLastActivity() > INACTIVITY_LIMIT_MS) {
        markAutoLogout()
        supabase.auth.signOut()
      }
    }, 30_000)

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity))
      window.clearInterval(interval)
    }
  }, [hasSession])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' && profile?.active === true,
    isActive: profile?.active === true,
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id)
    },
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      recordActivity()
    },
    signOut: async () => {
      await supabase.auth.signOut()
      clearActivity()
      setProfile(null)
    },
    requestPasswordReset: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: passwordRedirectUrl(),
      })
      if (error) throw error
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth måste användas inom AuthProvider')
  return ctx
}
