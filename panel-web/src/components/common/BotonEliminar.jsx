import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import './BotonEliminar.css'

/**
 * Botón de borrado que exige mantener presionado.
 *
 * Un "¿Está seguro?" se acepta por reflejo y no hace a nadie más consciente de
 * lo que está por hacer. Sostener el botón durante segundo y medio, viendo
 * cómo se llena la barra, sí: no se completa por accidente y se cancela
 * soltando, sin ningún paso extra que estorbe cuando la intención es real.
 *
 * El borrado en este sistema es definitivo y el archivo sale de R2, que no
 * tiene papelera, así que la fricción está puesta a propósito.
 */
function BotonEliminar({ onEliminar, etiqueta = 'Mantener para eliminar', duracion = 1500, deshabilitado = false }) {
  const [avance, setAvance] = useState(0)
  const [eliminando, setEliminando] = useState(false)
  const cuadro = useRef(null)
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
      if (cuadro.current) cancelAnimationFrame(cuadro.current)
    }
  }, [])

  const soltar = () => {
    if (cuadro.current) {
      cancelAnimationFrame(cuadro.current)
      cuadro.current = null
    }
    setAvance(0)
  }

  const completar = async () => {
    setAvance(0)
    setEliminando(true)
    try {
      await onEliminar()
    } finally {
      if (montado.current) setEliminando(false)
    }
  }

  const presionar = () => {
    if (eliminando || deshabilitado || cuadro.current) return

    const inicio = performance.now()

    const paso = (ahora) => {
      const fraccion = Math.min((ahora - inicio) / duracion, 1)
      setAvance(fraccion)

      if (fraccion < 1) {
        cuadro.current = requestAnimationFrame(paso)
      } else {
        cuadro.current = null
        completar()
      }
    }

    cuadro.current = requestAnimationFrame(paso)
  }

  return (
    <button
      type="button"
      className={`boton-eliminar${avance > 0 ? ' boton-eliminar-activo' : ''}`}
      disabled={eliminando || deshabilitado}
      onMouseDown={presionar}
      onMouseUp={soltar}
      onMouseLeave={soltar}
      onTouchStart={presionar}
      onTouchEnd={soltar}
      onTouchCancel={soltar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          presionar()
        }
      }}
      onKeyUp={soltar}
      onBlur={soltar}
    >
      <span className="boton-eliminar-relleno" style={{ transform: `scaleX(${avance})` }} />
      <span className="boton-eliminar-texto">
        <Trash2 size={14} />
        {eliminando ? 'Eliminando...' : etiqueta}
      </span>
    </button>
  )
}

export default BotonEliminar
