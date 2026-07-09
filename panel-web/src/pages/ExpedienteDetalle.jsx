import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Upload, FileText } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Skeleton from '../components/common/Skeleton'
import Table from '../components/common/Table'
import EmptyState from '../components/common/EmptyState'
import Modal from '../components/common/Modal'
import Input from '../components/common/Input'
import api from '../services/api'
import { formatearFecha, formatearFechaHora, areaClaseCss, estadoClaseCss } from '../utils/formatters'
import './ExpedienteDetalle.css'

const TRANSICIONES_VALIDAS = {
  1: [2, 3, 4],
  2: [1, 3, 4],
  3: [1, 2, 4],
  4: [5],
  5: [],
}

function ExpedienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [modalEstadoAbierto, setModalEstadoAbierto] = useState(false)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [fechaCierre, setFechaCierre] = useState(new Date().toISOString().slice(0, 10))
  const [enviando, setEnviando] = useState(false)

  const { datos: detalle, cargando, recargar } = useFetch(`/expedientes/${id}`)
  const { datos: docsData, cargando: cargandoDocs } = useFetch(`/expedientes/${id}/documentos`)
  const { datos: estadosData } = useFetch('/catalogos/estados-expediente')

  const expediente = detalle?.expediente

  const estadosDisponibles = (estadosData?.estados_expediente || []).filter((e) =>
    (TRANSICIONES_VALIDAS[expediente?.id_estado] || []).includes(e.id_estado)
  )

  const handleCambiarEstado = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const body = { id_estado: Number(nuevoEstado) }
      if (Number(nuevoEstado) === 4) {
        body.fecha_cierre = fechaCierre
      }
      await api.put(`/expedientes/${id}/estado`, body)
      toast.success('Estado actualizado')
      setModalEstadoAbierto(false)
      recargar()
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cambiar el estado')
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return (
      <div>
        <Skeleton height="28px" width="240px" />
        <div style={{ marginTop: 20 }}>
          <Skeleton height="160px" />
        </div>
      </div>
    )
  }

  if (!expediente) {
    return <EmptyState icon={FileText} titulo="Expediente no encontrado" />
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>{expediente.numero_expediente}</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secundario" onClick={() => navigate('/cargar', { state: { idExpediente: id } })}>
            <Upload size={16} />
            Cargar documento
          </Button>
          {estadosDisponibles.length > 0 && (
            <Button variant="acento" onClick={() => setModalEstadoAbierto(true)}>
              Cambiar estado
            </Button>
          )}
        </div>
      </div>

      <Card style={{ marginTop: 20 }}>
        <h3>{expediente.titulo}</h3>
        <p style={{ color: 'var(--texto-secundario)', marginTop: 8 }}>{expediente.descripcion || 'Sin descripción'}</p>

        <div className="detalle-grid">
          <div>
            <span className="label">Cliente</span>
            <p>{expediente.cliente_nombre || '—'}</p>
          </div>
          <div>
            <span className="label">Área</span>
            <p>
              <Badge tono={areaClaseCss(expediente.area_nombre)}>{expediente.area_nombre}</Badge>
            </p>
          </div>
          <div>
            <span className="label">Estado</span>
            <p>
              <Badge tono={estadoClaseCss(expediente.estado_nombre)}>{expediente.estado_nombre}</Badge>
            </p>
          </div>
          <div>
            <span className="label">Tipo</span>
            <p>{expediente.tipo_nombre}</p>
          </div>
          <div>
            <span className="label">Prioridad</span>
            <p>{expediente.prioridad_nombre}</p>
          </div>
          <div>
            <span className="label">Asignado a</span>
            <p>{expediente.usuario_asignado_nombre}</p>
          </div>
          <div>
            <span className="label">Fecha apertura</span>
            <p>{formatearFecha(expediente.fecha_apertura)}</p>
          </div>
          <div>
            <span className="label">Fecha cierre</span>
            <p>{formatearFecha(expediente.fecha_cierre)}</p>
          </div>
        </div>
      </Card>

      <h2 className="dashboard-subtitulo" style={{ marginTop: 24 }}>
        Documentos
      </h2>
      <Table>
        <thead>
          <tr>
            <th>Archivo</th>
            <th>Páginas</th>
            <th>Tamaño</th>
            <th>Fecha carga</th>
          </tr>
        </thead>
        <tbody>
          {cargandoDocs &&
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={4}>
                  <Skeleton height="18px" />
                </td>
              </tr>
            ))}
          {!cargandoDocs &&
            docsData?.documentos?.map((doc) => (
              <tr key={doc.id_documento}>
                <td>{doc.nombre_archivo_original}</td>
                <td>{doc.num_paginas ?? '—'}</td>
                <td>{doc.tamano_bytes ? `${Math.round(doc.tamano_bytes / 1024)} KB` : '—'}</td>
                <td>{formatearFechaHora(doc.fecha_carga)}</td>
              </tr>
            ))}
        </tbody>
      </Table>
      {!cargandoDocs && docsData?.documentos?.length === 0 && (
        <EmptyState icon={FileText} titulo="Sin documentos" descripcion="Este expediente no tiene documentos cargados" />
      )}

      <Modal isOpen={modalEstadoAbierto} onClose={() => setModalEstadoAbierto(false)} title="Cambiar estado">
        <form onSubmit={handleCambiarEstado} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label">Nuevo estado</label>
            <select
              className="select-field"
              value={nuevoEstado}
              onChange={(e) => setNuevoEstado(e.target.value)}
              required
            >
              <option value="">Selecciona...</option>
              {estadosDisponibles.map((e) => (
                <option key={e.id_estado} value={e.id_estado}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          {Number(nuevoEstado) === 4 && (
            <Input
              id="fecha_cierre"
              label="Fecha de cierre"
              type="date"
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
              required
            />
          )}

          <Button type="submit" variant="acento" fullWidth disabled={enviando || !nuevoEstado}>
            {enviando ? 'Guardando...' : 'Guardar'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

export default ExpedienteDetalle
