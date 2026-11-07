// Estado del documento que se está clasificando, guardado FUERA del componente.
//
// La pantalla Clasificar con IA se desmonta al navegar a otra sección, y con
// ella se perdía su estado: el trabajo seguía en el servidor, pero al volver
// la pantalla aparecía vacía. Este módulo vive mientras la pestaña esté
// abierta, así que la subida en curso y el seguimiento del trabajo siguen
// actualizándose aunque el usuario esté en otra pantalla.
//
// El id del trabajo también se copia a sessionStorage para sobrevivir a una
// recarga (F5). La barra de subida no: si se recarga a mitad de la subida, el
// navegador la corta.

const CLAVE = 'clasificacion_en_seguimiento'

const VACIO = {
  idTrabajo: null,
  nombre: '',
  inicio: null,
  subiendo: false,
  progreso: 0,
}

function leerGuardado() {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE))
    if (guardado?.idTrabajo) return { ...VACIO, ...guardado }
  } catch {
    // sessionStorage bloqueado o con basura: se arranca vacío
  }
  return { ...VACIO }
}

let estado = leerGuardado()
const oyentes = new Set()

function persistir() {
  try {
    if (estado.idTrabajo) {
      const { idTrabajo, nombre, inicio } = estado
      sessionStorage.setItem(CLAVE, JSON.stringify({ idTrabajo, nombre, inicio }))
    } else {
      sessionStorage.removeItem(CLAVE)
    }
  } catch {
    // sin almacenamiento solo se pierde la recuperación tras recargar
  }
}

export function obtenerSeguimiento() {
  return estado
}

export function actualizarSeguimiento(cambios) {
  estado = { ...estado, ...cambios }
  persistir()
  oyentes.forEach((oyente) => oyente(estado))
}

export function suscribirSeguimiento(oyente) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

// Al cerrar sesión: otro usuario en la misma pestaña no debe ver el trabajo anterior.
export function olvidarSeguimiento() {
  actualizarSeguimiento({ ...VACIO })
}
