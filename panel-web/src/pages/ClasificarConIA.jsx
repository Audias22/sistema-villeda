import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { UploadCloud, FileText, Sparkles } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import api from '../services/api'
import './CargarDocumento.css'

const EXTENSIONES_PERMITIDAS = ['pdf', 'jpg', 'jpeg', 'png']

function ClasificarConIA() {
  const inputRef = useRef(null)

  const [archivo, setArchivo] = useState(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [enviando, setEnviando] = useState(false)

  const validarYAsignar = (file) => {
    if (!file) return
    const extension = file.name.split('.').pop().toLowerCase()
    if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
      toast.error('Formato no permitido. Usa PDF, JPG o PNG')
      return
    }
    setArchivo(file)
  }

  const quitarArchivo = () => {
    setArchivo(null)
    setProgreso(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setArrastrando(false)
    validarYAsignar(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async () => {
    if (!archivo) {
      toast.error('Selecciona un archivo')
      return
    }

    setEnviando(true)
    setProgreso(0)

    const formData = new FormData()
    formData.append('archivo', archivo)

    try {
      await api.post('/clasificacion/trabajos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (evento) => {
          setProgreso(Math.round((evento.loaded * 100) / evento.total))
        },
      })

      toast.success('Documento encolado. Recibirás una notificación cuando esté listo.')
      quitarArchivo()
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo encolar el documento')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <h1>Clasificar con IA</h1>
      <p className="label" style={{ marginTop: 6, maxWidth: 640, display: 'block' }}>
        Sube un documento suelto y el sistema lo clasificará automáticamente creando el
        expediente correspondiente.
      </p>

      <Card style={{ marginTop: 20, maxWidth: 640 }}>
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

        {enviando && (
          <div className="barra-progreso">
            <div className="barra-progreso-relleno" style={{ width: `${progreso}%` }} />
          </div>
        )}

        <Button
          variant="acento"
          fullWidth
          onClick={handleSubmit}
          disabled={enviando}
          style={{ marginTop: 20 }}
        >
          <Sparkles size={16} />
          {enviando ? 'Enviando...' : 'Clasificar documento'}
        </Button>
      </Card>
    </div>
  )
}

export default ClasificarConIA
