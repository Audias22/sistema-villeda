import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import {
  getToken,
  getUser,
  saveToken,
  saveUser,
  clearAll,
  getBiometriaActiva,
  saveBiometriaActiva,
} from '../services/storage'
import { biometriaDisponible } from '../services/biometria'
import { onSessionExpired } from '../services/authEvents'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const sessionExpiredShown = useRef(false)

  // Gate de desbloqueo biométrico.
  //
  // ARRANCA EN true Y SOLO BAJA A false SI HAY MOTIVO. Es la orientación
  // correcta del valor por defecto: si algo falla al detectar la biometría, la
  // app se comporta como si no existiera y el usuario entra. Al revés
  // —arrancar en false y subir a true al desbloquear— cualquier fallo dejaría
  // al usuario encerrado fuera de su propia app.
  const [desbloqueado, setDesbloqueado] = useState(true)

  useEffect(() => {
    async function cargarSesionGuardada() {
      // Todo el cuerpo va protegido y setIsLoading(false) vive en el finally.
      // Si algo acá lanzara —getUser() hace JSON.parse() y un valor corrupto en
      // el almacenamiento bastaría—, isLoading nunca bajaría y la app quedaría
      // colgada para siempre en la pantalla "Cargando...", sin login y sin
      // forma de salir salvo reinstalar. El peor final posible se evita con un
      // finally.
      try {
        const storedToken = await getToken()
        const storedUser = await getUser()

        if (!storedToken || !storedUser) return

        setToken(storedToken)
        setUser(storedUser)

        // El gate exige las TRES condiciones: sesión guardada, preferencia
        // activada, y un dispositivo que hoy pueda autenticar de verdad.
        //
        // La tercera es la que cubre al usuario que habilitó la biometría y
        // después borró todas sus huellas desde los ajustes de Android. Sin
        // ese chequeo se le mostraría un prompt que ningún dedo puede
        // resolver. Ante la duda, la app se abre.
        const preferencia = await getBiometriaActiva()
        if (preferencia) {
          const disponible = await biometriaDisponible()
          if (disponible) {
            setDesbloqueado(false)
          } else {
            // El dispositivo ya no puede autenticar: se apaga la preferencia
            // para no volver a intentarlo en cada arranque, y se entra normal.
            await saveBiometriaActiva(false)
          }
        }
      } catch (e) {
        // La sesión guardada no se pudo leer. Se sigue como si no hubiera:
        // el usuario ve el login y entra con su contraseña.
      } finally {
        setIsLoading(false)
      }
    }

    cargarSesionGuardada()
  }, [])

  // COMPORTAMIENTO ESPERADO, NO UN BUG: desbloquear con la huella y que
  // enseguida aparezca "Sesión expirada".
  //
  // La biometría protege el ACCESO A LA APP; el token JWT del backend es otra
  // cosa y dura 15 minutos. Si el usuario abre la app pasados esos 15 minutos,
  // la huella lo va a dejar entrar y la primera petición al servidor va a
  // devolver 401, con el aviso de sesión expirada de siempre. Es correcto: la
  // app se desbloqueó, la sesión con el servidor no.
  //
  // NO "ARREGLAR" ESTO haciendo que la biometría pida un token nuevo o guardando
  // la contraseña para reautenticar. Eso convertiría el desbloqueo local en
  // re-autenticación contra el servidor y crearía la ilusión de una sesión más
  // larga de la que realmente existe, que es justo lo que se decidió evitar.
  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      if (sessionExpiredShown.current) return
      sessionExpiredShown.current = true
      setUser(null)
      setToken(null)
      // Se libera el gate al perder la sesión: sin token no hay nada que
      // desbloquear, y dejarlo en false impediría llegar al login.
      setDesbloqueado(true)
      Alert.alert('Sesión expirada', 'Tu sesión expiró, inicia sesión de nuevo.')
    })
    return unsubscribe
  }, [])

  async function signIn(newUser, newToken) {
    await saveToken(newToken)
    await saveUser(newUser)
    setUser(newUser)
    setToken(newToken)
    // Entrar con contraseña es una autenticación completa: no corresponde
    // pedir además la huella en el mismo acto.
    setDesbloqueado(true)
    sessionExpiredShown.current = false
  }

  async function signOut() {
    // El borrado va en try/catch y la limpieza del estado en finally, a
    // propósito: signOut() es la ÚNICA salida de la pantalla de bloqueo. Si
    // clearAll() llegara a fallar y la excepción cortara acá, nunca se
    // ejecutaría setDesbloqueado(true) y el usuario quedaría encerrado en esa
    // pantalla sin ningún botón que lo saque. Es preferible quedarse con un
    // token huérfano en el almacenamiento —que de todos modos expira solo a los
    // 15 minutos— que dejar a alguien afuera de su propia app.
    try {
      await clearAll()
    } catch (e) {
      // Sin acción: el estado se limpia igual abajo.
    } finally {
      setUser(null)
      setToken(null)
      setDesbloqueado(true)
      sessionExpiredShown.current = false
    }
  }

  function desbloquear() {
    setDesbloqueado(true)
  }

  // EL GATE CORRE SOLO AL ARRANQUE EN FRÍO, NO AL VOLVER DEL SEGUNDO PLANO.
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
  // Y la ganancia sería chica: el token del backend dura 15 minutos y expira
  // solo, así que el peor caso de no volver a pedirla son esos 15 minutos
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
        isAuthenticated: !!token && desbloqueado,
        // Hay sesión guardada pero todavía sin desbloquear. Lo usa
        // AuthNavigator para mostrar la pantalla de bloqueo en vez del login.
        bloqueado: !!token && !desbloqueado,
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
