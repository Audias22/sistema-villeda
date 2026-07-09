import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Pagination.css'

function Pagination({ paginaActual, totalPaginas, onCambiarPagina }) {
  if (totalPaginas <= 1) return null

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={paginaActual <= 1}
        onClick={() => onCambiarPagina(paginaActual - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} />
      </button>

      <span className="pagination-info">
        Página {paginaActual} de {totalPaginas}
      </span>

      <button
        className="pagination-btn"
        disabled={paginaActual >= totalPaginas}
        onClick={() => onCambiarPagina(paginaActual + 1)}
        aria-label="Página siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export default Pagination
