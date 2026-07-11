import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'villeda_jwt'
const USER_KEY = 'villeda_user'

export async function saveToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function getToken() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  return token || null
}

export async function saveUser(userObject) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userObject))
}

export async function getUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export async function clearAll() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(USER_KEY)
}
