// El backend devuelve dos formatos de fecha y el navegador interpreta mal los dos:
//  - Solo fecha ('2026-11-06'): new Date() la toma como medianoche UTC, que en
//    Guatemala es el día anterior a las 6 p. m. Se arma como fecha local.
//  - Fecha y hora sin zona ('2026-11-07T01:14:00'): el backend guarda en UTC,
//    pero sin la Z el navegador la toma como hora local y la deja 6 horas adelante.
function interpretarFecha(valor) {
  if (valor instanceof Date) return valor
  const texto = String(valor)
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  if (soloFecha) {
    return new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
  }
  const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/.test(texto)
  return new Date(tieneZona ? texto : `${texto}Z`)
}

// Fecha de hoy en formato YYYY-MM-DD según la hora local. toISOString() da la
// fecha UTC, que desde las 6 p. m. en Guatemala ya es mañana.
export function hoyLocalISO() {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

export function formatearFecha(valor) {
  if (!valor) return '—'
  const fecha = interpretarFecha(valor)
  return fecha.toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: '2-digit' })
}

export function formatearFechaHora(valor) {
  if (!valor) return '—'
  const fecha = interpretarFecha(valor)
  return fecha.toLocaleString('es-GT', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function nombreCompletoCliente(cliente) {
  if (!cliente) return '—'
  if (cliente.razon_social) return cliente.razon_social
  return [cliente.primer_nombre, cliente.segundo_nombre, cliente.primer_apellido, cliente.segundo_apellido]
    .filter(Boolean)
    .join(' ')
}

export function nombreCompletoUsuario(usuario) {
  if (!usuario) return '—'
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(' ')
}

export function areaClaseCss(nombreArea) {
  if (!nombreArea) return 'info'
  const normalizado = nombreArea
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  if (normalizado.includes('notarial')) return 'notarial'
  if (normalizado.includes('civil')) return 'civil'
  if (normalizado.includes('laboral')) return 'laboral'
  if (normalizado.includes('penal')) return 'penal'
  return 'info'
}

/**
 * Tono del chip según el tipo de acto notarial.
 *
 * Se compara sobre el nombre normalizado y no sobre el id porque los listados
 * reciben `tipo_nombre` ya resuelto por el backend. "Declaración Jurada" se
 * detecta por "declaracion" para que el chip no dependa de la tilde.
 *
 * Los tipos que no estén en la lista caen en 'otro-tipo', que es también el
 * tono del tipo "Otro" del catálogo: si mañana se activa un tipo nuevo, el chip
 * se ve correcto aunque todavía no tenga color propio.
 */
export function tipoClaseCss(nombreTipo) {
  if (!nombreTipo) return 'otro-tipo'
  const normalizado = nombreTipo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  if (normalizado.includes('compraventa')) return 'compraventa'
  if (normalizado.includes('donacion')) return 'donacion'
  if (normalizado.includes('declaracion')) return 'declaracion'
  if (normalizado.includes('mandato')) return 'mandato'
  if (normalizado.includes('matrimonio')) return 'matrimonio'
  return 'otro-tipo'
}

export function estadoClaseCss(nombreEstado) {
  if (!nombreEstado) return 'info'
  const normalizado = nombreEstado
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  if (normalizado.includes('cerrado') || normalizado.includes('finalizado') || normalizado.includes('resuelto')) return 'exito'
  if (normalizado.includes('cancelado') || normalizado.includes('rechazado')) return 'peligro'
  if (normalizado.includes('pendiente') || normalizado.includes('espera')) return 'advertencia'
  return 'info'
}
