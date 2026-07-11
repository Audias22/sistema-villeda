import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

export default function PerfilScreen() {
  const { user, signOut } = useAuth()

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
