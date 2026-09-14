export function formatearFecha(valor) {
  if (!valor) return '—'
  const fecha = new Date(valor)
  return fecha.toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: '2-digit' })
}

export function formatearFechaHora(valor) {
  if (!valor) return '—'
  const fecha = new Date(valor)
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
