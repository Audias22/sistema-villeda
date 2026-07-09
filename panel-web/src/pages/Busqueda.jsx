import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search as SearchIcon } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import Table from '../components/common/Table'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Skeleton from '../components/common/Skeleton'
import EmptyState from '../components/common/EmptyState'
import api from '../services/api'
import { formatearFechaHora, areaClaseCss, estadoClaseCss } from '../utils/formatters'

const CRITERIO_AREA = 3
const CRITERIO_FECHA = 2

function Busqueda() {
  const navigate = useNavigate()
  const { datos: criteriosData } = useFetch('/catalogos/criterios-busqueda')
  const { datos: areasData } = useFetch('/catalogos/areas-juridicas')
  const { datos: historialData, recargar: recargarHistorial } = useFetch('/busquedas/historial', {
    params: { por_pagina: 10 },
  })

  const [idCriterio, setIdCriterio] = useState('')
  const [termino, setTermino] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const handleBuscar = async (e) => {
    e.preventDefault()
    if (!idCriterio || !termino) {
      toast.error('Selecciona un criterio y escribe un término de búsqueda')
      return
    }

    setBuscando(true)
    try {
      const { data } = await api.post('/busquedas', {
        id_criterio: Number(idCriterio),
        termino_buscado: String(termino),
      })
      setResultado(data)
      recargarHistorial()
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo realizar la búsqueda')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div>
      <h1>Búsqueda de expedientes</h1>

      <form onSubmit={handleBuscar} className="filtros-barra" style={{ marginTop: 20, alignItems: 'flex-end' }}>
        <div className="campo-filtro">
          <label className="input-label">Criterio</label>
          <select
            className="select-field"
            value={idCriterio}
            onChange={(e) => {
              setIdCriterio(e.target.value)
              setTermino('')
            }}
          >
            <option value="">Selecciona...</option>
            {criteriosData?.criterios_busqueda?.map((c) => (
              <option key={c.id_criterio} value={c.id_criterio}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro" style={{ flex: 1 }}>
          <label className="input-label">Término de búsqueda</label>
          {Number(idCriterio) === CRITERIO_AREA ? (
            <select className="select-field" value={termino} onChange={(e) => setTermino(e.target.value)}>
              <option value="">Selecciona un área...</option>
              {areasData?.areas_juridicas?.map((a) => (
                <option key={a.id_area} value={a.id_area}>
                  {a.nombre}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input-field"
              type={Number(idCriterio) === CRITERIO_FECHA ? 'date' : 'text'}
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder="Escribe para buscar..."
            />
          )}
        </div>

        <Button type="submit" variant="acento" disabled={buscando}>
          <SearchIcon size={16} />
          {buscando ? 'Buscando...' : 'Buscar'}
        </Button>
      </form>

      {resultado && (
        <>
          <div className="busqueda-resumen">
            <Badge tono="info">Encontrado en {resultado.tiempo_respuesta_ms} ms</Badge>
            <span className="label">{resultado.total_resultados} resultado(s)</span>
          </div>

          {resultado.resultados.length === 0 ? (
            <EmptyState icon={SearchIcon} titulo="Sin resultados" descripcion="No se encontraron expedientes para tu búsqueda" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Expediente</th>
                  <th>Cliente</th>
                  <th>Área</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {resultado.resultados.map((exp) => (
                  <tr
                    key={exp.id_expediente}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/expedientes/${exp.id_expediente}`)}
                  >
                    <td>{exp.numero_expediente}</td>
                    <td>{exp.cliente_nombre || '—'}</td>
                    <td>
                      <Badge tono={areaClaseCss(exp.area_nombre)}>{exp.area_nombre || '—'}</Badge>
                    </td>
                    <td>
                      <Badge tono={estadoClaseCss(exp.estado_nombre)}>{exp.estado_nombre || '—'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}

      <h2 className="dashboard-subtitulo" style={{ marginTop: 32 }}>
        Historial de búsquedas
      </h2>
      <Table>
        <thead>
          <tr>
            <th>Término</th>
            <th>Resultados</th>
            <th>TBR</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {!historialData &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={4}>
                  <Skeleton height="18px" />
                </td>
              </tr>
            ))}
          {historialData?.busquedas?.map((b) => (
            <tr key={b.id_busqueda}>
              <td>{b.termino_buscado}</td>
              <td>{b.resultados_encontrados}</td>
              <td>{b.tiempo_respuesta_ms} ms</td>
              <td>{formatearFechaHora(b.fecha_busqueda)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export default Busqueda
