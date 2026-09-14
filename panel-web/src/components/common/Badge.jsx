import './Badge.css'

const TONOS_AREA = {
  notarial: 'notarial',
  civil: 'civil',
  laboral: 'laboral',
  penal: 'penal',
}

// Los seis tipos de acto notarial activos del catálogo. Los listados muestran
// el tipo desde el 13 de septiembre de 2026; el área quedó solo en la pantalla
// de detalle del expediente, donde describe en vez de filtrar.
const TONOS_TIPO = {
  compraventa: 'compraventa',
  donacion: 'donacion',
  declaracion: 'declaracion',
  mandato: 'mandato',
  matrimonio: 'matrimonio',
  'otro-tipo': 'otro-tipo',
}

const TONOS_ESTADO = {
  exito: 'exito',
  peligro: 'peligro',
  advertencia: 'advertencia',
  info: 'info',
}

function Badge({ children, tono = 'info', titulo }) {
  const clase = TONOS_AREA[tono] || TONOS_TIPO[tono] || TONOS_ESTADO[tono] || 'info'
  return <span className={`badge badge-${clase}`} title={titulo}>{children}</span>
}

export default Badge
