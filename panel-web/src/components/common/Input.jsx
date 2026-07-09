import './Input.css'

function Input({ label, error, rightElement, id, ...props }) {
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className="input-wrapper">
        <input id={id} className="input-field" {...props} />
        {rightElement && <div className="input-right">{rightElement}</div>}
      </div>
      {error && <span className="input-error">{error}</span>}
    </div>
  )
}

export default Input
