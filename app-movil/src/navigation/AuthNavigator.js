import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import LoginScreen from '../screens/LoginScreen'
import BloqueoScreen from '../screens/BloqueoScreen'

const Stack = createNativeStackNavigator()

/**
 * Stack de autenticación. Muestra la pantalla de bloqueo cuando hay una sesión
 * guardada esperando desbloqueo biométrico, y el login en cualquier otro caso.
 *
 * La decisión de cuál mostrar vive acá y no en RootNavigator para que ese siga
 * siendo la elección binaria de siempre entre "app" y "autenticación".
 */
export default function AuthNavigator() {
  const { bloqueado } = useAuth()

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {bloqueado ? (
        <Stack.Screen name="Bloqueo" component={BloqueoScreen} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}
