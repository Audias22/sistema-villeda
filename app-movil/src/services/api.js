import axios from 'axios'
import { getToken, clearAll } from './storage'
import { emitSessionExpired } from './authEvents'

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 60000,
})

api.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      const networkError = new Error('NETWORK_ERROR')
      networkError.code = 'NETWORK_ERROR'
      networkError.original = error
      return Promise.reject(networkError)
    }

    const esLogin = error.config?.url?.includes('/auth/login')

    if (error.response.status === 401 && !esLogin) {
      await clearAll()
      emitSessionExpired()
      const sessionError = new Error('SESSION_EXPIRED')
      sessionError.code = 'SESSION_EXPIRED'
      sessionError.original = error
      return Promise.reject(sessionError)
    }

    return Promise.reject(error)
  }
)

export default api
