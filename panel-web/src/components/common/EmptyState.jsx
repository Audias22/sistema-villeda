import './EmptyState.css'

function EmptyState({ icon: Icon, titulo, descripcion, accion }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={40} className="empty-state-icon" />}
      {titulo && <h3>{titulo}</h3>}
      {descripcion && <p className="empty-state-desc">{descripcion}</p>}
      {accion && <div className="empty-state-action">{accion}</div>}
    </div>
  )
}

export default EmptyState
