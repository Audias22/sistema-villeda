import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import {
  getToken,
  getUser,
  saveToken,
  saveUser,
  clearAll,
  getRefreshToken,
  getBiometriaActiva,
  saveBiometriaActiva,
} from '../services/storage'
import { biometriaDisponible } from '../services/biometria'
import { onSessionExpired } from '../services/authEvents'
import { renovarSesion } from '../services/auth'

const AuthContext = createContext(null)

// ¿Se puede retomar la sesión con la huella? Hacen falta las cuatro cosas:
// usuario guardado, token de renovación, la preferencia activada y un
// dispositivo que hoy pueda autenticar de verdad. La última cubre al usuario
// que habilitó la biometría y después borró sus huellas desde Android: en ese
// caso se apaga la preferencia y se va al login con contraseña.
async function puedeUsarHuella() {
  try {
    const [usuarioGuardado, refresh, preferencia] = await Promise.all([
      getUser(),
      getRefreshToken(),
      getBiometriaActiva(),
    ])
    if (!usuarioGuardado || !refresh || !preferencia) return null

    if (!(await biometriaDisponible())) {
      await saveBiometriaActiva(false)
      return null
    }
    return usuarioGuardado
  } catch (e) {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const sessionExpiredShown = useRef(false)

  // Pantalla de bloqueo con huella. Cambió el 7 de noviembre de 2026.
  //
  // ANTES: la huella solo abría la app; el token de acceso del backend dura 15
  // minutos, así que pasado ese tiempo la huella dejaba entrar y la primera
  // petición devolvía "Sesión expirada". En la práctica la huella no servía.
  //
  // AHORA: el login entrega además un token de renovación de 30 días, guardado
  // en SecureStore. La huella es el primer paso al abrir la app y también
  // cuando vence el token de 15 minutos: pasarla pide un token de acceso nuevo
  // con el de renovación (renovarSesion). No se guarda la contraseña en ningún
  // lado. Si el token de renovación venció o el usuario fue desactivado desde
  // el panel, el backend lo rechaza y se vuelve al login con contraseña.
  //
  // motivoBloqueo distingue el texto de la pantalla: 'inicio' al abrir la app,
  // 'expirada' cuando venció la sesión mientras se usaba.
  const [bloqueado, setBloqueado] = useState(false)
  const [motivoBloqueo, setMotivoBloqueo] = useState('inicio')

  useEffect(() => {
    async function cargarSesionGuardada() {
      // Todo protegido y setIsLoading(false) en el finally: si algo lanzara
      // (getUser() hace JSON.parse), la app no puede quedar colgada en
      // "Cargando...".
      try {
        const usuarioConHuella = await puedeUsarHuella()
        if (usuarioConHuella) {
          // La huella primero, siempre. No se carga el token de acceso
          // guardado aunque siga vigente: se pide uno nuevo al desbloquear.
          setUser(usuarioConHuella)
          setMotivoBloqueo('inicio')
          setBloqueado(true)
          return
        }

        // Sin huella: comportamiento de siempre. Si el token guardado ya
        // venció, la primera petición da 401 y se va al login.
        const storedToken = await getToken()
        const storedUser = await getUser()
        if (!storedToken || !storedUser) return

        setToken(storedToken)
        setUser(storedUser)
      } catch (e) {
        // Sesión ilegible: se sigue como si no hubiera, y aparece el login.
      } finally {
        setIsLoading(false)
      }
    }

    cargarSesionGuardada()
  }, [])

  useEffect(() => {
    const unsubscribe = onSessionExpired(async () => {
      if (sessionExpiredShown.current) return
      sessionExpiredShown.current = true
      setToken(null)

      // Con huella: pantalla de bloqueo para retomar la sesión, sin alerta.
      const usuarioConHuella = await puedeUsarHuella()
      if (usuarioConHuella) {
        setUser(usuarioConHuella)
        setMotivoBloqueo('expirada')
        setBloqueado(true)
        return
      }

      // Sin huella: se cierra todo y se va al login, como antes.
      try {
        await clearAll()
      } catch (e) {
        // El estado se limpia igual.
      }
      setUser(null)
      setBloqueado(false)
      Alert.alert('Sesión expirada', 'Tu sesión expiró, inicia sesión de nuevo.')
    })
    return unsubscribe
  }, [])

  async function signIn(newUser, newToken) {
    await saveToken(newToken)
    await saveUser(newUser)
    setUser(newUser)
    setToken(newToken)
    // Entrar con contraseña es una autenticación completa: no se pide además
    // la huella en el mismo acto.
    setBloqueado(false)
    sessionExpiredShown.current = false
  }

  async function signOut() {
    // try/finally a propósito: signOut() es la salida de la pantalla de
    // bloqueo ("Usar contraseña"). Si clearAll() fallara, el estado igual se
    // limpia y el usuario llega al login.
    try {
      await clearAll()
    } catch (e) {
      // Sin acción: el estado se limpia igual abajo.
    } finally {
      setUser(null)
      setToken(null)
      setBloqueado(false)
      sessionExpiredShown.current = false
    }
  }

  /**
   * Se llama DESPUÉS de que la huella fue aceptada. Pide el token de acceso
   * nuevo. Devuelve { ok, motivo } para que la pantalla de bloqueo sepa qué
   * mostrar: con 'red' se queda y deja reintentar; con 'sin_sesion' ya se
   * mandó al login.
   */
  async function desbloquear() {
    const resultado = await renovarSesion()

    if (resultado.ok) {
      setUser(resultado.user)
      setToken(resultado.token)
      setBloqueado(false)
      sessionExpiredShown.current = false
      return { ok: true }
    }

    if (resultado.motivo === 'red') {
      return { ok: false, motivo: 'red' }
    }

    await signOut()
    Alert.alert(
      'Inicia sesión',
      'Tu sesión ya no es válida. Entra con tu usuario y contraseña.'
    )
    return { ok: false, motivo: 'sin_sesion' }
  }

  // EL GATE CORRE AL ARRANQUE EN FRÍO Y CUANDO VENCE EL TOKEN DE ACCESO (401),
  // NO AL VOLVER DEL SEGUNDO PLANO.
  //
  // Se evaluó volver a pedir la biometría con AppState cada vez que la app
  // vuelve a primer plano, y SE DESCARTÓ a propósito. No es un olvido: si
  // alguien lo agrega más adelante pensando que es una mejora obvia, va a
  // romper el uso diario de la app.
  //
  // La razón es que esta app manda al usuario afuera de sí misma por diseño y
  // todo el tiempo: expo-sharing para mandar el PDF por WhatsApp,
  // expo-document-picker para elegir un archivo, la cámara para escanear. En
  // Android el selector de documentos y la hoja de compartir CUENTAN COMO
  // SEGUNDO PLANO. Con el gate en AppState, tocar "Compartir", elegir WhatsApp
  // y volver pediría la huella otra vez, con el PDF ya generado esperando.
  // Repetido decenas de veces por día, el resultado previsible es que el
  // usuario apague la función y quedemos sin biometría del todo.
  //
  // Y la ganancia sería chica: el token de acceso dura 15 minutos y al vencer
  // vuelve a aparecer la pantalla de bloqueo, así que el peor caso de no
  // pedirla al volver del segundo plano son esos 15 minutos
  // —sobre un teléfono que además ya está detrás del bloqueo de pantalla de
  // Android—. El costo de equivocarse es asimétrico: pedir de más nos deja sin
  // función, pedir de menos deja un riesgo residual que el backend ya acota.
  //
  // Si alguna vez hiciera falta, el punto medio es un UMBRAL DE TIEMPO (volver
  // a pedirla solo si estuvo en segundo plano más de 2 o 5 minutos), no un gate
  // en cada vuelta. Ojo con un caso límite si se implementa: AppState también
  // se dispara al abrirse el propio prompt biométrico, así que hay que evitar
  // que el gate se dispare a sí mismo en bucle.

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        // La app solo se considera abierta si hay sesión Y está desbloqueada.
        //
        // ESTA ES LA PIEZA CLAVE Y NO DEBE CONVERTIRSE EN UN MODAL. La
        // alternativa tentadora —montar AppNavigator y taparlo con una pantalla
        // de bloqueo por encima— es insegura: si AppNavigator llegó a montarse,
        // el contenido real ya está en memoria y renderizado detrás, sus
        // pantallas ya dispararon sus peticiones al backend, y basta un fallo
        // de la capa superior para dejarlo a la vista. Manteniendo
        // isAuthenticated en false, AppNavigator simplemente nunca se monta: no
        // hay nada debajo que tapar.
        isAuthenticated: !!token && !bloqueado,
        // Hay una sesión para retomar con la huella. Lo usa AuthNavigator
        // para mostrar la pantalla de bloqueo en vez del login.
        bloqueado,
        motivoBloqueo,
        isLoading,
        signIn,
        signOut,
        desbloquear,
      }}
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
