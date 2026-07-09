import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  Search,
  Users,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expedientes', label: 'Expedientes', icon: FolderOpen },
  { to: '/cargar', label: 'Cargar documento', icon: Upload },
  { to: '/busqueda', label: 'Búsqueda', icon: Search },
  { to: '/usuarios', label: 'Usuarios', icon: Users, rol: 'Administrador' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
]

function Sidebar() {
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const items = NAV_ITEMS.filter((item) => !item.rol || item.rol === usuario?.rol)

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-sello">V</span>
        <span className="sidebar-nombre">Villeda</span>
      </div>

      <nav className="sidebar-nav">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-item${isActive ? ' sidebar-item-activo' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {usuario?.nombre && <span className="sidebar-usuario">{usuario.nombre}</span>}
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
