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
