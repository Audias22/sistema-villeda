import { createContext, useState } from 'react'

export const AuthContext = createContext(null)

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario'))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [usuario, setUsuario] = useState(leerUsuario)

  const login = (nuevoToken, nuevoUsuario) => {
    localStorage.setItem('token', nuevoToken)
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario))
    setToken(nuevoToken)
    setUsuario(nuevoUsuario)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, autenticado: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}
