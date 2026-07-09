import './Button.css'

function Button({
  children,
  variant = 'primario',
  type = 'button',
  fullWidth = false,
  disabled = false,
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${fullWidth ? ' btn-full' : ''}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
