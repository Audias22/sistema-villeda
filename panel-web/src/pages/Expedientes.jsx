import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import Table from '../components/common/Table'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Skeleton from '../components/common/Skeleton'
import Pagination from '../components/common/Pagination'
import EmptyState from '../components/common/EmptyState'
import NuevoExpedienteModal from './NuevoExpedienteModal'
import { formatearFecha, areaClaseCss, estadoClaseCss } from '../utils/formatters'
import { FolderOpen } from 'lucide-react'

const POR_PAGINA = 10

function Expedientes() {
  const navigate = useNavigate()
  const [pagina, setPagina] = useState(1)
  const [idArea, setIdArea] = useState('')
  const [idEstado, setIdEstado] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)

  const { datos: areas } = useFetch('/catalogos/areas-juridicas')
  const { datos: estados } = useFetch('/catalogos/estados-expediente')
  const { datos, cargando, recargar } = useFetch('/expedientes', {
    params: {
      pagina,
      por_pagina: POR_PAGINA,
      id_area: idArea || undefined,
      id_estado: idEstado || undefined,
    },
  })

  return (
    <div>
      <h1>Expedientes</h1>

      <div className="filtros-barra" style={{ marginTop: 20 }}>
        <div className="campo-filtro">
          <label className="input-label">Área jurídica</label>
          <select
            className="select-field"
            value={idArea}
            onChange={(e) => {
              setIdArea(e.target.value)
              setPagina(1)
            }}
          >
            <option value="">Todas</option>
            {areas?.areas_juridicas?.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label className="input-label">Estado</label>
          <select
            className="select-field"
            value={idEstado}
            onChange={(e) => {
              setIdEstado(e.target.value)
              setPagina(1)
            }}
          >
            <option value="">Todos</option>
            {estados?.estados_expediente?.map((e) => (
              <option key={e.id_estado} value={e.id_estado}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>

        <Button variant="acento" onClick={() => setModalAbierto(true)} style={{ marginLeft: 'auto' }}>
          <Plus size={16} />
          Nuevo expediente
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <th>Expediente</th>
            <th>Cliente</th>
            <th>Área</th>
            <th>Estado</th>
            <th>Fecha creación</th>
          </tr>
        </thead>
        <tbody>
          {cargando &&
            Array.from({ length: POR_PAGINA }).map((_, i) => (
              <tr key={i}>
                <td colSpan={5}>
                  <Skeleton height="18px" />
                </td>
              </tr>
            ))}
          {!cargando &&
            datos?.expedientes?.map((exp) => (
              <tr
                key={exp.id_expediente}
                onClick={() => navigate(`/expedientes/${exp.id_expediente}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>{exp.numero_expediente}</td>
                <td>{exp.cliente_nombre || '—'}</td>
                <td>
                  <Badge tono={areaClaseCss(exp.area_nombre)}>{exp.area_nombre || '—'}</Badge>
                </td>
                <td>
                  <Badge tono={estadoClaseCss(exp.estado_nombre)}>{exp.estado_nombre || '—'}</Badge>
                </td>
                <td>{formatearFecha(exp.fecha_apertura)}</td>
              </tr>
            ))}
        </tbody>
      </Table>

      {!cargando && datos?.expedientes?.length === 0 && (
        <EmptyState icon={FolderOpen} titulo="Sin expedientes" descripcion="No se encontraron expedientes con estos filtros" />
      )}

      <Pagination paginaActual={datos?.pagina || 1} totalPaginas={datos?.total_paginas || 1} onCambiarPagina={setPagina} />

      <NuevoExpedienteModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onCreado={() => recargar()}
      />
    </div>
  )
}

export default Expedientes
