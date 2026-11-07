import { useEffect, useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Button from '../common/Button'
import BotonEliminar from '../common/BotonEliminar'
import Skeleton from '../common/Skeleton'
import api from '../../services/api'

const ID_AREA_NOTARIAL = 1

function ModalConfirmarClasificacion({ isOpen, onClose, idTrabajo, onExito }) {
  const [trabajo, setTrabajo] = useState(null)
  const [tipos, setTipos] = useState([])
  const [idTipoElegido, setIdTipoElegido] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [urlDocumento, setUrlDocumento] = useState(null)
  const [noExiste, setNoExiste] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    // Al descartar, el backend borra el trabajo y deja la notificación con
    // id_trabajo en null. Sin id ya no hay nada que consultar: se sabe que fue
    // descartado.
    if (!idTrabajo) {
      setTrabajo(null)
      setCargando(false)
      setNoExiste(true)
      return
    }

    setCargando(true)
    setTrabajo(null)
    setUrlDocumento(null)
    setNoExiste(false)

    // Aparte del Promise.all: si falla la URL, el modal igual sirve para decidir.
    api
      .get(`/clasificacion/trabajos/${idTrabajo}/documento`)
      .then(({ data }) => setUrlDocumento(data.url))
      .catch(() => {})

    Promise.all([
      api.get(`/clasificacion/trabajos/${idTrabajo}`),
      api.get('/catalogos/tipos-expediente', { params: { id_area: ID_AREA_NOTARIAL } }),
    ])
      .then(([resTrabajo, resTipos]) => {
        const datos = resTrabajo.data.trabajo
        setTrabajo(datos)
        setTipos(resTipos.data.tipos_expediente || [])
        // Se preselecciona lo que predijo el modelo: aceptar sin tocar nada es
        // el camino más común, corregir es la excepción.
        setIdTipoElegido(datos.id_tipo_predicho ? String(datos.id_tipo_predicho) : '')
      })
      .catch((error) => {
        // Descartar borra el trabajo: si se descartó desde otro lado (la
        // campanita o la pantalla de Clasificar), llega un 404. Se avisa en el
        // modal y se le pide al padre que se actualice, en vez de dejar el
        // modal vacío.
        if (error.response?.status === 404) {
          setNoExiste(true)
          onExito?.()
          return
        }
        toast.error('No se pudo cargar el documento')
      })
      .finally(() => setCargando(false))
  }, [isOpen, idTrabajo])

  const aceptar = async () => {
    if (!idTipoElegido) {
      toast.error('Selecciona un tipo de expediente')
      return
    }

    setEnviando(true)
    try {
      const { data } = await api.post(`/clasificacion/trabajos/${idTrabajo}/confirmar`, {
        id_tipo_confirmado: Number(idTipoElegido),
      })
      toast.success(data.mensaje || 'Expediente creado')
      onExito?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo confirmar la clasificación')
    } finally {
      setEnviando(false)
    }
  }

  const descartar = async () => {
    setEnviando(true)
    try {
      await api.delete(`/clasificacion/trabajos/${idTrabajo}`)
      toast.success('Documento descartado')
      onExito?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo descartar el documento')
    } finally {
      setEnviando(false)
    }
  }

  const porcentaje =
    trabajo?.confianza != null ? `${Math.round(trabajo.confianza * 100)}%` : '—'
  const nombrePredicho =
    tipos.find((t) => t.id_tipo === trabajo?.id_tipo_predicho)?.nombre || '—'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar clasificación">
      {cargando && <Skeleton height="140px" />}

      {/* Las notificaciones no desaparecen al resolverse, así que se puede
          llegar acá desde una que ya se atendió. Sin este aviso, el formulario
          se vería normal y "Aceptar" fallaría con un error del backend. */}
      {!cargando && noExiste && (
        <>
          <p style={{ marginBottom: 20 }}>
            Este documento ya fue descartado. No se creó ningún expediente.
          </p>
          <Button variant="secundario" onClick={onClose}>
            Cerrar
          </Button>
        </>
      )}

      {!cargando && trabajo && !trabajo.requiere_confirmacion && (
        <>
          <p style={{ marginBottom: 20 }}>
            Este documento ya fue resuelto y no necesita confirmación.
          </p>
          <Button variant="secundario" onClick={onClose}>
            Cerrar
          </Button>
        </>
      )}

      {!cargando && trabajo && trabajo.requiere_confirmacion && (
        <>
          <div className="detalle-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div>
              <span className="label">Archivo</span>
              <p>{trabajo.nombre_archivo_original}</p>

            </div>
            <div>
              <span className="label">Predicción del modelo</span>
              <p>
                {nombrePredicho} ({porcentaje})
              </p>
            </div>
          </div>

          {/* Con aspecto de botón y a todo el ancho: es el paso que hay que dar
              antes de elegir el tipo, no un enlace secundario. */}
          {urlDocumento && (
            <a
              href={urlDocumento}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secundario btn-full"
              style={{ marginTop: 16, textDecoration: 'none' }}
            >
              <FileText size={16} />
              Ver documento
              <ExternalLink size={14} style={{ opacity: 0.6 }} />
            </a>
          )}

          <div style={{ marginTop: 18 }}>
            <label className="input-label" htmlFor="id_tipo_confirmado">
              Tipo del expediente
            </label>
            <select
              id="id_tipo_confirmado"
              className="select-field"
              value={idTipoElegido}
              onChange={(e) => setIdTipoElegido(e.target.value)}
            >
              {tipos.map((tipo) => (
                <option key={tipo.id_tipo} value={tipo.id_tipo}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <Button variant="exito" onClick={aceptar} disabled={enviando}>
              Aceptar
            </Button>
            {/* Mismo patrón que borrar expedientes: mantener presionado en vez
                del confirm() del navegador, que rompía el diseño del panel. */}
            <BotonEliminar
              onEliminar={descartar}
              etiqueta="Mantener para descartar"
              deshabilitado={enviando}
            />
            <Button
              variant="secundario"
              onClick={onClose}
              disabled={enviando}
              style={{ marginLeft: 'auto' }}
            >
              Cancelar
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}

export default ModalConfirmarClasificacion
