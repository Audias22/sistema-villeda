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
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import AppHeader from '../components/AppHeader'
import api from '../services/api'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

const CRITERIOS = [
  { id: 1, label: 'Cliente', icono: '👤', tipo: 'texto', placeholder: 'Nombre del cliente' },
  { id: 2, label: 'Fecha', icono: '📅', tipo: 'fecha' },
  { id: 3, label: 'Área', icono: '⚖️', tipo: 'area' },
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

export default function BusquedaScreen() {
  const [idCriterio, setIdCriterio] = useState(1)
  const [terminoTexto, setTerminoTexto] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null)
  const [idArea, setIdArea] = useState(null)
  const [areas, setAreas] = useState([])
  const [mostrarAreas, setMostrarAreas] = useState(false)

  const [resultados, setResultados] = useState([])
  const [haBuscado, setHaBuscado] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState(null)

  const criterioActivo = CRITERIOS.find((c) => c.id === idCriterio)

  useEffect(() => {
    api
      .get('/catalogos/areas-juridicas')
      .then(({ data }) => setAreas(data.areas_juridicas || []))
      .catch(() => {})
  }, [])

  function cambiarCriterio(id) {
    setIdCriterio(id)
    setError(null)
    setMostrarAreas(false)
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
    } else if (criterioActivo.tipo === 'area') {
      if (!idArea) {
        setError('Selecciona un área')
        return
      }
      termino = String(idArea)
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
    Alert.alert(
      expediente.numero_expediente,
      `Cliente: ${expediente.cliente_nombre || '—'}\nÁrea: ${expediente.area_nombre || '—'}\nEstado: ${expediente.estado_nombre || '—'}\nFecha de apertura: ${formatearFechaVisible(expediente.fecha_apertura)}`
    )
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

          {criterioActivo.tipo === 'area' && (
            <TouchableOpacity
              style={[styles.input, styles.inputFlex]}
              onPress={() => setMostrarAreas((v) => !v)}
            >
              <Text style={idArea ? styles.inputTexto : styles.inputPlaceholder}>
                {idArea ? areas.find((a) => a.id_area === idArea)?.nombre : 'Selecciona un área'}
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

        {criterioActivo.tipo === 'area' && mostrarAreas && (
          <View style={styles.dropdown}>
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

        {resultados.map((exp) => (
          <TouchableOpacity key={exp.id_expediente} style={styles.tarjeta} onPress={() => verDetalle(exp)}>
            <Text style={styles.tarjetaNumero}>{exp.numero_expediente}</Text>
            <Text style={styles.tarjetaDato}>{exp.cliente_nombre || '—'}</Text>
            <View style={styles.tarjetaFila}>
              <Text style={styles.tarjetaDatoSecundario}>{exp.area_nombre || '—'}</Text>
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
