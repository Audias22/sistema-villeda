import { createNativeStackNavigator } from '@react-navigation/native-stack'
import ExpedientesScreen from '../screens/ExpedientesScreen'

const Stack = createNativeStackNavigator()

export default function ExpedientesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExpedientesLista" component={ExpedientesScreen} />
    </Stack.Navigator>
  )
}
