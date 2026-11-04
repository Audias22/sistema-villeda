import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Pencil, UserRound, UserX, FolderOpen } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Skeleton from '../components/common/Skeleton'
import Table from '../components/common/Table'
import EmptyState from '../components/common/EmptyState'
import Modal from '../components/common/Modal'
import ClienteFormulario from '../components/ClienteFormulario'
import api from '../services/api'
import { formatearFecha, nombreCompletoCliente, tipoClaseCss, estadoClaseCss } from '../utils/formatters'
import './ExpedienteDetalle.css'

function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false)
  const [modalDesactivarAbierto, setModalDesactivarAbierto] = useState(false)
  const [desactivando, setDesactivando] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAnio, setFiltroAnio] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const { datos, cargando, recargar } = useFetch(`/clientes/${id}`)
  const { datos: expedientesData, cargando: cargandoExpedientes } = useFetch('/expedientes', {
    params: { id_cliente: id, por_pagina: 50 },
  })

  const cliente = datos?.cliente
  const expedientes = expedientesData?.expedientes || []

  // Los filtros trabajan sobre lo que ya se trajo, sin pedir nada mas al
  // servidor. El año se saca de la fecha de apertura para que se pueda
  // acotar sin obligar a elegir un dia exacto.
  const tiposDisponibles = useMemo(
    () => [...new Set(expedientes.map((e) => e.tipo_nombre).filter(Boolean))].sort(),
    [expedientes],
  )

  const aniosDisponibles = useMemo(
    () =>
      [...new Set(expedientes.map((e) => (e.fecha_apertura || '').slice(0, 4)).filter(Boolean))].sort(
        (a, b) => b.localeCompare(a),
      ),
    [expedientes],
  )

  const expedientesFiltrados = useMemo(
    () =>
      expedientes.filter((e) => {
        const fecha = e.fecha_apertura || ''

        if (filtroTipo && e.tipo_nombre !== filtroTipo) return false
        if (filtroAnio && !fecha.startsWith(filtroAnio)) return false
        // El rango se compara como texto porque la fecha viene en formato
        // ISO, donde el orden alfabetico coincide con el cronologico.
        if (filtroDesde && fecha < filtroDesde) return false
        if (filtroHasta && fecha > filtroHasta) return false

        return true
      }),
    [expedientes, filtroTipo, filtroAnio, filtroDesde, filtroHasta],
  )

  const hayFiltro = Boolean(filtroTipo || filtroAnio || filtroDesde || filtroHasta)

  const limpiarFiltros = () => {
    setFiltroTipo('')
    setFiltroAnio('')
    setFiltroDesde('')
    setFiltroHasta('')
  }

  const guardar = async (payload) => {
    await api.put(`/clientes/${id}`, payload)
    toast.success('Cliente actualizado')
    setModalEditarAbierto(false)
    recargar()
  }

  const desactivar = async () => {
    setDesactivando(true)
    try {
      await api.delete(`/clientes/${id}`)
      toast.success('Cliente desactivado')
      setModalDesactivarAbierto(false)
      recargar()
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo desactivar el cliente')
    } finally {
      setDesactivando(false)
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

  if (!cliente) {
    return <EmptyState icon={UserRound} titulo="Cliente no encontrado" />
  }

  return (
    <div>
      <Button variant="secundario" onClick={() => navigate('/clientes')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} />
        Volver a clientes
      </Button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>{nombreCompletoCliente(cliente)}</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secundario" onClick={() => setModalEditarAbierto(true)}>
            <Pencil size={16} />
            Editar
          </Button>
          {cliente.activo && (
            <Button variant="secundario" onClick={() => setModalDesactivarAbierto(true)}>
              <UserX size={16} />
              Desactivar
            </Button>
          )}
        </div>
      </div>

      <Card style={{ marginTop: 20 }}>
        <div className="detalle-grid">
          <div>
            <span className="label">Tipo de persona</span>
            <p>{cliente.tipo_persona === 2 ? 'Jurídica' : 'Natural'}</p>
          </div>
          <div>
            <span className="label">Estado</span>
            <p>
              <Badge tono={cliente.activo ? 'exito' : 'peligro'}>{cliente.activo ? 'Activo' : 'Inactivo'}</Badge>
            </p>
          </div>
          <div>
            <span className="label">DPI</span>
            <p>{cliente.dpi || '—'}</p>
          </div>
          <div>
            <span className="label">NIT</span>
            <p>{cliente.nit || '—'}</p>
          </div>
          <div>
            <span className="label">Teléfono</span>
            <p>{cliente.telefono || '—'}</p>
          </div>
          <div>
            <span className="label">Correo</span>
            <p>{cliente.email || '—'}</p>
          </div>
          <div>
            <span className="label">Dirección</span>
            <p>{cliente.direccion || '—'}</p>
          </div>
          {cliente.tipo_persona !== 2 && (
            <div>
              <span className="label">Fecha de nacimiento</span>
              <p>{formatearFecha(cliente.fecha_nacimiento)}</p>
            </div>
          )}
          <div>
            <span className="label">Fecha de registro</span>
            <p>{formatearFecha(cliente.fecha_registro)}</p>
          </div>
        </div>
      </Card>

      <h3 style={{ marginTop: 32, marginBottom: 12 }}>
        Expedientes de este cliente
        <span style={{ color: 'var(--texto-muted)', fontWeight: 400, marginLeft: 10 }}>
          {hayFiltro ? `${expedientesFiltrados.length} de ${expedientes.length}` : expedientes.length}
        </span>
      </h3>

      {expedientes.length > 1 && (
        <div className="filtros-barra">
          <div className="campo-filtro">
            <label className="label" htmlFor="filtro-tipo">
              Tipo de acto
            </label>
            <select
              id="filtro-tipo"
              className="select-field"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos</option>
              {tiposDisponibles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="campo-filtro" style={{ minWidth: 120 }}>
            <label className="label" htmlFor="filtro-anio">
              Año
            </label>
            <select
              id="filtro-anio"
              className="select-field"
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
            >
              <option value="">Todos</option>
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="campo-filtro" style={{ minWidth: 150 }}>
            <label className="label" htmlFor="filtro-desde">
              Desde
            </label>
            <input
              id="filtro-desde"
              type="date"
              className="input-field"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
            />
          </div>

          <div className="campo-filtro" style={{ minWidth: 150 }}>
            <label className="label" htmlFor="filtro-hasta">
              Hasta
            </label>
            <input
              id="filtro-hasta"
              type="date"
              className="input-field"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
            />
          </div>

          {hayFiltro && (
            <Button variant="secundario" onClick={limpiarFiltros}>
              Limpiar
            </Button>
          )}
        </div>
      )}

      <Table>
        <thead>
          <tr>
            <th>Expediente</th>
            <th>Título</th>
            <th>Tipo de acto</th>
            <th>Estado</th>
            <th>Fecha apertura</th>
          </tr>
        </thead>
        <tbody>
          {cargandoExpedientes &&
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={5}>
                  <Skeleton height="18px" />
                </td>
              </tr>
            ))}
          {!cargandoExpedientes &&
            expedientesFiltrados.map((exp) => (
              <tr
                key={exp.id_expediente}
                onClick={() => navigate(`/expedientes/${exp.id_expediente}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>{exp.numero_expediente}</td>
                <td>{exp.titulo}</td>
                <td>
                  <Badge tono={tipoClaseCss(exp.tipo_nombre)}>{exp.tipo_nombre || '—'}</Badge>
                </td>
                <td>
                  <Badge tono={estadoClaseCss(exp.estado_nombre)}>{exp.estado_nombre || '—'}</Badge>
                </td>
                <td>{formatearFecha(exp.fecha_apertura)}</td>
              </tr>
            ))}
        </tbody>
      </Table>

      {!cargandoExpedientes && expedientes.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          titulo="Sin expedientes"
          descripcion="Este cliente todavía no tiene expedientes asociados"
        />
      )}

      {!cargandoExpedientes && expedientes.length > 0 && expedientesFiltrados.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          titulo="Sin resultados"
          descripcion="Ningún expediente de este cliente coincide con el filtro"
        />
      )}

      <Modal isOpen={modalEditarAbierto} onClose={() => setModalEditarAbierto(false)} title="Editar cliente">
        <ClienteFormulario
          modo="editar"
          datosIniciales={cliente}
          onSubmit={guardar}
          onCancel={() => setModalEditarAbierto(false)}
        />
      </Modal>

      <Modal
        isOpen={modalDesactivarAbierto}
        onClose={() => setModalDesactivarAbierto(false)}
        title="Desactivar cliente"
      >
        <p style={{ color: 'var(--texto-secundario)' }}>
          El cliente dejará de aparecer en los listados y en el buscador de nuevos expedientes. Sus expedientes
          no se modifican y podés reactivarlo después desde el botón Editar.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Button variant="secundario" onClick={() => setModalDesactivarAbierto(false)} fullWidth>
            Cancelar
          </Button>
          <Button variant="acento" onClick={desactivar} fullWidth disabled={desactivando}>
            {desactivando ? 'Desactivando...' : 'Sí, desactivar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default ClienteDetalle
