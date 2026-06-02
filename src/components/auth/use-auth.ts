import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './auth-context'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>.')
  }
  return ctx
}
