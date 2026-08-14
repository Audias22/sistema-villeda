import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Ejecuta fetchFn al montar y cada intervalMs milisegundos.
 *
 * Los errores se guardan en el estado y no se propagan: si el backend se cae un
 * momento, el intervalo sigue corriendo y se recupera solo en el próximo ciclo,
 * sin llenar la consola ni disparar toasts cada pocos segundos.
 */
export function usePolling(fetchFn, intervalMs = 15000) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // La función suele venir como literal en el render del componente, así que
  // cambiaría de identidad en cada pasada y reiniciaría el intervalo. Guardarla
  // en un ref mantiene un solo intervalo vivo durante toda la vida del hook.
  const fetchRef = useRef(fetchFn)
  useEffect(() => {
    fetchRef.current = fetchFn
  }, [fetchFn])

  const montadoRef = useRef(true)

  const recargar = useCallback(async () => {
    try {
      const resultado = await fetchRef.current()
      if (!montadoRef.current) return
      setDatos(resultado)
      setError(null)
    } catch (err) {
      if (!montadoRef.current) return
      setError(err)
    } finally {
      if (montadoRef.current) setCargando(false)
    }
  }, [])

  useEffect(() => {
    montadoRef.current = true
    recargar()

    const id = setInterval(recargar, intervalMs)

    return () => {
      montadoRef.current = false
      clearInterval(id)
    }
  }, [recargar, intervalMs])

  return { datos, cargando, error, recargar }
}

export default usePolling
