import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import { getToken, getUser, saveToken, saveUser, clearAll } from '../services/storage'
import { onSessionExpired } from '../services/authEvents'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const sessionExpiredShown = useRef(false)

  useEffect(() => {
    async function cargarSesionGuardada() {
      const storedToken = await getToken()
      const storedUser = await getUser()
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(storedUser)
      }
      setIsLoading(false)
    }
    cargarSesionGuardada()
  }, [])

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      if (sessionExpiredShown.current) return
      sessionExpiredShown.current = true
      setUser(null)
      setToken(null)
      Alert.alert('Sesión expirada', 'Tu sesión expiró, inicia sesión de nuevo.')
    })
    return unsubscribe
  }, [])

  async function signIn(newUser, newToken) {
    await saveToken(newToken)
    await saveUser(newUser)
    setUser(newUser)
    setToken(newToken)
    sessionExpiredShown.current = false
  }

  async function signOut() {
    await clearAll()
    setUser(null)
    setToken(null)
    sessionExpiredShown.current = false
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
