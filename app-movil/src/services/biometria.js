/**
 * Envoltorio de expo-local-authentication.
 *
 * Ninguna pantalla importa el módulo nativo directamente: todo pasa por acá,
 * para que el manejo de fallos esté en un solo lugar y sea consistente.
 *
 * PRINCIPIO QUE GOBIERNA ESTE ARCHIVO — ANTE LA DUDA, LA APP SE ABRE.
 * Ninguna función de este módulo propaga excepciones. Todas devuelven un valor
 * seguro si algo falla, y "seguro" acá significa el valor que deja al usuario
 * entrar, no el que lo deja afuera.
 *
 * La razón es que la biometría de esta app es una comodidad con una capa de
 * protección, no el mecanismo de seguridad principal: el backend sigue
 * exigiendo su propio token JWT, que expira a los 15 minutos por su cuenta. Una
 * app que no deja entrar a su dueño legítimo es una falla peor que una que pide
 * la huella de menos.
 */

import * as LocalAuthentication from 'expo-local-authentication'

// Resultados de pedirAutenticacion(), para que las pantallas no tengan que
// conocer los 14 valores de error que devuelve authenticateAsync().
export const RESULTADO_OK = 'ok'
export const RESULTADO_CANCELADO = 'cancelado'
export const RESULTADO_BLOQUEADO = 'bloqueado'
export const RESULTADO_SIN_BIOMETRIA = 'sin_biometria'
export const RESULTADO_FALLIDO = 'fallido'

/**
 * true solo si el dispositivo tiene lector Y hay biometría registrada.
 *
 * Las dos condiciones importan. isEnrolledAsync() es la que cubre el caso de
 * alguien que habilitó la opción y después borró todas sus huellas desde los
 * ajustes de Android: sin este chequeo previo se le mostraría un prompt que
 * ningún dedo puede resolver, y quedaría encerrado fuera de la app.
 *
 * Ante cualquier excepción devuelve false, que es el valor que hace que la app
 * se comporte como si la biometría no existiera.
 */
export async function biometriaDisponible() {
  try {
    const hayLector = await LocalAuthentication.hasHardwareAsync()
    if (!hayLector) return false

    const hayRegistradas = await LocalAuthentication.isEnrolledAsync()
    return !!hayRegistradas
  } catch (e) {
    return false
  }
}

/**
 * Cómo llamar a la biometría en los textos de la interfaz.
 *
 * Se consulta al dispositivo en vez de asumir "huella": un teléfono que hace
 * reconocimiento facial no debe leer "Usa tu huella". Si no se puede
 * determinar, "biometría" es correcto en todos los casos.
 */
export async function etiquetaBiometria() {
  try {
    const tipos = await LocalAuthentication.supportedAuthenticationTypesAsync()
    const { FINGERPRINT, FACIAL_RECOGNITION, IRIS } = LocalAuthentication.AuthenticationType

    // Si el dispositivo soporta varias, gana la huella: en Android es la más
    // común y la que el usuario espera ver nombrada.
    if (tipos.includes(FINGERPRINT)) return 'huella'
    if (tipos.includes(FACIAL_RECOGNITION)) return 'reconocimiento facial'
    if (tipos.includes(IRIS)) return 'iris'
    return 'biometría'
  } catch (e) {
    return 'biometría'
  }
}

/**
 * Lanza el prompt nativo y traduce su resultado a una de las constantes de
 * arriba. Devuelve { resultado, error } — error solo para el log, no para
 * mostrar al usuario.
 *
 * Nota sobre los reintentos: quien los cuenta es Android, no esta app. El
 * prompt nativo permite varios intentos internos y recién cuando se agotan
 * devuelve 'lockout', que además inhabilita el sensor unos 30 segundos. Por eso
 * ese caso se distingue: volver a llamar a authenticateAsync() durante el
 * lockout falla igual, y ofrecer un botón de reintentar que no puede funcionar
 * es peor que no ofrecerlo.
 */
export async function pedirAutenticacion(mensaje) {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: mensaje,
      cancelLabel: 'Cancelar',
      // false a propósito: deja que Android ofrezca el PIN o el patrón del
      // dispositivo como alternativa. Es una salida más para el usuario
      // legítimo y no debilita nada, porque quien conoce el PIN del teléfono ya
      // tiene acceso a todo lo demás.
      disableDeviceFallback: false,
    })

    if (r.success) return { resultado: RESULTADO_OK, error: null }

    switch (r.error) {
      case 'user_cancel':
      case 'app_cancel':
      case 'system_cancel':
      case 'user_fallback':
        return { resultado: RESULTADO_CANCELADO, error: r.error }

      case 'lockout':
      case 'lockout_permanent':
        return { resultado: RESULTADO_BLOQUEADO, error: r.error }

      case 'not_enrolled':
      case 'not_available':
      case 'passcode_not_set':
        // El dispositivo ya no puede autenticar: quedarse pidiendo la huella
        // encerraría al usuario. Quien llama debe apagar la preferencia y
        // dejarlo entrar.
        return { resultado: RESULTADO_SIN_BIOMETRIA, error: r.error }

      default:
        return { resultado: RESULTADO_FALLIDO, error: r.error || 'desconocido' }
    }
  } catch (e) {
    // Si el módulo nativo falla, se trata como "el dispositivo no puede
    // autenticar" y no como un fallo de seguridad: la app se abre.
    return { resultado: RESULTADO_SIN_BIOMETRIA, error: e?.message || 'excepcion' }
  }
}
