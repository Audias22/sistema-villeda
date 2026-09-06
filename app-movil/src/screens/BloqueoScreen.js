/**
 * Pantalla de desbloqueo biométrico.
 *
 * Se muestra al abrir la app cuando hay una sesión guardada y el usuario
 * habilitó el desbloqueo biométrico. Reemplaza al login mientras dure el
 * bloqueo: no se superpone a la app, porque AppNavigator ni siquiera se montó
 * (ver el comentario de isAuthenticated en AuthContext.js).
 *
 * REGLA DE LA PANTALLA: SIEMPRE TIENE QUE HABER UNA SALIDA VISIBLE.
 * En cualquier estado, incluso mientras se consulta el dispositivo o durante un
 * lockout del sensor, el botón "Entrar con contraseña" está presente. Una
 * pantalla de bloqueo sin salida es la peor falla posible de esta función: deja
 * al dueño legítimo afuera de su propia app sin nada que tocar.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'
import { saveBiometriaActiva } from '../services/storage'
import {
  etiquetaBiometria,
  pedirAutenticacion,
  RESULTADO_OK,
  RESULTADO_BLOQUEADO,
  RESULTADO_SIN_BIOMETRIA,
  RESULTADO_CANCELADO,
} from '../services/biometria'

export default function BloqueoScreen() {
  const { user, signOut, desbloquear } = useAuth()

  const [etiqueta, setEtiqueta] = useState('biometría')
  const [pidiendo, setPidiendo] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  // Durante el lockout de Android el sensor queda inhabilitado unos segundos y
  // volver a llamarlo falla igual, así que se oculta el botón de reintentar:
  // un botón que no puede funcionar es peor que ningún botón.
  const [sensorBloqueado, setSensorBloqueado] = useState(false)

  // Evita que el prompt se lance dos veces si el efecto se vuelve a ejecutar.
  const yaLanzado = useRef(false)

  const intentar = useCallback(async () => {
    setPidiendo(true)
    setMensaje(null)

    const { resultado } = await pedirAutenticacion('Desbloquea Oficina Villeda')

    setPidiendo(false)

    if (resultado === RESULTADO_OK) {
      desbloquear()
      return
    }

    if (resultado === RESULTADO_SIN_BIOMETRIA) {
      // El dispositivo dejó de poder autenticar entre que se guardó la
      // preferencia y ahora. Se apaga la preferencia y se entra igual: ante la
      // duda, la app se abre.
      await saveBiometriaActiva(false)
      desbloquear()
      return
    }

    if (resultado === RESULTADO_BLOQUEADO) {
      setSensorBloqueado(true)
      setMensaje(
        'Demasiados intentos fallidos. Espera un momento e intenta de nuevo, ' +
          'o entra con tu contraseña.'
      )
      return
    }

    if (resultado === RESULTADO_CANCELADO) {
      // No se relanza el prompt solo: reintentar sobre una cancelación
      // deliberada dejaría al usuario sin forma de salir de la pantalla.
      setMensaje(null)
      return
    }

    setMensaje('No pudimos verificar tu identidad. Intenta de nuevo o entra con tu contraseña.')
  }, [desbloquear])

  // Se guarda la última versión de intentar() en un ref para que el efecto de
  // montaje pueda llamarla sin tenerla como dependencia. Sin esto el efecto se
  // volvería a ejecutar en cada render, porque desbloquear() cambia de
  // identidad cada vez que AuthProvider renderiza.
  const intentarRef = useRef(intentar)
  intentarRef.current = intentar

  // Deps vacías: esto corre UNA sola vez, al montar la pantalla.
  useEffect(() => {
    let vigente = true

    async function preparar() {
      const e = await etiquetaBiometria()
      if (vigente) setEtiqueta(e)

      if (!yaLanzado.current) {
        yaLanzado.current = true
        intentarRef.current()
      }
    }

    preparar()
    return () => {
      vigente = false
    }
  }, [])

  const nombre = user?.nombre ? `Hola, ${user.nombre}` : 'Sesión bloqueada'

  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={styles.contenido}>
        <View style={styles.sello}>
          <Text style={styles.selloTexto}>V</Text>
        </View>

        <Text style={styles.titulo}>{nombre}</Text>
        <Text style={styles.subtitulo}>
          Usa tu {etiqueta} para volver a entrar
        </Text>

        {pidiendo && (
          <View style={styles.cargando}>
            <ActivityIndicator color={colors.navy} />
          </View>
        )}

        {mensaje && (
          <View style={styles.avisoContainer}>
            <Text style={styles.avisoTexto}>{mensaje}</Text>
          </View>
        )}

        {!sensorBloqueado && (
          <TouchableOpacity
            style={[styles.boton, pidiendo && styles.botonDeshabilitado]}
            onPress={intentar}
            disabled={pidiendo}
          >
            <Text style={styles.botonTexto}>
              {pidiendo ? 'Verificando...' : `Usar ${etiqueta}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Salida siempre visible, en todos los estados. Ver la regla de arriba. */}
        <TouchableOpacity style={styles.botonSecundario} onPress={signOut}>
          <Text style={styles.botonSecundarioTexto}>Entrar con contraseña</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  contenido: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sello: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  selloTexto: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    color: colors.navy,
  },
  titulo: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h2,
    color: colors.navy,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },
  cargando: {
    marginBottom: 16,
  },
  avisoContainer: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  avisoTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.danger,
    textAlign: 'center',
  },
  boton: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  botonSecundario: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  botonSecundarioTexto: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.small,
    color: colors.navy,
    textDecorationLine: 'underline',
  },
})
