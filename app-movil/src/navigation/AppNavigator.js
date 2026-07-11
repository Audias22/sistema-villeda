import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

export default function AppNavigator() {
  const { signOut } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Dashboard (Fase 4)</Text>
      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.h3,
    color: colors.navy,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
})
