import './Card.css'

function Card({ children, hover = false, className = '', ...props }) {
  return (
    <div className={`card${hover ? ' card-hover' : ''}${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </div>
  )
}

export default Card
