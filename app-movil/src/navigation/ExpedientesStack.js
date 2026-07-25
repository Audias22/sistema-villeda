import { createNativeStackNavigator } from '@react-navigation/native-stack'
import ExpedientesScreen from '../screens/ExpedientesScreen'
import ExpedienteDetalleScreen from '../screens/ExpedienteDetalleScreen'
import CargarDocumentoScreen from '../screens/CargarDocumentoScreen'
import EscanearDocumentoScreen from '../screens/EscanearDocumentoScreen'

const Stack = createNativeStackNavigator()

export default function ExpedientesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExpedientesLista" component={ExpedientesScreen} />
      <Stack.Screen name="ExpedienteDetalle" component={ExpedienteDetalleScreen} />
      <Stack.Screen name="CargarDocumento" component={CargarDocumentoScreen} />
      <Stack.Screen name="EscanearDocumento" component={EscanearDocumentoScreen} />
    </Stack.Navigator>
  )
}
