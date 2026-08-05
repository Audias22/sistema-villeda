import axios from 'axios'
import { emitSessionExpired } from './authEvents'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const esLogin = error.config?.url?.includes('/auth/login')

    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      // Se avisa al AuthContext para que redirija con React Router.
      // Antes se hacia window.location.href = '/login', que recargaba el
      // navegador y pedia /login como archivo real al servidor de Vercel
      emitSessionExpired()
    }

    return Promise.reject(error)
  }
)

export default api
