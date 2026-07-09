import './Table.css'

function Table({ children }) {
  return (
    <div className="table-wrapper">
      <table className="table">{children}</table>
    </div>
  )
}

export default Table
