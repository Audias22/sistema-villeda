import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FileText, FolderOpen, Upload, Gauge } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useConteoAnimado } from '../hooks/useConteoAnimado'
import Card from '../components/common/Card'
import Skeleton from '../components/common/Skeleton'
import Table from '../components/common/Table'
import Badge from '../components/common/Badge'
import PieChart from '../components/charts/PieChart'
import AreaChart from '../components/charts/AreaChart'
import BarChart from '../components/charts/BarChart'
import { formatearFecha, tipoClaseCss, estadoClaseCss } from '../utils/formatters'
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

/**
 * Tarjeta de métrica. Cuando recibe `destino` deja de ser un rótulo y pasa a
 * ser una entrada: lleva a la pantalla donde está ese dato, que es lo que uno
 * quiere hacer después de leer el número.
 */
function MetricaCard({ icono: Icono, valor, label, cargando, tono, destino, decimales = 0, sufijo = '' }) {
  const navigate = useNavigate()
  const animado = useConteoAnimado(cargando ? 0 : valor)

  const irAlDestino = destino ? () => navigate(destino) : undefined

  return (
    <motion.div variants={tarjeta}>
      <Card
        hover
        className={`metrica-card metrica-card-${tono}${destino ? ' metrica-card-enlace' : ''}`}
        onClick={irAlDestino}
        role={destino ? 'button' : undefined}
        tabIndex={destino ? 0 : undefined}
        onKeyDown={
          destino
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(destino)
                }
              }
            : undefined
        }
      >
        <span className="metrica-card-burbuja">
          <Icono size={20} />
        </span>

        {cargando ? (
          <Skeleton width="72px" height="30px" />
        ) : (
          <span className="metrica">
            {animado.toLocaleString('es-GT', {
              minimumFractionDigits: decimales,
              maximumFractionDigits: decimales,
            })}
            {sufijo}
          </span>
        )}

        <span className="label">{label}</span>
      </Card>
    </motion.div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
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
          tono="azul"
          valor={dashboard?.totales?.expedientes ?? 0}
          label="Total expedientes"
          cargando={cargandoDashboard}
          destino="/expedientes"
        />
        <MetricaCard
          icono={FileText}
          tono="verde"
          valor={expedientesActivos ?? 0}
          label="Expedientes activos"
          cargando={cargandoDashboard}
          destino="/expedientes?estado=Activo"
        />
        <MetricaCard
          icono={Upload}
          tono="dorado"
          valor={dashboard?.totales?.documentos ?? 0}
          label="Documentos cargados"
          cargando={cargandoDashboard}
          destino="/cargar"
        />
        <MetricaCard
          icono={Gauge}
          tono="morado"
          valor={dashboard?.tbr?.promedio_ms ?? 0}
          label="TBR promedio"
          cargando={cargandoDashboard}
          decimales={2}
          sufijo=" ms"
          destino="/reportes"
        />
      </motion.div>

      <div className="dashboard-grafica-ancha">
        <Card>
          <h3>Distribución por tipo notarial</h3>
          {cargandoDashboard ? (
            <Skeleton height="280px" />
          ) : (
            <BarChart datos={dashboard?.expedientes_por_tipo_notarial || []} />
          )}
        </Card>
      </div>

      <div className="dashboard-graficas">
        {/* Antes acá estaba la distribución por área jurídica. Se reemplazó el
            13 de septiembre de 2026: los 390 expedientes son del área Notarial,
            así que la dona mostraba una sola porción del 100%. El estado del
            expediente sí varía y no estaba representado en ningún lado.
            expedientes_por_area se conserva en la respuesta del backend porque
            la app móvil lo consume. */}
        <Card>
          <h3>Distribución por estado</h3>
          {cargandoDashboard ? (
            <Skeleton height="260px" />
          ) : (
            <PieChart datos={dashboard?.expedientes_por_estado || []} dataKeyNombre="estado" />
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
            <th>Tipo de acto</th>
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
                <tr
                  key={exp.id_expediente}
                  className="fila-enlace"
                  onClick={() => navigate(`/expedientes/${exp.id_expediente}`)}
                >
                  <td>{exp.numero_expediente}</td>
                  <td>{exp.cliente_nombre || '—'}</td>
                  <td>
                    <Badge tono={tipoClaseCss(exp.tipo_nombre)}>{exp.tipo_nombre || '—'}</Badge>
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
