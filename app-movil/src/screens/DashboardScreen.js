import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../components/AppHeader'
import api from '../services/api'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

export default function DashboardScreen() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarDashboard = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await api.get('/reportes/dashboard')
      setDatos(data)
    } catch (err) {
      setError('No pudimos cargar el dashboard. Revisa tu conexión.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDashboard()
  }, [cargarDashboard])

  const tarjetas = datos
    ? [
        { label: 'Expedientes', valor: datos.totales?.expedientes ?? 0 },
        { label: 'Documentos', valor: datos.totales?.documentos ?? 0 },
        { label: 'Clientes', valor: datos.totales?.clientes ?? 0 },
        { label: 'Búsquedas', valor: datos.totales?.busquedas ?? 0 },
        { label: 'TBR promedio', valor: `${datos.tbr?.promedio_ms ?? 0} ms` },
      ]
    : []

  const dosColumnas = tarjetas.length >= 4

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <AppHeader title="Dashboard" />

      {cargando && (
        <View style={styles.centrado}>
          <ActivityIndicator color={colors.navy} size="large" />
        </View>
      )}

      {!cargando && error && (
        <View style={styles.centrado}>
          <Text style={styles.errorTexto}>{error}</Text>
          <TouchableOpacity style={styles.boton} onPress={cargarDashboard}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!cargando && !error && (
        <ScrollView contentContainerStyle={styles.contenido}>
          <View style={[styles.grid, dosColumnas && styles.gridDosColumnas]}>
            {tarjetas.map((t) => (
              <View key={t.label} style={[styles.tarjeta, dosColumnas && styles.tarjetaMitad]}>
                <Text style={styles.tarjetaLabel}>{t.label}</Text>
                <Text style={styles.tarjetaValor}>{t.valor}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  contenido: {
    padding: 16,
  },
  grid: {
    flexDirection: 'column',
  },
  gridDosColumnas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tarjeta: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
  },
  tarjetaMitad: {
    width: '48%',
  },
  tarjetaLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  tarjetaValor: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h1,
    color: colors.navy,
  },
  errorTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  boton: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  botonTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
})
