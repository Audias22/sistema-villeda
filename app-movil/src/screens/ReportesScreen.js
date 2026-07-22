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
import api from '../services/api'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

function formatearFechaISO(fecha) {
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function ReportesScreen() {
  const [idArea, setIdArea] = useState(null)
  const [areas, setAreas] = useState([])
  const [mostrarAreas, setMostrarAreas] = useState(false)
  const [fechaDesde, setFechaDesde] = useState(null)
  const [fechaHasta, setFechaHasta] = useState(null)

  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)
  const [datos, setDatos] = useState(null)

  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [pdfUri, setPdfUri] = useState(null)

  useEffect(() => {
    api
      .get('/catalogos/areas-juridicas')
      .then(({ data }) => setAreas(data.areas_juridicas || []))
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
          id_area: idArea || undefined,
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

  function construirHtmlReporte() {
    const filasTabla = (items, campoNombre) =>
      items.map((item) => `<tr><td>${item[campoNombre]}</td><td>${item.total}</td></tr>`).join('')

    return `
      <html>
        <body style="font-family: sans-serif;">
          <h1>Reporte — Sistema Villeda</h1>
          <p>Expedientes: ${datos.totales?.expedientes ?? 0}</p>
          <p>Documentos: ${datos.totales?.documentos ?? 0}</p>
          <p>Documentos duplicados: ${datos.documentos_duplicados ?? 0}</p>

          <h2>Por área jurídica</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr><th>Área</th><th>Cantidad</th></tr>
            ${filasTabla(datos.expedientes_por_area || [], 'area')}
          </table>

          <h2>Por estado</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr><th>Estado</th><th>Cantidad</th></tr>
            ${filasTabla(datos.expedientes_por_estado || [], 'estado')}
          </table>

          <h2>Por mes</h2>
          <table border="1" cellpadding="6" cellspacing="0">
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

  async function descargarPdf() {
    setGenerandoPdf(true)
    try {
      const html = construirHtmlReporte()
      const { uri } = await Print.printToFileAsync({ html })

      const nombreArchivo = `reporte-villeda-${formatearFechaISO(new Date())}.pdf`
      const archivoTemporal = new File(uri)
      const destino = new File(Paths.document, nombreArchivo)

      if (destino.exists) {
        destino.delete()
      }
      archivoTemporal.move(destino)

      setPdfUri(destino.uri)
    } catch (err) {
      Alert.alert('Error', 'No pudimos generar el PDF. Intenta de nuevo.')
    } finally {
      setGenerandoPdf(false)
    }
  }

  async function compartirPdf() {
    if (!pdfUri) return
    try {
      await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf' })
    } catch (err) {
      Alert.alert('Error', 'No pudimos compartir el PDF. Intenta de nuevo.')
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
            onPress={() => setMostrarAreas((v) => !v)}
          >
            <Text style={idArea ? styles.inputTexto : styles.inputPlaceholder}>
              {idArea ? areas.find((a) => a.id_area === idArea)?.nombre : 'Todas las áreas'}
            </Text>
          </TouchableOpacity>
        </View>

        {mostrarAreas && (
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setIdArea(null)
                setMostrarAreas(false)
              }}
            >
              <Text style={styles.dropdownItemTexto}>Todas las áreas</Text>
            </TouchableOpacity>
            {areas.map((a) => (
              <TouchableOpacity
                key={a.id_area}
                style={styles.dropdownItem}
                onPress={() => {
                  setIdArea(a.id_area)
                  setMostrarAreas(false)
                }}
              >
                <Text style={styles.dropdownItemTexto}>{a.nombre}</Text>
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

            <Text style={styles.tituloSeccion}>Por área jurídica</Text>
            {(datos.expedientes_por_area || []).map((item) => (
              <Text key={item.area} style={styles.filaLista}>{item.area} — {item.total}</Text>
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

            <TouchableOpacity style={styles.botonCargar} onPress={descargarPdf} disabled={generandoPdf}>
              {generandoPdf ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.botonCargarTexto}>Descargar PDF</Text>
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
