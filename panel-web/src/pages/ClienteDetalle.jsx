import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Pencil, UserRound, UserX, FolderOpen } from 'lucide-react'
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
import { formatearFecha, nombreCompletoCliente, areaClaseCss, estadoClaseCss } from '../utils/formatters'
import './ExpedienteDetalle.css'

function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false)
  const [modalDesactivarAbierto, setModalDesactivarAbierto] = useState(false)
  const [desactivando, setDesactivando] = useState(false)

  const { datos, cargando, recargar } = useFetch(`/clientes/${id}`)
  const { datos: expedientesData, cargando: cargandoExpedientes } = useFetch('/expedientes', {
    params: { id_cliente: id, por_pagina: 50 },
  })

  const cliente = datos?.cliente
  const expedientes = expedientesData?.expedientes || []

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

      <h3 style={{ marginTop: 32 }}>Expedientes de este cliente</h3>

      <Table>
        <thead>
          <tr>
            <th>Expediente</th>
            <th>Título</th>
            <th>Área</th>
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
            expedientes.map((exp) => (
              <tr
                key={exp.id_expediente}
                onClick={() => navigate(`/expedientes/${exp.id_expediente}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>{exp.numero_expediente}</td>
                <td>{exp.titulo}</td>
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

      {!cargandoExpedientes && expedientes.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          titulo="Sin expedientes"
          descripcion="Este cliente todavía no tiene expedientes asociados"
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
