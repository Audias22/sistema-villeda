import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

export function useFetch(url, { params, skip = false } = {}) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(!skip)
  const [error, setError] = useState(null)

  const paramsKey = JSON.stringify(params || {})

  const recargar = useCallback(() => {
    if (skip) return
    setCargando(true)
    setError(null)

    api
      .get(url, { params })
      .then((res) => setDatos(res.data))
      .catch((err) => setError(err))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey, skip])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { datos, cargando, error, recargar }
}
