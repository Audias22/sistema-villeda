import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../components/AppHeader'
import api from '../services/api'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

const POR_PAGINA = 20

// Sincronizado con panel-web/src/utils/formatters.js (areaClaseCss/estadoClaseCss)
// y panel-web/src/styles/globals.css — cualquier cambio de colores debe hacerse en ambos lados.
const TONOS = {
  notarial: { color: '#3B6D11', fondo: '#E8F0E4' },
  civil: { color: '#185FA5', fondo: '#E6F1FB' },
  laboral: { color: '#854F0B', fondo: '#FAEEDA' },
  penal: { color: '#A32D2D', fondo: '#FCEBEB' },
  exito: { color: '#3B6D11', fondo: '#E8F0E4' },
  peligro: { color: '#A32D2D', fondo: '#FCEBEB' },
  advertencia: { color: '#854F0B', fondo: '#FAEEDA' },
  info: { color: '#185FA5', fondo: '#E6F1FB' },
}

function normalizar(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function tonoArea(nombreArea) {
  const n = normalizar(nombreArea)
  if (n.includes('notarial')) return TONOS.notarial
  if (n.includes('civil')) return TONOS.civil
  if (n.includes('laboral')) return TONOS.laboral
  if (n.includes('penal')) return TONOS.penal
  return TONOS.info
}

function tonoEstado(nombreEstado) {
  const n = normalizar(nombreEstado)
  if (n.includes('cerrado') || n.includes('finalizado') || n.includes('resuelto')) return TONOS.exito
  if (n.includes('cancelado') || n.includes('rechazado')) return TONOS.peligro
  if (n.includes('pendiente') || n.includes('espera')) return TONOS.advertencia
  return TONOS.info
}

function formatearFechaVisible(fechaIso) {
  if (!fechaIso) return '—'
  const [yyyy, mm, dd] = fechaIso.split('-')
  return `${dd}/${mm}/${yyyy}`
}

export default function ExpedientesScreen({ navigation }) {
  const [expedientes, setExpedientes] = useState([])
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState(null)

  const hayMas = pagina < totalPaginas

  const cargarPagina = useCallback(async (numeroPagina, modoInicial) => {
    if (modoInicial) {
      setCargando(true)
    } else {
      setCargandoMas(true)
    }
    setError(null)

    try {
      const { data } = await api.get('/expedientes', {
        params: { pagina: numeroPagina, por_pagina: POR_PAGINA },
      })

      setExpedientes((actuales) =>
        modoInicial ? data.expedientes || [] : [...actuales, ...(data.expedientes || [])]
      )
      setPagina(data.pagina || numeroPagina)
      setTotalPaginas(data.total_paginas || 1)
    } catch (err) {
      if (err.code === 'SESSION_EXPIRED') {
        return
      }
      setError('No pudimos cargar los expedientes. Revisa tu conexión.')
    } finally {
      setCargando(false)
      setCargandoMas(false)
    }
  }, [])

  useEffect(() => {
    cargarPagina(1, true)
  }, [cargarPagina])

  function handleCargarMas() {
    cargarPagina(pagina + 1, false)
  }

  function handleReintentar() {
    cargarPagina(1, true)
  }

  function verDetalle(expediente) {
    navigation.navigate('ExpedienteDetalle', { id_expediente: expediente.id_expediente })
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <AppHeader title="Expedientes" />

      {cargando && expedientes.length === 0 && (
        <View style={styles.centrado}>
          <ActivityIndicator color={colors.navy} size="large" />
        </View>
      )}

      {!cargando && error && expedientes.length === 0 && (
        <View style={styles.centrado}>
          <Text style={styles.errorTexto}>{error}</Text>
          <TouchableOpacity style={styles.boton} onPress={handleReintentar}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!cargando && !error && expedientes.length === 0 && (
        <View style={styles.centrado}>
          <Text style={styles.vacioTexto}>No hay expedientes todavía</Text>
        </View>
      )}

      {expedientes.length > 0 && (
        <ScrollView contentContainerStyle={styles.contenido}>
          {expedientes.map((exp) => {
            const area = tonoArea(exp.area_nombre)
            const estado = tonoEstado(exp.estado_nombre)
            return (
              <TouchableOpacity
                key={exp.id_expediente}
                style={styles.tarjeta}
                onPress={() => verDetalle(exp)}
              >
                <Text style={styles.numero}>{exp.numero_expediente}</Text>
                <Text style={styles.cliente}>{exp.cliente_nombre || '—'}</Text>
                <View style={styles.chips}>
                  <View style={[styles.chip, { backgroundColor: area.fondo }]}>
                    <Text style={[styles.chipTexto, { color: area.color }]}>
                      {exp.area_nombre || '—'}
                    </Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: estado.fondo }]}>
                    <Text style={[styles.chipTexto, { color: estado.color }]}>
                      {exp.estado_nombre || '—'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.fecha}>
                  Abierto el {formatearFechaVisible(exp.fecha_apertura)}
                </Text>
              </TouchableOpacity>
            )
          })}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTextoInline}>{error}</Text>
              <TouchableOpacity style={styles.boton} onPress={handleCargarMas}>
                <Text style={styles.botonTexto}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {!error && hayMas && (
            <TouchableOpacity style={styles.botonCargarMas} onPress={handleCargarMas} disabled={cargandoMas}>
              {cargandoMas ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.botonCargarMasTexto}>Cargar más</Text>
              )}
            </TouchableOpacity>
          )}

          {!error && !hayMas && (
            <Text style={styles.sinMasTexto}>No hay más expedientes</Text>
          )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tarjeta: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  numero: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h3,
    color: colors.navy,
    marginBottom: 4,
  },
  cliente: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.small,
  },
  fecha: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  errorTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  errorTextoInline: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 10,
  },
  vacioTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
  botonCargarMas: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  botonCargarMasTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  sinMasTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
})
