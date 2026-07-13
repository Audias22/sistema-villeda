import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import AppHeader from '../components/AppHeader'
import api from '../services/api'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024

function formatearTamano(bytes) {
  if (!bytes && bytes !== 0) return '—'
  return `${Math.round(bytes / 1024)} KB`
}

function iconoArchivo(mimeType) {
  return mimeType === 'application/pdf' ? '📄' : '🖼'
}

export default function CargarDocumentoScreen({ route, navigation }) {
  const idExpedientePreseleccionado = route.params?.id_expediente

  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null)
  const [vieneDeParams, setVieneDeParams] = useState(!!idExpedientePreseleccionado)
  const [cargandoPreseleccion, setCargandoPreseleccion] = useState(!!idExpedientePreseleccionado)
  const [errorPreseleccion, setErrorPreseleccion] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState([])

  const [archivo, setArchivo] = useState(null)
  const [errorArchivo, setErrorArchivo] = useState(null)

  const [subiendo, setSubiendo] = useState(false)
  const [errorSubida, setErrorSubida] = useState(null)

  useEffect(() => {
    if (!idExpedientePreseleccionado) return

    api
      .get(`/expedientes/${idExpedientePreseleccionado}`)
      .then(({ data }) => setExpedienteSeleccionado(data.expediente))
      .catch((err) => {
        if (err.code === 'SESSION_EXPIRED') {
          return
        }
        setErrorPreseleccion('No pudimos cargar el expediente preseleccionado.')
      })
      .finally(() => setCargandoPreseleccion(false))
  }, [idExpedientePreseleccionado])

  useEffect(() => {
    if (busqueda.trim().length < 3) {
      setResultadosBusqueda([])
      return
    }

    const timeout = setTimeout(() => {
      api
        .get('/expedientes', { params: { busqueda: busqueda.trim(), por_pagina: 8 } })
        .then(({ data }) => setResultadosBusqueda(data.expedientes || []))
        .catch((err) => {
          if (err.code === 'SESSION_EXPIRED') {
            return
          }
          setResultadosBusqueda([])
        })
    }, 400)

    return () => clearTimeout(timeout)
  }, [busqueda])

  function seleccionarExpediente(expediente) {
    setExpedienteSeleccionado(expediente)
    setBusqueda('')
    setResultadosBusqueda([])
  }

  function cambiarExpediente() {
    setExpedienteSeleccionado(null)
  }

  async function seleccionarArchivo() {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    })

    if (resultado.canceled) return

    const asset = resultado.assets[0]

    if (asset.size && asset.size > TAMANO_MAXIMO_BYTES) {
      setErrorArchivo('El archivo excede los 10 MB permitidos')
      return
    }

    setErrorArchivo(null)
    setArchivo(asset)
  }

  function quitarArchivo() {
    setArchivo(null)
    setErrorArchivo(null)
  }

  async function handleCargar() {
    setErrorSubida(null)
    setSubiendo(true)

    const formData = new FormData()
    formData.append('archivo', {
      uri: archivo.uri,
      name: archivo.name,
      type: archivo.mimeType || 'application/octet-stream',
    })
    formData.append('id_expediente', String(expedienteSeleccionado.id_expediente))

    try {
      const { data } = await api.post('/documentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const aviso = data.documento?.aviso
      Alert.alert(
        aviso ? '⚠️ Documento cargado' : 'Documento cargado correctamente',
        aviso || undefined,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (err) {
      if (err.code === 'SESSION_EXPIRED') {
        return
      }
      if (err.code === 'NETWORK_ERROR') {
        setErrorSubida('Sin conexión. Revisa tu WiFi o datos móviles')
      } else if (err.response?.data?.error?.includes('10 MB')) {
        setErrorSubida('El archivo excede los 10 MB permitidos')
      } else {
        setErrorSubida('No pudimos cargar el documento. Intenta de nuevo.')
      }
    } finally {
      setSubiendo(false)
    }
  }

  const deshabilitado = !expedienteSeleccionado || !archivo || subiendo

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <AppHeader title="Cargar documento" showBackButton />

      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.tituloSeccion}>Expediente</Text>

        {cargandoPreseleccion && (
          <View style={styles.cargandoPreseleccion}>
            <ActivityIndicator color={colors.navy} />
          </View>
        )}

        {!cargandoPreseleccion && errorPreseleccion && (
          <Text style={styles.errorTexto}>{errorPreseleccion}</Text>
        )}

        {!cargandoPreseleccion && !errorPreseleccion && expedienteSeleccionado && (
          <View style={styles.tarjetaExpediente}>
            <View style={styles.tarjetaExpedienteInfo}>
              <Text style={styles.expedienteNumero}>
                Expediente: {expedienteSeleccionado.numero_expediente}
              </Text>
              <Text style={styles.expedienteCliente}>
                Cliente: {expedienteSeleccionado.cliente_nombre || '—'}
              </Text>
            </View>
            {vieneDeParams ? (
              <Text style={styles.candado}>🔒</Text>
            ) : (
              <TouchableOpacity onPress={cambiarExpediente}>
                <Text style={styles.cambiarTexto}>Cambiar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!cargandoPreseleccion && !errorPreseleccion && !expedienteSeleccionado && (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Buscar por número de expediente..."
              placeholderTextColor={colors.textSecondary}
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {resultadosBusqueda.length > 0 && (
              <View style={styles.dropdown}>
                {resultadosBusqueda.map((exp) => (
                  <TouchableOpacity
                    key={exp.id_expediente}
                    style={styles.dropdownItem}
                    onPress={() => seleccionarExpediente(exp)}
                  >
                    <Text style={styles.dropdownItemTitulo}>{exp.numero_expediente}</Text>
                    <Text style={styles.dropdownItemSubtitulo}>
                      {exp.cliente_nombre || exp.titulo || '—'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={[styles.tituloSeccion, styles.tituloSeccionArchivo]}>Archivo</Text>

        {!archivo && (
          <TouchableOpacity style={styles.dropzone} onPress={seleccionarArchivo}>
            <Text style={styles.dropzoneEmoji}>📎</Text>
            <Text style={styles.dropzoneTexto}>Seleccionar archivo</Text>
            <Text style={styles.dropzoneSubtexto}>PDF, JPG o PNG — máximo 10 MB</Text>
          </TouchableOpacity>
        )}

        {errorArchivo && <Text style={styles.errorTextoArchivo}>{errorArchivo}</Text>}

        {archivo && (
          <View style={styles.tarjetaArchivo}>
            <Text style={styles.iconoArchivo}>{iconoArchivo(archivo.mimeType)}</Text>
            <View style={styles.tarjetaArchivoInfo}>
              <Text style={styles.nombreArchivo} numberOfLines={1}>
                {archivo.name}
              </Text>
              <Text style={styles.tamanoArchivo}>{formatearTamano(archivo.size)}</Text>
            </View>
            <TouchableOpacity style={styles.botonQuitar} onPress={quitarArchivo}>
              <Text style={styles.botonQuitarTexto}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {errorSubida && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTextoInline}>{errorSubida}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.botonCargar, deshabilitado && styles.botonCargarDeshabilitado]}
          onPress={handleCargar}
          disabled={deshabilitado}
        >
          {subiendo ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <Text style={styles.botonCargarTexto}>Cargar y procesar</Text>
          )}
        </TouchableOpacity>

        {subiendo && <Text style={styles.subiendoTexto}>Cargando y procesando...</Text>}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  contenido: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tituloSeccion: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
    marginBottom: 10,
  },
  tituloSeccionArchivo: {
    marginTop: 24,
  },
  cargandoPreseleccion: {
    paddingVertical: 12,
  },
  tarjetaExpediente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
  },
  tarjetaExpedienteInfo: {
    flex: 1,
  },
  expedienteNumero: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
    marginBottom: 4,
  },
  expedienteCliente: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  candado: {
    fontSize: fontSize.h3,
  },
  cambiarTexto: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.small,
    color: colors.gold,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemTitulo: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  dropdownItemSubtitulo: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  dropzoneEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  dropzoneTexto: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.body,
    color: colors.navy,
    marginBottom: 4,
  },
  dropzoneSubtexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  errorTextoArchivo: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.danger,
    marginTop: 8,
  },
  tarjetaArchivo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  iconoArchivo: {
    fontSize: 24,
  },
  tarjetaArchivoInfo: {
    flex: 1,
  },
  nombreArchivo: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  tamanoArchivo: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  botonQuitar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonQuitarTexto: {
    fontSize: fontSize.h3,
    color: colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorTextoInline: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.danger,
  },
  errorTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  botonCargar: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  botonCargarDeshabilitado: {
    opacity: 0.5,
  },
  botonCargarTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  subiendoTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
})
