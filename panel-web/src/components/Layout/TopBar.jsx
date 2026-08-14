import CampanaNotificaciones from '../notificaciones/CampanaNotificaciones'
import './TopBar.css'

function TopBar({ children }) {
  return (
    <header className="topbar">
      {children}
      <CampanaNotificaciones />
    </header>
  )
}

export default TopBar
