import { useEffect, useState } from 'react'
import { Alert, Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../context/AuthContext'
import { biometriaDisponible, etiquetaBiometria } from '../services/biometria'
import { getBiometriaActiva, saveBiometriaActiva } from '../services/storage'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

export default function PerfilScreen() {
  const { user, signOut } = useAuth()

  // El interruptor existe para que la decisión sea reversible. La app ofrece la
  // biometría una sola vez tras el primer login, y sin este control un "Ahora
  // no" accidental dejaría al usuario sin la función para siempre.
  const [biometriaSoportada, setBiometriaSoportada] = useState(false)
  const [biometriaActiva, setBiometriaActiva] = useState(false)
  const [etiqueta, setEtiqueta] = useState('biometría')

  useEffect(() => {
    let vigente = true

    async function cargar() {
      // Si el dispositivo no puede hacer biometría, la fila no se muestra: no
      // tiene sentido ofrecer un interruptor que no puede hacer nada.
      const soportada = await biometriaDisponible()
      if (!vigente) return
      setBiometriaSoportada(soportada)
      if (!soportada) return

      const [activa, e] = await Promise.all([getBiometriaActiva(), etiquetaBiometria()])
      if (!vigente) return
      setBiometriaActiva(activa)
      setEtiqueta(e)
    }

    cargar()
    return () => {
      vigente = false
    }
  }, [])

  async function cambiarBiometria(valor) {
    // Se actualiza la pantalla primero para que el interruptor responda al
    // instante; guardar en secure-store es rápido pero no inmediato.
    setBiometriaActiva(valor)
    await saveBiometriaActiva(valor)
  }

  function confirmarCerrarSesion() {
    Alert.alert('¿Cerrar sesión?', '', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, cerrar', style: 'destructive', onPress: signOut },
    ])
  }

  const nombreCompleto = `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim() || '—'

  const datos = [
    { label: 'Nombre completo', valor: nombreCompleto },
    { label: 'Usuario', valor: user?.nombre_usuario || '—' },
    { label: 'Rol', valor: user?.rol || '—' },
  ]

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <AppHeader title="Perfil" />

      <View style={styles.contenido}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/logo-villeda.jpg')} style={styles.logo} resizeMode="contain" />
        </View>

        {datos.map((d) => (
          <View key={d.label} style={styles.fila}>
            <Text style={styles.label}>{d.label}</Text>
            <Text style={styles.valor}>{d.valor}</Text>
          </View>
        ))}

        {biometriaSoportada && (
          <View style={styles.filaBiometria}>
            <View style={styles.filaBiometriaTexto}>
              <Text style={styles.label}>Desbloqueo con {etiqueta}</Text>
              <Text style={styles.ayuda}>
                {biometriaActiva
                  ? `Se pedirá tu ${etiqueta} al abrir la app`
                  : 'Se pedirá tu contraseña al abrir la app'}
              </Text>
            </View>
            <Switch
              value={biometriaActiva}
              onValueChange={cambiarBiometria}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.white}
            />
          </View>
        )}

        <TouchableOpacity style={styles.botonCerrarSesion} onPress={confirmarCerrarSesion}>
          <Text style={styles.botonCerrarSesionTexto}>Cerrar sesión</Text>
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
    padding: 20,
  },
  logoContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
  },
  fila: {
    marginBottom: 20,
  },
  filaBiometria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
    marginTop: 4,
  },
  filaBiometriaTexto: {
    flex: 1,
    paddingRight: 12,
  },
  ayuda: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.tiny,
    color: colors.textSecondary,
    marginTop: 2,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  valor: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  botonCerrarSesion: {
    marginTop: 'auto',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonCerrarSesionTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.danger,
  },
})
