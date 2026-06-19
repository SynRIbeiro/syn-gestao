import { createContext } from 'react'
import type { ReactNode } from 'react'

interface AuthContextValue {
  loading: false
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ loading: false }}>
      {children}
    </AuthContext.Provider>
  )
}
