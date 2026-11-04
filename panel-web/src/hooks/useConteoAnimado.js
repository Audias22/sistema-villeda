import { useEffect, useRef, useState } from 'react'

/**
 * Anima un número desde donde estaba hasta su valor final.
 *
 * Sirve para que las métricas del dashboard no aparezcan de golpe. Respeta la
 * preferencia del sistema de reducir movimiento: en ese caso devuelve el valor
 * sin animar, porque la animación es decorativa y no debe estorbar a quien la
 * tiene desactivada.
 */
export function useConteoAnimado(valor, duracion = 800) {
  const objetivo = Number(valor) || 0
  const [actual, setActual] = useState(objetivo)
  const anterior = useRef(objetivo)

  useEffect(() => {
    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    if (sinMovimiento || objetivo === anterior.current) {
      setActual(objetivo)
      anterior.current = objetivo
      return
    }

    const desde = anterior.current
    anterior.current = objetivo
    const inicio = performance.now()
    let cuadro

    const paso = (ahora) => {
      const avance = Math.min((ahora - inicio) / duracion, 1)
      const suave = 1 - Math.pow(1 - avance, 3) // desacelera al final
      setActual(desde + (objetivo - desde) * suave)
      if (avance < 1) cuadro = requestAnimationFrame(paso)
    }

    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [objetivo, duracion])

  return actual
}
