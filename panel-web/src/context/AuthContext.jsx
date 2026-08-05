import { createContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { onSessionExpired } from '../services/authEvents'
import { tokenVigente } from '../utils/jwt'

export const AuthContext = createContext(null)

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario'))
  } catch {
    return null
  }
}

function limpiarAlmacenamiento() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
}

// Se lee una sola vez al arrancar. Si el token guardado ya expiro se borra aqui
// mismo, para no renderizar el panel como si la sesion siguiera activa
function leerSesionInicial() {
  const token = localStorage.getItem('token')

  if (!tokenVigente(token)) {
    limpiarAlmacenamiento()
    return { token: null, usuario: null }
  }

  return { token, usuario: leerUsuario() }
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionInicial)
  const navigate = useNavigate()
  const sesionExpiradaMostrada = useRef(false)

  useEffect(() => {
    const desuscribir = onSessionExpired(() => {
      // El dashboard lanza varias peticiones a la vez, asi que sin este guard
      // un solo vencimiento mostraria el aviso repetido
      if (sesionExpiradaMostrada.current) return
      sesionExpiradaMostrada.current = true

      setSesion({ token: null, usuario: null })
      toast.error('Tu sesión expiró, inicia sesión de nuevo.')
      navigate('/login', { replace: true })
    })

    return desuscribir
  }, [navigate])

  const login = (nuevoToken, nuevoUsuario) => {
    localStorage.setItem('token', nuevoToken)
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario))
    setSesion({ token: nuevoToken, usuario: nuevoUsuario })
    sesionExpiradaMostrada.current = false
  }

  const logout = () => {
    limpiarAlmacenamiento()
    setSesion({ token: null, usuario: null })
    sesionExpiradaMostrada.current = false
  }

  return (
    <AuthContext.Provider
      value={{
        token: sesion.token,
        usuario: sesion.usuario,
        login,
        logout,
        autenticado: !!sesion.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
