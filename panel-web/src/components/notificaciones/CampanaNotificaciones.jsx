import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  AlertTriangle,
  Copy,
  CheckCircle,
  User,
  XCircle,
  CheckCheck,
} from 'lucide-react'
import usePolling from '../../hooks/usePolling'
import api from '../../services/api'
import ModalConfirmarClasificacion from './ModalConfirmarClasificacion'
import './CampanaNotificaciones.css'

const INTERVALO_MS = 15000

// Espeja tipos_notificacion de la base.
const TIPO_BAJA_CONFIANZA = 1
const TIPO_CARGA_COMPLETADA = 3

// El ícono viene de la base (tipos_notificacion.icono) en kebab-case.
const ICONOS = {
  'alert-triangle': AlertTriangle,
  copy: Copy,
  'check-circle': CheckCircle,
  user: User,
  'x-circle': XCircle,
}

function tiempoRelativo(fechaIso) {
  if (!fechaIso) return ''

  // El backend guarda en UTC sin sufijo de zona. Sin la Z, el navegador lo
  // interpretaria como hora local y mostraria diferencias de varias horas.
  const conZona = fechaIso.endsWith('Z') ? fechaIso : `${fechaIso}Z`
  const segundos = Math.floor((Date.now() - new Date(conZona).getTime()) / 1000)

  if (segundos < 60) return 'hace un momento'
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`
  const dias = Math.floor(horas / 24)
  if (dias < 30) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
  const meses = Math.floor(dias / 30)
  return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`
}

function CampanaNotificaciones() {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [modalConfirmarAbierto, setModalConfirmarAbierto] = useState(false)
  const [idTrabajoConfirmar, setIdTrabajoConfirmar] = useState(null)
  const contenedorRef = useRef(null)

  const traerNotificaciones = useCallback(async () => {
    const { data } = await api.get('/notificaciones')
    return data
  }, [])

  const { datos, recargar } = usePolling(traerNotificaciones, INTERVALO_MS)

  const notificaciones = datos?.notificaciones || []
  const noLeidas = datos?.no_leidas || 0

  useEffect(() => {
    if (!abierto) return

    const alClicAfuera = (evento) => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
        setAbierto(false)
      }
    }

    document.addEventListener('mousedown', alClicAfuera)
    return () => document.removeEventListener('mousedown', alClicAfuera)
  }, [abierto])

  const marcarTodas = async () => {
    try {
      await api.put('/notificaciones/marcar-todas-leidas')
      recargar()
    } catch {
      // Silencioso a propósito: el siguiente ciclo del polling corrige la vista.
    }
  }

  const marcarComoLeida = async (notificacion) => {
    if (notificacion.leida) return
    try {
      await api.put(`/notificaciones/${notificacion.id_notificacion}/leida`)
      recargar()
    } catch {
      // Ver comentario de marcarTodas.
    }
  }

  const alHacerClic = async (notificacion) => {
    // Baja confianza: hay una decisión pendiente, así que se abre el modal en
    // vez de navegar. No se marca leída todavía — eso ocurre al aceptar o
    // descartar, para que cancelar deje la notificación tal como estaba.
    if (notificacion.id_tipo === TIPO_BAJA_CONFIANZA && notificacion.id_trabajo) {
      setIdTrabajoConfirmar(notificacion.id_trabajo)
      setModalConfirmarAbierto(true)
      setAbierto(false)
      return
    }

    await marcarComoLeida(notificacion)

    // Carga completada: el expediente ya existe, se puede ir a verlo.
    if (notificacion.id_tipo === TIPO_CARGA_COMPLETADA && notificacion.id_expediente) {
      setAbierto(false)
      navigate(`/expedientes/${notificacion.id_expediente}`)
    }

    // Duplicados y errores no llevan a ningún lado: solo quedan leídos.
  }

  return (
    <div className="campana" ref={contenedorRef}>
      <button
        type="button"
        className="campana-boton"
        onClick={() => setAbierto((previo) => !previo)}
        aria-label={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ''}`}
      >
        <Bell size={20} />
        {noLeidas > 0 && (
          <span className="campana-badge">{noLeidas > 99 ? '99+' : noLeidas}</span>
        )}
      </button>

      {abierto && (
        <div className="campana-popup">
          <div className="campana-popup-encabezado">
            <span className="campana-popup-titulo">Notificaciones</span>
            {noLeidas > 0 && (
              <button type="button" className="campana-marcar-todas" onClick={marcarTodas}>
                <CheckCheck size={14} />
                Marcar todas como leídas
              </button>
            )}
          </div>

          <ul className="campana-lista">
            {notificaciones.length === 0 && (
              <li className="campana-vacio">No tienes notificaciones</li>
            )}

            {notificaciones.map((notificacion) => {
              const Icono = ICONOS[notificacion.icono] || Bell
              return (
                <li
                  key={notificacion.id_notificacion}
                  className={`campana-item${notificacion.leida ? '' : ' campana-item-nueva'}`}
                  onClick={() => alHacerClic(notificacion)}
                >
                  <Icono
                    size={18}
                    className="campana-item-icono"
                    style={{ color: notificacion.color_hex }}
                  />
                  <div className="campana-item-cuerpo">
                    <p className="campana-item-mensaje">{notificacion.mensaje}</p>
                    <span className="campana-item-tiempo">
                      {tiempoRelativo(notificacion.fecha_creacion)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <ModalConfirmarClasificacion
        isOpen={modalConfirmarAbierto}
        idTrabajo={idTrabajoConfirmar}
        onClose={() => setModalConfirmarAbierto(false)}
        onExito={recargar}
      />
    </div>
  )
}

export default CampanaNotificaciones
