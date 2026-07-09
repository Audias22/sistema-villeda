import { useState } from 'react'
import toast from 'react-hot-toast'
import { Download, FolderOpen, FileText, Copy } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Skeleton from '../components/common/Skeleton'
import PieChart from '../components/charts/PieChart'
import AreaChart from '../components/charts/AreaChart'
import api from '../services/api'

function Reportes() {
  const [idArea, setIdArea] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [exportando, setExportando] = useState(false)

  const { datos: areasData } = useFetch('/catalogos/areas-juridicas')
  const { datos: reporte, cargando } = useFetch('/reportes/dashboard', {
    params: {
      id_area: idArea || undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
    },
  })

  const handleExportarExcel = async () => {
    setExportando(true)
    try {
      const respuesta = await api.get('/reportes/expedientes/excel', {
        params: {
          id_area: idArea || undefined,
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
        },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([respuesta.data]))
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = 'expedientes.xlsx'
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('No se pudo exportar el reporte')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div>
      <h1>Reportes</h1>

      <div className="filtros-barra" style={{ marginTop: 20 }}>
        <div className="campo-filtro">
          <label className="input-label">Área jurídica</label>
          <select className="select-field" value={idArea} onChange={(e) => setIdArea(e.target.value)}>
            <option value="">Todas</option>
            {areasData?.areas_juridicas?.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="campo-filtro">
          <label className="input-label">Desde</label>
          <input className="input-field" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div className="campo-filtro">
          <label className="input-label">Hasta</label>
          <input className="input-field" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <Button variant="acento" onClick={handleExportarExcel} disabled={exportando} style={{ marginLeft: 'auto' }}>
          <Download size={16} />
          {exportando ? 'Exportando...' : 'Exportar Excel'}
        </Button>
      </div>

      <div className="dashboard-metricas" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Card className="metrica-card">
          <FolderOpen className="metrica-card-icono" size={28} />
          {cargando ? <Skeleton width="60px" height="28px" /> : <span className="metrica">{reporte?.totales?.expedientes ?? 0}</span>}
          <span className="label">Expedientes</span>
        </Card>
        <Card className="metrica-card">
          <FileText className="metrica-card-icono" size={28} />
          {cargando ? <Skeleton width="60px" height="28px" /> : <span className="metrica">{reporte?.totales?.documentos ?? 0}</span>}
          <span className="label">Documentos</span>
        </Card>
        <Card className="metrica-card">
          <Copy className="metrica-card-icono" size={28} />
          {cargando ? (
            <Skeleton width="60px" height="28px" />
          ) : (
            <span className="metrica">{reporte?.documentos_duplicados ?? 0}</span>
          )}
          <span className="label">Documentos duplicados</span>
        </Card>
      </div>

      <div className="dashboard-graficas">
        <Card>
          <h3>Distribución por área jurídica</h3>
          {cargando ? <Skeleton height="260px" /> : <PieChart datos={reporte?.expedientes_por_area || []} />}
        </Card>
        <Card>
          <h3>Distribución por estado</h3>
          {cargando ? (
            <Skeleton height="260px" />
          ) : (
            <PieChart datos={reporte?.expedientes_por_estado || []} dataKeyNombre="estado" />
          )}
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <h3>Expedientes por mes</h3>
        {cargando ? <Skeleton height="260px" /> : <AreaChart datos={reporte?.expedientes_por_mes || []} />}
      </Card>
    </div>
  )
}

export default Reportes
