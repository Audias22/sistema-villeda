import { motion } from 'framer-motion'
import { FileText, FolderOpen, Upload, Gauge } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import Card from '../components/common/Card'
import Skeleton from '../components/common/Skeleton'
import Table from '../components/common/Table'
import Badge from '../components/common/Badge'
import PieChart from '../components/charts/PieChart'
import AreaChart from '../components/charts/AreaChart'
import { formatearFecha, areaClaseCss, estadoClaseCss } from '../utils/formatters'
import './Dashboard.css'

const contenedor = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const tarjeta = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

function saludo() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function MetricaCard({ icono: Icono, valor, label, cargando }) {
  return (
    <motion.div variants={tarjeta}>
      <Card hover className="metrica-card">
        <Icono className="metrica-card-icono" size={28} />
        {cargando ? (
          <Skeleton width="60px" height="28px" />
        ) : (
          <span className="metrica">{valor}</span>
        )}
        <span className="label">{label}</span>
      </Card>
    </motion.div>
  )
}

function Dashboard() {
  const { usuario } = useAuth()
  const { datos: dashboard, cargando: cargandoDashboard } = useFetch('/reportes/dashboard')
  const { datos: expedientesRecientes, cargando: cargandoExpedientes } = useFetch('/expedientes', {
    params: { pagina: 1, por_pagina: 5 },
  })

  const expedientesActivos = dashboard?.expedientes_por_estado?.find((e) =>
    e.estado?.toLowerCase().includes('activo')
  )?.total

  return (
    <div>
      <h1>
        {saludo()}, {usuario?.nombre}
      </h1>
      <p className="dashboard-fecha">
        {new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <motion.div className="dashboard-metricas" variants={contenedor} initial="hidden" animate="show">
        <MetricaCard
          icono={FolderOpen}
          valor={dashboard?.totales?.expedientes ?? 0}
          label="Total expedientes"
          cargando={cargandoDashboard}
        />
        <MetricaCard
          icono={FileText}
          valor={expedientesActivos ?? 0}
          label="Expedientes activos"
          cargando={cargandoDashboard}
        />
        <MetricaCard
          icono={Upload}
          valor={dashboard?.totales?.documentos ?? 0}
          label="Documentos cargados"
          cargando={cargandoDashboard}
        />
        <MetricaCard
          icono={Gauge}
          valor={`${dashboard?.tbr?.promedio_ms ?? 0} ms`}
          label="TBR promedio"
          cargando={cargandoDashboard}
        />
      </motion.div>

      <div className="dashboard-graficas">
        <Card>
          <h3>Distribución por área jurídica</h3>
          {cargandoDashboard ? (
            <Skeleton height="260px" />
          ) : (
            <PieChart datos={dashboard?.expedientes_por_area || []} />
          )}
        </Card>
        <Card>
          <h3>Expedientes por mes</h3>
          {cargandoDashboard ? (
            <Skeleton height="260px" />
          ) : (
            <AreaChart datos={dashboard?.expedientes_por_mes || []} />
          )}
        </Card>
      </div>

      <h2 className="dashboard-subtitulo">Últimos expedientes</h2>
      <Table>
        <thead>
          <tr>
            <th>Expediente</th>
            <th>Cliente</th>
            <th>Área</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {cargandoExpedientes
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5}>
                    <Skeleton height="18px" />
                  </td>
                </tr>
              ))
            : expedientesRecientes?.expedientes?.map((exp) => (
                <tr key={exp.id_expediente}>
                  <td>{exp.numero_expediente}</td>
                  <td>{exp.cliente_nombre || '—'}</td>
                  <td>
                    <Badge tono={areaClaseCss(exp.area_nombre)}>{exp.area_nombre || '—'}</Badge>
                  </td>
                  <td>
                    <Badge tono={estadoClaseCss(exp.estado_nombre)}>{exp.estado_nombre || '—'}</Badge>
                  </td>
                  <td>{formatearFecha(exp.fecha_apertura)}</td>
                </tr>
              ))}
        </tbody>
      </Table>
    </div>
  )
}

export default Dashboard
