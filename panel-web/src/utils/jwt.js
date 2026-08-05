// Decodifica el payload de un JWT sin librerias externas.
// Solo lee el contenido, NO verifica la firma (eso le toca al backend).
export function decodificarPayload(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binario = atob(relleno)
    const json = decodeURIComponent(
      Array.from(binario, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    )

    return JSON.parse(json)
  } catch {
    return null
  }
}

// El token JWT del backend expira en 15 minutos, asi que al arrancar el panel
// hay que revisar exp en vez de asumir que un token guardado sigue sirviendo.
export function tokenVigente(token) {
  if (!token) return false

  const payload = decodificarPayload(token)
  if (!payload) return false

  // Sin exp no se puede juzgar desde el cliente, se deja que el backend decida
  if (typeof payload.exp !== 'number') return true

  return payload.exp * 1000 > Date.now()
}
