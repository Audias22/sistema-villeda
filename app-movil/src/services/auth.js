import api from './api'
import { saveToken, saveUser, getToken, clearAll } from './storage'

export async function login(usuario, contrasena) {
  const { data } = await api.post('/auth/login', {
    nombre_usuario: usuario,
    contrasena,
  })

  await saveToken(data.token)
  await saveUser(data.usuario)

  return { user: data.usuario, token: data.token }
}

export async function logout() {
  await clearAll()
}

export async function isAuthenticated() {
  const token = await getToken()
  return !!token
}
