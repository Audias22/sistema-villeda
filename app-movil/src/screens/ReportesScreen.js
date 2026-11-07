import { useEffect, useRef, useState } from 'react'
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

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Periodos del filtro. Los años salen de los datos reales (ver aniosDisponibles),
// así que no hay que tocar código cuando se digitalicen expedientes de otro año.
const PERIODO_TODO = 'todo'
const PERIODO_PERSONALIZADO = 'personalizado'

function formatearFechaISO(fecha) {
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatearFechaCorta(fecha) {
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`
}

// '2022-03' -> 'mar 2022'
function nombreMes(clave) {
  const [anio, mes] = String(clave).split('-')
  const indice = Number(mes) - 1
  return MESES[indice] ? `${MESES[indice]} ${anio}` : String(clave)
}

function Chip({ etiqueta, activo, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, activo && styles.chipActivo]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
    >
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{etiqueta}</Text>
    </TouchableOpacity>
  )
}

// Barras horizontales hechas con Views: no hace falta una librería de gráficas
// para esto, y así no se agrega ninguna dependencia nativa.
function Barras({ items, vacio }) {
  if (items.length === 0) {
    return <Text style={styles.vacioTexto}>{vacio}</Text>
  }
  const maximo = Math.max(1, ...items.map((i) => i.valor))
  return items.map((item) => (
    <View key={item.clave} style={styles.barraFila}>
      <View style={styles.barraEncabezado}>
        <Text style={styles.barraNombre} numberOfLines={1}>{item.nombre}</Text>
        <Text style={styles.barraValor}>{item.valor}</Text>
      </View>
      <View style={styles.barraPista}>
        <View
          style={[
            styles.barraRelleno,
            { width: `${item.valor === 0 ? 0 : Math.max(2, (item.valor / maximo) * 100)}%` },
          ]}
        />
      </View>
    </View>
  ))
}

function Metrica({ valor, etiqueta }) {
  return (
    <View style={styles.metrica}>
      <Text style={styles.metricaValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={styles.metricaEtiqueta} numberOfLines={1} adjustsFontSizeToFit>
        {etiqueta}
      </Text>
    </View>
  )
}

export default function ReportesScreen() {
  const [tipos, setTipos] = useState([])
  const [idTipo, setIdTipo] = useState(null)
  const [periodo, setPeriodo] = useState(PERIODO_TODO)
  const [fechaDesde, setFechaDesde] = useState(null)
  const [fechaHasta, setFechaHasta] = useState(null)
  const [aniosDisponibles, setAniosDisponibles] = useState([])

  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)
  const [datos, setDatos] = useState(null)

  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [pdfUri, setPdfUri] = useState(null)

  // Si el usuario toca varios filtros seguidos, solo vale la última respuesta.
  const ultimaPeticion = useRef(0)

  useEffect(() => {
    api
      .get('/catalogos/tipos-expediente', { params: { id_area: ID_AREA_NOTARIAL } })
      .then(({ data }) => setTipos(data.tipos_expediente || []))
      .catch(() => {})
  }, [])

  // Rango de fechas que corresponde al periodo elegido.
  function rangoDelPeriodo() {
    if (periodo === PERIODO_TODO) return {}
    if (periodo === PERIODO_PERSONALIZADO) {
      return {
        fecha_desde: fechaDesde ? formatearFechaISO(fechaDesde) : undefined,
        fecha_hasta: fechaHasta ? formatearFechaISO(fechaHasta) : undefined,
      }
    }
    return { fecha_desde: `${periodo}-01-01`, fecha_hasta: `${periodo}-12-31` }
  }

  // El reporte se genera solo al abrir la pantalla y cada vez que cambia un
  // filtro. Antes había que elegir fechas a mano (arrancaban en hoy) y tocar
  // "Generar reporte".
  useEffect(() => {
    if (periodo === PERIODO_PERSONALIZADO && fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      ultimaPeticion.current += 1
      setGenerando(false)
      setError('La fecha "Desde" no puede ser posterior a "Hasta".')
      setDatos(null)
      return
    }
    generarReporte()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idTipo, periodo, fechaDesde, fechaHasta])

  async function generarReporte() {
    const numero = ++ultimaPeticion.current
    setError(null)
    setGenerando(true)
    setPdfUri(null)

    try {
      const { data } = await api.get('/reportes/dashboard', {
        params: { id_tipo: idTipo || undefined, ...rangoDelPeriodo() },
      })
      if (numero !== ultimaPeticion.current) return
      setDatos(data)

      // Los años del filtro salen de la consulta sin filtros.
      if (!idTipo && periodo === PERIODO_TODO) {
        const anios = [...new Set((data.expedientes_por_mes || []).map((m) => String(m.mes).slice(0, 4)))]
        setAniosDisponibles(anios.sort((a, b) => b.localeCompare(a)))
      }
    } catch (err) {
      if (numero !== ultimaPeticion.current) return
      if (err.code === 'SESSION_EXPIRED') return
      setError('No pudimos generar el reporte. Revisa tu conexión.')
    } finally {
      if (numero === ultimaPeticion.current) setGenerando(false)
    }
  }

  function abrirSelector(valorActual, alElegir) {
    DateTimePickerAndroid.open({
      value: valorActual || new Date(),
      mode: 'date',
      onChange: (event, fecha) => {
        if (event.type === 'set' && fecha) alElegir(fecha)
      },
    })
  }

  const nombreTipo = idTipo ? tipos.find((t) => t.id_tipo === idTipo)?.nombre || 'Tipo' : 'Todos los tipos'
  let nombrePeriodo = 'todo el acervo'
  if (periodo === PERIODO_PERSONALIZADO) {
    nombrePeriodo = `${fechaDesde ? formatearFechaCorta(fechaDesde) : 'el inicio'} a ${
      fechaHasta ? formatearFechaCorta(fechaHasta) : 'hoy'
    }`
  } else if (periodo !== PERIODO_TODO) {
    nombrePeriodo = `año ${periodo}`
  }
  const resumenFiltros = `${nombreTipo} · ${nombrePeriodo}`

  // Los estados en cero no aportan nada en pantalla: se ocultan.
  const estadosConDatos = (datos?.expedientes_por_estado || []).filter((e) => e.total > 0)

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
          <p>Filtros: ${resumenFiltros}</p>
          <p>Generado: ${new Date().toLocaleString('es-GT')}</p>
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
            ${filasTabla(estadosConDatos, 'estado')}
          </table>

          <h2>Por mes</h2>
          <table>
            <tr><th>Mes</th><th>Cantidad</th></tr>
            ${filasTabla((datos.expedientes_por_mes || []).map((m) => ({ ...m, mes: nombreMes(m.mes) })), 'mes')}
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
        <View style={styles.tarjeta}>
          <Text style={styles.etiquetaFiltro}>Tipo de acto</Text>
          <View style={styles.chips}>
            <Chip etiqueta="Todos" activo={!idTipo} onPress={() => setIdTipo(null)} />
            {tipos.map((t) => (
              <Chip
                key={t.id_tipo}
                etiqueta={t.nombre}
                activo={idTipo === t.id_tipo}
                onPress={() => setIdTipo(t.id_tipo)}
              />
            ))}
          </View>

          <Text style={[styles.etiquetaFiltro, { marginTop: 14 }]}>Periodo</Text>
          <View style={styles.chips}>
            <Chip etiqueta="Todo" activo={periodo === PERIODO_TODO} onPress={() => setPeriodo(PERIODO_TODO)} />
            {aniosDisponibles.map((anio) => (
              <Chip key={anio} etiqueta={anio} activo={periodo === anio} onPress={() => setPeriodo(anio)} />
            ))}
            <Chip
              etiqueta="Personalizado"
              activo={periodo === PERIODO_PERSONALIZADO}
              onPress={() => setPeriodo(PERIODO_PERSONALIZADO)}
            />
          </View>

          {periodo === PERIODO_PERSONALIZADO && (
            <View style={styles.fechas}>
              <TouchableOpacity style={styles.fecha} onPress={() => abrirSelector(fechaDesde, setFechaDesde)}>
                <Text style={styles.fechaEtiqueta}>Desde</Text>
                <Text style={fechaDesde ? styles.fechaValor : styles.fechaVacia}>
                  {fechaDesde ? formatearFechaCorta(fechaDesde) : 'Elegir'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fecha} onPress={() => abrirSelector(fechaHasta, setFechaHasta)}>
                <Text style={styles.fechaEtiqueta}>Hasta</Text>
                <Text style={fechaHasta ? styles.fechaValor : styles.fechaVacia}>
                  {fechaHasta ? formatearFechaCorta(fechaHasta) : 'Elegir'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.resumen}>
          <Text style={styles.resumenTexto} numberOfLines={2}>{resumenFiltros}</Text>
          {generando && <ActivityIndicator color={colors.navy} size="small" />}
        </View>

        {!generando && error && (
          <View style={styles.centrado}>
            <Text style={styles.errorTexto}>{error}</Text>
            <TouchableOpacity style={styles.botonSecundario} onPress={generarReporte}>
              <Text style={styles.botonSecundarioTexto}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && datos && (
          <View style={generando ? styles.atenuado : null}>
            <View style={styles.metricas}>
              <Metrica valor={datos.totales?.expedientes ?? 0} etiqueta="Expedientes" />
              <Metrica valor={datos.totales?.documentos ?? 0} etiqueta="Documentos" />
              <Metrica valor={datos.documentos_duplicados ?? 0} etiqueta="Duplicados" />
            </View>

            <View style={styles.tarjeta}>
              <Text style={styles.tituloTarjeta}>Por tipo de acto</Text>
              <Barras
                vacio="Sin expedientes en este periodo."
                items={(datos.expedientes_por_tipo_notarial || []).map((i) => ({
                  clave: i.id_tipo,
                  nombre: i.nombre,
                  valor: i.cantidad,
                }))}
              />
            </View>

            <View style={styles.tarjeta}>
              <Text style={styles.tituloTarjeta}>Por estado</Text>
              <Barras
                vacio="Sin expedientes en este periodo."
                items={estadosConDatos.map((i) => ({ clave: i.estado, nombre: i.estado, valor: i.total }))}
              />
            </View>

            <View style={styles.tarjeta}>
              <Text style={styles.tituloTarjeta}>Por mes de apertura</Text>
              <Barras
                vacio="Sin expedientes en este periodo."
                items={(datos.expedientes_por_mes || []).map((i) => ({
                  clave: i.mes,
                  nombre: nombreMes(i.mes),
                  valor: i.total,
                }))}
              />
            </View>

            <View style={styles.tarjeta}>
              <Text style={styles.tituloTarjeta}>Tiempo de búsqueda (TBR)</Text>
              <Text style={styles.notaTarjeta}>De todas las búsquedas del sistema, sin filtros.</Text>
              <View style={styles.tbrFila}>
                <View style={styles.tbrCelda}>
                  <Text style={styles.tbrValor}>{datos.tbr?.promedio_ms ?? 0}</Text>
                  <Text style={styles.tbrEtiqueta}>Promedio (ms)</Text>
                </View>
                <View style={styles.tbrCelda}>
                  <Text style={styles.tbrValor}>{datos.tbr?.minimo_ms ?? 0}</Text>
                  <Text style={styles.tbrEtiqueta}>Mínimo (ms)</Text>
                </View>
                <View style={styles.tbrCelda}>
                  <Text style={styles.tbrValor}>{datos.tbr?.maximo_ms ?? 0}</Text>
                  <Text style={styles.tbrEtiqueta}>Máximo (ms)</Text>
                </View>
              </View>
            </View>

            <View style={styles.acciones}>
              <TouchableOpacity
                style={[styles.botonPrincipal, styles.accion]}
                onPress={generarPdf}
                disabled={generandoPdf || generando}
              >
                {generandoPdf ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <Text style={styles.botonPrincipalTexto}>Generar PDF</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonSecundario, styles.accion, !pdfUri && styles.deshabilitado]}
                onPress={compartirPdf}
                disabled={!pdfUri}
              >
                <Text style={styles.botonSecundarioTexto}>Compartir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const sombra = {
  shadowColor: colors.navy,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.cream },
  contenido: { padding: 16, paddingBottom: 32 },
  tarjeta: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...sombra,
  },
  etiquetaFiltro: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.tiny,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  chipActivo: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipTexto: { fontFamily: fontFamily.medium, fontSize: fontSize.small, color: colors.navy },
  chipTextoActivo: { color: colors.white },
  fechas: { flexDirection: 'row', gap: 10, marginTop: 12 },
  fecha: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  fechaEtiqueta: { fontFamily: fontFamily.regular, fontSize: fontSize.tiny, color: colors.textSecondary },
  fechaValor: { fontFamily: fontFamily.semiBold, fontSize: fontSize.small, color: colors.navy, marginTop: 2 },
  fechaVacia: { fontFamily: fontFamily.medium, fontSize: fontSize.small, color: colors.gold, marginTop: 2 },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  resumenTexto: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.small, color: colors.textSecondary },
  atenuado: { opacity: 0.5 },
  metricas: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metrica: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...sombra,
  },
  metricaValor: { fontFamily: fontFamily.serif, fontSize: 28, color: colors.navy },
  metricaEtiqueta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.tiny,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tituloTarjeta: { fontFamily: fontFamily.serif, fontSize: fontSize.h3, color: colors.navy, marginBottom: 12 },
  notaTarjeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.tiny,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 12,
  },
  barraFila: { marginBottom: 12 },
  barraEncabezado: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, gap: 8 },
  barraNombre: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.small, color: colors.navy },
  barraValor: { fontFamily: fontFamily.semiBold, fontSize: fontSize.small, color: colors.navy },
  barraPista: { height: 8, borderRadius: 4, backgroundColor: colors.cream, overflow: 'hidden' },
  barraRelleno: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
  vacioTexto: { fontFamily: fontFamily.regular, fontSize: fontSize.small, color: colors.textSecondary },
  tbrFila: { flexDirection: 'row', gap: 8 },
  tbrCelda: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tbrValor: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.navy },
  tbrEtiqueta: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  accion: { flex: 1 },
  botonPrincipal: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPrincipalTexto: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.navy },
  botonSecundario: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.navy,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSecundarioTexto: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.navy },
  deshabilitado: { opacity: 0.4 },
  centrado: { alignItems: 'center', paddingVertical: 24 },
  errorTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
})
