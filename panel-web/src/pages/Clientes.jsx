import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Eye, Pencil, UserRound } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import Table from '../components/common/Table'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Skeleton from '../components/common/Skeleton'
import Pagination from '../components/common/Pagination'
import EmptyState from '../components/common/EmptyState'
import Modal from '../components/common/Modal'
import Input from '../components/common/Input'
import ClienteFormulario from '../components/ClienteFormulario'
import api from '../services/api'
import { nombreCompletoCliente } from '../utils/formatters'

const POR_PAGINA = 10

function Clientes() {
  const navigate = useNavigate()
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [soloActivos, setSoloActivos] = useState('true')
  const [clienteEditando, setClienteEditando] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  // El listado no se pide en cada tecla, se espera a que el usuario termine de escribir
  useEffect(() => {
    const timeout = setTimeout(() => {
      setBusquedaAplicada(busqueda)
      setPagina(1)
    }, 300)
    return () => clearTimeout(timeout)
  }, [busqueda])

  const { datos, cargando, recargar } = useFetch('/clientes', {
    params: {
      pagina,
      por_pagina: POR_PAGINA,
      busqueda: busquedaAplicada || undefined,
      solo_activos: soloActivos,
    },
  })

  const abrirNuevo = () => {
    setClienteEditando(null)
    setModalAbierto(true)
  }

  const abrirEditar = (cliente) => {
    setClienteEditando(cliente)
    setModalAbierto(true)
  }

  const guardar = async (payload, opciones) => {
    // Reutilizar un cliente que ya existía no crea nada, solo cierra y lo muestra
    if (opciones?.reutilizado) {
      setModalAbierto(false)
      toast.success('Se usó el cliente que ya estaba registrado')
      navigate(`/clientes/${payload.id_cliente}`)
      return
    }

    if (clienteEditando) {
      await api.put(`/clientes/${clienteEditando.id_cliente}`, payload)
      toast.success('Cliente actualizado')
    } else {
      await api.post('/clientes', payload)
      toast.success('Cliente creado')
    }

    setModalAbierto(false)
    recargar()
  }

  const identificador = (cliente) => cliente.dpi || cliente.nit || '—'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>Clientes</h1>
        <Button variant="acento" onClick={abrirNuevo}>
          <Plus size={16} />
          Nuevo cliente
        </Button>
      </div>

      <div className="filtros-barra" style={{ marginTop: 20 }}>
        <div className="campo-filtro" style={{ flex: 1, minWidth: 240 }}>
          <Input
            id="busqueda"
            label="Buscar"
            placeholder="Nombre, razón social, DPI o NIT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="campo-filtro">
          <label className="input-label">Estado</label>
          <select
            className="select-field"
            value={soloActivos}
            onChange={(e) => {
              setSoloActivos(e.target.value)
              setPagina(1)
            }}
          >
            <option value="true">Solo activos</option>
            <option value="false">Todos</option>
          </select>
        </div>
      </div>

      <Table>
        <thead>
          <tr>
            <th>Nombre / Razón social</th>
            <th>DPI / NIT</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th>Acciones</th>
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
            datos?.clientes?.map((c) => (
              <tr key={c.id_cliente}>
                <td>{nombreCompletoCliente(c)}</td>
                <td>{identificador(c)}</td>
                <td>{c.telefono || '—'}</td>
                <td>
                  <Badge tono={c.activo ? 'exito' : 'peligro'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secundario" onClick={() => navigate(`/clientes/${c.id_cliente}`)}>
                      <Eye size={14} />
                      Ver
                    </Button>
                    <Button variant="secundario" onClick={() => abrirEditar(c)}>
                      <Pencil size={14} />
                      Editar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </Table>

      {!cargando && datos?.clientes?.length === 0 && (
        <EmptyState
          icon={UserRound}
          titulo="Sin clientes"
          descripcion={
            busquedaAplicada
              ? `No se encontró ningún cliente que coincida con "${busquedaAplicada}"`
              : 'Todavía no hay clientes registrados'
          }
        />
      )}

      <Pagination
        paginaActual={datos?.pagina || 1}
        totalPaginas={datos?.total_paginas || 1}
        onCambiarPagina={setPagina}
      />

      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={clienteEditando ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <ClienteFormulario
          key={clienteEditando?.id_cliente || 'nuevo'}
          modo={clienteEditando ? 'editar' : 'crear'}
          datosIniciales={clienteEditando}
          onSubmit={guardar}
          onCancel={() => setModalAbierto(false)}
        />
      </Modal>
    </div>
  )
}

export default Clientes
