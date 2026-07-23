import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { UploadCloud, FileText, AlertTriangle } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import api from '../services/api'
import './CargarDocumento.css'

const EXTENSIONES_PERMITIDAS = ['pdf', 'jpg', 'jpeg', 'png']

function CargarDocumento() {
  const location = useLocation()
  const inputRef = useRef(null)

  const [busquedaExpediente, setBusquedaExpediente] = useState('')
  const [expedientesEncontrados, setExpedientesEncontrados] = useState([])
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null)
  const [archivo, setArchivo] = useState(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    const idPrevio = location.state?.idExpediente
    if (idPrevio) {
      api.get(`/expedientes/${idPrevio}`).then((res) => setExpedienteSeleccionado(res.data.expediente))
    }
  }, [location.state])

  useEffect(() => {
    if (!busquedaExpediente || busquedaExpediente.length < 2) {
      setExpedientesEncontrados([])
      return
    }
    const timeout = setTimeout(() => {
      api
        .get('/expedientes', { params: { busqueda: busquedaExpediente, por_pagina: 8 } })
        .then((res) => setExpedientesEncontrados(res.data.expedientes))
        .catch(() => setExpedientesEncontrados([]))
    }, 300)
    return () => clearTimeout(timeout)
  }, [busquedaExpediente])

  const validarYAsignar = (file) => {
    if (!file) return
    const extension = file.name.split('.').pop().toLowerCase()
    if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
      toast.error('Formato no permitido. Usa PDF, JPG o PNG')
      return
    }
    setArchivo(file)
    setResultado(null)
  }

  const quitarArchivo = () => {
    setArchivo(null)
    setResultado(null)
    setProgreso(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setArrastrando(false)
    validarYAsignar(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async () => {
    if (!expedienteSeleccionado) {
      toast.error('Selecciona un expediente')
      return
    }
    if (!archivo) {
      toast.error('Selecciona un archivo')
      return
    }

    setCargando(true)
    setProgreso(0)
    setResultado(null)

    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('id_expediente', expedienteSeleccionado.id_expediente)

    try {
      const { data } = await api.post('/documentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evento) => {
          setProgreso(Math.round((evento.loaded * 100) / evento.total))
        },
      })

      setResultado(data.documento)
      if (data.documento.aviso) {
        toast(data.documento.aviso, { icon: '⚠️' })
      } else {
        toast.success('Documento cargado y procesado')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cargar el documento')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      <h1>Cargar documento</h1>

      <Card style={{ marginTop: 20, maxWidth: 640 }}>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <label className="input-label">Expediente</label>
          <input
            className="input-field"
            placeholder="Buscar por número o título..."
            value={
              expedienteSeleccionado
                ? `${expedienteSeleccionado.numero_expediente} — ${expedienteSeleccionado.titulo}`
                : busquedaExpediente
            }
            onChange={(e) => {
              setExpedienteSeleccionado(null)
              setBusquedaExpediente(e.target.value)
            }}
          />
          {expedientesEncontrados.length > 0 && !expedienteSeleccionado && (
            <ul className="cliente-dropdown">
              {expedientesEncontrados.map((exp) => (
                <li
                  key={exp.id_expediente}
                  onClick={() => {
                    setExpedienteSeleccionado(exp)
                    setExpedientesEncontrados([])
                  }}
                >
                  {exp.numero_expediente} — {exp.titulo} ({exp.cliente_nombre})
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={`dropzone${arrastrando ? ' dropzone-activo' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud size={32} />
          <p>Arrastra un archivo aquí o haz clic para seleccionar</p>
          <span className="label">PDF, JPG o PNG — máximo 10 MB</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            hidden
            onChange={(e) => validarYAsignar(e.target.files?.[0])}
          />
        </div>

        {archivo && (
          <div className="archivo-preview">
            <FileText size={18} />
            <span>{archivo.name}</span>
            <span className="label">{Math.round(archivo.size / 1024)} KB</span>
            <Button variant="secundario" onClick={quitarArchivo} style={{ marginLeft: 'auto' }}>
              Quitar archivo
            </Button>
          </div>
        )}

        {cargando && (
          <div className="barra-progreso">
            <div className="barra-progreso-relleno" style={{ width: `${progreso}%` }} />
          </div>
        )}

        <Button variant="acento" fullWidth onClick={handleSubmit} disabled={cargando} style={{ marginTop: 20 }}>
          {cargando ? 'Procesando...' : 'Cargar y procesar'}
        </Button>

        {resultado && (
          <div className="resultado-ocr">
            {resultado.aviso && (
              <div className="resultado-aviso">
                <AlertTriangle size={16} />
                <span>{resultado.aviso}</span>
              </div>
            )}
            <div className="detalle-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div>
                <span className="label">Páginas procesadas</span>
                <p>{resultado.num_paginas ?? '—'}</p>
              </div>
              <div>
                <span className="label">Tamaño</span>
                <p>{Math.round(resultado.tamano_bytes / 1024)} KB</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default CargarDocumento
