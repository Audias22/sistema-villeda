import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'villeda_jwt'
const USER_KEY = 'villeda_user'

// Preferencia de desbloqueo biométrico. Son DOS claves y no una a propósito:
// responden preguntas distintas. Con una sola no se podría distinguir "el
// usuario dijo que no" de "todavía no se le preguntó", y el ofrecimiento
// volvería a aparecer en cada inicio de sesión.
const BIOMETRIA_ACTIVA_KEY = 'villeda_biometria_activa'
const BIOMETRIA_PREGUNTADA_KEY = 'villeda_biometria_preguntada'

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

// --- Preferencia de biometría ---------------------------------------------
//
// Todas devuelven un valor seguro ante excepción en vez de propagar: se leen
// durante el arranque de la app, y un fallo del almacenamiento no puede
// impedir que la app abra.

export async function saveBiometriaActiva(activa) {
  try {
    await SecureStore.setItemAsync(BIOMETRIA_ACTIVA_KEY, activa ? '1' : '0')
  } catch (e) {
    // Silencioso a propósito: no poder guardar la preferencia es un problema
    // menor y no debe interrumpir el flujo del usuario.
  }
}

export async function getBiometriaActiva() {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIA_ACTIVA_KEY)) === '1'
  } catch (e) {
    return false
  }
}

export async function saveBiometriaPreguntada() {
  try {
    await SecureStore.setItemAsync(BIOMETRIA_PREGUNTADA_KEY, '1')
  } catch (e) {
    // Ver arriba. En el peor caso se le vuelve a ofrecer una vez más.
  }
}

export async function getBiometriaPreguntada() {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIA_PREGUNTADA_KEY)) === '1'
  } catch (e) {
    // true ante la duda: si no se puede leer, es preferible no ofrecer la
    // opción a ofrecerla repetidamente en cada login.
    return true
  }
}

/**
 * Borra la sesión: token y usuario.
 *
 * NO borra la preferencia de biometría, y es deliberado. La preferencia es del
 * dispositivo, no de la sesión: si el usuario habilitó el desbloqueo biométrico
 * en su teléfono y después cierra sesión, al volver a entrar con contraseña
 * espera que su teléfono siga siendo su teléfono, no tener que habilitarlo de
 * nuevo cada vez.
 *
 * Que quede una preferencia activa sin sesión es inofensivo: el gate de
 * desbloqueo solo se activa si ADEMÁS hay token guardado, así que sin sesión
 * simplemente no se aplica y la app va al login como siempre.
 *
 * Si alguien agrega acá el borrado de la preferencia, rompe esa decisión.
 */
export async function clearAll() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(USER_KEY)
}
