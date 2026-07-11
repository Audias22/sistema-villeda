import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

// AppHeader se usa en pantallas raíz de tabs (sin botón atrás) y en pantallas
// dentro de un Stack (con botón atrás). En vez de pedirle `navigation` como
// prop a cada pantalla que lo renderiza, se usa useNavigation() internamente:
// funciona igual en ambos casos porque siempre se renderiza dentro de un
// NavigationContainer, y evita pasar la prop manualmente desde cada Screen.
export default function AppHeader({ title, showBackButton = false }) {
  const navigation = useNavigation()

  return (
    <View style={styles.container}>
      {showBackButton && (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonTexto}>←</Text>
        </TouchableOpacity>
      )}
      <Image source={require('../assets/logo-villeda.jpg')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
  },
  backButtonTexto: {
    fontSize: fontSize.h2,
    color: colors.navy,
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h3,
    color: colors.navy,
    flexShrink: 1,
  },
})
