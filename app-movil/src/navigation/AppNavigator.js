import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import DashboardScreen from '../screens/DashboardScreen'
import BusquedaScreen from '../screens/BusquedaScreen'
import ReportesScreen from '../screens/ReportesScreen'
import PerfilScreen from '../screens/PerfilScreen'
import ExpedientesStack from './ExpedientesStack'
import { colors } from '../theme/colors'

const Tab = createBottomTabNavigator()

const ICONOS = {
  Dashboard: '📊',
  Expedientes: '📁',
  Busqueda: '🔍',
  Reportes: '📈',
  Perfil: '👤',
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.cream,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{ICONOS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Expedientes" component={ExpedientesStack} />
      <Tab.Screen name="Busqueda" component={BusquedaScreen} options={{ tabBarLabel: 'Búsqueda' }} />
      <Tab.Screen name="Reportes" component={ReportesScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  )
}
