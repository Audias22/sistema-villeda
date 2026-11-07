import api from './api'
import { saveToken, saveUser, getToken, clearAll, saveRefreshToken, getRefreshToken } from './storage'

export async function login(usuario, contrasena) {
  const { data } = await api.post('/auth/login', {
    nombre_usuario: usuario,
    contrasena,
  })

  await saveToken(data.token)
  await saveUser(data.usuario)
  if (data.refresh_token) await saveRefreshToken(data.refresh_token)

  return { user: data.usuario, token: data.token }
}

/**
 * Pide un token de acceso nuevo con el token de renovación guardado. Se llama
 * solo después de que el usuario pasó la huella.
 *
 * Devuelve { ok: true, user, token } o { ok: false, motivo }, donde motivo es
 * 'sin_sesion' (no hay token de renovación, venció o el usuario fue
 * desactivado: hay que entrar con contraseña) o 'red' (sin conexión: se puede
 * reintentar con la huella).
 */
export async function renovarSesion() {
  const refresh = await getRefreshToken()
  if (!refresh) return { ok: false, motivo: 'sin_sesion' }

  try {
    const { data } = await api.post('/auth/refresh', null, {
      headers: { Authorization: `Bearer ${refresh}` },
    })
    await saveToken(data.token)
    await saveUser(data.usuario)
    return { ok: true, user: data.usuario, token: data.token }
  } catch (e) {
    if (e?.code === 'NETWORK_ERROR' || e?.code === 'TIMEOUT_ERROR') {
      return { ok: false, motivo: 'red' }
    }
    return { ok: false, motivo: 'sin_sesion' }
  }
}

export async function logout() {
  await clearAll()
}

export async function isAuthenticated() {
  const token = await getToken()
  return !!token
}
