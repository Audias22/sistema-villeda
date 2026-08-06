import { useState } from 'react'
import toast from 'react-hot-toast'
import Input from './common/Input'
import Button from './common/Button'
import { nombreCompletoCliente } from '../utils/formatters'

const NATURAL = 1
const JURIDICA = 2

const VACIO = {
  tipo_persona: NATURAL,
  primer_nombre: '',
  segundo_nombre: '',
  primer_apellido: '',
  segundo_apellido: '',
  razon_social: '',
  dpi: '',
  nit: '',
  fecha_nacimiento: '',
  telefono: '',
  email: '',
  direccion: '',
  activo: true,
}

function desdeDatos(datosIniciales) {
  if (!datosIniciales) return VACIO
  const partida = { ...VACIO }
  for (const campo of Object.keys(VACIO)) {
    const valor = datosIniciales[campo]
    if (valor !== undefined && valor !== null) partida[campo] = valor
  }
  return partida
}

/**
 * Formulario de cliente compartido por la pantalla de Clientes y por el modal de
 * Nuevo expediente. Con compacto=true muestra solo lo mínimo para crear al vuelo.
 *
 * onSubmit(payload, opciones) debe hacer la llamada a la API y dejar propagar el
 * error: este componente atrapa el 409 de duplicado y ofrece reutilizar el cliente
 * que ya existe, llamando onSubmit(clienteExistente, { reutilizado: true }).
 */
function ClienteFormulario({ modo = 'crear', datosIniciales, onSubmit, onCancel, compacto = false }) {
  const [form, setForm] = useState(() => desdeDatos(datosIniciales))
  const [enviando, setEnviando] = useState(false)
  const [duplicado, setDuplicado] = useState(null)

  const esNatural = Number(form.tipo_persona) === NATURAL
  const esEdicion = modo === 'editar'

  const actualizarCampo = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // Al crear, un campo vacío simplemente no se envía. Al editar sí se manda null,
  // porque vaciar un campo a propósito debe borrar el valor que ya estaba guardado
  const valorFinal = (valor) => {
    const limpio = (valor ?? '').toString().trim()
    if (limpio) return limpio
    return esEdicion ? null : undefined
  }

  const construirPayload = () => {
    const payload = { tipo_persona: Number(form.tipo_persona) }

    if (esNatural) {
      payload.primer_nombre = valorFinal(form.primer_nombre)
      payload.primer_apellido = valorFinal(form.primer_apellido)
      if (!compacto) {
        payload.segundo_nombre = valorFinal(form.segundo_nombre)
        payload.segundo_apellido = valorFinal(form.segundo_apellido)
        payload.fecha_nacimiento = valorFinal(form.fecha_nacimiento)
      }
    } else {
      payload.razon_social = valorFinal(form.razon_social)
    }

    // En compacto solo se pide el identificador que corresponde al tipo de persona
    if (compacto) {
      if (esNatural) payload.dpi = valorFinal(form.dpi)
      else payload.nit = valorFinal(form.nit)
    } else {
      payload.dpi = valorFinal(form.dpi)
      payload.nit = valorFinal(form.nit)
    }

    payload.telefono = valorFinal(form.telefono)

    if (!compacto) {
      payload.email = valorFinal(form.email)
      payload.direccion = valorFinal(form.direccion)
      if (esEdicion) payload.activo = form.activo
    }

    // Las claves undefined se quitan para no mandarlas al backend
    return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setDuplicado(null)
    setEnviando(true)

    try {
      await onSubmit(construirPayload())
    } catch (error) {
      if (error.response?.status === 409) {
        setDuplicado(error.response.data)
      } else {
        toast.error(error.response?.data?.error || 'No se pudo guardar el cliente')
      }
    } finally {
      setEnviando(false)
    }
  }

  const usarExistente = () => {
    onSubmit(duplicado.cliente, { reutilizado: true })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label htmlFor="tipo_persona" className="input-label">
          Tipo de persona
        </label>
        <select
          id="tipo_persona"
          className="select-field"
          value={form.tipo_persona}
          onChange={actualizarCampo('tipo_persona')}
          required
        >
          <option value={NATURAL}>Natural</option>
          <option value={JURIDICA}>Jurídica</option>
        </select>
      </div>

      {esNatural ? (
        <>
          <div style={{ display: 'flex', gap: 12 }}>
            <Input
              id="primer_nombre"
              label="Primer nombre"
              value={form.primer_nombre}
              onChange={actualizarCampo('primer_nombre')}
              required
            />
            {!compacto && (
              <Input
                id="segundo_nombre"
                label="Segundo nombre"
                value={form.segundo_nombre}
                onChange={actualizarCampo('segundo_nombre')}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Input
              id="primer_apellido"
              label="Primer apellido"
              value={form.primer_apellido}
              onChange={actualizarCampo('primer_apellido')}
              required
            />
            {!compacto && (
              <Input
                id="segundo_apellido"
                label="Segundo apellido"
                value={form.segundo_apellido}
                onChange={actualizarCampo('segundo_apellido')}
              />
            )}
          </div>
        </>
      ) : (
        <Input
          id="razon_social"
          label="Razón social"
          value={form.razon_social}
          onChange={actualizarCampo('razon_social')}
          required
        />
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        {(!compacto || esNatural) && (
          <Input
            id="dpi"
            label="DPI"
            value={form.dpi}
            onChange={actualizarCampo('dpi')}
            maxLength={20}
            placeholder="Opcional"
          />
        )}
        {(!compacto || !esNatural) && (
          <Input
            id="nit"
            label="NIT"
            value={form.nit}
            onChange={actualizarCampo('nit')}
            maxLength={20}
            placeholder="Opcional"
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <Input
          id="telefono"
          label="Teléfono"
          value={form.telefono}
          onChange={actualizarCampo('telefono')}
          maxLength={20}
          placeholder="Opcional"
        />
        {!compacto && esNatural && (
          <Input
            id="fecha_nacimiento"
            label="Fecha de nacimiento"
            type="date"
            value={form.fecha_nacimiento}
            onChange={actualizarCampo('fecha_nacimiento')}
          />
        )}
      </div>

      {!compacto && (
        <>
          <Input
            id="email"
            label="Correo"
            type="email"
            value={form.email}
            onChange={actualizarCampo('email')}
            maxLength={100}
            placeholder="Opcional"
          />
          <Input
            id="direccion"
            label="Dirección"
            value={form.direccion}
            onChange={actualizarCampo('direccion')}
            maxLength={255}
            placeholder="Opcional"
          />
        </>
      )}

      {!compacto && esEdicion && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={form.activo} onChange={actualizarCampo('activo')} />
          Cliente activo
        </label>
      )}

      {duplicado && (
        <div className="aviso-duplicado">
          <span className="aviso-duplicado-texto">{duplicado.error}</span>
          <span className="aviso-duplicado-nombre">{nombreCompletoCliente(duplicado.cliente)}</span>
          <Button variant="secundario" onClick={usarExistente}>
            Usar el cliente existente
          </Button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        {onCancel && (
          <Button variant="secundario" onClick={onCancel} fullWidth>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="acento" fullWidth disabled={enviando}>
          {enviando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  )
}

export default ClienteFormulario
