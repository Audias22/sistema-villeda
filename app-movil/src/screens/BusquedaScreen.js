import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import AppHeader from '../components/AppHeader'
import api from '../services/api'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'
import { ID_AREA_NOTARIAL, soloClasesDelModelo } from '../constants/clasificacion'

const CRITERIOS = [
  { id: 1, label: 'Cliente', icono: '👤', tipo: 'texto', placeholder: 'Nombre del cliente' },
  { id: 2, label: 'Fecha', icono: '📅', tipo: 'fecha' },
  { id: 3, label: 'Tipo de acto', icono: '⚖️', tipo: 'tipo' },
  { id: 4, label: 'Contenido', icono: '📄', tipo: 'texto', placeholder: 'Palabra clave en el documento' },
  { id: 5, label: 'No. Expediente', icono: '#️⃣', tipo: 'texto', placeholder: 'Número de expediente' },
]

function formatearFechaISO(fecha) {
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatearFechaVisible(fechaIso) {
  if (!fechaIso) return '—'
  const [yyyy, mm, dd] = fechaIso.split('-')
  return `${dd}/${mm}/${yyyy}`
}

export default function BusquedaScreen({ navigation }) {
  const [idCriterio, setIdCriterio] = useState(1)
  const [terminoTexto, setTerminoTexto] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null)
  const [idTipo, setIdTipo] = useState(null)
  const [tipos, setTipos] = useState([])
  const [mostrarTipos, setMostrarTipos] = useState(false)

  const [resultados, setResultados] = useState([])
  // Milisegundos que informa el backend en tiempo_respuesta_ms. Es el MISMO
  // valor que se guarda en la tabla busquedas, medido allá con perf_counter
  // alrededor de la consulta. La app solo lo muestra: nunca mide con su propio
  // reloj, porque eso incluiría la latencia de red y no sería el TBR.
  const [tiempoMs, setTiempoMs] = useState(null)
  const [haBuscado, setHaBuscado] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState(null)

  const criterioActivo = CRITERIOS.find((c) => c.id === idCriterio)

  useEffect(() => {
    api
      .get('/catalogos/tipos-expediente', { params: { id_area: ID_AREA_NOTARIAL } })
      // El catálogo devuelve los 6 tipos activos; acá se dejan solo los 4 que
      // el modelo puede predecir. Es una decisión de presentación de ESTA
      // pantalla: el endpoint y la base no se tocan, y Expedientes sigue
      // ofreciendo los 6 para que un expediente corregido a Mandato o
      // Matrimonio siga siendo encontrable.
      .then(({ data }) => setTipos(soloClasesDelModelo(data.tipos_expediente)))
      .catch(() => {})
  }, [])

  function cambiarCriterio(id) {
    setIdCriterio(id)
    setError(null)
    setMostrarTipos(false)
  }

  function abrirSelectorFecha() {
    DateTimePickerAndroid.open({
      value: fechaSeleccionada || new Date(),
      mode: 'date',
      onChange: (event, fecha) => {
        if (event.type === 'set' && fecha) {
          setFechaSeleccionada(fecha)
        }
      },
    })
  }

  async function handleBuscar() {
    let termino = null

    if (criterioActivo.tipo === 'texto') {
      if (!terminoTexto.trim()) {
        setError('Escribe un término de búsqueda')
        return
      }
      termino = terminoTexto.trim()
    } else if (criterioActivo.tipo === 'fecha') {
      if (!fechaSeleccionada) {
        setError('Selecciona una fecha')
        return
      }
      termino = formatearFechaISO(fechaSeleccionada)
    } else if (criterioActivo.tipo === 'tipo') {
      if (!idTipo) {
        setError('Selecciona un tipo de acto')
        return
      }
      termino = String(idTipo)
    }

    setError(null)
    setBuscando(true)

    try {
      const { data } = await api.post('/busquedas', {
        id_criterio: idCriterio,
        termino_buscado: termino,
        desde_plataforma: 'movil',
      })
      setResultados(data.resultados || [])
      setTiempoMs(data.tiempo_respuesta_ms ?? null)
      setHaBuscado(true)
    } catch (err) {
      if (err.code === 'SESSION_EXPIRED') {
        return
      }
      if (err.code === 'NETWORK_ERROR') {
        setError('Sin conexión. Revisa tu WiFi o datos móviles')
      } else {
        setError('No se pudo realizar la búsqueda. Intenta de nuevo en un momento')
      }
    } finally {
      setBuscando(false)
    }
  }

  function verDetalle(expediente) {
    // Antes esto solo abría un diálogo nativo con cuatro datos sueltos. Ahora
    // abre el detalle real, que vive en BusquedaStack junto a esta pantalla.
    //
    // Solo se pasa el id: ExpedienteDetalleScreen hace sus propias llamadas a
    // GET /expedientes/:id y a /documentos. Por eso no importa que
    // POST /busquedas devuelva una forma distinta a GET /expedientes.
    navigation.navigate('ExpedienteDetalle', { id_expediente: expediente.id_expediente })
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <AppHeader title="Búsqueda" />

      <View style={styles.selectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CRITERIOS.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, idCriterio === c.id && styles.chipActivo]}
              onPress={() => cambiarCriterio(c.id)}
            >
              <Text style={[styles.chipTexto, idCriterio === c.id && styles.chipTextoActivo]}>
                {c.icono} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.buscadorContainer}>
        <View style={styles.buscadorFila}>
          {criterioActivo.tipo === 'texto' && (
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder={criterioActivo.placeholder}
              placeholderTextColor={colors.textSecondary}
              value={terminoTexto}
              onChangeText={setTerminoTexto}
              autoCapitalize="none"
            />
          )}

          {criterioActivo.tipo === 'fecha' && (
            <TouchableOpacity style={[styles.input, styles.inputFlex]} onPress={abrirSelectorFecha}>
              <Text style={fechaSeleccionada ? styles.inputTexto : styles.inputPlaceholder}>
                {fechaSeleccionada ? formatearFechaISO(fechaSeleccionada) : 'Selecciona una fecha'}
              </Text>
            </TouchableOpacity>
          )}

          {criterioActivo.tipo === 'tipo' && (
            <TouchableOpacity
              style={[styles.input, styles.inputFlex]}
              onPress={() => setMostrarTipos((v) => !v)}
            >
              <Text style={idTipo ? styles.inputTexto : styles.inputPlaceholder}>
                {idTipo ? tipos.find((t) => t.id_tipo === idTipo)?.nombre : 'Selecciona un tipo de acto'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.botonBuscar} onPress={handleBuscar} disabled={buscando}>
            {buscando ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <Text style={styles.botonBuscarTexto}>Buscar</Text>
            )}
          </TouchableOpacity>
        </View>

        {criterioActivo.tipo === 'tipo' && mostrarTipos && (
          <View style={styles.dropdown}>
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
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.resultadosContainer}>
        {!haBuscado && !buscando && (
          <Text style={styles.estadoTexto}>Escribe un término para buscar</Text>
        )}

        {haBuscado && !buscando && resultados.length === 0 && !error && (
          <Text style={styles.estadoTexto}>Sin resultados para tu búsqueda</Text>
        )}

        {/* Solo se muestra si hubo resultados, como se pidió: una búsqueda vacía
            no informa el tiempo. El número viene del backend en
            tiempo_respuesta_ms — es el mismo que se guarda en la tabla busquedas
            y NO se mide acá, porque el reloj de la app incluiría la latencia de
            red y dejaría de ser el TBR de la tesis. */}
        {!buscando && resultados.length > 0 && tiempoMs !== null && (
          <Text style={styles.tiempoTexto}>
            {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'} · Consulta: {tiempoMs} ms
          </Text>
        )}

        {resultados.map((exp) => (
          <TouchableOpacity key={exp.id_expediente} style={styles.tarjeta} onPress={() => verDetalle(exp)}>
            <Text style={styles.tarjetaNumero}>{exp.numero_expediente}</Text>
            <Text style={styles.tarjetaDato}>{exp.cliente_nombre || '—'}</Text>
            <View style={styles.tarjetaFila}>
              <Text style={styles.tarjetaDatoSecundario}>{exp.tipo_nombre || '—'}</Text>
              <Text style={styles.tarjetaDatoSecundario}>{formatearFechaVisible(exp.fecha_apertura)}</Text>
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
  selectorContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chips: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActivo: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipTexto: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  chipTextoActivo: {
    color: colors.navy,
  },
  buscadorContainer: {
    padding: 16,
  },
  buscadorFila: {
    flexDirection: 'row',
    gap: 10,
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
  botonBuscar: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonBuscarTexto: {
    fontFamily: fontFamily.semiBold,
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
  errorContainer: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  errorTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.danger,
  },
  resultadosContainer: {
    padding: 16,
    paddingTop: 0,
    flexGrow: 1,
  },
  tiempoTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  estadoTexto: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  tarjeta: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tarjetaNumero: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
    color: colors.navy,
    marginBottom: 4,
  },
  tarjetaDato: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.navy,
    marginBottom: 6,
  },
  tarjetaFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tarjetaDatoSecundario: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.tiny,
    color: colors.textSecondary,
  },
})
