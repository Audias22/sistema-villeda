import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/common/Modal'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import api from '../services/api'
import { nombreCompletoCliente } from '../utils/formatters'

const HOY = new Date().toISOString().slice(0, 10)

const VACIO = {
  titulo: '',
  descripcion: '',
  id_area: '',
  id_tipo_expediente: '',
  prioridad: '',
  fecha_apertura: HOY,
}

function NuevoExpedienteModal({ isOpen, onClose, onCreado }) {
  const [form, setForm] = useState(VACIO)
  const [areas, setAreas] = useState([])
  const [tipos, setTipos] = useState([])
  const [prioridades, setPrioridades] = useState([])
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clientesEncontrados, setClientesEncontrados] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(VACIO)
    setClienteSeleccionado(null)
    setBusquedaCliente('')
    setClientesEncontrados([])

    api.get('/catalogos/areas-juridicas').then((res) => setAreas(res.data.areas_juridicas))
    api.get('/catalogos/prioridades').then((res) => setPrioridades(res.data.prioridades))
  }, [isOpen])

  useEffect(() => {
    if (!form.id_area) {
      setTipos([])
      return
    }
    api
      .get('/catalogos/tipos-expediente', { params: { id_area: form.id_area } })
      .then((res) => setTipos(res.data.tipos_expediente))
  }, [form.id_area])

  useEffect(() => {
    if (!busquedaCliente || busquedaCliente.length < 2) {
      setClientesEncontrados([])
      return
    }
    const timeout = setTimeout(() => {
      api
        .get('/clientes', { params: { busqueda: busquedaCliente, por_pagina: 8 } })
        .then((res) => setClientesEncontrados(res.data.clientes))
        .catch(() => setClientesEncontrados([]))
    }, 300)
    return () => clearTimeout(timeout)
  }, [busquedaCliente])

  const actualizarCampo = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!clienteSeleccionado) {
      toast.error('Selecciona un cliente')
      return
    }

    setEnviando(true)
    try {
      const identity = JSON.parse(localStorage.getItem('usuario'))
      const { data } = await api.post('/expedientes', {
        id_cliente: clienteSeleccionado.id_cliente,
        id_tipo_expediente: Number(form.id_tipo_expediente),
        id_area: Number(form.id_area),
        id_usuario_asignado: identity.id_usuario,
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        fecha_apertura: form.fecha_apertura,
        prioridad: Number(form.prioridad),
      })
      toast.success(`Expediente ${data.expediente.numero_expediente} creado`)
      onCreado?.(data.expediente)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo crear el expediente')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo expediente">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          id="titulo"
          label="Título"
          value={form.titulo}
          onChange={actualizarCampo('titulo')}
          required
          minLength={5}
        />

        <div style={{ position: 'relative' }}>
          <Input
            id="cliente"
            label="Cliente"
            placeholder="Buscar por nombre, DPI o NIT..."
            value={clienteSeleccionado ? nombreCompletoCliente(clienteSeleccionado) : busquedaCliente}
            onChange={(e) => {
              setClienteSeleccionado(null)
              setBusquedaCliente(e.target.value)
            }}
            required
          />
          {clientesEncontrados.length > 0 && !clienteSeleccionado && (
            <ul className="cliente-dropdown">
              {clientesEncontrados.map((c) => (
                <li
                  key={c.id_cliente}
                  onClick={() => {
                    setClienteSeleccionado(c)
                    setClientesEncontrados([])
                  }}
                >
                  {nombreCompletoCliente(c)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="id_area" className="input-label">
              Área jurídica
            </label>
            <select id="id_area" className="select-field" value={form.id_area} onChange={actualizarCampo('id_area')} required>
              <option value="">Selecciona...</option>
              {areas.map((a) => (
                <option key={a.id_area} value={a.id_area}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor="id_tipo_expediente" className="input-label">
              Tipo de expediente
            </label>
            <select
              id="id_tipo_expediente"
              className="select-field"
              value={form.id_tipo_expediente}
              onChange={actualizarCampo('id_tipo_expediente')}
              disabled={!form.id_area}
              required
            >
              <option value="">Selecciona...</option>
              {tipos.map((t) => (
                <option key={t.id_tipo} value={t.id_tipo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="prioridad" className="input-label">
              Prioridad
            </label>
            <select id="prioridad" className="select-field" value={form.prioridad} onChange={actualizarCampo('prioridad')} required>
              <option value="">Selecciona...</option>
              {prioridades.map((p) => (
                <option key={p.id_prioridad} value={p.id_prioridad}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <Input
              id="fecha_apertura"
              label="Fecha de apertura"
              type="date"
              value={form.fecha_apertura}
              onChange={actualizarCampo('fecha_apertura')}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="descripcion" className="input-label">
            Descripción
          </label>
          <textarea
            id="descripcion"
            className="textarea-field"
            rows={3}
            value={form.descripcion}
            onChange={actualizarCampo('descripcion')}
          />
        </div>

        <Button type="submit" variant="acento" fullWidth disabled={enviando}>
          {enviando ? 'Creando...' : 'Crear expediente'}
        </Button>
      </form>
    </Modal>
  )
}

export default NuevoExpedienteModal
