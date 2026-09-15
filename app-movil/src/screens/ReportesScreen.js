import { useEffect, useState } from 'react'
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
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import AppHeader from '../components/AppHeader'
import { LOGO_BASE64 } from '../assets/logoBase64'
import api from '../services/api'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'
import { ID_AREA_NOTARIAL } from '../constants/clasificacion'

function formatearFechaISO(fecha) {
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function ReportesScreen() {
  const [idTipo, setIdTipo] = useState(null)
  const [tipos, setTipos] = useState([])
  const [mostrarTipos, setMostrarTipos] = useState(false)
  const [fechaDesde, setFechaDesde] = useState(null)
  const [fechaHasta, setFechaHasta] = useState(null)

  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)
  const [datos, setDatos] = useState(null)

  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [pdfUri, setPdfUri] = useState(null)

  useEffect(() => {
    api
      .get('/catalogos/tipos-expediente', { params: { id_area: ID_AREA_NOTARIAL } })
      .then(({ data }) => setTipos(data.tipos_expediente || []))
      .catch(() => {})
  }, [])

  function abrirSelectorFechaDesde() {
    DateTimePickerAndroid.open({
      value: fechaDesde || new Date(),
      mode: 'date',
      onChange: (event, fecha) => {
        if (event.type === 'set' && fecha) {
          setFechaDesde(fecha)
        }
      },
    })
  }

  function abrirSelectorFechaHasta() {
    DateTimePickerAndroid.open({
      value: fechaHasta || new Date(),
      mode: 'date',
      onChange: (event, fecha) => {
        if (event.type === 'set' && fecha) {
          setFechaHasta(fecha)
        }
      },
    })
  }

  async function generarReporte() {
    setError(null)
    setGenerando(true)
    setDatos(null)
    setPdfUri(null)

    try {
      const { data } = await api.get('/reportes/dashboard', {
        params: {
          id_tipo: idTipo || undefined,
          fecha_desde: fechaDesde ? formatearFechaISO(fechaDesde) : undefined,
          fecha_hasta: fechaHasta ? formatearFechaISO(fechaHasta) : undefined,
        },
      })
      setDatos(data)
    } catch (err) {
      if (err.code === 'SESSION_EXPIRED') {
        return
      }
      setError('No pudimos generar el reporte. Revisa tu conexión.')
    } finally {
      setGenerando(false)
    }
  }

  // El logo viene incrustado como constante (ver src/assets/logoBase64.js). No se
  // resuelve el asset ni se descarga nada: Image.resolveAssetSource() devuelve un
  // nombre de recurso drawable en un build de release, no una URL, y
  // File.downloadFileAsync() no puede consumirlo. Devuelve null si por lo que sea
  // la constante no esta disponible, para que el reporte se genere sin membrete.
  function obtenerLogoBase64() {
    if (typeof LOGO_BASE64 === 'string' && LOGO_BASE64.length > 0) {
      return LOGO_BASE64
    }
    return null
  }

  function construirHtmlReporte(logoBase64) {
    // campoTotal existe porque expedientes_por_tipo_notarial usa 'cantidad'
    // mientras que las demás listas del dashboard usan 'total'.
    const filasTabla = (items, campoNombre, campoTotal = 'total') =>
      items.map((item) => `<tr><td>${item[campoNombre]}</td><td>${item[campoTotal]}</td></tr>`).join('')

    // Si el logo no esta disponible el reporte se genera igual, sin membrete.
    // Un reporte sin logo es mucho mejor que ningun reporte.
    const membrete = logoBase64 ? `<img src="data:image/jpeg;base64,${logoBase64}" />` : ''

    return `
      <html>
        <head>
          <style>
            @page { margin: 1cm; }
            body { font-family: sans-serif; font-size: 11px; margin: 0; }
            .encabezado { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
            .encabezado img { width: 45px; height: 45px; }
            h1 { font-size: 15px; margin: 0; }
            h2 { font-size: 12px; margin: 8px 0 3px; }
            p { margin: 1px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 4px; page-break-inside: avoid; }
            th, td { border: 1px solid #999; padding: 3px 6px; font-size: 10px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="encabezado">
            ${membrete}
            <h1>Reporte — Sistema Villeda</h1>
          </div>
          <p>Expedientes: ${datos.totales?.expedientes ?? 0}</p>
          <p>Documentos: ${datos.totales?.documentos ?? 0}</p>
          <p>Documentos duplicados: ${datos.documentos_duplicados ?? 0}</p>

          <h2>Por tipo de acto</h2>
          <table>
            <tr><th>Tipo de acto</th><th>Cantidad</th></tr>
            ${filasTabla(datos.expedientes_por_tipo_notarial || [], 'nombre', 'cantidad')}
          </table>

          <h2>Por estado</h2>
          <table>
            <tr><th>Estado</th><th>Cantidad</th></tr>
            ${filasTabla(datos.expedientes_por_estado || [], 'estado')}
          </table>

          <h2>Por mes</h2>
          <table>
            <tr><th>Mes</th><th>Cantidad</th></tr>
            ${filasTabla(datos.expedientes_por_mes || [], 'mes')}
          </table>

          <h2>Tiempo de búsqueda (TBR)</h2>
          <p>Promedio: ${datos.tbr?.promedio_ms ?? 0} ms</p>
          <p>Mínimo: ${datos.tbr?.minimo_ms ?? 0} ms</p>
          <p>Máximo: ${datos.tbr?.maximo_ms ?? 0} ms</p>
        </body>
      </html>
    `
  }

  async function generarPdf() {
    setGenerandoPdf(true)
    // paso nombra la etapa en curso para que el Alert diga que fue lo que fallo
    // en vez de un mensaje generico. El catch de antes se tragaba el error y por
    // eso el bug del logo sobrevivio tres builds sin diagnostico.
    let paso = 'armar el contenido del reporte'

    try {
      const logoBase64 = obtenerLogoBase64()
      const html = construirHtmlReporte(logoBase64)

      paso = 'crear el archivo PDF'
      const { uri } = await Print.printToFileAsync({ html })

      paso = 'guardar el PDF en el dispositivo'
      const nombreArchivo = `reporte-villeda-${formatearFechaISO(new Date())}.pdf`
      const archivoTemporal = new File(uri)
      const destino = new File(Paths.document, nombreArchivo)

      if (destino.exists) {
        destino.delete()
      }
      archivoTemporal.move(destino)

      setPdfUri(destino.uri)
      Alert.alert('PDF generado', 'El reporte está listo. Usa "Compartir" para guardarlo o enviarlo.')
    } catch (err) {
      console.error(`[Reportes] Fallo al ${paso}:`, err)
      Alert.alert('Error', `No pudimos ${paso}. Detalle: ${err?.message || 'error desconocido'}`)
    } finally {
      setGenerandoPdf(false)
    }
  }

  async function compartirPdf() {
    if (!pdfUri) return
    try {
      await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf' })
    } catch (err) {
      console.error('[Reportes] Fallo al compartir el PDF:', err)
      Alert.alert('Error', `No pudimos compartir el PDF. Detalle: ${err?.message || 'error desconocido'}`)
    }
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <AppHeader title="Reportes" />

      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.tituloSeccion}>Filtros</Text>

        <View style={styles.filtroFila}>
          <TouchableOpacity
            style={[styles.input, styles.inputFlex]}
            onPress={() => setMostrarTipos((v) => !v)}
          >
            <Text style={idTipo ? styles.inputTexto : styles.inputPlaceholder}>
              {idTipo ? tipos.find((t) => t.id_tipo === idTipo)?.nombre : 'Todos los tipos'}
            </Text>
          </TouchableOpacity>
        </View>

        {mostrarTipos && (
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setIdTipo(null)
                setMostrarTipos(false)
              }}
            >
              <Text style={styles.dropdownItemTexto}>Todos los tipos</Text>
            </TouchableOpacity>
            {tipos.map((t) => (
              <TouchableOpacity
                key={t.id_tipo}
                style={styles.dropdownItem}
                onPress={() => {
                  setIdTipo(t.id_tipo)
                  setMostrarTipos(false)
                }}
              >
                <Text style={styles.dropdownItemTexto}>{t.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.filtroFila}>
          <TouchableOpacity style={[styles.input, styles.inputFlex]} onPress={abrirSelectorFechaDesde}>
            <Text style={fechaDesde ? styles.inputTexto : styles.inputPlaceholder}>
              {fechaDesde ? formatearFechaISO(fechaDesde) : 'Desde'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.input, styles.inputFlex]} onPress={abrirSelectorFechaHasta}>
            <Text style={fechaHasta ? styles.inputTexto : styles.inputPlaceholder}>
              {fechaHasta ? formatearFechaISO(fechaHasta) : 'Hasta'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.botonCargar} onPress={generarReporte} disabled={generando}>
          {generando ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <Text style={styles.botonCargarTexto}>Generar reporte</Text>
          )}
        </TouchableOpacity>

        {generando && (
          <View style={styles.centrado}>
            <ActivityIndicator color={colors.navy} size="large" />
          </View>
        )}

        {!generando && error && (
          <View style={styles.centrado}>
            <Text style={styles.errorTexto}>{error}</Text>
            <TouchableOpacity style={styles.boton} onPress={generarReporte}>
              <Text style={styles.botonTexto}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!generando && !error && datos && (
          <View>
            <View style={styles.gridTarjetas}>
              <View style={styles.tarjetaMetrica}>
                <Text style={styles.tarjetaMetricaValor}>{datos.totales?.expedientes ?? 0}</Text>
                <Text style={styles.tarjetaMetricaLabel}>Expedientes</Text>
              </View>
              <View style={styles.tarjetaMetrica}>
                <Text style={styles.tarjetaMetricaValor}>{datos.totales?.documentos ?? 0}</Text>
                <Text style={styles.tarjetaMetricaLabel}>Documentos</Text>
              </View>
              <View style={styles.tarjetaMetrica}>
                <Text style={styles.tarjetaMetricaValor}>{datos.documentos_duplicados ?? 0}</Text>
                <Text style={styles.tarjetaMetricaLabel}>Duplicados</Text>
              </View>
            </View>

            <Text style={styles.tituloSeccion}>Por tipo de acto</Text>
            {(datos.expedientes_por_tipo_notarial || []).map((item) => (
              <Text key={item.id_tipo} style={styles.filaLista}>{item.nombre} — {item.cantidad}</Text>
            ))}

            <Text style={styles.tituloSeccion}>Por estado</Text>
            {(datos.expedientes_por_estado || []).map((item) => (
              <Text key={item.estado} style={styles.filaLista}>{item.estado} — {item.total}</Text>
            ))}

            <Text style={styles.tituloSeccion}>Por mes</Text>
            {(datos.expedientes_por_mes || []).map((item) => (
              <Text key={item.mes} style={styles.filaLista}>{item.mes} — {item.total}</Text>
            ))}

            <Text style={styles.tituloSeccion}>Tiempo de búsqueda (TBR)</Text>
            <Text style={styles.filaLista}>Promedio: {datos.tbr?.promedio_ms ?? 0} ms</Text>
            <Text style={styles.filaLista}>Mínimo: {datos.tbr?.minimo_ms ?? 0} ms</Text>
            <Text style={styles.filaLista}>Máximo: {datos.tbr?.maximo_ms ?? 0} ms</Text>

            <TouchableOpacity style={styles.botonCargar} onPress={generarPdf} disabled={generandoPdf}>
              {generandoPdf ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.botonCargarTexto}>Generar PDF</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonCompartir, !pdfUri && styles.botonCompartirDeshabilitado]}
              onPress={compartirPdf}
              disabled={!pdfUri}
            >
              <Text style={styles.botonCompartirTexto}>Compartir</Text>
            </TouchableOpacity>
          </View>
        )}
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
    padding: 16,
  },
  centrado: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 28,
  },
  tituloSeccion: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h3,
    color: colors.navy,
    marginBottom: 12,
    marginTop: 20,
  },
  filtroFila: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  inputFlex: {
    flex: 1,
  },
  inputTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  inputPlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  dropdown: {
    marginBottom: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
  },
  botonCargar: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  botonCargarTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
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
  gridTarjetas: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  tarjetaMetrica: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tarjetaMetricaValor: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h2,
    color: colors.navy,
    marginBottom: 4,
  },
  tarjetaMetricaLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filaLista: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.navy,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  botonCompartir: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  botonCompartirDeshabilitado: {
    opacity: 0.5,
  },
  botonCompartirTexto: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.gold,
  },
})
