import './Badge.css'

const TONOS_AREA = {
  notarial: 'notarial',
  civil: 'civil',
  laboral: 'laboral',
  penal: 'penal',
}

const TONOS_ESTADO = {
  exito: 'exito',
  peligro: 'peligro',
  advertencia: 'advertencia',
  info: 'info',
}

function Badge({ children, tono = 'info' }) {
  const clase = TONOS_AREA[tono] || TONOS_ESTADO[tono] || 'info'
  return <span className={`badge badge-${clase}`}>{children}</span>
}

export default Badge
