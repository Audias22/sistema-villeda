import { createNativeStackNavigator } from '@react-navigation/native-stack'
import BusquedaScreen from '../screens/BusquedaScreen'
import ExpedienteDetalleScreen from '../screens/ExpedienteDetalleScreen'
import CargarDocumentoScreen from '../screens/CargarDocumentoScreen'
import EscanearDocumentoScreen from '../screens/EscanearDocumentoScreen'

const Stack = createNativeStackNavigator()

/**
 * Stack del tab Búsqueda.
 *
 * Búsqueda era una pantalla suelta del tab navigator y sus resultados solo
 * abrían un Alert. Para poder abrir el detalle real hacía falta que
 * ExpedienteDetalle estuviera al alcance de su navigator.
 *
 * SE ELIGIÓ UN STACK PROPIO Y NO NAVEGACIÓN CRUZADA ENTRE TABS. La alternativa
 * —navigate('Expedientes', { screen: 'ExpedienteDetalle' })— no cuesta ningún
 * cambio estructural, pero salta al tab Expedientes y el botón atrás del
 * detalle lleva a la lista de expedientes, no a los resultados: el usuario
 * pierde su búsqueda y tiene que rehacerla para ver el segundo resultado. Con
 * un stack propio cada tab conserva su pila y volver atrás devuelve los
 * resultados intactos.
 *
 * ⚠️ CargarDocumento y EscanearDocumento TIENEN que estar registradas acá,
 * aunque parezcan ajenas a la búsqueda: el detalle navega a CargarDocumento y
 * esa a EscanearDocumento. Si faltaran, el botón "Cargar documento" del detalle
 * rompería únicamente cuando se llega desde Búsqueda — un camino fácil de no
 * probar. ExpedienteDetalle queda así registrada en dos stacks; son rutas
 * independientes con su propio estado, no código duplicado.
 */
export default function BusquedaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BusquedaLista" component={BusquedaScreen} />
      <Stack.Screen name="ExpedienteDetalle" component={ExpedienteDetalleScreen} />
      <Stack.Screen name="CargarDocumento" component={CargarDocumentoScreen} />
      <Stack.Screen name="EscanearDocumento" component={EscanearDocumentoScreen} />
    </Stack.Navigator>
  )
}
