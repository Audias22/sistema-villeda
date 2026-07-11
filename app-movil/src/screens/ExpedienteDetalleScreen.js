import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import * as WebBrowser from 'expo-web-browser'
import AppHeader from '../components/AppHeader'
import api from '../services/api'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

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
  if (!fechaIso) return null
  const [yyyy, mm, dd] = fechaIso.split('-')
  return `${dd}/${mm}/${yyyy}`
}

function formatearFechaHoraVisible(fechaIso) {
  if (!fechaIso) return '—'
  const fecha = new Date(fechaIso)
  const dd = String(fecha.getDate()).padStart(2, '0')
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const yyyy = fecha.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatearTamano(bytes) {
  if (!bytes && bytes !== 0) return '—'
  return `${Math.round(bytes / 1024)} KB`
}

export default function ExpedienteDetalleScreen({ route, navigation }) {
  const { id_expediente } = route.params

  const [expediente, setExpediente] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [abriendoId, setAbriendoId] = useState(null)
  const primeraCargaHecha = useRef(false)

  const cargarTodo = useCallback(async () => {
    setError(null)
    try {
      const [{ data: detalleData }, { data: docsData }] = await Promise.all([
        api.get(`/expedientes/${id_expediente}`),
        api.get(`/expedientes/${id_expediente}/documentos`, { params: { por_pagina: 50 } }),
      ])
      setExpediente(detalleData.expediente)
      setDocumentos(docsData.documentos || [])
    } catch (err) {
      setError('No pudimos cargar el expediente. Revisa tu conexión.')
    } finally {
      setCargando(false)
      primeraCargaHecha.current = true
    }
  }, [id_expediente])

  useFocusEffect(
    useCallback(() => {
      if (!primeraCargaHecha.current) {
        setCargando(true)
      }
      cargarTodo()
    }, [cargarTodo])
  )

  async function abrirDocumento(documento) {
    setAbriendoId(documento.id_documento)
    try {
      const { data } = await api.get(`/documentos/${documento.id_documento}/descarga`)
      await WebBrowser.openBrowserAsync(data.url_descarga)
    } catch (err) {
      Alert.alert('Error', 'No pudimos abrir el documento. Intenta de nuevo.')
    } finally {
      setAbriendoId(null)
    }
  }

  if (cargando) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <AppHeader title="Expediente" showBackButton />
        <View style={styles.centrado}>
          <ActivityIndicator color={colors.navy} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (error && !expediente) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <AppHeader title="Expediente" showBackButton />
        <View style={styles.centrado}>
          <Text style={styles.errorTexto}>{error}</Text>
          <TouchableOpacity style={styles.boton} onPress={cargarTodo}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const area = tonoArea(expediente.area_nombre)
  const estado = tonoEstado(expediente.estado_nombre)

  const campos = [
    { label: 'Cliente', valor: expediente.cliente_nombre, completo: true },
    { label: 'Área', chip: { texto: expediente.area_nombre, tono: area } },
    { label: 'Estado', chip: { texto: expediente.estado_nombre, tono: estado } },
    { label: 'Tipo', valor: expediente.tipo_nombre },
    { label: 'Prioridad', valor: expediente.prioridad_nombre },
    { label: 'Asignado a', valor: expediente.usuario_asignado_nombre, completo: true },
    { label: 'Fecha apertura', valor: formatearFechaVisible(expediente.fecha_apertura) },
    { label: 'Fecha cierre', valor: formatearFechaVisible(expediente.fecha_cierre) },
  ].filter((c) => c.chip || c.valor)

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <AppHeader title="Expediente" showBackButton />

      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.tarjeta}>
          <Text style={styles.numero}>{expediente.numero_expediente}</Text>

          <View style={styles.grid}>
            {campos.map((campo) => (
              <View key={campo.label} style={[styles.campo, campo.completo && styles.campoCompleto]}>
                <Text style={styles.campoLabel}>{campo.label}</Text>
                {campo.chip ? (
                  <View style={[styles.chip, { backgroundColor: campo.chip.tono.fondo }]}>
                    <Text style={[styles.chipTexto, { color: campo.chip.tono.color }]}>
                      {campo.chip.texto}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.campoValor}>{campo.valor}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.botonCargar}
          onPress={() => navigation.navigate('CargarDocumento', { id_expediente })}
        >
          <Text style={styles.botonCargarTexto}>Cargar documento</Text>
        </TouchableOpacity>

        <Text style={styles.tituloSeccion}>Documentos</Text>

        {documentos.length === 0 && (
          <Text style={styles.vacioTexto}>Este expediente no tiene documentos aún</Text>
        )}

        {documentos.map((doc) => (
          <TouchableOpacity
            key={doc.id_documento}
            style={styles.filaDocumento}
            onPress={() => abrirDocumento(doc)}
            disabled={abriendoId === doc.id_documento}
          >
            <Text style={styles.nombreDocumento}>{doc.nombre_archivo_original}</Text>
            <View style={styles.filaDocumentoInfo}>
              <Text style={styles.infoDocumento}>
                {doc.num_paginas ?? '—'} páginas · {formatearTamano(doc.tamano_bytes)} ·{' '}
                {formatearFechaHoraVisible(doc.fecha_carga)}
              </Text>
              {abriendoId === doc.id_documento && (
                <ActivityIndicator color={colors.navy} size="small" style={styles.spinnerInline} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  tarjeta: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  numero: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h2,
    color: colors.navy,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  campo: {
    width: '42%',
    flexGrow: 1,
  },
  campoCompleto: {
    width: '100%',
  },
  campoLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  campoValor: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.small,
  },
  botonCargar: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  botonCargarTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  tituloSeccion: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h3,
    color: colors.navy,
    marginBottom: 12,
  },
  vacioTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  filaDocumento: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  nombreDocumento: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: '#185FA5',
    marginBottom: 4,
  },
  filaDocumentoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoDocumento: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  spinnerInline: {
    marginLeft: 4,
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
