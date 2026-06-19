import { createContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface MagicLinkResult {
  error: AuthError | null
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  sendMagicLink: (email: string) => Promise<MagicLinkResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const sendMagicLink = useCallback(async (email: string): Promise<MagicLinkResult> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://gestao.synribeiro.com.br/dashboard',
        shouldCreateUser: false,
      },
    })
    return { error }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, sendMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
