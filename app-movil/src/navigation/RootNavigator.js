import { View, Text, StyleSheet } from 'react-native'
import { useAuth } from '../context/AuthContext'
import AuthNavigator from './AuthNavigator'
import AppNavigator from './AppNavigator'
import { colors } from '../theme/colors'
import { fontSize } from '../theme/typography'

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>Cargando...</Text>
      </View>
    )
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
})
