import { createContext, useContext, useEffect, useState } from 'react'
import { getToken, getUser, saveToken, saveUser, clearAll } from '../services/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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

  async function signIn(newUser, newToken) {
    await saveToken(newToken)
    await saveUser(newUser)
    setUser(newUser)
    setToken(newToken)
  }

  async function signOut() {
    await clearAll()
    setUser(null)
    setToken(null)
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
