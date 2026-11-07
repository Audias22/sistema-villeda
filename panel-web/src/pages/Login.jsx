import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [nombreUsuario, setNombreUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)

    try {
      const { data } = await api.post('/auth/login', {
        nombre_usuario: nombreUsuario.trim(),
        contrasena,
      })
      login(data.token, data.usuario)
      navigate('/dashboard')
    } catch (error) {
      const mensaje = error.response?.data?.error || 'No se pudo iniciar sesión'
      toast.error(mensaje)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-marca">
        <div className="login-marca-contenido">
          <div className="login-marco">
            <span /><span /><span /><span />
            <img
              className="login-logo"
              src="/logo-villeda-blanco.png"
              alt="Lic. Otto Ronaldo Villeda Portillo, Abogado y Notario"
            />
          </div>
          <p className="login-lema">Sistema de gestión y clasificación de expedientes notariales</p>
        </div>
      </aside>

      <main className="login-acceso">
        <div className="login-form-caja">
          <p className="login-despacho">Oficina Jurídica Villeda</p>
          <h1 className="login-titulo">Bienvenido</h1>
          <p className="login-subtitulo">Ingrese sus credenciales para continuar</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <Input
              id="nombre_usuario"
              label="Usuario"
              type="text"
              placeholder="Ingresa tu usuario"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              autoComplete="username"
              required
            />

            <Input
              id="contrasena"
              label="Contraseña"
              type={mostrarContrasena ? 'text' : 'password'}
              placeholder="Ingresa tu contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              required
              rightElement={
                <span onClick={() => setMostrarContrasena((v) => !v)}>
                  {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              }
            />

            <Button type="submit" variant="acento" fullWidth disabled={cargando}>
              {cargando ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="login-pie">San Diego, Zacapa &middot; Guatemala</p>
        </div>
      </main>
    </div>
  )
}

export default Login
