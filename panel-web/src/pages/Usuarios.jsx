import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Users as UsersIcon } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import Table from '../components/common/Table'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Skeleton from '../components/common/Skeleton'
import EmptyState from '../components/common/EmptyState'
import Modal from '../components/common/Modal'
import Input from '../components/common/Input'
import api from '../services/api'
import { formatearFecha } from '../utils/formatters'

const VACIO = {
  id_usuario: null,
  nombre: '',
  apellido: '',
  nombre_usuario: '',
  correo: '',
  contrasena: '',
  id_rol: '',
  activo: true,
}

function Usuarios() {
  const { usuario } = useAuth()
  const { datos: rolesData } = useFetch('/catalogos/roles')
  const { datos, cargando, recargar } = useFetch('/usuarios', { params: { pagina: 1, por_pagina: 50 } })

  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [enviando, setEnviando] = useState(false)

  if (usuario?.rol !== 'Administrador') {
    return (
      <EmptyState
        icon={UsersIcon}
        titulo="Acceso restringido"
        descripcion="Solo un administrador puede gestionar usuarios"
      />
    )
  }

  const nombreRol = (idRol) => rolesData?.roles?.find((r) => r.id_rol === idRol)?.nombre_rol || '—'

  const abrirNuevo = () => {
    setForm(VACIO)
    setModalAbierto(true)
  }

  const abrirEditar = (u) => {
    setForm({
      id_usuario: u.id_usuario,
      nombre: u.nombre,
      apellido: u.apellido,
      nombre_usuario: u.nombre_usuario,
      correo: u.correo,
      contrasena: '',
      id_rol: u.id_rol,
      activo: u.activo,
    })
    setModalAbierto(true)
  }

  const actualizarCampo = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)

    try {
      if (form.id_usuario) {
        const payload = {
          nombre: form.nombre,
          apellido: form.apellido,
          nombre_usuario: form.nombre_usuario,
          correo: form.correo,
          id_rol: Number(form.id_rol),
          activo: form.activo,
        }
        if (form.contrasena) payload.contrasena = form.contrasena
        await api.put(`/usuarios/${form.id_usuario}`, payload)
        toast.success('Usuario actualizado')
      } else {
        await api.post('/usuarios', {
          nombre: form.nombre,
          apellido: form.apellido,
          nombre_usuario: form.nombre_usuario,
          correo: form.correo,
          contrasena: form.contrasena,
          id_rol: Number(form.id_rol),
        })
        toast.success('Usuario creado')
      }
      setModalAbierto(false)
      recargar()
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo guardar el usuario')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>Gestión de usuarios</h1>
        <Button variant="acento" onClick={abrirNuevo}>
          <Plus size={16} />
          Nuevo usuario
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Fecha creación</th>
          </tr>
        </thead>
        <tbody>
          {cargando &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={5}>
                  <Skeleton height="18px" />
                </td>
              </tr>
            ))}
          {!cargando &&
            datos?.usuarios?.map((u) => (
              <tr key={u.id_usuario} onClick={() => abrirEditar(u)} style={{ cursor: 'pointer' }}>
                <td>
                  {u.nombre} {u.apellido}
                </td>
                <td>{u.nombre_usuario}</td>
                <td>{nombreRol(u.id_rol)}</td>
                <td>
                  <Badge tono={u.activo ? 'exito' : 'peligro'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                </td>
                <td>{formatearFecha(u.fecha_creacion)}</td>
              </tr>
            ))}
        </tbody>
      </Table>

      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={form.id_usuario ? 'Editar usuario' : 'Nuevo usuario'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Input id="nombre" label="Nombre" value={form.nombre} onChange={actualizarCampo('nombre')} required />
            <Input id="apellido" label="Apellido" value={form.apellido} onChange={actualizarCampo('apellido')} required />
          </div>
          <Input
            id="nombre_usuario"
            label="Usuario"
            value={form.nombre_usuario}
            onChange={actualizarCampo('nombre_usuario')}
            required
          />
          <Input id="correo" label="Correo" type="email" value={form.correo} onChange={actualizarCampo('correo')} required />
          <Input
            id="contrasena"
            label={form.id_usuario ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password"
            value={form.contrasena}
            onChange={actualizarCampo('contrasena')}
            required={!form.id_usuario}
            minLength={8}
          />
          <div>
            <label htmlFor="id_rol" className="input-label">
              Rol
            </label>
            <select id="id_rol" className="select-field" value={form.id_rol} onChange={actualizarCampo('id_rol')} required>
              <option value="">Selecciona...</option>
              {rolesData?.roles?.map((r) => (
                <option key={r.id_rol} value={r.id_rol}>
                  {r.nombre_rol}
                </option>
              ))}
            </select>
          </div>

          {form.id_usuario && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input type="checkbox" checked={form.activo} onChange={actualizarCampo('activo')} />
              Usuario activo
            </label>
          )}

          <Button type="submit" variant="acento" fullWidth disabled={enviando}>
            {enviando ? 'Guardando...' : 'Guardar'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

export default Usuarios
