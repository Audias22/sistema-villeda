import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { login } from '../services/auth'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

export default function LoginScreen() {
  const { signIn } = useAuth()

  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [servidorLento, setServidorLento] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setServidorLento(false)
      return
    }

    const timer = setTimeout(() => setServidorLento(true), 15000)
    return () => clearTimeout(timer)
  }, [isLoading])

  async function handleLogin() {
    if (!usuario.trim() || !contrasena) {
      setError('Ingresa usuario y contraseña')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const { user, token } = await login(usuario.trim(), contrasena)
      await signIn(user, token)
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos')
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Sin conexión. Revisa tu WiFi o datos móviles')
      } else {
        setError('No pudimos iniciar sesión. Intenta de nuevo en un momento')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.sello}>
              <Text style={styles.selloTexto}>V</Text>
            </View>
            <Text style={styles.titulo}>Oficina Villeda</Text>
            <Text style={styles.subtitulo}>Sistema de gestión de expedientes</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu usuario"
              placeholderTextColor={colors.textSecondary}
              value={usuario}
              onChangeText={setUsuario}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <Text style={[styles.label, styles.labelEspaciado]}>Contraseña</Text>
            <View style={styles.inputContrasenaContainer}>
              <TextInput
                style={styles.inputContrasena}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor={colors.textSecondary}
                value={contrasena}
                onChangeText={setContrasena}
                secureTextEntry={!mostrarContrasena}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.ojoBoton}
                onPress={() => setMostrarContrasena((v) => !v)}
              >
                <Text style={styles.ojoTexto}>👁</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.boton} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.botonTexto}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>

            {isLoading && servidorLento && (
              <Text style={styles.mensajeLento}>
                El servidor está iniciando, esto puede tardar un momento...
              </Text>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTexto}>{error}</Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sello: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.small,
    color: colors.navy,
    marginBottom: 6,
  },
  labelEspaciado: {
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  inputContrasenaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  inputContrasena: {
    flex: 1,
    padding: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  ojoBoton: {
    paddingHorizontal: 12,
  },
  ojoTexto: {
    fontSize: fontSize.body,
  },
  boton: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  botonTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  mensajeLento: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  errorContainer: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.danger,
  },
})
