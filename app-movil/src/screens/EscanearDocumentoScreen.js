import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import * as Print from 'expo-print'
import { File } from 'expo-file-system'
import AppHeader from '../components/AppHeader'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

const ANCHO_MAXIMO_PAGINA = 2000

export default function EscanearDocumentoScreen({ route, navigation }) {
  const idExpediente = route.params?.id_expediente

  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef(null)

  const [paginas, setPaginas] = useState([])
  const [capturando, setCapturando] = useState(false)
  const [generando, setGenerando] = useState(false)

  async function tomarFoto() {
    if (capturando || !cameraRef.current) return
    setCapturando(true)

    try {
      const foto = await cameraRef.current.takePictureAsync({ quality: 1 })
      const reducida = await ImageManipulator.manipulateAsync(
        foto.uri,
        [{ resize: { width: ANCHO_MAXIMO_PAGINA } }],
        { format: ImageManipulator.SaveFormat.JPEG }
      )
      setPaginas((prev) => [...prev, { uri: reducida.uri }])
    } catch (err) {
      Alert.alert('Error', 'No pudimos capturar la foto. Intenta de nuevo.')
    } finally {
      setCapturando(false)
    }
  }

  function eliminarPagina(index) {
    setPaginas((prev) => prev.filter((_, i) => i !== index))
  }

  async function finalizar() {
    if (paginas.length === 0) return
    setGenerando(true)

    try {
      const paginasBase64 = await Promise.all(
        paginas.map((pagina) => new File(pagina.uri).base64())
      )

      const html = `
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { margin: 0; }
              .pagina { page-break-after: always; }
              .pagina:last-child { page-break-after: auto; }
              .pagina img { width: 100%; display: block; }
            </style>
          </head>
          <body>
            ${paginasBase64
              .map((base64) => `<div class="pagina"><img src="data:image/jpeg;base64,${base64}" /></div>`)
              .join('')}
          </body>
        </html>
      `

      const { uri } = await Print.printToFileAsync({ html })
      const archivoPdf = new File(uri)
      const nombreArchivo = `escaneo-${Date.now()}.pdf`

      navigation.navigate('CargarDocumento', {
        ...(idExpediente ? { id_expediente: idExpediente } : {}),
        archivoEscaneado: {
          uri: archivoPdf.uri,
          name: nombreArchivo,
          mimeType: 'application/pdf',
          size: archivoPdf.size,
        },
      })
    } catch (err) {
      Alert.alert('Error', 'No pudimos generar el PDF. Intenta de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <AppHeader title="Escanear documento" showBackButton />
        <View style={styles.centrado}>
          <ActivityIndicator color={colors.navy} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <AppHeader title="Escanear documento" showBackButton />
        <View style={styles.centrado}>
          <Text style={styles.permisoEmoji}>📷</Text>
          <Text style={styles.permisoTitulo}>Necesitamos acceso a tu cámara</Text>
          <Text style={styles.permisoTexto}>
            La usamos únicamente para escanear documentos del expediente y armarlos en un PDF.
          </Text>
          <TouchableOpacity
            style={styles.botonPermiso}
            onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
          >
            <Text style={styles.botonPermisoTexto}>
              {permission.canAskAgain ? 'Permitir acceso a la cámara' : 'Abrir configuración'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <AppHeader title="Escanear documento" showBackButton />

      <CameraView ref={cameraRef} style={styles.camara} />

      <View style={styles.controles}>
        {paginas.length > 0 && (
          <View style={styles.filaMiniaturas}>
            {paginas.map((pagina, index) => (
              <View key={pagina.uri} style={styles.miniatura}>
                <Image source={{ uri: pagina.uri }} style={styles.miniaturaImagen} />
                <TouchableOpacity
                  style={styles.botonEliminarMiniatura}
                  onPress={() => eliminarPagina(index)}
                >
                  <Text style={styles.botonEliminarMiniaturaTexto}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.filaAcciones}>
          <TouchableOpacity
            style={styles.botonCapturar}
            onPress={tomarFoto}
            disabled={capturando || generando}
          >
            {capturando ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View style={styles.botonCapturarInterior} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.botonFinalizar, (paginas.length === 0 || generando) && styles.botonFinalizarDeshabilitado]}
          onPress={finalizar}
          disabled={paginas.length === 0 || generando}
        >
          {generando ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <Text style={styles.botonFinalizarTexto}>
              Finalizar {paginas.length > 0 ? `(${paginas.length})` : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.cream,
  },
  permisoEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  permisoTitulo: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.h3,
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  permisoTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  botonPermiso: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  botonPermisoTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  camara: {
    flex: 1,
  },
  controles: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  filaMiniaturas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  miniatura: {
    width: 52,
    height: 52,
  },
  miniaturaImagen: {
    width: 52,
    height: 52,
    borderRadius: 6,
  },
  botonEliminarMiniatura: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonEliminarMiniaturaTexto: {
    color: colors.white,
    fontSize: fontSize.tiny,
    fontFamily: fontFamily.semiBold,
  },
  filaAcciones: {
    alignItems: 'center',
    marginBottom: 12,
  },
  botonCapturar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCapturarInterior: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
  },
  botonFinalizar: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonFinalizarDeshabilitado: {
    opacity: 0.5,
  },
  botonFinalizarTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
  },
})
