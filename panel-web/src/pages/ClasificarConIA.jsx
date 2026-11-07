import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  UploadCloud,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import ModalConfirmarClasificacion from '../components/notificaciones/ModalConfirmarClasificacion'
import api from '../services/api'
import {
  obtenerSeguimiento,
  actualizarSeguimiento,
  suscribirSeguimiento,
} from '../services/seguimientoClasificacion'
import './CargarDocumento.css'
import './ClasificarConIA.css'

const EXTENSIONES_PERMITIDAS = ['pdf', 'jpg', 'jpeg', 'png']
const ID_AREA_NOTARIAL = 1
const INTERVALO_CONSULTA_MS = 3000

// Mismos ids que backend/app/clasificacion/models.py
const ESTADO_PENDIENTE = 1
const ESTADO_EN_PROCESO = 2
const ESTADO_EXITOSO = 3
const ESTADO_ERROR = 4
const ESTADO_DUPLICADO = 5

const estaTerminado = (trabajo) =>
  Boolean(trabajo) && [ESTADO_EXITOSO, ESTADO_ERROR, ESTADO_DUPLICADO].includes(trabajo.id_estado)

function ClasificarConIA() {
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [archivo, setArchivo] = useState(null)
  const [arrastrando, setArrastrando] = useState(false)

  // La subida y el trabajo encolado viven en seguimientoClasificacion.js y no
  // en el componente: así, si el usuario se va a otra pantalla y vuelve, ve
  // la misma barra o el mismo resultado en vez de una pantalla vacía.
  const [seguimiento, setSeguimiento] = useState(obtenerSeguimiento)
  useEffect(() => {
    setSeguimiento(obtenerSeguimiento())
    return suscribirSeguimiento(setSeguimiento)
  }, [])
  const { idTrabajo, nombre: nombreEnviado, inicio, subiendo: enviando, progreso } = seguimiento

  const [trabajo, setTrabajo] = useState(null)
  const [descartado, setDescartado] = useState(false)
  const [expediente, setExpediente] = useState(null)
  const [segundos, setSegundos] = useState(0)
  const [versionConsulta, setVersionConsulta] = useState(0)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [tipos, setTipos] = useState([])

  const terminado = estaTerminado(trabajo) || descartado

  useEffect(() => {
    api
      .get('/catalogos/tipos-expediente', { params: { id_area: ID_AREA_NOTARIAL } })
      .then(({ data }) => setTipos(data.tipos_expediente || []))
      .catch(() => {})
  }, [])

  // Consulta el estado cada pocos segundos hasta que el trabajo termina.
  useEffect(() => {
    if (!idTrabajo) return undefined
    let activo = true
    let temporizador

    const consultar = async () => {
      try {
        const { data } = await api.get(`/clasificacion/trabajos/${idTrabajo}`)
        if (!activo) return
        setTrabajo(data.trabajo)
        if (!estaTerminado(data.trabajo)) {
          temporizador = setTimeout(consultar, INTERVALO_CONSULTA_MS)
        }
      } catch (error) {
        if (!activo) return
        // Descartar borra el trabajo, por eso un 404 después de descartar es lo esperado.
        if (error.response?.status === 404) {
          setDescartado(true)
          return
        }
        temporizador = setTimeout(consultar, INTERVALO_CONSULTA_MS)
      }
    }

    consultar()
    return () => {
      activo = false
      clearTimeout(temporizador)
    }
  }, [idTrabajo, versionConsulta])

  // Contador visible mientras procesa: el primer documento puede tardar por el
  // arranque del clasificador. Se calcula desde la hora de envío, así que sigue
  // siendo correcto aunque el usuario haya salido de la pantalla y vuelto.
  useEffect(() => {
    if (!idTrabajo || terminado || !inicio) return undefined
    const calcular = () => setSegundos(Math.max(0, Math.floor((Date.now() - inicio) / 1000)))
    calcular()
    const intervalo = setInterval(calcular, 1000)
    return () => clearInterval(intervalo)
  }, [idTrabajo, terminado, inicio])

  const idExpedienteCreado = trabajo?.id_expediente_creado

  useEffect(() => {
    if (!idExpedienteCreado) return
    api
      .get(`/expedientes/${idExpedienteCreado}`)
      .then(({ data }) => setExpediente(data.expediente))
      .catch(() => {})
  }, [idExpedienteCreado])

  const nombreTipo = (id) => tipos.find((t) => t.id_tipo === id)?.nombre || '—'

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
    if (inputRef.current) inputRef.current.value = ''
  }

  const clasificarOtro = () => {
    actualizarSeguimiento({ idTrabajo: null, nombre: '', inicio: null, progreso: 0 })
    setTrabajo(null)
    setDescartado(false)
    setExpediente(null)
    setSegundos(0)
    quitarArchivo()
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

    const nombre = archivo.name
    actualizarSeguimiento({ subiendo: true, progreso: 0, nombre })

    const formData = new FormData()
    formData.append('archivo', archivo)

    try {
      const { data } = await api.post('/clasificacion/trabajos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (evento) => {
          actualizarSeguimiento({ progreso: Math.round((evento.loaded * 100) / evento.total) })
        },
      })

      setSegundos(0)
      setTrabajo(null)
      setDescartado(false)
      setExpediente(null)
      actualizarSeguimiento({
        idTrabajo: data.id_trabajo,
        nombre,
        inicio: Date.now(),
        subiendo: false,
        progreso: 0,
      })
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo enviar el documento')
      actualizarSeguimiento({ subiendo: false, progreso: 0 })
    }
  }

  const renderEstado = () => {
    if (descartado) {
      return (
        <div className="resultado-aviso">
          <XCircle size={16} />
          <span>El documento fue descartado. No se creó ningún expediente.</span>
        </div>
      )
    }

    if (!trabajo || trabajo.id_estado === ESTADO_PENDIENTE || trabajo.id_estado === ESTADO_EN_PROCESO) {
      const enProceso = trabajo?.id_estado === ESTADO_EN_PROCESO
      return (
        <>
          <div className="resultado-proceso">
            <Loader2 size={16} className="icono-girando" />
            <span>
              {enProceso ? 'Leyendo el documento y clasificándolo…' : 'En cola, esperando turno…'}
            </span>
            <span className="resultado-segundos">{segundos} s</span>
          </div>
          {segundos >= 15 && (
            <p className="resultado-nota">
              El primer documento puede tardar hasta un minuto mientras arranca el clasificador.
              También te llegará una notificación cuando termine.
            </p>
          )}
        </>
      )
    }

    if (trabajo.id_estado === ESTADO_ERROR) {
      return (
        <div className="resultado-error">
          <XCircle size={16} />
          <span>{trabajo.mensaje_error || 'No se pudo procesar el documento.'}</span>
        </div>
      )
    }

    if (trabajo.id_estado === ESTADO_DUPLICADO) {
      return (
        <div className="resultado-aviso">
          <AlertTriangle size={16} />
          <span>Este documento ya está en el sistema, así que no se procesó de nuevo.</span>
        </div>
      )
    }

    const confianza =
      trabajo.confianza != null ? `${Math.round(trabajo.confianza * 100)}%` : '—'
    const pendienteConfirmar = trabajo.requiere_confirmacion && !idExpedienteCreado

    return (
      <>
        {pendienteConfirmar ? (
          <div className="resultado-aviso">
            <AlertTriangle size={16} />
            <span>
              La confianza fue de {confianza}, menor al 70%. Revisá el tipo antes de crear el
              expediente.
            </span>
          </div>
        ) : (
          <div className="resultado-listo">
            <CheckCircle2 size={16} />
            <span>
              Se creó el expediente {expediente?.numero_expediente || '…'} como{' '}
              {nombreTipo(trabajo.id_tipo_confirmado ?? trabajo.id_tipo_predicho)}
            </span>
          </div>
        )}

        <div className="detalle-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div>
            <span className="label">Tipo detectado</span>
            <p>{nombreTipo(trabajo.id_tipo_predicho)}</p>
          </div>
          <div>
            <span className="label">Confianza</span>
            <p>{confianza}</p>
          </div>
          <div>
            <span className="label">Páginas</span>
            <p>{trabajo.num_paginas ?? '—'}</p>
          </div>
        </div>
      </>
    )
  }

  const pendienteConfirmar =
    trabajo?.id_estado === ESTADO_EXITOSO &&
    trabajo.requiere_confirmacion &&
    !idExpedienteCreado &&
    !descartado

  return (
    <div>
      <h1>Clasificar con IA</h1>
      <p className="label" style={{ marginTop: 6, maxWidth: 640, display: 'block' }}>
        Sube un documento suelto y el sistema lo clasificará automáticamente creando el
        expediente correspondiente.
      </p>

      {idTrabajo ? (
        <Card style={{ marginTop: 20, maxWidth: 640 }}>
          <div className="archivo-preview" style={{ marginTop: 0, marginBottom: 16 }}>
            <FileText size={18} />
            <span>{nombreEnviado}</span>
          </div>

          {renderEstado()}

          <div className="resultado-acciones">
            {pendienteConfirmar && (
              <Button variant="acento" onClick={() => setModalAbierto(true)}>
                Revisar y confirmar
              </Button>
            )}
            {idExpedienteCreado && (
              <Button variant="acento" onClick={() => navigate(`/expedientes/${idExpedienteCreado}`)}>
                Ver el expediente
              </Button>
            )}
            <Button variant="secundario" onClick={clasificarOtro}>
              {terminado ? 'Clasificar otro documento' : 'Clasificar otro mientras tanto'}
            </Button>
            <Button variant="secundario" onClick={() => navigate('/expedientes')}>
              Ir a expedientes
            </Button>
          </div>
        </Card>
      ) : (
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

          {(archivo || enviando) && (
            <div className="archivo-preview">
              <FileText size={18} />
              {/* Si el usuario salió y volvió durante la subida, el File ya no
                  existe en este componente: se muestra el nombre guardado. */}
              <span>{archivo?.name || nombreEnviado}</span>
              {archivo && <span className="label">{Math.round(archivo.size / 1024)} KB</span>}
              {!enviando && (
                <Button variant="secundario" onClick={quitarArchivo} style={{ marginLeft: 'auto' }}>
                  Quitar archivo
                </Button>
              )}
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
      )}

      <ModalConfirmarClasificacion
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        idTrabajo={idTrabajo}
        onExito={() => setVersionConsulta((v) => v + 1)}
      />
    </div>
  )
}

export default ClasificarConIA
