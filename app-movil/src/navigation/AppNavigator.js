import { StyleSheet, Text, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import DashboardScreen from '../screens/DashboardScreen'
import BusquedaScreen from '../screens/BusquedaScreen'
import PerfilScreen from '../screens/PerfilScreen'
import ExpedientesStack from './ExpedientesStack'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

const Tab = createBottomTabNavigator()

const ICONOS = {
  Dashboard: '📊',
  Expedientes: '📁',
  Busqueda: '🔍',
  Reportes: '📈',
  Perfil: '👤',
}

function ReportesPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTexto}>Reportes (Fase 4B.3)</Text>
    </View>
  )
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
      <Tab.Screen name="Reportes" component={ReportesPlaceholder} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.h3,
    color: colors.navy,
  },
})
