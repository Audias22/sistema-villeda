# ESTADO DEL PROYECTO — Sistema Villeda
**Última actualización:** 15 de agosto de 2026
**Desarrollador:** Rudi Audias Guevara Mejicanos — Carné 1190-22-8232

---

## STACK TECNOLÓGICO
| Capa | Tecnología | Estado |
|------|-----------|--------|
| Backend | Python 3.14.3 + Flask (desarrollo local); Python 3.13-slim en Docker de producción | ✅ Funcionando |
| Contenerización | Docker (imagen `python:3.13-slim` con `tesseract-ocr`, `tesseract-ocr-spa` y `poppler-utils` vía apt) | ✅ Funcionando en producción |
| Base de datos | PostgreSQL — Supabase | ✅ Funcionando |
| Almacenamiento archivos | Cloudflare R2 (bucket villeda-archivos) | ✅ Funcionando — migrado desde almacenamiento local |
| Almacenamiento archivos (código local anterior) | backend/almacenamiento/ | 🗄️ Comentado en documentos/services.py, no se borró (rollback disponible) |
| ORM | SQLAlchemy | ✅ Funcionando |
| Validación de entradas | Marshmallow | ✅ Instalado y en uso |
| Extracción PDF digital | pdfplumber | ✅ Funcionando |
| Búsqueda insensible a acentos | PostgreSQL unaccent | ✅ Funcionando |
| Exportación Excel | openpyxl | ✅ Funcionando |
| Exportación PDF | reportlab | ⏳ Instalado, no usado todavía |
| Panel web | React 18 + Vite — Vercel | ✅ Frontend completo (7 pantallas) — desplegado en Vercel (https://sistema-villeda-panel.vercel.app) |
| App móvil | React Native (Expo SDK 54) — APK Android | 🔄 Fases 1-3, 4A, 4B.1, 4B.2 y 4B.3 completadas + Fase 5 en progreso (nombre/ícono/splash y escaneo con cámara listos; notificaciones, biometría y build EAS pendientes) |
| OCR | Tesseract 5.x + OpenCV (filtrado HSV de sellos de color) — instalado vía apt en Docker de producción, en `C:\Program Files\Tesseract-OCR\` en local | ✅ Funcionando en producción y en local |
| Modelo baseline | BETO | ✅ Entrenado y evaluado (4 de septiembre de 2026) — F1 macro **0.9661** en su mejor configuración (truncamiento principio_final) |
| Modelo final | RoBERTa-base-bne | ✅ Entrenado y evaluado (4 de septiembre de 2026) — F1 macro **0.9862** en su mejor configuración (truncamiento principio_final). Supera a BETO: es el modelo seleccionado |
| Despliegue ML en producción | Modal (Free tier $30/mes de crédito, requiere tarjeta) | ✅ Desplegado y verificado (6 de septiembre de 2026) — RoBERTa-bne servido desde Modal, integrado al backend reemplazando el mock |
| Autenticación | JWT + bcrypt | ✅ Funcionando |
| RBAC | 2 capas (BD + decoradores) | ✅ Funcionando |

---

## SERVICIOS EXTERNOS CONFIGURADOS
| Servicio | Estado | Notas |
|----------|--------|-------|
| Supabase | ✅ Activo | Proyecto: villeda-juridico, región us-east-2 |
| GitHub | ✅ Activo | Repo: Audias22/sistema-villeda (privado) |
| Cloudflare R2 | ✅ Activo | Bucket villeda-archivos |
| Render.com — backend v2 (Docker) | ✅ Activo | https://sistema-villeda-backend-v2.onrender.com — Plan Starter ($7/mes, 0.5 CPU / 512MB RAM) desde 30 de julio de 2026 — antes Free tier |
| Render.com — backend v1 (nativo) | ⏸️ Suspendido | https://sistema-villeda-backend.onrender.com — conservado, no eliminado, por si hace falta consultar logs históricos |
| Vercel | ✅ Activo | Panel web desplegado — https://sistema-villeda-panel.vercel.app |
| Modal | ⏳ No creado | Se usará para servir BETO/RoBERTa como microservicio serverless cuando llegue la Fase 7/8 |

---

## DEPLOY EN PRODUCCIÓN
| Item | Estado | Notas |
|------|--------|-------|
| Backend en Render.com (v2 con Docker) | ✅ Completado | https://sistema-villeda-backend-v2.onrender.com |
| Frontend en Vercel | ✅ Completado | https://sistema-villeda-panel.vercel.app (variable `VITE_API_URL` apunta al backend v2) |
| Fix seguridad — debugger de Flask | ✅ Completado | `debug` ahora depende de `FLASK_ENV` (desactivado en producción, activo en local) |
| Fix codificación — requirements.txt | ✅ Completado | Convertido de UTF-16 a UTF-8 sin BOM, sin cambios de dependencias |
| Ping anti-pausa (Render free tier) | ✅ Activo | Hilo en background solo si `FLASK_ENV=production`, ping cada 14 min a /health. URL configurable vía `SELF_PING_URL` (opcional — si no está definida, usa el default apuntando a `sistema-villeda-backend-v2.onrender.com/health`); antes estaba hardcodeada al servicio v1 ya suspendido |
| Dockerización del backend (Tesseract + Poppler en Render) | ✅ Completado | `backend/Dockerfile` (imagen `python:3.13-slim`, instala `tesseract-ocr`, `tesseract-ocr-spa` y `poppler-utils` vía apt) + `backend/.dockerignore`. Se eliminaron los hardcodes de rutas de Windows en `ocr/services.py`: `tesseract_cmd` y `POPPLER_PATH` ahora se leen de las variables de entorno `TESSERACT_CMD`/`POPPLER_PATH` (opcionales — si no están definidas, pytesseract y pdf2image usan lo que encuentren en el PATH del sistema, que es el caso dentro del contenedor Linux). Verificado localmente: build y ejecución del contenedor Docker con OCR funcionando correctamente. Verificado en producción: JPG subido en producción → OCR real vía Tesseract 5.x → almacenamiento en R2 con key UUID limpia → apertura en navegador sin errores |
| Prueba end-to-end en producción (backend v2) | ✅ Exitosa | Login + subida de documento + OCR real + almacenamiento en R2 + descarga vía URL firmada + apertura del archivo, todo contra `sistema-villeda-backend-v2.onrender.com` |
| Fix 404 NOT_FOUND de Vercel al abrir el panel con sesión vencida | ✅ Completado | Se agregó `panel-web/vercel.json` con rewrite catch-all a `/index.html` y se eliminó la recarga completa del navegador en el manejo de 401 (ver detalle abajo) |

**Migración a servicio nuevo en Render (`sistema-villeda-backend-v2.onrender.com`):** Render no permite cambiar el runtime de un servicio existente de nativo (buildpack de Python) a Docker desde el dashboard, así que se creó un servicio nuevo (`sistema-villeda-backend-v2`) con runtime Docker apuntando al mismo repo. El servicio anterior (`sistema-villeda-backend.onrender.com`) quedó **suspendido, no eliminado**, por si hace falta consultar sus logs históricos. La app móvil (`app-movil/.env`, `EXPO_PUBLIC_API_URL`) y el panel web (`panel-web` en Vercel, variable `VITE_API_URL`) ya apuntan al servicio nuevo.

**Fix del 404 NOT_FOUND de Vercel al abrir el panel con una sesión vencida (5 de agosto de 2026):** al abrir el link raíz de Vercel en pestaña nueva, con un token viejo todavía guardado en localStorage, el panel se pintaba un instante y luego caía en un 404 NOT_FOUND de Vercel del que no se salía ni refrescando (solo cerrando la pestaña y volviendo a entrar). La cadena era: (1) `AuthContext` leía el token de localStorage y daba `autenticado: true` solo por su presencia, sin revisar si ya había expirado; (2) la ruta `/` redirige a `/dashboard`, que pasaba el `ProtectedRoute` y montaba el panel; (3) el `Dashboard` pedía datos al backend con el token muerto y recibía 401; (4) el interceptor de `services/api.js` hacía `window.location.href = '/login'`, que es una **recarga completa** del navegador, no una navegación de React Router; (5) esa recarga pedía `/login` como archivo real al servidor de Vercel, que sin rewrite de SPA no lo encuentra → 404. Se corrigieron las dos puntas: se agregó `panel-web/vercel.json` con el rewrite catch-all (`/(.*)` → `/index.html`, lo estándar para SPA de Vite) y se reemplazó la recarga por el mismo patrón de eventos que ya usaba la app móvil — nuevo `panel-web/src/services/authEvents.js` (idéntico al de `app-movil`), el interceptor emite `emitSessionExpired()` y `AuthContext` escucha y redirige con `navigate('/login')` de React Router, sin recargar. Además `AuthContext` ahora valida el campo `exp` del JWT al arrancar con `panel-web/src/utils/jwt.js` (decodificación base64url a mano, sin librerías nuevas): si el token ya venció, limpia localStorage y arranca como no autenticado, así que el panel ya ni se alcanza a pintar. Se excluyó `/auth/login` del manejo de 401 (igual que en la app móvil) — antes, una contraseña equivocada disparaba la recarga y borraba el toast de error antes de que se viera. Verificado con Chrome headless por CDP contra un backend falso que devuelve 401: con el código viejo el navegador cargaba 2 documentos (la recarga) y con el corregido carga 1 solo, terminando en `/login` en ambos escenarios (token expirado en localStorage, y token con `exp` futuro rechazado por el backend).

**El bug de PNG/JPG en el visor móvil (documentado antes como "pendiente" en Bugs conocidos) quedó resuelto como efecto secundario de la investigación de R2**, no de un cambio en el visor: era un problema de datos históricos — los documentos 1 y 2 del expediente NOT-2026-0001 se cargaron antes de la migración a Cloudflare R2 y su `ruta_almacenamiento` guardó una ruta local de Windows en vez de una key de R2, por lo que el archivo nunca existió en el bucket (confirmado con `list_objects_v2`, sin resultados para esos hashes). Los documentos cargados después de la migración a R2 suben con key UUID limpia y se abren correctamente en cualquier navegador — no hubo que tocar `expo-web-browser` ni el Content-Type. Los dos documentos huérfanos siguen en la base de datos (ver "MEJORAS FUTURAS PENDIENTES" más abajo).

---

## VARIABLES DE ENTORNO (.env) — backend/
| Variable | Estado |
|----------|--------|
| DATABASE_URL | ✅ Configurada (Session Pooler Supabase) |
| JWT_SECRET_KEY | ✅ Configurada |
| FLASK_ENV | ✅ Configurada (development en local, production en Render) |
| PORT | ✅ Configurada (5000 en local; Render inyecta la suya) |
| TESSERACT_CMD | ✅ Configurada en local (Windows, `C:\Program Files\Tesseract-OCR\tesseract.exe`); no definida en Docker/Render (usa PATH del sistema) |
| POPPLER_PATH | ✅ Configurada en local (Windows, `C:\poppler\bin`); no definida en Docker/Render (usa PATH del sistema) |
| SELF_PING_URL | ⏳ Opcional — si se define, override del default `sistema-villeda-backend-v2.onrender.com/health` |
| R2_ACCOUNT_ID | ✅ Configurada |
| R2_ACCESS_KEY_ID | ✅ Configurada |
| R2_SECRET_ACCESS_KEY | ✅ Configurada |
| R2_BUCKET_NAME | ✅ Configurada (villeda-archivos) |

---

## BASE DE DATOS — Supabase
| Item | Estado |
|------|--------|
| 28 tablas creadas (recontado el 31 de agosto de 2026 contra `information_schema`: la BD real tiene **44 tablas base + 5 vistas = 49 objetos**, no 28 ni las 43 anotadas el 31 de julio — drift acumulado sin documentar) | ✅ |
| 5 vistas creadas | ✅ |
| 5 triggers creados | ✅ |
| Datos seed (roles, permisos, áreas, etc.) | ✅ |
| Extensión pg_trgm | ✅ |
| Extensión unaccent | ✅ |
| Índice GIN texto_completo | ✅ |
| Usuario ovilleda creado | ✅ |
| Permisos asignados a los 5 roles | ✅ |
| Esquema de `clientes` verificado (17 columnas — el 6 de agosto de 2026 se agregaron `telefono` VARCHAR(20), `email` VARCHAR(100) y `direccion` VARCHAR(255), las 3 nullable, con ALTER TABLE manual en el SQL Editor de Supabase) | ✅ |
| Esquema de `expedientes` verificado (18 columnas) | ✅ |
| Esquema de `documentos` verificado (16 columnas) | ✅ |
| Esquema de `busquedas` verificado (8 columnas) | ✅ |
| Esquema de `formatos_documento` verificado (6 formatos: PDF escaneado=1, PDF digital=2, Word=3, Excel=4, JPG=5, PNG=6) | ✅ |
| `criterios_busqueda` verificado (5 criterios: nombre_cliente=1, fecha=2, area=3, contenido=4, numero_expediente=5) | ✅ |
| `estados_fisico_doc` ajustada a 3 niveles (Deteriorado=1, Regular=2, Bueno=3) según marco metodológico (variable EFD) | ✅ |
| `tipos_expediente`: catálogo Notarial corregido a 6 tipos reales (Compraventa, Mandato, Donación, Declaración Jurada, Matrimonio, Otro), confirmados con la secretaria del Lic. Villeda (30 de julio de 2026) — Civil/Laboral/Penal sin cambios (14 tipos originales, aún sin validar, ver nota de alcance abajo) | 🔄 Notarial confirmado, resto pendiente |
| 1 cliente real de prueba creado (id_cliente: 1) | ✅ |
| 1 expediente real de prueba creado (id_expediente: 1, numero: NOT-2026-0001) | ✅ |
| Documentos de prueba en NOT-2026-0001 | ✅ (2 PNG huérfanos previos a R2 + varios PDF/JPG posteriores con key UUID limpia). Se limpiarán junto con el expediente cuando arranque la carga en limpio |
| 4 búsquedas reales registradas con TBR (promedio 105.50 ms, rango 93-117 ms) | ✅ |
| 1 exportación Excel real generada y descargada exitosamente | ✅ |

---

## ESTRUCTURA DE ARCHIVOS — backend/
backend/

├── app/

│   ├── init.py          ✅ Factory function con 8 blueprints registrados (auth, ocr, clientes, expedientes, documentos, busquedas, reportes, auditoria)

│   ├── config.py            ✅ Variables de entorno

│   ├── auth/

│   │   ├── init.py      ✅ Exporta auth_bp

│   │   ├── routes.py        ✅ POST /api/v1/auth/login, POST /api/v1/auth/logout

│   │   └── services.py      ✅ autenticar_usuario()

│   ├── usuarios/

│   │   ├── init.py      ✅ Exporta usuarios_bp

│   │   ├── models.py        ✅ Modelo Usuario (SQLAlchemy)

│   │   ├── schemas.py       ✅ UsuarioSchema, UsuarioUpdateSchema (marshmallow)

│   │   ├── services.py      ✅ CRUD completo (crear, listar paginado+búsqueda, obtener, actualizar, desactivar)

│   │   └── routes.py        ✅ POST, GET (lista+detalle), PUT, DELETE — protegidas con gestionar_usuarios

│   ├── catalogos/           ✅ Completo

│   │   ├── init.py      ✅ Exporta catalogos_bp

│   │   ├── routes.py        ✅ GET roles, áreas jurídicas, estados de expediente, tipos de expediente (filtrable por área), prioridades, criterios de búsqueda

│   │   └── services.py      ✅ Consultas de solo lectura sobre los catálogos de app/common/models.py

│   ├── common/

│   │   ├── init.py      ✅ Exporta 13 modelos catálogo + require_permission

│   │   ├── models.py        ✅ Rol, Permiso, RolPermiso, AreaJuridica, EstadoExpediente, Prioridad, TipoExpediente, FormatoDocumento, EstadoFisicoDoc, EstadoCarga, CargaMasiva, TipoReporte, Exportacion

│   │   ├── decorators.py    ✅ @require_permission con json.loads

│   │   └── peticion.py      ✅ obtener_ip_cliente() con X-Forwarded-For + constante PLATAFORMA_WEB

│   ├── ocr/

│   │   ├── init.py      ✅ Exporta ocr_bp

│   │   ├── routes.py        ✅ POST /api/v1/ocr/procesar

│   │   └── services.py      ✅ procesar_archivo(), calcular_hash(), preprocesar_imagen() — filtrado de color HSV con OpenCV para eliminar sellos (rojo, azul, dorado) antes de Tesseract. `tesseract_cmd` y `POPPLER_PATH` se leen de `os.getenv()` (opcionales)

│   ├── clientes/

│   │   ├── init.py      ✅ Exporta clientes_bp

│   │   ├── models.py        ✅ Modelo Cliente (14 columnas, igual a Supabase)

│   │   ├── schemas.py       ✅ ClienteSchema, ClienteUpdateSchema (marshmallow)

│   │   ├── services.py      ✅ CRUD completo + validación Natural/Jurídica + duplicados DPI

│   │   └── routes.py        ✅ POST, GET (lista+detalle), PUT, DELETE

│   ├── expedientes/

│   │   ├── init.py      ✅ Exporta expedientes_bp

│   │   ├── models.py        ✅ Modelo Expediente (18 columnas, igual a Supabase)

│   │   ├── schemas.py       ✅ ExpedienteSchema, ExpedienteUpdateSchema, ExpedienteCerrarSchema

│   │   ├── services.py      ✅ CRUD + generación automática numero_expediente + transiciones de estado controladas

│   │   └── routes.py        ✅ POST, GET (lista+detalle), PUT, PUT /estado

│   ├── documentos/

│   │   ├── init.py      ✅ Exporta documentos_bp

│   │   ├── models.py        ✅ Modelo Documento (16 columnas, igual a Supabase) + to_dict_completo()

│   │   ├── schemas.py       ✅ DocumentoUploadSchema, DocumentoUpdateSchema

│   │   ├── services.py      ✅ cargar_documento() integra OCR+pdfplumber+hash+subida a R2

│   │   └── routes.py        ✅ POST, GET por expediente, GET detalle (con texto), PUT estado_fisico

│   ├── busquedas/

│   │   ├── init.py      ✅ Exporta busquedas_bp

│   │   ├── models.py        ✅ CriterioBusqueda, Busqueda (8 columnas, igual a Supabase)

│   │   ├── schemas.py       ✅ BusquedaSchema

│   │   ├── services.py      ✅ Medición TBR con time.perf_counter(), unaccent en criterios 1 y 4, métricas agregadas

│   │   └── routes.py        ✅ POST /busquedas, GET /historial, GET /metricas

│   ├── reportes/

│   │   ├── init.py      ✅ Exporta reportes_bp

│   │   ├── services.py      ✅ obtener_dashboard(), exportar_expedientes_excel() con openpyxl (encabezados con color, filtros, freeze panes) + registrar_solicitud_exportacion() / marcar_exportacion_exitosa() / marcar_exportacion_fallida()

│   │   └── routes.py        ✅ GET /dashboard, GET /expedientes/excel (descarga con send_file + bitácora en exportaciones)

│   ├── services/            ✅ Servicios transversales (no ligados a un módulo específico)

│   │   ├── init.py

│   │   └── r2_service.py    ✅ Cliente boto3 para Cloudflare R2 — subir_archivo(), descargar_archivo(), eliminar_archivo(), obtener_url_firmada()

│   ├── clasificacion/       ✅ Completo — cola de trabajos ML, worker y confirmación humana

│   │   ├── init.py      ✅ Exporta clasificacion_bp

│   │   ├── models.py        ✅ EstadoProcesamiento, ModeloML, TrabajoClasificacion (26 columnas), ClasificacionML

│   │   ├── schemas.py       ✅ TrabajoCrearSchema, TrabajoConfirmarSchema

│   │   ├── clasificador.py  ✅ Mock aislado — clasificar(texto) devuelve {id_tipo_predicho, confianza, id_modelo}

│   │   ├── worker.py        ✅ Daemon thread: claim atómico, recuperación de zombis, loop cada 5s

│   │   ├── services.py      ✅ encolar_trabajo(), obtener_trabajo(), procesar_trabajo(), confirmar_trabajo(), descartar_trabajo()

│   │   └── routes.py        ✅ POST /trabajos, GET /trabajos/\<id\>, POST /trabajos/\<id\>/confirmar, DELETE /trabajos/\<id\>

│   ├── notificaciones/      ✅ Completo

│   │   ├── init.py      ✅ Exporta notificaciones_bp

│   │   ├── models.py        ✅ TipoNotificacion, Notificacion + constantes TIPO_*

│   │   ├── schemas.py       ✅ NotificacionListarSchema

│   │   ├── services.py      ✅ crear_notificacion() sin commit, listar_notificaciones(), marcar_leida(), marcar_todas_leidas()

│   │   └── routes.py        ✅ GET /notificaciones, PUT /\<id\>/leida, PUT /marcar-todas-leidas

│   ├── ml/                  ⏳ Vacío (carpeta sin uso — la funcionalidad ML vive en clasificacion/)

│   └── auditoria/           ✅ Completo

│       ├── init.py      ✅ Exporta auditoria_bp

│       ├── models.py        ✅ Modelo Auditoria (11 columnas, igual a Supabase)

│       ├── services.py      ✅ registrar_auditoria() + listar_auditoria() con filtros y paginación

│       └── routes.py        ✅ GET (lista+detalle)

├── almacenamiento/          ✅ Carpeta de archivos subidos (NO se sube a GitHub — en .gitignore)

│   └── exportaciones/       ✅ Carpeta de reportes Excel/PDF generados (NO se sube a GitHub — en .gitignore)

├── venv/                    ✅ Entorno virtual activo

├── .env                     ✅ Variables configuradas (DATABASE_URL, JWT_SECRET_KEY, FLASK_ENV, PORT, TESSERACT_CMD, POPPLER_PATH, R2_*)

├── requirements.txt         ✅ Actualizado con marshmallow + pdfplumber

├── Dockerfile               ✅ Imagen python:3.13-slim + apt de tesseract-ocr, tesseract-ocr-spa y poppler-utils

├── .dockerignore            ✅ Excluye venv/, .env, almacenamiento/, scripts de prueba locales, cachés y archivos de editor/OS

├── run.py                   ✅ Punto de entrada con /health, endpoint de prueba, y ping_propio() con SELF_PING_URL opcional

└── Procfile                 ✅ Conservado (no usado en runtime Docker, no borra)

---

## ENDPOINTS DISPONIBLES
| Método | Ruta | Estado | Protegido |
|--------|------|--------|-----------|
| GET | /health | ✅ Funcionando | No |
| POST | /api/v1/auth/login | ✅ Funcionando | No |
| POST | /api/v1/auth/logout | ✅ Funcionando | No |
| GET | /api/v1/test/protegido | ✅ Funcionando | Sí — ver_dashboard |
| POST | /api/v1/ocr/procesar | ✅ Funcionando | Sí — cargar_documento |
| POST | /api/v1/clientes | ✅ Funcionando (409 con id_cliente si el DPI o NIT ya existe) | Sí — gestionar_clientes |
| GET | /api/v1/clientes | ✅ Funcionando (paginado + búsqueda + solo_activos) | Sí — gestionar_clientes |
| GET | /api/v1/clientes/\<id\> | ✅ Funcionando | Sí — gestionar_clientes |
| PUT | /api/v1/clientes/\<id\> | ✅ Funcionando (mismo 409 que POST) | Sí — gestionar_clientes |
| DELETE | /api/v1/clientes/\<id\> | ✅ Funcionando (soft delete) | Sí — gestionar_clientes |
| POST | /api/v1/expedientes | ✅ Funcionando (numero_expediente automático) | Sí — gestionar_expedientes |
| GET | /api/v1/expedientes | ✅ Funcionando (paginado + filtros área/estado/usuario/cliente — `?id_cliente=X` agregado el 6 de agosto de 2026 para el detalle de cliente) | Sí — buscar_expediente |
| GET | /api/v1/expedientes/\<id\> | ✅ Funcionando | Sí — ver_expediente |
| PUT | /api/v1/expedientes/\<id\> | ✅ Funcionando (bloqueado si cerrado/archivado) | Sí — gestionar_expedientes |
| PUT | /api/v1/expedientes/\<id\>/estado | ✅ Funcionando (transiciones controladas) | Sí — gestionar_expedientes |
| POST | /api/v1/documentos | ✅ Funcionando (OCR/pdfplumber automático + duplicados) | Sí — cargar_documento |
| GET | /api/v1/expedientes/\<id\>/documentos | ✅ Funcionando (paginado) | Sí — ver_expediente |
| GET | /api/v1/documentos/\<id\> | ✅ Funcionando (incluye texto_completo) | Sí — ver_expediente |
| PUT | /api/v1/documentos/\<id\> | ✅ Funcionando (solo estado_fisico) | Sí — cargar_documento |
| GET | /api/v1/documentos/\<id\>/descarga | ✅ Funcionando (URL firmada de R2, expira en 1 hora) | Sí — ver_expediente |
| POST | /api/v1/busquedas | ✅ Funcionando (mide y registra TBR real) | Sí — buscar_expediente |
| GET | /api/v1/busquedas/historial | ✅ Funcionando (paginado + filtros usuario/criterio) | Sí — buscar_expediente |
| GET | /api/v1/busquedas/metricas | ✅ Funcionando (promedio/min/max TBR) | Sí — ver_dashboard |
| GET | /api/v1/reportes/dashboard | ✅ Funcionando (totales + por área + por estado + por tipo notarial + por mes + TBR + duplicados) | Sí — ver_dashboard |
| POST | /api/v1/clasificacion/trabajos | ✅ Funcionando (encola y responde 202 sin procesar) | Sí — cargar_documento |
| GET | /api/v1/clasificacion/trabajos/\<id\> | ✅ Funcionando (estado del trabajo en la cola) | Sí — cargar_documento |
| POST | /api/v1/clasificacion/trabajos/\<id\>/confirmar | ✅ Funcionando (crea el expediente con el tipo confirmado) | Sí — revisar_clasificacion |
| DELETE | /api/v1/clasificacion/trabajos/\<id\> | ✅ Funcionando (solo trabajos pendientes de confirmación) | Sí — revisar_clasificacion |
| GET | /api/v1/notificaciones | ✅ Funcionando (20 más recientes + conteo de no leídas) | Sí — ver_notificaciones |
| PUT | /api/v1/notificaciones/\<id\>/leida | ✅ Funcionando (valida pertenencia al usuario del token) | Sí — ver_notificaciones |
| PUT | /api/v1/notificaciones/marcar-todas-leidas | ✅ Funcionando | Sí — ver_notificaciones |
| GET | /api/v1/reportes/expedientes/excel | ✅ Funcionando (descarga real .xlsx con filtros opcionales + registro en `exportaciones`) | Sí — exportar_reporte |
| GET | /api/v1/auditoria | ✅ Funcionando (paginado + filtros tabla/acción/usuario/fecha) | Sí — ver_auditoria |
| GET | /api/v1/auditoria/\<id\> | ✅ Funcionando | Sí — ver_auditoria |
| POST | /api/v1/usuarios | ✅ Funcionando | Sí — gestionar_usuarios |
| GET | /api/v1/usuarios | ✅ Funcionando (paginado + búsqueda) | Sí — gestionar_usuarios |
| GET | /api/v1/usuarios/\<id\> | ✅ Funcionando | Sí — gestionar_usuarios |
| PUT | /api/v1/usuarios/\<id\> | ✅ Funcionando | Sí — gestionar_usuarios |
| DELETE | /api/v1/usuarios/\<id\> | ✅ Funcionando (soft delete) | Sí — gestionar_usuarios |
| GET | /api/v1/catalogos/roles | ✅ Funcionando | Sí (JWT) |
| GET | /api/v1/catalogos/areas-juridicas | ✅ Funcionando | Sí (JWT) |
| GET | /api/v1/catalogos/estados-expediente | ✅ Funcionando | Sí (JWT) |
| GET | /api/v1/catalogos/tipos-expediente | ✅ Funcionando (filtrable por id_area) | Sí (JWT) |
| GET | /api/v1/catalogos/prioridades | ✅ Funcionando | Sí (JWT) |
| GET | /api/v1/catalogos/criterios-busqueda | ✅ Funcionando | Sí (JWT) |

---

## PANEL WEB — panel-web/ (React 18 + Vite)
| Pantalla | Ruta | Estado |
|----------|------|--------|
| Login | /login | ✅ Autenticación JWT con AuthContext |
| Dashboard | /dashboard | ✅ Totales, distribución por área/estado, TBR, gráficas (Bar/Pie/Area) |
| Expedientes (lista + detalle) | /expedientes, /expedientes/:id | ✅ Listado paginado, filtros, detalle con documentos, modal de nuevo expediente (permite crear el cliente al vuelo si la búsqueda no lo encuentra) |
| Clientes (lista + detalle) | /clientes, /clientes/:id | ✅ Listado paginado con búsqueda y filtro activos/todos, modal crear/editar, detalle con datos de contacto y sus expedientes, desactivación con confirmación |
| Cargar documento | /cargar | ✅ Subida de archivo con OCR/pdfplumber automático |
| Clasificar con IA | /clasificar | ✅ Sube un documento suelto sin elegir expediente: el worker lo clasifica y crea el expediente solo. Responde de inmediato y el resultado llega por la campanita |
| Búsqueda | /busqueda | ✅ Búsqueda por los 5 criterios con medición de TBR |
| Usuarios | /usuarios | ✅ CRUD conectado a /api/v1/usuarios |
| Reportes | /reportes | ✅ Dashboard de reportes + exportación Excel |

**Estructura:** componentes comunes reutilizables (Button, Card, Input, Modal, Table, Badge, Pagination, Skeleton, EmptyState), un componente de dominio compartido (`ClienteFormulario`, con prop `compacto` para el alta al vuelo), layout con Sidebar + TopBar, rutas protegidas (ProtectedRoute), contexto de autenticación (AuthContext), hooks (useAuth, useFetch), capa de servicios (api.js) que centraliza las llamadas al backend Flask.

**Persistencia del tiempo de extracción de texto — variable TPO (15 de agosto de 2026):** el tiempo que tarda el OCR ya se calculaba en `procesar_archivo()`, pero se descartaba: ningún llamador lo guardaba. Ahora se persiste, porque es la variable TPO del Capítulo III de la tesis.

**Migraciones (ejecutadas manualmente en Supabase):**
```sql
ALTER TABLE documentos              ADD COLUMN tiempo_ocr_seg NUMERIC(6,2);
ALTER TABLE trabajos_clasificacion  ADD COLUMN tiempo_ocr_seg NUMERIC(6,2);
```

**Qué mide exactamente (definición para la matriz de operacionalización):** segundos que tarda **únicamente la extracción del texto**. Incluye el rasterizado del PDF con Poppler, el preprocesamiento HSV de sellos y el reconocimiento de Tesseract; o, en el camino digital, la lectura de la capa de texto con pdfplumber. **No incluye** la detección del formato (`determinar_id_formato()`, que abre el PDF para ver si trae capa de texto), la descarga del archivo desde R2, el cálculo del hash, la clasificación del modelo ni ninguna escritura en la base. La definición está escrita en el docstring de `_extraer_texto()` en `clasificacion/services.py` para que código y tesis no se desincronicen.

**Un solo instrumento de medición:** `procesar_archivo()` medía con `time.time()` mientras el TBR de búsquedas usa `time.perf_counter()`. Se unificó todo en `perf_counter` (reloj monotónico, inmune a los ajustes de hora del sistema), para poder declarar un único instrumento en la matriz de operacionalización. El único consumidor de `tiempo_seg` fuera de los logs es el endpoint `POST /api/v1/ocr/procesar`, que no lo llama ningún cliente y cuyo contrato no cambia: sigue devolviendo segundos transcurridos con el mismo nombre.

**Dónde se guarda.** Hay tres lugares que construyen un `Documento` y los tres registran el tiempo:

| Origen | De dónde sale el valor |
|---|---|
| `documentos/services.py` — carga manual | se mide ahí mismo. El camino de PDF digital **antes no medía nada**, y son el 78% de los expedientes reales (124 de 158), así que sin esto la variable quedaba casi vacía |
| `clasificacion/services.py` — creación automática | viaja desde `_extraer_texto()` dentro de la misma ejecución del worker |
| `clasificacion/services.py` — confirmación manual | se copia de `trabajos_clasificacion.tiempo_ocr_seg` |

El tercer caso es el motivo de la segunda migración: en el camino de baja confianza el texto se extrae cuando el worker procesa el trabajo, pero el documento recién se crea **cuando una persona confirma el tipo**, en otra petición HTTP y quizá días después. La medición ya no existe en memoria, y recalcularla ahí daría un número falso porque en la confirmación no se vuelve a hacer OCR. Por eso el worker guarda el tiempo en el propio trabajo apenas lo mide — antes de cualquier bifurcación, así queda registrado también en los trabajos que terminan en Error o Duplicado — y la confirmación lo copia al documento.

Los documentos y trabajos anteriores a este cambio quedan en NULL, sin inventar valores. Verificado con los cuatro caminos en local: carga manual de PDF digital (0.14 s), carga manual de PDF escaneado por Tesseract (5.42 s, 2 páginas), creación automática, y confirmación manual (el valor viaja del trabajo al documento entre dos peticiones distintas).

**Funcionalidad "Clasificar con IA" — completa (14 de agosto de 2026, 4 fases):** la secretaria sube un documento suelto en `/clasificar` sin elegir expediente, y el sistema le crea el expediente correspondiente. El panel responde de inmediato y el resultado llega por la campanita del header. Se construyó en cuatro fases: cola vacía → worker con creación automática → notificaciones → pantalla y confirmación manual.

**Migración de base de datos:** tabla nueva `trabajos_clasificacion` (26 columnas), más `id_tipo_predicho`/`id_tipo_corregido` agregadas a `clasificaciones_ml` e `id_trabajo` agregada a `notificaciones`. Las tablas `clasificaciones_ml`, `probabilidades_clasificacion`, `modelos_ml`, `notificaciones` y `tipos_notificacion` **ya existían** desde el diseño original (con `tipos_notificacion` sembrada con sus 5 tipos), pero estaban modeladas para clasificar por **área jurídica** (4 clases) y esta funcionalidad clasifica por **tipo notarial** (6 clases) — de ahí las columnas nuevas. En `clasificaciones_ml` la columna `id_area_predicha` es NOT NULL y se llena siempre con 1 (Notarial), que es cierto por construcción; el dato con significado real va en `id_tipo_predicho`.

**Por qué existe una tabla de cola separada:** `documentos.id_expediente` es NOT NULL, así que un documento suelto no puede vivir en `documentos` antes de que exista su expediente, y `clasificaciones_ml.id_documento` tampoco admite clasificar sin documento. `trabajos_clasificacion` guarda el archivo, su texto y su predicción hasta que el expediente existe. En el caso de baja confianza eso puede durar días, hasta que una persona decida.

**Decisiones de diseño:**

- **Worker como daemon thread** en el mismo proceso Flask (patrón de `ping_propio` en `run.py`), con polling cada 5 segundos. Se descartó Celery/Redis y un servicio worker aparte en Render por el volumen real de la oficina (un usuario) y el costo. Arranca solo si `FLASK_ENV=production`, o en local con `FORZAR_WORKER=true`. Lleva un chequeo de `WERKZEUG_RUN_MAIN` porque con `debug=True` el reloader de Flask levanta dos procesos y sin eso habría dos workers compitiendo por la misma cola.
- **Claim atómico** con `UPDATE ... WHERE id_trabajo = (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING`. Hoy corre un solo worker, pero esto es lo que permitiría moverlo a un proceso aparte sin cambiar nada.
- **Umbral de confianza 0.70**: por encima el expediente se crea solo; por debajo el trabajo queda en `requiere_confirmacion=TRUE` y espera que una persona acepte o corrija el tipo. El OCR y el modelo igual terminaron bien, así que el estado sigue siendo Exitoso.
- **Mock del clasificador** (`clasificador.py`, aislado y reemplazable por la llamada HTTP a Modal sin cambiar la firma): elige al azar entre los 6 tipos notariales activos leídos del catálogo, con la confianza sesgada 70% alta / 30% baja. El sesgo se controla con `MOCK_SESGO_ALTA_CONFIANZA` (default 0.70); en local se puede bajar a 0.10 para probar el modal de confirmación sin subir veinte archivos. Registrado en `modelos_ml` con `id_modelo=3` y `num_clases=6` — los modelos 1 (BETO) y 2 (RoBERTa-bne) del marco teórico quedaron intactos con sus 4 clases.
- **Duplicados por hash** contra la tabla `documentos`: el trabajo queda en estado 5 (Duplicado), se borra el objeto de R2 para no acumular copias, se guarda el id del documento original en `mensaje_error` y no se crea nada.
- **OCR sin texto** (PDF de solo imágenes ilegibles): estado 4 (Error), no se llama al clasificador y el archivo **se conserva** en R2 para poder revisarlo a mano.
- **Cliente placeholder "Cliente NNN"** secuencial (001, 002...), tipo_persona Natural. Un documento suelto no trae con qué identificar a su dueño, así que siempre se crea uno nuevo y la secretaria le pone el nombre real después editando el cliente.
- **Trabajos zombi**: al arrancar, el worker devuelve a la cola los que quedaron En proceso más de 15 minutos (un deploy o un OOM a mitad del OCR), sumando un intento. A los 3 intentos pasan a Error para que un archivo que rompe el pipeline no gire para siempre.
- **Retry del `numero_expediente`**: se genera con `count()+1`, que no es atómico, así que si alguien crea un expediente a mano en el mismo instante los dos calculan el mismo número y el UNIQUE rechaza al segundo. Hasta 3 reintentos. Ojo al leer el código: el `rollback` del reintento revierte **también** los campos ya asignados al trabajo, por eso se reasignan dentro del loop y no antes.
- **La confirmación humana usa una función paralela** (`_crear_expediente_desde_confirmacion`) en vez de parametrizar la automática, para que las dos historias queden separadas y auditables por separado. Diferencias reales: el expediente se asigna a quien confirmó (no a quien subió el archivo), la descripción deja registrada la predicción original junto al tipo final, y en `clasificaciones_ml` se llena `id_tipo_corregido` solo cuando hubo corrección real — así se puede medir después cuántas veces se equivocó el modelo.
- **Descartar solo aplica a trabajos pendientes de confirmación.** Los duplicados y los errores no se borran aunque parezcan basura: son la evidencia de qué pasó con un archivo que alguien subió.
- **Todas las notificaciones se crean sin commit propio** (`crear_notificacion()` hace `add` y nada más), para que viajen en la misma transacción que el expediente. Si la creación falla y hace rollback, no queda el aviso de algo que nunca ocurrió.

**Panel web:** pantalla `/clasificar` (drag & drop, reutiliza el CSS de `/cargar`), campanita `CampanaNotificaciones` montada en el TopBar de todas las pantallas con polling cada 15s, `ModalConfirmarClasificacion` para el caso de baja confianza (dropdown con los 6 tipos preseleccionado en el predicho, más Aceptar / Descartar / Cancelar), y hook reutilizable `usePolling`. Al hacer clic en una notificación: la de baja confianza abre el modal, la de carga completada navega al expediente, y las de duplicado y error solo se marcan leídas. Dos detalles resueltos en el camino: el backend guarda las fechas en UTC sin sufijo de zona, así que el tiempo relativo le agrega la `Z` antes de parsear (sin eso toda notificación reciente diría "hace 6 horas"); y como las notificaciones no desaparecen al resolverse, el modal avisa "este documento ya fue resuelto" si se llega a él desde una notificación vieja.

**⚠️ Pendiente conocido — trigger `trg_notificacion_baja_confianza`:** existe en Supabase desde el diseño original un trigger sobre `clasificaciones_ml` que inserta una notificación de baja confianza cuando `confianza < 0.70`. Estuvo dormido hasta la Fase 4, porque hasta entonces un trabajo de baja confianza nunca llegaba a insertar una clasificación. Ahora, cada confirmación manual dispara **una notificación fantasma** ("El documento tiene una confianza de clasificación de X%. Requiere revisión manual.") que además viene sin `id_expediente` ni `id_trabajo`. La aplicación ya maneja estas notificaciones mejor que el trigger, así que la salida limpia es `DROP TRIGGER trg_notificacion_baja_confianza ON clasificaciones_ml; DROP FUNCTION fn_notificacion_baja_confianza();`. **No ejecutado todavía — falta decidirlo.** Mientras tanto, el modal ignora las notificaciones sin `id_trabajo`, así que la fantasma no rompe nada: solo ensucia la bandeja.

**Otros triggers preexistentes descubiertos (14 de agosto de 2026):** además del anterior hay cuatro de auditoría (`fn_auditar_expediente_insert/update`, `fn_auditar_documento_insert`, `fn_auditar_clasificacion_update`) que escriben en `auditoria` por su cuenta — o sea que todo lo que crea el worker **ya queda auditado por la base**, sin llamar a `registrar_auditoria()` desde el código. Y `trg_detectar_duplicado`, un BEFORE INSERT sobre `documentos` que pisa `es_duplicado_exacto` e `id_documento_original` comparando el hash: ese campo lo decide la base, no el código.

**⚠️ Hallazgo — `fn_auditar_clasificacion_update` está inactivo de hecho (31 de agosto de 2026):** su condición vigila `OLD.id_area_corregida` / `NEW.id_area_corregida`, columnas del diseño original por área jurídica, mientras que la confirmación humana escribe en `id_tipo_corregido`. La condición nunca se cumple, y por eso `auditoria` no tiene ni una fila de `clasificaciones_ml` pese a que el trigger existe y está habilitado. Se corrige por separado con un `CREATE OR REPLACE` en Supabase, fuera del código de la aplicación.

**Registro de exportaciones y auditoría de usuarios y clientes (31 de agosto de 2026):** cierra dos brechas entre lo que afirmaba el Capítulo IV de la tesis y lo que el código hacía. Ninguna necesitó migración: las tablas ya existían en Supabase con su esquema completo, solo faltaba el modelo SQLAlchemy y el código que escribiera en ellas.

- **Modelos nuevos en `common/models.py`:** `TipoReporte` (catálogo: 1 = Lista completa de expedientes XLSX, 2 = Reporte por área jurídica PDF, 3 = Historial de cliente PDF, 4 = Métricas del sistema PDF; solo el 1 está implementado) y `Exportacion`. Van ahí y no en un `reportes/models.py` nuevo siguiendo el precedente de `CargaMasiva`, que también es una tabla de operaciones y no un catálogo puro. `exitosa` y `fecha_solicitud` usan `server_default` y no `default` de Python, para que los ponga la base como ya hace su esquema. Recordar que `create_all()` no se llama en ningún lado: los modelos son mapeo puro sobre tablas existentes y declararlos no puede alterar el esquema real.

- **Registro de exportaciones en dos fases**, aprovechando que el esquema separa `fecha_solicitud` de `fecha_generacion`. Fase 1: apenas entra la petición se inserta la fila con `exitosa=false` y se commitea de inmediato, para que quede rastro aunque la generación reviente después. Fase 2: si el Excel sale bien se completa con `exitosa=true`, `fecha_generacion`, `nombre_archivo`, `ruta_archivo` y `tamano_bytes` leído con `os.path.getsize()` del archivo real; si lanza excepción se guarda `mensaje_error` y `exitosa` queda en false con `fecha_generacion` en null — esa combinación es lo que distingue una exportación fallida de una exitosa. Las tres funciones viven en `reportes/services.py` y **ninguna propaga excepciones**: la bitácora no puede hacer fallar la exportación que el usuario pidió. `marcar_exportacion_fallida()` hace `rollback()` antes de escribir, porque si lo que falló fue una query la sesión quedó en estado fallido y cualquier escritura posterior sería rechazada; la fila ya está commiteada de la fase 1, así que revertir no la pierde. Se pasa el `id_exportacion` entre fases y no el objeto ORM, justamente porque un entero sobrevive a un rollback. El contrato HTTP no cambió: sigue devolviendo el mismo `send_file()`, y el error sigue saliendo como antes (la excepción se relanza).

- **`exportaciones.ruta_archivo` es evidencia, no una forma de recuperar el archivo.** El sistema de archivos de Render **no persiste entre despliegues**, así que la ruta guardada apunta a algo que puede ya no existir. Sirve para saber quién exportó qué y cuándo. **No construir una descarga histórica sobre ese campo.** La ruta se normaliza con `os.path.abspath()` antes de guardarla, porque `RUTA_EXPORTACIONES` se arma con `..` relativos al módulo y sin eso la bitácora queda ilegible.

- **Auditoría de usuarios y clientes desde las rutas, no desde los servicios.** Los seis endpoints (`POST`/`PUT`/`DELETE` de cada uno) llaman a `registrar_auditoria_segura()`. Van en la ruta por una razón concreta: **la IP del cliente solo existe en el contexto de la petición HTTP, y ningún trigger de PostgreSQL puede conocerla.** Ese es exactamente el hueco que cubre este cambio — los cuatro triggers de auditoría de la base llenan todo menos `ip_address` y `plataforma`, porque desde la base no se puede.

- **`registrar_auditoria_segura()`** (en `auditoria/services.py`) envuelve a `registrar_auditoria()` en try/except y nunca propaga: si la auditoría falla, la operación que el usuario pidió ya ocurrió y hacerla fallar por no haber podido dejar constancia sería peor que perder el registro. El `rollback()` del except **no es opcional**: `registrar_auditoria()` commitea por su cuenta, y si ese commit revienta la sesión queda inutilizable y el siguiente acceso al ORM tiraría `PendingRollbackError`, llevándose puesta la petición entera. Por el mismo motivo las seis rutas arman el diccionario de respuesta **antes** de auditar: después del commit los objetos quedan expirados y un `to_dict()` posterior dispararía una recarga contra la base.

- **Snapshot del estado anterior:** se hace con una lectura adicional en la ruta (`obtener_usuario_por_id()` / `obtener_cliente_por_id()`) materializada a dict **antes** de llamar al servicio. Hace falta porque los servicios cargan el objeto ORM y lo mutan en la misma sesión, así que para cuando la ruta lo recibe de vuelta ya trae los valores nuevos. Se eligió este camino para **no modificar la firma de ningún servicio**. Cuesta un SELECT extra por PK en UPDATE y DELETE.

- **Lista blanca explícita de campos auditables**, definida como constante en cada `routes.py` y leída con `getattr()` del modelo, no de `to_dict()`. Es lista blanca y no lista negra a propósito: si mañana alguien agrega una columna sensible al modelo, no se filtra sola a la auditoría. **`contrasena_hash` nunca entra.** No se usa `to_dict()` para que ampliar ese método no amplíe la auditoría sin que nadie lo note. Quedan fuera también las fechas: no son lo que se audita —el cuándo ya está en `auditoria.fecha_accion`— y además `date`/`datetime` no son serializables a JSONB sin convertirlos.

- **Convención de `accion`**, verificada el 31 de agosto de 2026 contra las definiciones reales de los triggers en Supabase: `'INSERT'` y `'UPDATE'` en mayúsculas, y `tabla_afectada` con el nombre literal de la tabla en minúsculas. Ningún trigger escribe `'DELETE'`; **ese valor queda fijado por este cambio**, también en mayúsculas.

- **Decisión sobre `DELETE`:** en usuarios y clientes el borrado es lógico (`activo = false`, la fila sigue existiendo), así que se registra **también `datos_nuevos`** con el estado ya desactivado, además de `datos_anteriores`. Sin él la auditoría no dejaría constancia de qué cambió, solo de cómo estaba antes.

- **`id_sesion` va en null.** El JWT que emite `/auth/login` lleva solo `id_usuario`, `id_rol` y `nombre`; no hay identificador de sesión ni tabla `sesiones`, así que no hay nada que poner. Si algún día se agrega, este es el lugar.

- **`plataforma` está fijo en `'web'`** (constante `PLATAFORMA_WEB` en `common/peticion.py`): la gestión de usuarios y de clientes solo existe en el panel, la app móvil no expone esas pantallas. Si algún día las expone, hay que dejar de fijarlo a mano.

- **`obtener_ip_cliente()`** (`common/peticion.py`) lee primero `X-Forwarded-For` y toma **el primer elemento** de la lista separada por comas, que es el cliente original; los siguientes son los proxies intermedios. Cae a `request.remote_addr` si el encabezado no viene, que es el caso en local. Hace falta porque el backend corre detrás del proxy de Render, donde `request.remote_addr` devuelve la IP del proxy y no la del usuario, y **`ProxyFix` de Werkzeug no está montado** en `create_app()`. Advertencia para quien lea esto después: `X-Forwarded-For` lo puede falsificar cualquiera que llegue directo al backend, así que sirve como evidencia de auditoría en operación normal, **no como control de seguridad**.

- **El 409 Conflict por DPI o NIT duplicado en clientes no se audita**: no hubo cambio en la base que registrar.

- **Verificado el 31 de agosto de 2026** contra la base real, con el backend levantado en local: exportación exitosa con y sin filtros (`parametros_json` queda `{}` y no null cuando no viene ninguno, y `tamano_bytes` coincide con el archivo en disco), exportación fallida con una fecha inválida (fila con `exitosa=false`, `mensaje_error` lleno y `fecha_generacion` null), y los seis registros de auditoría de un usuario y un cliente de prueba con `ip_address` correctamente extraída del primer elemento de `X-Forwarded-For`. Confirmado por búsqueda directa que el hash bcrypt del usuario de prueba no aparece en ningún `datos_nuevos`. Los registros de prueba (usuario `test_auditoria_310826`, cliente `TEST AUDITORIA CLIENTE` y sus filas en `auditoria` y `exportaciones`) se limpian aparte, en el SQL Editor de Supabase.

**Gráfica de distribución por tipo notarial (12 de agosto de 2026):** como el 100% de los expedientes reales son del área Notarial, la gráfica de subtipos es más informativa que la de áreas. Se agregó al endpoint `/reportes/dashboard` el campo `expedientes_por_tipo_notarial` — lista de `{id_tipo, nombre, cantidad}` con los 6 tipos notariales activos, incluidos los que están en cero. La query usa `outerjoin` con los filtros de área/fecha **dentro del `ON`** y no en el `WHERE`: así los tipos sin expedientes no se descartan y la gráfica siempre muestra las 6 barras. No hace falta `COALESCE` porque `COUNT(expedientes.id_expediente)` ya devuelve 0 en las filas que el LEFT JOIN rellena con NULL. El filtro de área es `TipoExpediente.id_area == 1` (id de Notarial) en vez de comparar por nombre, para no depender del texto del catálogo. En el panel se agregó `panel-web/src/components/charts/BarChart.jsx` (Recharts `BarChart` con `layout="vertical"`, color `#D4A853` igual que las otras gráficas), y en `Dashboard.jsx` se pinta en una fila propia de ancho completo (`.dashboard-grafica-ancha`) arriba de las dos gráficas existentes, que quedaron intactas. Cada barra muestra su cantidad al final con un `LabelList` (`position="right"`, color navy `#1B2A4A`, con el `margin.right` del gráfico subido a 40 para que el número no se corte). El `<Bar>` lleva `minPointSize={1}` a propósito: sin eso Recharts no dibuja el rectángulo de las barras con valor 0 y, al no haber rectángulo, tampoco genera su etiqueta — los cuatro "0" simplemente no aparecían. Con `minPointSize={1}` las 6 barras existen (las de cero con 1px, imperceptible contra el eje) y los 6 números se renderizan siempre. Al momento del cambio los datos reales eran Compraventa 2, Donación 1 y los otros 4 tipos en cero.

**Desplegado en Vercel, con la variable `VITE_API_URL` apuntando a `https://sistema-villeda-backend-v2.onrender.com/api/v1`. Prueba end-to-end contra el backend v2 en producción exitosa (subida de JPG + OCR real + R2 + descarga).**

---

## APP MÓVIL — app-movil/ (React Native + Expo)
| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Setup base del proyecto Expo | ✅ Completada |
| Fase 2 | Servicios base y sistema de tema | ✅ Completada |
| Fase 3 | Pantalla de Login + navegación (Auth/App/Root) | ✅ Completada |
| Fase 4A | Bottom tabs — Dashboard + Búsqueda + Perfil | ✅ Completada |
| Fase 4B.1 | 5 tabs + Stack anidado de Expedientes + lista paginada | ✅ Completada |
| Fase 4B.2 | Detalle de expediente + carga de documentos | ✅ Completada |
| Fase 4B.3 | Pantalla de Reportes (con exportar PDF) | ✅ Completada |
| Fase 5 | Funcionalidades nativas (cámara, notificaciones, biometría) | 🔄 En progreso — nombre/ícono/splash, escaneo con cámara y **build de APK con EAS** completados (6 de septiembre de 2026, ver "Build de APK con EAS" abajo); notificaciones push y biometría pendientes |

**Fase 1 — detalle:**
- Proyecto creado con `create-expo-app` (template blank), JavaScript puro (sin TypeScript), consistente con el panel web — SDK 54 (bajado desde SDK 57 por compatibilidad con la versión de Expo Go disponible en Play Store)
- Estructura `src/{assets,components,navigation,screens,services}` preservada (pre-creada, aún vacía — pantallas se agregan en fases siguientes)
- Navegación: `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`
- HTTP: `axios`
- Almacenamiento seguro: `expo-secure-store` (para el token JWT en fases siguientes)
- Fuentes: `expo-font` + `@expo-google-fonts/dm-serif-display` + `@expo-google-fonts/dm-sans`
- Variable de entorno `EXPO_PUBLIC_API_URL` apuntando a `https://sistema-villeda-backend-v2.onrender.com/api/v1` (prefijo `EXPO_PUBLIC_` obligatorio en Expo para exponer variables al cliente)
- `App.js` mínimo con `SafeAreaProvider` + `NavigationContainer` + placeholder — verificado que Expo arranca y compila sin errores (bundle Android servido con HTTP 200 por Metro)
- `.env`, `node_modules/` y `.expo/` de app-movil agregados al `.gitignore` raíz del monorepo (no se creó `.gitignore` propio dentro de app-movil)
- No instalado todavía (se agregan en su fase correspondiente): `expo-camera`, `expo-notifications`, `expo-local-authentication`, `expo-image-picker`

**Fase 2 — detalle:** todo el trabajo se hizo dentro de `app-movil/src/` (excepto `App.js`, que consume el tema y el hook de fuentes).
- `src/theme/colors.js` — design tokens del panel web (navy, gold, cream, white, textPrimary, textSecondary, danger, success, border)
- `src/theme/typography.js` — nombres exactos de familias DM Serif Display / DM Sans (regular, medium, semibold, bold) y escala de tamaños (h1 a tiny)
- `src/services/storage.js` — wrapper sobre `expo-secure-store` (`saveToken`, `getToken`, `saveUser`, `getUser`, `clearAll`), serializa/deserializa JSON ya que secure-store solo acepta strings
- `src/services/api.js` — cliente axios (`baseURL` desde `EXPO_PUBLIC_API_URL`, timeout 60s por el arranque en frío de Render free tier), interceptor de request que agrega el JWT, interceptor de response que distingue `SESSION_EXPIRED` (401, limpia storage) de `NETWORK_ERROR` (sin respuesta del servidor)
- `src/services/auth.js` — `login()`, `logout()`, `isAuthenticated()`, construido sobre api.js y storage.js
- `src/hooks/useFonts.js` — hook que carga las 5 variantes de fuente con `expo-font`, retorna `{ fontsLoaded, fontError }`
- `App.js` actualizado: splash con fondo cream mientras cargan las fuentes, luego placeholder con DM Serif Display, color navy y fondo cream

**Fase 3 — detalle:**
- `src/context/AuthContext.js` — `AuthProvider` + hook `useAuth()`; al montar intenta cargar sesión guardada (storage.js), expone `{ user, token, isAuthenticated, isLoading, signIn, signOut }`
- `src/navigation/AuthNavigator.js` — stack sin header con una sola ruta (Login)
- `src/navigation/AppNavigator.js` — placeholder temporal ("Dashboard (Fase 4)" + botón Cerrar sesión conectado a `signOut()` del contexto); reemplazado por bottom tabs en la Fase 4A
- `src/navigation/RootNavigator.js` — decide Auth vs App según `isAuthenticated` del contexto; splash "Cargando..." mientras `isLoading`
- `src/screens/LoginScreen.js` — pantalla completa: sello "V" en círculo gold, título/subtítulo en DM Serif/DM Sans, inputs de usuario y contraseña (con toggle de visibilidad), botón con `ActivityIndicator` durante la carga, aviso de "servidor iniciando" pasados 15s (Render free tier), validación local de campos vacíos, y mensajes de error diferenciados (credenciales incorrectas / sin conexión / error genérico)
- `App.js` ahora envuelve `RootNavigator` en `AuthProvider`, dentro de `NavigationContainer` + `SafeAreaProvider`
- **Fix en `src/services/api.js`:** el interceptor de 401→`SESSION_EXPIRED` (de la Fase 2) interceptaba también el 401 de credenciales incorrectas en `/auth/login`, que usa el mismo código de estado. Se excluyó `/auth/login` de esa transformación para que `LoginScreen` pueda distinguir "credenciales incorrectas" de "sesión expirada" — el resto de la app sigue usando `SESSION_EXPIRED` sin cambios

**Fase 4A — detalle:**
- `src/navigation/AppNavigator.js` — reemplazado por bottom tab navigator (Dashboard / Búsqueda / Perfil), iconos con emoji, `tabBarActiveTintColor` navy / `tabBarInactiveTintColor` textSecondary / `tabBarStyle` fondo cream
- `src/components/AppHeader.js` — header reutilizable (fondo blanco, logo real 40x40 + título DM Serif Display h3, borde inferior)
- `src/screens/DashboardScreen.js` — consume `GET /reportes/dashboard`; 5 tarjetas (expedientes, documentos, clientes, búsquedas, TBR promedio) en grid de 2 columnas; loading con `ActivityIndicator`, error de red con botón Reintentar
- `src/screens/BusquedaScreen.js` — consume `POST /busquedas` con los **5 criterios completos** (no solo texto libre, por decisión explícita: en la práctica del despacho se busca tanto por fecha y área como por cliente): selector de chips (Cliente/Fecha/Área/Contenido/No. Expediente) que cambia el tipo de input (texto, date picker nativo `@react-native-community/datetimepicker`, o dropdown de áreas cargado de `GET /catalogos/areas-juridicas`); envía `desde_plataforma: 'movil'` en cada búsqueda (el backend ya soportaba este campo desde antes, sin cambios necesarios); resultado por tarjeta con Alert nativo al presionar (detalle real queda para Fase 4B)
- `src/screens/PerfilScreen.js` — logo real 120x120, datos del usuario (`nombre + apellido`, `nombre_usuario`, `rol`, todos ya presentes en la respuesta de `/auth/login`, sin cambios de `AuthContext` necesarios), botón Cerrar sesión con Alert de confirmación
- Nueva dependencia: `@react-native-community/datetimepicker` (instalada con `npx expo install`, SDK 54 compatible)
- `src/assets/logo-villeda.jpg` (logo real del despacho, ya existente en el repo) ahora es una dependencia real del código (`require()` en AppHeader y PerfilScreen) — se agregó al control de versiones

**Fase 4B.1 — detalle:**
- `src/navigation/AppNavigator.js` — ampliado a 5 tabs en orden Dashboard / Expedientes / Búsqueda / Reportes / Perfil; el tab Expedientes renderiza `ExpedientesStack`, el tab Reportes renderizaba un placeholder temporal ("Reportes (Fase 4B.3)") dentro del propio archivo, reemplazado por `ReportesScreen` real en la Fase 4B.3
- `src/navigation/ExpedientesStack.js` — stack anidado sin header, ruta única `ExpedientesLista` por ahora (rutas de Detalle y CargarDocumento llegan en la Fase 4B.2)
- `src/screens/ExpedientesScreen.js` — consume `GET /expedientes` (paginación `pagina`/`por_pagina`, no offset/limit); carga 20 iniciales + botón "Cargar más" que incrementa `pagina`; estados de carga inicial, error con Reintentar, lista vacía, y "No hay más expedientes" cuando `pagina >= total_paginas`; tarjeta con número (DM Serif Display), cliente, chips de área/estado, y fecha de apertura; tap en tarjeta navega a `ExpedienteDetalle` (Fase 4B.2)
- **Los colores de chips de área y estado están sincronizados con `panel-web/src/utils/formatters.js`** (y los valores hex de `panel-web/src/styles/globals.css`) — cualquier cambio futuro de esa paleta debe aplicarse en `ExpedientesScreen.js` y `ExpedienteDetalleScreen.js` (Fase 4B.2), donde el mismo mapeo está duplicado

**Fase 4B.2 — detalle:**
- `src/components/AppHeader.js` — nueva prop `showBackButton`; usa `useNavigation()` internamente (en vez de recibir `navigation` como prop) porque se renderiza tanto en pantallas raíz de tabs como en pantallas dentro del stack de Expedientes
- `src/navigation/ExpedientesStack.js` — 2 rutas nuevas: `ExpedienteDetalle` y `CargarDocumento`
- `src/screens/ExpedienteDetalleScreen.js` — dos llamadas (`GET /expedientes/{id}` + `GET /expedientes/{id}/documentos`); tarjeta de datos en grid (cliente y asignado a ocupan la fila completa por ser nombres largos, el resto en 2 columnas); documentos listados con nombre, páginas, tamaño y fecha; al tocar un documento pide la URL firmada (`GET /documentos/{id}/descarga`) y la abre con `expo-web-browser`; recarga documentos automáticamente al reenfocarse (`useFocusEffect`, sin parpadeo de loading completo en recargas posteriores a la primera)
- `src/screens/CargarDocumentoScreen.js` — selector de expediente con debounce 400ms (mínimo 3 caracteres) usando **`GET /expedientes?busqueda=`, NO `POST /busquedas`** (ver nota abajo); expediente bloqueado con 🔒 si llegó preseleccionado por navegación, o cambiable si se buscó manualmente; selección de archivo con `expo-document-picker` (PDF/JPG/PNG, validación de 10MB también en cliente); sube con `POST /documentos` (`FormData` con campos `archivo` + `id_expediente`); duplicados se muestran como aviso (⚠️) en el Alert de éxito, no como error, porque el backend responde 201 con `documento.aviso`
- **Buscador de expediente en CargarDocumento usa `GET /expedientes?busqueda=` (NO `POST /busquedas`) por consistencia con panel web — decisión de diseño para no contaminar la tabla BUSQUEDAS del Capítulo V con búsquedas administrativas**
- Nuevas dependencias: `expo-document-picker`, `expo-web-browser` (instaladas con `npx expo install`, SDK 54 compatible)

**Fase 4B.3 — detalle (22 de julio de 2026):**
- `src/screens/ReportesScreen.js` (nuevo) — sigue el mismo patrón de `ExpedienteDetalleScreen.js`: `SafeAreaView` + `AppHeader` (sin `showBackButton`, es raíz de tab), estados `cargando`/`error`/`datos`, catch con `if (err.code === 'SESSION_EXPIRED') { return }` como primera condición
- Filtros: dropdown de área jurídica (mismo catálogo `GET /catalogos/areas-juridicas` que ya consume `BusquedaScreen.js`) + dos `DateTimePickerAndroid` (desde/hasta), reutilizando el patrón ya usado en `BusquedaScreen.js`
- Botón "Generar reporte" llama a `GET /reportes/dashboard` con `id_area`, `fecha_desde`, `fecha_hasta`; sin auto-fetch al montar (a diferencia de las otras pantallas), porque el reporte depende de filtros que el usuario define primero
- Resultados sin gráficas (decisión explícita, ver Paso 0 de esta fase): 3 tarjetas de métricas (Expedientes, Documentos, Duplicados) con el mismo estilo de tarjeta que `ExpedienteDetalleScreen.js`; listas de texto simple para `expedientes_por_area`, `expedientes_por_estado` y `expedientes_por_mes` (formato "Nombre — cantidad"); TBR como 3 líneas de texto (promedio/mínimo/máximo)
- **No existe endpoint de PDF en el backend** (solo `GET /reportes/expedientes/excel`, sin tocar) — el PDF se genera 100% en el dispositivo: se arma un HTML simple con los mismos datos ya renderizados en pantalla, `Print.printToFileAsync({ html })` lo convierte a PDF, y se mueve con la API de `expo-file-system` (`File`/`Paths`, la API nueva de la v19 — reemplazó a las funciones legacy `documentDirectory`/`moveAsync`) a un archivo `reporte-villeda-{fecha}.pdf` en el directorio de documentos de la app
- Botón "Compartir" con `Sharing.shareAsync()`, deshabilitado (`opacity: 0.5`) hasta que exista un PDF generado en la sesión actual
- Nuevas dependencias: `expo-print` (~15.0.8), `expo-sharing` (~14.0.8), `expo-file-system` (~19.0.23) — instaladas con `npx expo install`, SDK 54 compatible
- **Bug encontrado y corregido (22 de julio):** el botón "Descargar PDF" no daba ningún feedback visible tras generar el archivo — `Print.printToFileAsync` y el movimiento con `File`/`Paths` funcionaban correctamente (confirmado porque "Compartir" sí compartía el PDF generado), pero no había ningún `Alert` de éxito. Además, `Paths.document` en Expo Go apunta a un directorio sandbox aislado por experiencia (cambio documentado en el changelog de `expo-file-system` v19.0.23) que nunca es visible desde la app de Archivos de Android — esto no es un bug, es el comportamiento esperado del almacenamiento privado de la app. Fix: se agregó `Alert.alert('PDF generado', 'El reporte está listo. Usa "Compartir" para guardarlo o enviarlo.')` justo después de `setPdfUri(...)`.
- **Botón y función renombrados:** "Descargar PDF" → "Generar PDF" (`descargarPdf` → `generarPdf`), para reflejar que el PDF no se guarda en un lugar visible del dispositivo — queda listo internamente y se "saca" del teléfono mediante el botón Compartir.

**⚠️ RIESGO IDENTIFICADO, PENDIENTE DE VERIFICAR EN EL APK — el logo del PDF puede comportarse distinto fuera de Expo Go (6 de septiembre de 2026):** `obtenerLogoBase64()` en `ReportesScreen.js` hace `Image.resolveAssetSource(require('../assets/logo-villeda.jpg'))` y le pasa el `asset.uri` resultante a `File.downloadFileAsync()`. **En Expo Go eso funciona porque `resolveAssetSource()` devuelve una URL `http://` que apunta al servidor de Metro**, y descargarla es una petición HTTP normal. En un APK release no hay servidor Metro: el asset queda empaquetado como recurso de Android y el URI que devuelve no es descargable por HTTP, así que `downloadFileAsync()` puede fallar y con él la generación del PDF completa — que es justamente la funcionalidad de la Fase 4B.3 y algo que el Capítulo IV afirma que funciona.

No se tocó el código a propósito: **medir antes que cambiar a ciegas**, porque el comportamiento depende del runtime y no se puede confirmar sin construir. **Es el primer punto de la lista de verificación del APK.** Arreglo conocido si falla: usar `Asset.fromModule(require('../assets/logo-villeda.jpg'))` de `expo-asset`, llamar `await asset.downloadAsync()` y leer `asset.localUri`, que resuelve a una ruta de archivo válida **tanto en Expo Go como en un build standalone**. Queda anotado aunque resulte que funciona, porque es el tipo de diferencia entre entornos que muerde meses después y cuya causa no es obvia desde el síntoma.

**Build de APK con EAS (6 de septiembre de 2026):** primer build propio de la app. **Motivo inmediato:** Expo Go se actualizó solo a SDK 57 en el dispositivo de pruebas y dejó de abrir el proyecto, que está en SDK 54 — y subir de SDK está descartado por decisión del proyecto. Con un APK propio la app deja de depender de qué versión de Expo Go tenga Play Store instalada, que es la causa de fondo. **Motivo de tesis:** el Capítulo IV afirma que la app se distribuye como APK instalable, y esto vuelve cierta esa afirmación.

`eas.json` (nuevo, versionado) declara dos perfiles. **`preview`** es el que se usa: `android.buildType: "apk"` produce un APK instalable directamente en vez del AAB de Play Store, y `distribution: "internal"` habilita una URL de descarga compartible para instalarlo desde el navegador del teléfono, sin pasar por Play Store ni por cable. **`production`** queda declarado con `app-bundle` por si algún día se publica, pero no se usa.

**⚠️ `EXPO_PUBLIC_API_URL` va en el bloque `env` de `eas.json`, y tiene que estar ahí sí o sí.** El build corre en la nube de EAS y **el `.env` local NO se sube**: está en `.gitignore` y la documentación de Expo es explícita en que los archivos `.env` no llegan a los workers remotos. Las variables `EXPO_PUBLIC_*` se **inlinean en el bundle durante el build**, así que si el worker no la tiene, `process.env.EXPO_PUBLIC_API_URL` queda `undefined`, axios se construye con `baseURL: undefined` y **el APK instala y abre bien pero no puede hablar con el backend** — falla recién al intentar iniciar sesión, con un error de red genérico que no señala la causa. Es el modo de fallo más caro de diagnosticar de todo el proceso.

Va en `eas.json` versionado y **no** como secreto de EAS, a propósito: `EXPO_PUBLIC_*` se inlinea por diseño, así que cualquiera puede extraer esa URL descompilando el APK. Guardarla como secreto daría protección aparente sin protección real, mientras que tenerla escrita en el repo deja documentado **contra qué backend se construyó cada APK**. Para un secreto de verdad —una clave de API— la respuesta sería la opuesta: variables de entorno de EAS y jamás un prefijo `EXPO_PUBLIC_`.

`cli.appVersionSource: "remote"` más `autoIncrement: true` dejan que EAS lleve la cuenta del `versionCode` de Android y lo incremente solo. `app.json` no lo declara y así queda: sin esto, el segundo APK saldría con el mismo `versionCode` que el primero y Android rechazaría instalarlo encima.

El primer `eas build` **vincula el proyecto a la cuenta de Expo y escribe `extra.eas.projectId` en `app.json`**, o sea que el comando de build modifica un archivo versionado. Por eso el `projectId` se commiteó **aparte** de la configuración, para que quede claro qué lo generó y no aparezca mezclado con cambios escritos a mano.

`expo-local-authentication` quedó instalado y con su plugin declarado aunque la biometría todavía no esté implementada: **el plugin es lo que inyecta los permisos `USE_BIOMETRIC` y `USE_FINGERPRINT` en el manifiesto de Android, y eso solo se resuelve al construir**. Incluirlo ahora evita tener que reconstruir el APK cuando se implemente la funcionalidad. El costo es unos pocos KB de código nativo que ninguna pantalla usa todavía.
- **Rediseño del PDF:** logo del despacho (`assets/logo-villeda.jpg`) embebido en el encabezado del HTML como base64 (leído con `File.downloadFileAsync` sobre el asset resuelto vía `Image.resolveAssetSource`, ya que `Print.printToFileAsync` no puede resolver un `require()` de React Native); CSS agregado (`@page { margin: 1cm }`, fuente base 11px, espaciados compactos entre `h1`/`h2`/`p`/`table`, `page-break-inside: avoid` en las tablas) para que el reporte quede en una sola página en vez de dos.
- **Verificado en dispositivo real (22 de julio, celular físico contra backend v2):** generar reporte con filtros, generar PDF (con logo, una sola página, y el Alert de confirmación), y compartir por WhatsApp — los tres pasos funcionando correctamente.

**Fase 5 — detalle parcial (23 de julio de 2026): nombre real, ícono y splash de marca**
- `app.json`: `name` → "Oficina Villeda", `slug` → "oficina-villeda", `android.package` → "com.villeda.oficinavilleda" (no existía antes).
- 5 assets regenerados en `app-movil/assets/` a partir del logo real del despacho (`src/assets/logo-villeda.jpg`, 395×395 — se decidió usar tal cual, sin esperar una versión de mayor resolución): `icon.png` (1024×1024) y `android-icon-foreground.png` (512×512) usan el logo completo con texto, escalado al 66% del canvas dentro de la zona segura del ícono adaptativo de Android, fondo cream (#F7F5F2); `android-icon-background.png` (512×512) es cream sólido; `android-icon-monochrome.png` (432×432) usa solo el gráfico de la V + martillo recortado (sin texto), porque a silueta de un solo color el texto fino se veía como una mancha ilegible; `splash-icon.png` (1024×1024) usa el logo completo.
- Instalado `expo-splash-screen`, configurado como plugin en `app.json` (imagen = `splash-icon.png`, `imageWidth: 200`, `backgroundColor` cream). En `App.js` se agregó `SplashScreen.preventAutoHideAsync()` a nivel de módulo y `SplashScreen.hideAsync()` en un `useEffect` cuando `fontsLoaded || fontError` — el bloque existente de "Cargando..." (Fase 2) se dejó intacto como fallback.
- **Pendiente de verificación visual:** ninguno de estos cambios (ícono, nombre, splash) se puede ver en Expo Go — Expo Go es un contenedor genérico que no refleja estos assets. Se van a ver reales recién en el primer build de desarrollo con EAS (siguiente paso de Fase 5).

**Fase 5 — detalle adicional (30 de julio de 2026): escaneo con cámara y estabilización del backend**
- `EscanearDocumentoScreen.js` (nuevo): captura multipágina con `expo-camera`, cada foto procesada con `expo-image-manipulator` (resize a 2000px de ancho máximo, sin comprimir agresivo para no perjudicar el OCR), páginas armadas en un solo PDF vía `Print.printToFileAsync()` (mismo mecanismo que Fase 4B.3), con campo de texto para nombrar el archivo antes de generar.
- **Bug de memoria descubierto y corregido:** el pipeline de OCR (`extraer_texto_pdf()` en `ocr/services.py`) cargaba todas las páginas del PDF en memoria simultáneamente vía `convert_from_bytes()`, causando OOM en Render con documentos de varias páginas (confirmado con crash real en producción y logs de Render). Corregido usando `paths_only=True` de `pdf2image` (una sola llamada a Poppler, escribiendo cada página a disco en vez de mantenerlas todas en RAM), procesando página por página con `del` explícitos. Se mantiene `dpi=300` sin degradar — verificado que el texto extraído es idéntico al de antes del fix.
- **Bug de clasificación de errores corregido:** `ECONNABORTED` (timeout propio de axios) y `ERR_NETWORK` (conexión cortada por túnel/proxy) se confundían como el mismo "sin conexión". Se agregó `TIMEOUT_ERROR` como código separado, y se subieron los timeouts a 120s (Tesseract, Poppler, y cliente HTTP en móvil y panel web) tras medir tiempos reales de 60-95s por página en el plan gratuito de Render.
- `threaded=True` agregado a `app.run()` en `run.py` para que `/health` siga respondiendo mientras una petición de OCR está en curso.
- Se eliminó `app-movil/AGENTS.md`, un archivo con una instrucción desactualizada (referenciaba Expo SDK 57) que contradecía la decisión ya tomada de usar SDK 54.
- **Render actualizado de Free a Starter ($7/mes):** las mediciones reales mostraron que la CPU del plan gratuito (0.1 vCPU) era insuficiente incluso después del fix de memoria — Starter da 5x más CPU (0.5 vCPU) manteniendo la misma RAM, y elimina el "dormir" tras 15 min de inactividad.

**Fix — sincronización de sesión ante token expirado (12 de julio de 2026):** el interceptor de `src/services/api.js` limpiaba el storage físico (`clearAll()`) al detectar un 401 fuera de `/auth/login`, pero no tenía forma de actualizar el estado de React de `AuthContext.js` (`isAuthenticated` se calcula como `!!token`, en memoria). Resultado: `RootNavigator` seguía mostrando el stack autenticado hasta reiniciar la app manualmente. Se agregó `src/services/authEvents.js`, un pub/sub minimalista sin librerías nuevas (`onSessionExpired` / `emitSessionExpired`). `api.js` llama a `emitSessionExpired()` justo después de `clearAll()` dentro del bloque de 401. `AuthContext.js` se suscribe con `onSessionExpired()` en un `useEffect` propio (independiente del que carga la sesión guardada); el callback pone `user`/`token` en `null` y muestra `Alert.alert('Sesión expirada', 'Tu sesión expiró, inicia sesión de nuevo.')`, protegido con un `useRef` (`sessionExpiredShown`) para no duplicar el aviso si llegan varios 401 casi simultáneos — el ref se resetea a `false` en `signIn()` y en `signOut()`. Además, los `catch` que originaban el request (`DashboardScreen.js`, `BusquedaScreen.js`, `ExpedientesScreen.js`, los dos de `ExpedienteDetalleScreen.js`, y los tres de `CargarDocumentoScreen.js`) ahora chequean `if (err.code === 'SESSION_EXPIRED') { return }` como primera condición, para no mostrar su mensaje genérico ("revisa tu conexión") como parpadeo antes de que el `Alert` de `AuthContext` tome control — en `CargarDocumentoScreen.js` esto obligó a cambiar dos `.catch(() => ...)` a `.catch((err) => ...)` para poder leer el código de error.

**Bug resuelto — apertura de .png/.jpg desde `ExpedienteDetalleScreen` (21 de julio de 2026):** la hipótesis original de este bug ("Content-Type incorrecto en R2 para imágenes") era incorrecta. La causa real: los dos documentos PNG del expediente de prueba NOT-2026-0001 se cargaron antes de la migración a Cloudflare R2 y su `ruta_almacenamiento` quedó como una ruta local de Windows en vez de una key de R2 — el archivo nunca existió en el bucket, por eso la URL firmada devolvía `NoSuchKey`. No era un bug del visor (`expo-web-browser`) ni del Content-Type. Ver nota completa en "DEPLOY EN PRODUCCIÓN". Los documentos cargados después de la migración a R2 (con key UUID) se abren correctamente.

---

## FASES DE DESARROLLO
| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Supabase — Base de datos | ✅ Completa |
| Fase 2 | GitHub + estructura carpetas | ✅ Completa |
| Fase 3 | Backend Flask esqueleto | ✅ Completa |
| Fase 4 | JWT + RBAC | ✅ Completa |
| Fase 5 | OCR Tesseract | ✅ Completa (en producción vía Docker en Render) |
| Fase 5.5 | Backend completo (clientes, expedientes, documentos, busquedas, reportes) | ✅ Completa |
| Fase 6 | Dataset etiquetado | ✅ 390 expedientes (158 de 2021 + 232 de 2022) separados, etiquetados y con el texto extraído. Corpus de entrenamiento generado el 1 de septiembre de 2026 con `extraer_corpus.py` (fuera del repo): 390/390 exitosos, sin vacíos ni errores. Ver "Extracción del corpus de entrenamiento" abajo |
| Fase 7 | Fine-tuning BETO | ✅ Completa (4 de septiembre de 2026) — F1 macro 0.9661 fuera de pliegue con truncamiento principio_final, 11 errores sobre 390. Ver "Entrenamiento y evaluación de los modelos de clasificación" abajo |
| Fase 8 | Fine-tuning RoBERTa-base-bne | ✅ Completa (4 de septiembre de 2026) — F1 macro 0.9862 fuera de pliegue con truncamiento principio_final, 3 errores sobre 390. **Supera a BETO: es el modelo seleccionado.** Ver "Entrenamiento y evaluación de los modelos de clasificación" abajo |
| Fase 8.5 | Despliegue del modelo ML en Modal (microservicio serverless) | ✅ Completa (6 de septiembre de 2026) — servicio desplegado con `backend/modal_app/clasificador_modal.py` e integrado al backend, que ya no usa el mock. Ver "Integración del clasificador real de Modal" abajo |
| Fase 9 | Panel web + App móvil | 🔄 Panel web (React) completo con 7 pantallas, desplegado en Vercel. App móvil: Fases 1-3, 4A, 4B.1, 4B.2 y 4B.3 (setup Expo + servicios/tema + login + 5 tabs + detalle de expediente + carga de documentos + reportes con PDF y compartir) completadas |
| Fase 10 | Pruebas + medición TBR | 🔄 Mecanismo de registro automático ya operativo — faltan mediciones reales en oficina |

---

## DEPENDENCIAS INSTALADAS — backend/
- flask 3.1.3
- flask-sqlalchemy 3.1.1
- psycopg2-binary 2.9.12
- flask-jwt-extended 4.7.4
- flask-bcrypt 1.0.1
- flask-cors 6.0.2
- python-dotenv 1.2.2
- boto3 1.43.21
- pytesseract 0.3.13
- pillow 12.2.0
- pdf2image 1.17.0
- openpyxl 3.1.5
- reportlab 4.5.1
- sqlalchemy 2.0.50
- marshmallow 4.3.0
- pdfplumber 0.11.10

En Docker de producción, además de las dependencias Python de arriba, el sistema operativo del contenedor tiene instalados vía apt: `tesseract-ocr`, `tesseract-ocr-spa`, `poppler-utils`, `libgl1`, `libglib2.0-0`.

---

## FLUJO END-TO-END VALIDADO
**Confirmado funcionando completo:** Cliente → Expediente → Documento (carga con OCR/pdfplumber automático) → Texto extraído y almacenado → Detección de duplicados por hash → Búsqueda (5 criterios) con medición real de TBR → Métricas agregadas → Dashboard consolidado → Exportación Excel descargable.

Prueba real ejecutada: documento jurídico guatemalteco (PNG) cargado al expediente NOT-2026-0001, texto extraído correctamente con Tesseract, segunda carga del mismo archivo detectada como duplicado exacto del documento ID 1, búsqueda por número de expediente y por contenido (con y sin tildes) funcionando, 4 búsquedas registradas con TBR real entre 93-117 ms, dashboard mostrando todos los totales y distribuciones correctamente, archivo Excel descargado con formato profesional (encabezados con color, filtros automáticos, panel congelado).

**Prueba end-to-end en producción (11 de julio de 2026, backend v1 nativo):** el mismo flujo (subida de documento + OCR + almacenamiento en Cloudflare R2 + descarga vía URL firmada) se repitió contra el backend ya desplegado en Render.com y el panel web desplegado en Vercel, con resultado exitoso. **Aclaración post-hoc (21 de julio):** el archivo usado en esa prueba fue un PDF digital procesado con pdfplumber (id_formato=2), no un PDF escaneado ni imagen — así que el OCR real vía Tesseract NO se ejercitó en producción con el entorno nativo. El bug de OCR en Linux (rutas hardcodeadas de Windows) recién se detectó cuando se intentó subir un PNG a producción, disparando la migración a Docker.

**Prueba end-to-end en producción (21 de julio de 2026, backend v2 Docker):** login + subida real de JPG desde el panel de Vercel → OCR real vía Tesseract 5.x instalado por apt en el contenedor → almacenamiento en R2 con key UUID limpia → apertura del archivo en el navegador vía URL firmada, todo contra `sistema-villeda-backend-v2.onrender.com`. Este es el primer OCR real ejercitado exitosamente en producción.

---

## PENDIENTES INMEDIATOS
1. ✅ Flujos de subida y visualización de archivos en app móvil (Expo Go vía `--tunnel`) probados contra el backend v2 (22 de julio): ver expediente con todos sus documentos, cargar una imagen nueva — ambos funcionando. Pantalla de Reportes también verificada end-to-end en dispositivo real: generar reporte, generar PDF (con logo y una sola página), compartir por WhatsApp — todo exitoso.
2. ✅ Fase 4B.3 móvil — Pantalla de Reportes completada (filtros + métricas + exportar PDF con `expo-print` + compartir con `expo-sharing`/`expo-file-system`).
3. ✅ Mejoras UX de documentos duplicados y "Quitar archivo" completadas en panel web y app móvil (23 de julio) — ver detalle en "Completado en la sesión del 23 de julio de 2026" más abajo.
4. 🔄 Fase 5 móvil — completados: nombre/ícono/splash, escaneo con cámara multipágina, **build de APK con EAS** (6 de septiembre de 2026). Pendientes: notificaciones push (`expo-notifications`) y biometría (`expo-local-authentication` ya está instalado y su plugin declarado en `app.json`, así que el APK ya trae el módulo nativo y se puede implementar sin reconstruir).
5. ⏳ Redactar 4.5.1 / 4.5.2 / 4.6.1 de la tesis (describir sistema construido, pruebas end-to-end reales, despliegue en Render/Docker/Vercel/Supabase/R2/Expo). **Movido a último a propósito:** las pantallas de Expediente/Detalle y Cargar Documento (panel-web y app-movil) van a cambiar visualmente con la mejora UX del punto 3, y Fase 5 móvil (punto 4) agrega pantallas nuevas — redactar el capítulo de interfaz después de ambas evita repetir capturas y texto ya escrito.
6. ⏳ Migración de Flask dev server a `gunicorn` en Docker de producción (warning en logs, no urgente).
7. ⏳ Rotar contraseña de Supabase (se expuso en captura en una sesión anterior — higiene de seguridad).
8. ✅ 390 expedientes separados, etiquetados y con el texto extraído (ver Fase 6), y **Fase 7-8 completadas**: BETO y RoBERTa-base-bne entrenados y evaluados el 4 de septiembre de 2026, con RoBERTa como modelo seleccionado (F1 macro 0.9862). El entrenamiento ya no bloquea nada. **Fase 8.5 también quedó completa el 6 de septiembre de 2026**: el modelo está servido desde Modal e integrado al backend, que ya no usa el mock. Lo que queda pendiente aguas abajo es la **redacción del Capítulo V** y **4.6.2 Prueba de Aceptación**.
9. ⏳ **Versionar los scripts SQL del esquema de la base de datos** — se confirmó (31 de julio de 2026) que ningún script `.sql` de creación del esquema está en el repo; los que existen (`villeda_db.sql`, `villeda_legal_v2.sql`, `02_CREATE_villeda_db_CORREGIDO.sql`) viven sueltos en carpetas locales (Downloads/Desktop), fuera de control de versiones. Esto explica también por qué el esquema real de Supabase pudo derivar de esos scripts sin que se note (ej. la tabla `entidades_nlp` normalizada con FK en la BD real, vs. columna `VARCHAR` en línea en los scripts locales). Subir una versión actualizada al repo (carpeta `backend/sql/` o similar) para no depender de archivos locales sin respaldo. Prioridad baja, no urgente.

**Completado en la sesión del 21 de julio de 2026:** dockerización completa del backend (Tesseract + Poppler funcionando en producción), migración a servicio nuevo `sistema-villeda-backend-v2` (el anterior quedó suspendido), fix del `self-ping` (ahora configurable vía `SELF_PING_URL`), fix del AuthContext móvil ante token expirado (pub/sub + Alert), fix de los 8 catches para ignorar `SESSION_EXPIRED`, y verificación end-to-end en producción con OCR real. También se identificó que el bug de PNG/JPG del visor móvil era en realidad un problema de datos históricos, no del código.

**Completado en la sesión del 22 de julio de 2026:** Fase 4B.3 móvil — pantalla de Reportes (`src/screens/ReportesScreen.js`) con filtros (área + rango de fechas), métricas y listas sin gráficas, generación de PDF en el dispositivo con `expo-print`, y compartir con `expo-sharing` sobre un archivo movido con la API nueva de `expo-file-system` v19 (`File`/`Paths`). Tab "Reportes" en `AppNavigator.js` conectado a la pantalla real, placeholder eliminado. Se corrigió además un bug de falta de feedback en "Generar PDF" (antes "Descargar PDF") agregando un `Alert` de confirmación, y se rediseñó el PDF con logo del despacho embebido en base64 y CSS para que quede en una sola página. Todo verificado en dispositivo real contra el backend v2: generar reporte, generar PDF, y compartir por WhatsApp funcionando correctamente.

**Completado en la sesión del 23 de julio de 2026:** mejoras UX de documentos duplicados y carga de archivos. Panel web: `Badge.jsx` ahora acepta un prop `titulo` para tooltip nativo; `ExpedienteDetalle.jsx` muestra `⚠️ Duplicado` con tooltip "Duplicado del documento ID X" cuando `es_duplicado_exacto`; `CargarDocumento.jsx` ahora tiene función `quitarArchivo()` y botón para resetear el formulario (no existía antes). App móvil: `ExpedienteDetalleScreen.js` muestra el mismo chip de duplicado (con `Alert` al tocarlo en vez de tooltip); `CargarDocumentoScreen.js` no se tocó porque ya tenía `quitarArchivo()` funcionando. **Bug encontrado y corregido durante la prueba en dispositivo real:** en móvil, nombres de archivo largos empujaban el chip de duplicado fuera del área visible de la tarjeta (fila `flexDirection: row` sin wrap ni shrink) — corregido agregando `flexWrap: 'wrap'` a la fila, `flexShrink: 1` al nombre, y `flexShrink: 0` al chip, para que el nombre se ajuste a varias líneas en vez de truncarse o desbordarse. Todo verificado en navegador (panel web) y dispositivo real (app móvil) contra el backend v2.

---

## MEJORAS FUTURAS PENDIENTES
1. ✅ **UX botón "Quitar archivo" en pantalla Cargar Documento** — completado 23 de julio en panel-web (`CargarDocumento.jsx`); app-movil (`CargarDocumentoScreen.js`) ya lo tenía funcionando desde antes.
2. ✅ **Marca visual de documentos duplicados en el listado** — completado 23 de julio en panel-web (`ExpedienteDetalle.jsx`, Badge con tooltip) y app-movil (`ExpedienteDetalleScreen.js`, chip con Alert).
3. ⏳ **Limpiar el expediente de prueba NOT-2026-0001 completo** (incluyendo los 2 PNG huérfanos con `ruta_almacenamiento` como ruta local de Windows, previos a la migración a R2) cuando empiece la carga en limpio con los expedientes reales del Licenciado.
4. ⏳ **Nombre real de la app + ícono + splash screen + build de APK real con EAS** (parte de Fase 5 móvil).
5. ⏳ **Migración de Flask dev server a gunicorn** en el Docker de producción — warning actual, no urgente.
6. ⏳ **Aclarar y/o construir el flujo real de "carga masiva"** — la pantalla actual de Cargar Documento (panel-web y app-movil) es de un archivo a la vez por diseño (`POST /api/v1/documentos` recibe un solo campo `archivo` por petición) — esto es correcto para el uso diario del despacho, no es un bug. Existe un concepto de carga masiva planeado para cuando se digitalicen los ~300 expedientes físicos del Lic. Villeda (tablas `CARGAS_MASIVAS`/`DETALLE_CARGA_MASIVA` ya creadas en Supabase, y la convención ya definida de cliente placeholder "Cliente NNN" para esos documentos), pero no está confirmado si ese mecanismo ya está construido en el backend o si solo existen las tablas esperando esa fase. Confirmar y/o construir cuando llegue el momento de la digitalización masiva — no antes.

---

## DECISIONES IMPORTANTES TOMADAS

**No existe dataset público de expedientes jurídicos guatemaltecos** descargable y anonimizado (se investigó SICEJ, jurisprudencia.oj.gob.gt, CC Guatemala, y datasets legales internacionales — ninguno aplica). Se decidió:
- Esperar a conseguir los 197 expedientes reales.
- Mientras tanto, avanzar el backend completo (expedientes, documentos, búsquedas, reportes) que no depende del dataset.
- Panel web y app móvil se construyen DESPUÉS de tener el backend completo, no antes — para evitar pantallas sin datos reales.

**Diferenciación PDF digital vs escaneado:** se decidió detectar automáticamente con pdfplumber si un PDF tiene texto extraíble (id_formato=2, sin OCR) o es escaneado (id_formato=1, requiere OCR con Tesseract), en lugar de asumir siempre un solo tipo. Esto preserva la precisión de las métricas de OCR para el Capítulo V.

**Medición de TBR:** se usa `time.perf_counter()` (no `time.time()`) porque está diseñado específicamente para medir duraciones cortas con mayor precisión y no se ve afectado por ajustes del reloj del sistema. El tiempo se mide únicamente alrededor de la consulta a la base de datos, sin incluir validación de esquema ni serialización de la respuesta — esto asegura que el TBR reflejado en el Capítulo V sea el tiempo real de búsqueda y recuperación, no el tiempo total de la petición HTTP.

**Búsqueda insensible a acentos:** se detectó que ILIKE de PostgreSQL no ignora tildes ("jurídico" ≠ "juridico"), lo cual afectaría la usabilidad real en la oficina. Se resolvió con la extensión `unaccent` de PostgreSQL aplicada en los criterios de búsqueda por nombre de cliente y por contenido OCR.

**Reporte Excel priorizado sobre PDF:** se decidió construir primero el listado de expedientes en Excel (más útil para uso diario del Lic. Villeda y demuestra integración de 4 tablas) y dejar la exportación PDF individual para después, ya que tiene menor prioridad para el Capítulo V que el panel web.

**Dockerización del backend (21 de julio de 2026):** Render no permite instalar paquetes de sistema como `tesseract-ocr` o `poppler-utils` vía apt en su entorno nativo (buildpacks de Python), y esto se confirmó con soporte oficial de Render en su foro público. La única alternativa oficialmente soportada es dockerizar. Se descartaron: (a) buscar un binario portable de Tesseract (frágil por dependencias compartidas), (b) reemplazar Tesseract por un servicio de OCR en la nube (invalidaría el marco teórico ya escrito), (c) migrar a otro proveedor (esfuerzo desproporcionado sin razón para abandonar Render). Docker Free tier en Render no tiene costo adicional. La imagen usa `python:3.13-slim` (no 3.14.3 como en desarrollo local) por disponibilidad de wheels precompilados para Linux.

**Migración a servicio nuevo `sistema-villeda-backend-v2` (21 de julio de 2026):** Render no permite cambiar el runtime de un servicio existente de nativo a Docker desde el dashboard. Por eso se creó un servicio nuevo con runtime Docker apuntando al mismo repo, y el servicio anterior quedó suspendido (no eliminado) por si hace falta consultar sus logs históricos.

**Despliegue del modelo ML en Modal (21 de julio de 2026, decisión):** el modelo ML (BETO baseline → RoBERTa-base-bne final) sí correrá en producción, no solo en Colab para la tesis. Se servirá como microservicio serverless en Modal.com. Modal ofrece Free tier con $30/mes de crédito de cómputo (requiere tarjeta para verificación de cuenta, no cobra bajo el crédito). Arquitectura: backend Flask en Render (Docker) → llamada HTTP a Modal para clasificar → respuesta al panel/móvil. Razones para elegir Modal sobre otras alternativas: (a) Render Free tier tiene solo 512 MB RAM, insuficiente para BETO/RoBERTa cargados en memoria; (b) Modal cobra por segundos de cómputo real, no por uptime, lo cual encaja bien con el volumen bajo de la oficina; (c) 4.6.1 Despliegue queda mejor documentado con esta arquitectura defendible; (d) el backend pasó a Starter ($7/mes) por necesidad real de CPU para OCR — panel y app siguen en Free tier con costo cero — y Modal se activa solo cuando llegue la Fase 8.5.

**Duplicados de documento tratados como AVISO** (201 con `documento.aviso`), NO como error, para preservar la posibilidad de asociar el mismo documento a varios expedientes (útil legalmente para copias de DPI, poderes, etc.). Marca visual en el UI queda pendiente como mejora futura.

**Alcance del dataset físico acotado a Notarial (30 de julio de 2026):** de los 158 expedientes escaneados (protocolo notarial del Lic. Villeda, ya separados y organizados con `separar_expedientes.py` en `expedientes_separados/`, numerados `2021-001.pdf` a `2021-158.pdf`), una revisión manual de ~50 no encontró ningún caso de Civil, Laboral o Penal — consistente con que un libro de protocolo notarial, por definición legal, solo puede contener actos notariales. Esto acota el alcance realista del Capítulo V y la clasificación ML a los tipos dentro de Notarial, no a las 4 áreas completas. Decisión pendiente de confirmación 100% directa con el Lic. Villeda (se confirmó con su secretaria), pero con evidencia fuerte a favor. Los 158 archivos viven fuera del repo (carpeta de escritorio local), no se commitean.

**Extracción de entidades (NER) confirmada fuera de alcance (31 de julio de 2026):** se verificó que la tabla `entidades_nlp` existe en Supabase pero está vacía (0 filas), sin ningún modelo SQLAlchemy ni referencia en todo el código (confirmado con búsqueda exhaustiva en .py, .js, .jsx, .sql y .md de backend, panel-web y app-movil) — es infraestructura del diseño original que nunca se conectó a nada. La Guía de Desarrollo confirma que Fase 6-8 son exclusivamente clasificación de documento completo (`BertForSequenceClassification`/`RobertaForSequenceClassification`, `num_labels=4`), no reconocimiento de entidades (nombres, fechas, montos) — esa sería una tarea NLP completamente distinta (token-classification), sin librerías instaladas para ello. El etiquetado actual (área/tipo por documento) es todo lo que se necesita para el alcance real de la tesis.

**Modelo ML reformulado: 6 tipos Notarial en vez de 4 áreas (31 de julio de 2026, decisión):** la Guía de Desarrollo especificaba clasificación de 4 clases (civil/penal/laboral/notarial, `num_labels=4`), pero el dataset físico disponible (158 expedientes) es 100% Notarial — sin ningún ejemplo real de las otras 3 áreas, entrenar con 4 clases habría sido inválido (el modelo no puede aprender a distinguir clases que nunca vio). Se decidió reformular BETO/RoBERTa para clasificar los **6 tipos dentro de Notarial** (Compraventa, Donación, Declaración Jurada, Mandato, Matrimonio, Otro) en vez de las 4 áreas jurídicas — `num_labels=6`, no 4. Esto afecta directamente Fase 7-8 (fine-tuning) y debe reflejarse también en el Capítulo V de la tesis cuando se redacte. La clasificación por área jurídica queda descartada como objetivo del modelo (todo el dataset es Notarial de todas formas), no solo pospuesta.

**Actualización del 1 de septiembre de 2026 — el modelo entrena con 4 clases, no 6.** Sobre el corpus final de 390 expedientes, Mandato tiene 11 casos, Matrimonio 5 y Otro 1: **17 en total sobre 390**. Con esos números una partición estratificada deja 3 o 4 casos en el conjunto de prueba, y cualquier métrica por clase sería ruido. Se agrupan las tres en una sola clase "Otro", quedando **Compraventa (160), Declaración Jurada (148), Donación (65) y Otro (17)** — `num_labels=4`, no 6.

**El catálogo `tipos_expediente` de la base de datos MANTIENE los 6 tipos y no se toca.** Ya hay expedientes reales en producción etiquetados como Mandato y Matrimonio, y colapsar el catálogo destruiría información legal legítima. La formulación correcta es: **el sistema registra seis tipos de acto, el modelo aprende cuatro** porque tres tienen frecuencia insuficiente para entrenar y evaluar. La confirmación humana sigue ofreciendo los 6 tipos en el desplegable.

Consecuencia para el desbalance: aun con 4 clases la proporción es **160 contra 17**, así que el entrenamiento usa **pesos por clase** y se reporta **F1 macro**, no exactitud global.

**Extracción del corpus de entrenamiento — se fuerza Tesseract sobre los 390 (1 de septiembre de 2026):** el texto que alimenta Fase 7-8 y el Capítulo V se extrajo con `extraer_corpus.py` (fuera del repo, en `Desktop\SEPARAR_PDF\`), que reutiliza `procesar_archivo()` de `app/ocr/services.py` cargado por ruta con importlib — mismo dpi=300, mismo `lang='spa'` sin `oem` ni `psm` explícitos (o sea los valores por defecto de Tesseract 5: OEM 3 y PSM 3), mismo preprocesamiento HSV que borra sellos rojos, azules y dorados.

**La bifurcación de producción NO se aplica: Tesseract corre sobre los 390, tengan o no capa de texto.** En producción `determinar_id_formato()` manda los PDF con capa a pdfplumber y solo los escaneados a OCR. Acá eso se saltea deliberadamente por dos razones. La primera es que la capa de texto que deja el escáner es peor que Tesseract sobre el mismo documento; quedó documentado sobre el corpus entero y no ya sobre ocho casos: en varios expedientes la capa devuelve el texto desmenuzado carácter por carácter (`c 1 ato - rc - e - de - o - c - tub - re` por "catorce de octubre"), lo que **infla el conteo de palabras** de pdfplumber por encima del de Tesseract sin aportar contenido. Ojo al leer `corpus_manifiesto.csv`: `palabras_pdfplumber > palabras_tesseract` es señal de degradación, no de mejor extracción.

La segunda razón es la que de verdad obligaba: **la capa de texto está fuertemente correlacionada con el año.** Medido sobre los 390 — 2021: 124 de 158 con capa (78,5%); 2022: 80 de 232 (34,5%). Una brecha de 44 puntos. Respetar la bifurcación habría partido el corpus en dos calidades de texto alineadas con el año, y el clasificador podría haber aprendido artefactos del método de extracción en vez del tipo de acto. Forzar Tesseract deja una sola calidad de texto en todo el corpus.

La medición de pdfplumber **se conserva igual, pero solo como comparación**: las columnas `palabras_pdfplumber`, `caracteres_pdfplumber` y `segundos_pdfplumber` del manifiesto no alimentan el entrenamiento, y quedan **vacías (no en cero)** donde el PDF no traía capa, porque la diferencia entre "no aplica" y "aplicó y dio cero" importa para el análisis.

Detalles de la corrida: 390/390 con `resultado='ok'`, ningún `vacio` ni `error`; 955 páginas en 28,8 minutos de tiempo acumulado por expediente (1,81 s/página), de los cuales el 93,6% es Tesseract y el 4,9% pdfplumber. Salida: un `.txt` por expediente en `corpus_texto/` (UTF-8, el texto no va en el CSV porque los saltos de línea y las comas lo romperían) más `corpus_manifiesto.csv`. El script es reanudable —saltea todo `.txt` con contenido— y para que la reanudación no mienta no escribe archivo cuando no hay texto, la verificación exige contenido y no solo existencia, la escritura es atómica (`.tmp` + `os.replace`), y el manifiesto se escribe fila por fila con flush inmediato: si se escribiera al final, un corte a mitad dejaría `.txt` válidos que la corrida siguiente saltearía, sin fila en el CSV y sin forma de regenerarla. El conteo de palabras usa `contar_palabras()` de `medir_longitud_texto.py` (normaliza espacios con `re.sub`), **no** el `texto.split()` que ya devuelve `procesar_archivo()`, para que haya una sola definición de "palabra" en toda la tesis — es la misma con la que se calculó la variable LTE del Capítulo IV.

**El corpus entró completo al entrenamiento, sin filtro de calidad.** `resultado='ok'` significa que Tesseract devolvió texto, no que el texto sea bueno: hay escaneos legibles pero ruidosos que quedaron dentro, y al menos uno (`2021-021`) es prácticamente ilegible. No se descartó ninguno. Los resultados del entrenamiento se obtuvieron sobre ese corpus tal cual, lo que hace las métricas **más conservadoras y no menos**.

**⚠️ Parámetros reales de Tesseract — corregir el marco metodológico de la tesis:** se verificó leyendo el código que `procesar_archivo()` llama a `pytesseract.image_to_string()` con **`lang='spa'` únicamente**, sin argumento `config=`. Es decir que corre con los valores **por defecto de Tesseract 5: PSM 3 (segmentación automática de página, sin OSD) y OEM 3**. Notas anteriores del proyecto mencionaban `--oem 3 --psm 6`, que **NO es lo que corre**: PSM 6 ("un único bloque uniforme de texto") nunca se configuró. El OEM coincide por casualidad, porque 3 es también el valor por defecto. **Hay que revisar si el marco metodológico de la tesis repite ese dato incorrecto** — el valor a citar es PSM 3, y describirlo como "los valores por defecto de Tesseract" en vez de como una configuración elegida, porque nunca se eligió.

**Entrenamiento y evaluación de los modelos de clasificación (4 de septiembre de 2026)**

Cierra las Fases 7 y 8. Se evaluaron cuatro enfoques sobre el mismo corpus de 390 expedientes: una regla de palabra clave sin aprendizaje, TF-IDF con regresión logística, y los dos Transformers (BETO y RoBERTa-base-bne), cada Transformer con dos estrategias de truncamiento.

**Metodología de evaluación.** Validación cruzada estratificada de 5 pliegues, `shuffle=True`, semilla 42. Cada expediente termina con una predicción hecha por un modelo que no lo vio durante su entrenamiento — predicción **fuera de pliegue**. La semilla y el número de pliegues son **los mismos en los baselines y en los Transformers, deliberadamente**: así cada expediente cae en el mismo pliegue en todos los experimentos y las predicciones se pueden comparar documento por documento, no solo en promedio. Sin esa condición, dos modelos con el mismo F1 podrían estar acertando en documentos distintos y no habría forma de notarlo.

5 pliegues es el máximo razonable acá, y el límite lo pone la clase minoritaria: con 17 casos en `Otro`, cada pliegue recibe 3 o 4. Con 10 pliegues quedarían 1 o 2 y la métrica de esa clase sería inútil.

La métrica principal es **F1 macro, no exactitud global**. Con 160 Compraventa contra 17 Otro, un modelo que nunca prediga la clase minoritaria igual tendría buena exactitud. El entrenamiento usa además **pesos por clase en la función de pérdida**, calculados sobre el conjunto de entrenamiento de cada pliegue: con la distribución real, la clase `Otro` recibe **9.41 veces más peso** que Compraventa. Y en el baseline TF-IDF el vectorizador **se ajusta dentro de cada pliegue**, solo sobre el conjunto de entrenamiento — ajustarlo sobre los 390 antes de partir habría metido el IDF y el vocabulario de los documentos de prueba en el modelo, y el número resultante no valdría nada.

**Baseline 1 — regla de palabra clave.** Clasificador sin aprendizaje: busca en el texto normalizado (minúsculas, sin tildes) las palabras clave de cada clase. Existe para responder una pregunta previsible de la terna: si estos documentos son formularios rígidos, por qué hace falta un modelo en vez de buscar la palabra "COMPRAVENTA" en el encabezado.

Se evalúa sobre los 390 directamente, sin partición, porque no hay nada que ajustar y por lo tanto nada que pueda filtrarse. Esa asimetría **favorece a la regla** frente a los modelos, que juegan de visitante con predicciones fuera de pliegue — y aun así pierde, lo que refuerza el argumento en vez de debilitarlo.

Resultado: **F1 macro 0.859, exactitud 0.915, 33 errores sobre 390.** Cómo se resolvió cada caso: 169 por el nombre del acto (43.3%), **206 por el rol de las partes (52.8%)**, 15 sin ninguna coincidencia (3.8%). Los ambiguos —con palabras clave de más de una clase— fueron **269, el 69% del corpus**, resueltos por orden de aparición en el documento.

Dato clave para el Capítulo V: hay **79 expedientes donde no aparece ninguna palabra del nombre de su propio acto en todo el texto**. En esos el rol de las partes es lo único que puede resolver, y clasifica bien 64. Sin incluir los roles como palabras clave, esos 79 habrían caído todos en la clase `Otro`.

Por qué falla la regla: la cadena `donacion` aparece en 125 documentos pero **solo 65 son realmente Donación**. En 59 Declaraciones Juradas aparece la frase estándar *"lo adquirió por donación verbal que le hiciera"*, que describe **cómo se obtuvo el inmueble y no el acto que la escritura constituye**. Casi la mitad de las apariciones de esa palabra apuntan a la clase equivocada.

**Baseline 2 — TF-IDF con regresión logística.** `TfidfVectorizer` con n-gramas de 1 y 2, `min_df=2`, `sublinear_tf=True`, sin lista de palabras vacías. `LogisticRegression` con `class_weight='balanced'`. Resultado: **F1 macro 0.9900, exactitud 0.9949, solo 2 errores sobre 390**, con media entre pliegues 0.988 ± 0.021 y un vocabulario medio de 13 484 términos por pliegue.

Hallazgo que va al Capítulo V: en la clase Donación el modelo pesa el término `donante` con **1.369** y `donacion` con **0.748**, casi el doble. Aprendió por su cuenta que **el rol de las partes identifica el acto mejor que el nombre del acto** — que es exactamente lo que se había deducido a mano al revisar el expediente `2021-049`, donde el OCR perdió la palabra DONACIÓN pero el documento seguía diciendo EL DONANTE y LA DONATARIA.

**Transformers: BETO y RoBERTa-base-bne.** Entrenados en Kaggle con GPU Tesla T4. Cuatro configuraciones —dos modelos por dos estrategias de truncamiento—, cinco pliegues cada una: **veinte entrenamientos, unos 13 minutos de GPU**. Hiperparámetros: `max_len` 512, batch 8, 4 épocas, learning rate 2e-5, warmup 10%, weight decay 0.01, recorte de gradiente a 1.0, precisión mixta.

**Por qué hay que truncar.** Los expedientes tienen **1178 tokens de mediana** con el tokenizador de BETO y 1214 con el de RoBERTa, contra los **510 que entran en la ventana del modelo**. **385 de los 390 documentos se truncan, el 98.7%.** Más de la mitad del texto se descarta y hay que decidir qué mitad, así que la estrategia de truncamiento deja de ser un detalle de implementación y pasa a ser una variable experimental. Las dos evaluadas:

- **`principio`** — los primeros 510 tokens.
- **`principio_final`** — 128 tokens del inicio y 382 del cierre, descartando el medio. La proporción sigue el trabajo de Sun y colegas sobre ajuste fino de BERT para clasificación de texto. La hipótesis era que en una escritura notarial el acto se nombra en la comparecencia inicial, pero los roles de las partes y las firmas aparecen al cierre.

Resultados, predicciones fuera de pliegue sobre los 390:

| modelo | estrategia | F1 macro | exactitud | errores | media entre pliegues |
|---|---|---|---|---|---|
| RoBERTa-bne | principio_final | **0.9862** | 0.9923 | 3 | 0.9838 ± 0.0199 |
| BETO | principio_final | 0.9661 | 0.9718 | 11 | 0.9623 ± 0.0337 |
| RoBERTa-bne | principio | 0.9583 | 0.9641 | 14 | 0.9555 ± 0.0223 |
| BETO | principio | 0.9533 | 0.9692 | 12 | 0.9489 ± 0.0303 |

Dos conclusiones. **RoBERTa-base-bne supera a BETO**, lo que cumple el objetivo específico de comparar arquitecturas y seleccionar la de mayor F1. Y **la estrategia de principio y final gana en los dos modelos, no en uno solo**: que sea consistente la convierte en un hallazgo metodológico y no en una casualidad. RoBERTa se beneficia más, sube 2.8 puntos contra 1.3 de BETO.

**Por qué una configuración puede tener más errores absolutos y aun así mejor F1 macro.** Es la pregunta que va a hacer cualquiera que lea la tabla de arriba: BETO con `principio_final` tiene **11 errores y F1 macro 0.9661**, mientras que BETO con `principio` tiene **12 errores y F1 macro 0.9533** — un error más, pero 1.3 puntos peor. No es un error de cálculo. El F1 por clase de `principio_final` es 0.978, 0.980, 0.937 y 0.970, cuyo promedio es 0.9661; el de `principio` es 0.966, 0.973, 0.992 y 0.882, promedio 0.9533. **La diferencia la explica por completo la clase `Otro`**, que pasa de F1 0.882 a 0.970: con `principio` fallan dos de sus 17 casos y con `principio_final` falla uno solo. Como el F1 macro promedia las cuatro clases con el mismo peso, **un error sobre una clase de 17 casos cuesta lo mismo que uno sobre una de 160**. Por eso el F1 macro es la métrica correcta para este corpus desbalanceado, y por eso no se reporta exactitud global como métrica principal.

**Comparación general.**

| enfoque | F1 macro | errores sobre 390 |
|---|---|---|
| TF-IDF + regresión logística | **0.9900** | 2 |
| RoBERTa-bne (principio_final) | 0.9862 | 3 |
| BETO (principio_final) | 0.9661 | 11 |
| RoBERTa-bne (principio) | 0.9583 | 14 |
| BETO (principio) | 0.9533 | 12 |
| Regla de palabra clave | 0.8590 | 33 |

Documento por documento, el mejor Transformer contra TF-IDF: **aciertan los dos 387, solo el Transformer 0, solo TF-IDF 1, fallan los dos 2.**

**El modelo simple gana, y hay que decirlo así en la tesis** — pegado siempre a ese número. La conclusión defendible no es que el Transformer resuelva el problema, sino que **sobre este corpus ambos enfoques coinciden en 387 de 390 documentos y la diferencia entre ellos es un solo caso**. El margen restante no es capacidad del modelo sino ambigüedad de la etiqueta.

**Límite de validez externa que hay que declarar en la tesis:** el corpus son formularios de **un solo notario**, con plantillas fijas y vocabulario de rol muy discriminativo. Sobre protocolos de otro notario, o con más variedad de actos, no hay razón para esperar 0.99.

**Análisis de errores del modelo ganador.** Los 3 errores de RoBERTa con `principio_final`:

| archivo | año | tipo real | predicho | confianza |
|---|---|---|---|---|
| 2021-059 | 2021 | Compraventa | Donación | 0.585 |
| 2022-056 | 2022 | Otro | Declaración Jurada | 0.401 |
| 2022-228 | 2022 | Declaración Jurada | Donación | 0.898 |

Dos observaciones. La primera: **dos de los tres tienen confianza por debajo del umbral de 0.70 del sistema**, así que en producción no se crearían automáticamente — irían a confirmación humana. Eso **valida empíricamente la elección de ese umbral**, que hasta ahora era una decisión de diseño sin respaldo medido.

La segunda: el expediente `2022-228` **falla también en el baseline TF-IDF, y en los dos casos por lo mismo**. Revisado el documento original, es un **CONTRATO DE RESCISIÓN** que deja sin efecto una declaración jurada anterior, la escritura 222. El documento no constituye una declaración jurada: la cancela. La etiqueta es discutible y el tipo "Rescisión" no existe en el catálogo de seis tipos. **Que dos modelos con arquitecturas completamente distintas fallen en el mismo documento indica que el problema está en la etiqueta, no en los modelos.** Se decidió **conservar la etiqueta como está** y documentarlo como caso límite en el Capítulo V, en vez de corregirla: cambiarla obligaría a revisar todo el criterio de etiquetado.

**Métricas por clase del modelo ganador** (RoBERTa-bne, principio_final, fuera de pliegue):

| clase | precisión | recall | F1 | soporte |
|---|---|---|---|---|
| Compraventa | 1.000 | 0.994 | 0.997 | 160 |
| Declaración Jurada | 0.993 | 0.993 | 0.993 | 148 |
| Donación | 0.970 | 1.000 | 0.985 | 65 |
| Otro | 1.000 | 0.941 | 0.970 | 17 |

La clase `Otro` tiene **precisión perfecta pero recall 0.941**: cuando el modelo dice `Otro` nunca se equivoca, pero se le escapa uno de los 17. Con una clase de ese tamaño, un solo error es el 6%.

**Reproducibilidad — el entrenamiento no es exactamente reproducible.** Pese a tener la semilla fija, el no determinismo de cuDNN en GPU hace que dos corridas independientes con la misma semilla no den lo mismo: el pliegue 1 de BETO con `principio_final` dio **0.9919 en una corrida y 0.9780 en otra**. **En el Capítulo V hay que reportar la media entre pliegues con su desviación, nunca un valor exacto de un pliegue individual.** Lo que sí se mantuvo idéntico en ambas corridas fue **el orden de las cuatro configuraciones**, que es lo que le da solidez al resultado: la conclusión no depende del ruido de una corrida.

**⚠️ Disponibilidad de RoBERTa-base-bne — el repositorio oficial ya no tiene los pesos.** `PlanTL-GOB-ES/roberta-base-bne` conserva el README y la configuración, pero no el modelo. El repositorio `BSC-LT/roberta-base-bne` al que remite tampoco los tiene y devuelve 401. **Los dos se apuntan mutuamente.** Se usó el espejo `IsGarrido/roberta-base-bne`, subido explícitamente como copia de los pesos de PlanTL, 499 MB. **Es un espejo de terceros, no oficial.** Si en el futuro hay que reentrenar y ese espejo desaparece, habrá que buscar otro o cambiar de modelo — **conviene guardar una copia local de los pesos** antes de que eso pase.

**Modelo final.** Se reentrenó la configuración ganadora (RoBERTa-bne con `principio_final`) sobre **los 390 expedientes completos, sin partición**, con los mismos hiperparámetros. Pérdida por época: 1.1157, 0.1436, 0.0214, 0.0131. Los archivos quedaron en la salida del notebook de Kaggle `audias29/notebook6ff7e315ff` (`kaggle kernels output audias29/notebook6ff7e315ff`): `model.safetensors`, `config.json`, `tokenizer.json`, `tokenizer_config.json` y `clases.json`.

**`clases.json` es crítico y no se puede perder.** Contiene el orden de las clases, el mapeo de índice a nombre, la estrategia de truncamiento, el valor de `head_tokens`, el `max_len` y el umbral de 0.70. **Sin ese archivo el servicio de inferencia en Modal no sabría qué significa cada índice de salida del modelo** — la red devuelve cuatro números y nada más; cuál corresponde a Compraventa y cuál a Donación vive únicamente ahí.

Pendiente para Fase 8.5: **`model.safetensors` (480 MB) no se descargó todavía.** Se resolverá al momento del despliegue en Modal, probablemente guardándolo como Kaggle Model o descargándolo directamente desde Modal en vez de pasarlo por la máquina local. *(Resuelto el 6 de septiembre de 2026: los pesos se subieron a un repositorio privado de Hugging Face y Modal los baja de ahí — ver la sección siguiente.)*

**Integración del clasificador real de Modal (6 de septiembre de 2026):** cierra la Fase 8.5. El backend dejó de usar el mock aleatorio y ahora clasifica con RoBERTa-bne servido desde Modal.

**Arquitectura.** El servicio vive en `backend/modal_app/clasificador_modal.py` (desplegado con `modal deploy`) y carga los pesos desde el repositorio **privado** de Hugging Face `Audias22/villeda-clasificador-notarial`, cacheados en un volumen persistente de Modal para no bajar 475 MB en cada arranque en frío. Recibe `{"texto": "..."}` y devuelve `{clase, confianza, modelo, estrategia, umbral, todas}`. **Devuelve el NOMBRE de la clase, nunca un id**: el servicio no conoce los identificadores de Supabase y no tiene por qué. El OCR se queda en Render a propósito — ya funciona, y mantenerlo ahí conserva la medición de la variable TPO en un solo lugar.

Del lado del backend, `clasificar(texto)` **conserva su firma y su contrato de 3 claves** (`id_tipo_predicho`, `confianza`, `id_modelo`), así que el worker no se enteró del cambio. Archivos: `app/services/modal_service.py` (cliente HTTP nuevo, sigue la forma de `r2_service.py`), `app/clasificacion/clasificador.py` (elige implementación y traduce) y el try/except nuevo en `app/clasificacion/services.py`.

**⚠️ Mapeo de clase a `id_tipo` — los ids NO son consecutivos.** Verificado contra la base el 6 de septiembre de 2026:

| clase del modelo | id_tipo |
|---|---|
| Compraventa | 1 |
| Declaración Jurada | 16 |
| Donación | 15 |
| Otro | 18 |

El **`id_tipo` 4 es "Acta notarial" y está INACTIVO**. Si alguien "simplificara" el diccionario mapeando por índice (0→1, 1→2, 2→3, 3→4), **todo lo que el modelo clasifique como "Otro" quedaría archivado como acta notarial y no saltaría ningún error**, porque 4 es un id válido: el daño solo se vería meses después revisando expedientes a mano. Por eso el mapeo está escrito explícito y con esa advertencia al lado en el código.

El mapeo va **en el código y no se lee de la base**, a propósito: el modelo predice cuatro clases fijas decididas al entrenar, así que si mañana alguien activa un tipo nuevo en el catálogo el modelo lo va a seguir clasificando entre estas cuatro. **El mapeo es una propiedad del modelo entrenado, no del catálogo.**

**Las cuatro decisiones de diseño, con su razón:**

1. **Transitorio vs permanente, dos excepciones y no una.** Es la decisión más importante y la que corrige el diseño original. Los *permanentes* —HTTP 400, una clase fuera del mapeo, respuesta con estructura inesperada, falta `MODAL_CLASIFICADOR_URL`, cualquier 4xx que no sea 429— van a `ESTADO_ERROR` con notificación al usuario, porque reintentar daría el mismo resultado. Los *transitorios* —timeout, conexión caída, 5xx, 429— **se dejan propagar**, para conservar el camino de reintentos que ya existía: el worker hace rollback, el trabajo queda En proceso y el rescate de zombis lo devuelve a la cola hasta 3 veces. Sin esa distinción, un parpadeo de red de dos segundos convertiría el documento en un Error definitivo que la secretaria tendría que volver a subir — se le estaría quitando el reintento justo a la operación que más lo necesita, que es la única llamada de red del pipeline.

2. **La URL se valida en la primera llamada, no en el import.** `create_app()` importa `clasificacion.routes` → `services` → `clasificador`, así que un `raise` a nivel de módulo **dejaría sin arrancar todo el backend**: sin login, sin expedientes, sin búsquedas, sin reportes. Un deploy que se olvide de la variable dejaría a la oficina entera sin sistema, en vez de solo sin clasificación automática. Validando en la llamada, el fallo es proporcional a lo que rompe: el documento va a Error con un mensaje que nombra la variable que falta, y el resto de la API sigue viva. Verificado: `create_app()` arranca sin `MODAL_CLASIFICADOR_URL`.

3. **El umbral del backend es el autoritativo.** Modal informa su propio `umbral` en cada respuesta, pero manda `UMBRAL_CONFIANZA` de `services.py`: es política del negocio, no propiedad del modelo, y es el valor que se persiste en `umbral_usado` y `umbral_confianza_usado`. Si los dos difieren se loguea un **warning**, para que una divergencia futura sea visible en vez de silenciosa. La comparación usa un import diferido dentro de la función porque `services.py` ya importa de `clasificador.py` y a nivel de módulo sería circular.

4. **Se loguean las probabilidades de las cuatro clases** en cada predicción. Ante una predicción rara, el dict `todas` es lo que separa "el modelo se equivocó" de "el modelo dudó entre dos", y va a ser material para el Capítulo V cuando la oficina empiece a usar el sistema con documentos reales.

**Dos variables de entorno nuevas. Hay que cargarlas EN RENDER, no solo en el `.env` local:**

| variable | valor | qué pasa si falta |
|---|---|---|
| `MODAL_CLASIFICADOR_URL` | la URL del endpoint desplegado | en modo modal, cada documento va a Error con mensaje explícito. El resto de la API sigue funcionando |
| `CLASIFICADOR_MODO` | `modal` (default) o `mock` | sin ella el default es `modal`, que es lo correcto en producción — un deploy olvidadizo no puede terminar creando expedientes con tipos al azar |

`id_modelo` queda en **4** (`RoBERTa-bne notarial`, la fila real de `modelos_ml`) en modo modal, y sigue en **3** (el mock) en modo mock. **El mock no se borra**: sirve para desarrollo local sin gastar crédito de Modal ni depender de la red.

**Verificación del 6 de septiembre de 2026**, cinco escenarios, todos llamando a las funciones directamente sin levantar el worker (ver la advertencia operativa de abajo): el mapeo de las cuatro clases dio los cuatro `id_tipo` correctos con `id_modelo=4`; el pipeline completo con `procesar_trabajo()` creó el expediente con `id_tipo_predicho=15` para una Donación; el modo mock siguió dando `id_modelo=3`; sin la URL el trabajo fue a `ESTADO_ERROR` con el mensaje correcto; y con la URL apuntando a un puerto cerrado la excepción **propagó** y el trabajo quedó En proceso, **no** en Error. El caso de clase no mapeada no se puede provocar desde afuera —habría que reentrenar el modelo con otras etiquetas— y se verificó leyendo el código: `_clasificar_con_modal()` lanza `ErrorClasificadorPermanente` antes de tocar la base, así que nunca puede escribirse un `id_tipo` adivinado.

**⚠️ ADVERTENCIA OPERATIVA — levantar el backend local con `FORZAR_WORKER=true` compite por la cola de producción.** `DATABASE_URL` apunta a la misma base de Supabase, y `reclamar_siguiente_trabajo()` usa `FOR UPDATE SKIP LOCKED`, que está diseñado justamente para que varios workers convivan sin pisarse. Funciona como debe, pero significa dos cosas peligrosas: **un trabajo que se encole para probar en local puede ser reclamado por el worker de Render y procesado con el código desplegado en vez del que se quiere probar**, y al revés, **un worker local con código sin desplegar puede reclamar y procesar un documento real de la oficina**. Descubierto el 6 de septiembre de 2026 al intentar verificar esta misma integración: el documento de prueba lo procesó Render con el mock, creando el expediente 48 archivado como Compraventa siendo una Donación — una demostración involuntaria de por qué este cambio hacía falta. Para probar el worker en local, o se apaga el worker y se llama a `procesar_trabajo()` directamente, o se insertan las filas de prueba **ya en estado En proceso (2)**, que producción no reclama porque solo toma Pendiente.

**Artefactos generados, todos fuera del repositorio.** En `Desktop\SEPARAR_PDF\resultados_ml\`: `resultados_transformers.csv`, `metricas_por_clase.csv`, `configuracion.json`, y cuatro archivos `predicciones_*.csv` con las predicciones fuera de pliegue de cada configuración (archivo, año, tipo original, tipo real, tipo predicho, probabilidad, acierto y la probabilidad de cada una de las cuatro clases). En `Desktop\SEPARAR_PDF\` están los scripts de los baselines: `corpus_comun.py`, `baseline_reglas.py`, `baseline_tfidf.py`, `analisis_errores.py`, `comparar_baselines.py`, `predicciones_tfidf.csv` y `predicciones_reglas.csv`.

**Desajuste confirmado: sistema real tiene 44 tablas, no 28 (31 de julio de 2026, recontado el 31 de agosto de 2026):** se verificó directamente en Supabase (consulta sobre information_schema.tables, confirmada por el propio usuario ejecutándola en el SQL Editor) que el sistema real tiene **44 tablas base + 5 vistas = 49 objetos**. El recuento original del 31 de julio de 2026 había dado 43 tablas + 5 vistas = 48 objetos; quedó corregido el 31 de agosto de 2026 al inventariar la base tabla por tabla contra `information_schema`. Las 15 tablas que en mayo de 2026 se habían eliminado en una base de datos MySQL local (villeda_db, para el diagrama del Capítulo IV) nunca se aplicaron al sistema real construido en Supabase — el backend usa esas 15 tablas de catálogo como modelos SQLAlchemy reales (EstadoExpediente, Prioridad, FormatoDocumento, etc.), no como texto suelto. Decisión: actualizar el Capítulo IV a 44 tablas (describir el sistema real), no reducir la base de datos de producción para que coincida con la tesis ya escrita — evita el riesgo de tocar un sistema que ya funciona con documentos reales.

**Duplicados de cliente responden 409 Conflict con el id del existente (6 de agosto de 2026, decisión):** al construir la gestión de clientes se detectó que un DPI repetido devolvía 400 con solo el mensaje de error, sin el `id_cliente` del que ya existía. Eso dejaba sin salida al caso más común del alta al vuelo desde Nuevo expediente: la secretaria escribe un cliente, el sistema le dice que el DPI ya está registrado, y no había forma de ofrecerle usar ese cliente sin abandonar el modal y perder el expediente a medio llenar. Se cambió a **409 Conflict** con cuerpo `{"error": "...", "id_cliente": N, "cliente": {...}}`, tanto en POST como en PUT. El 409 es además el código semánticamente correcto (conflicto con el estado actual del recurso), a diferencia del 400 que sugiere datos mal formados. En el panel, `ClienteFormulario` atrapa ese 409 y muestra un botón "Usar el cliente existente" que selecciona al cliente ya registrado y continúa el flujo. Se aprovechó para agregar la **validación de NIT duplicado que no existía** (solo se validaba el DPI), aplicada únicamente a personas Jurídicas: una persona Natural puede compartir NIT con su empresa legítimamente, así que bloquearlo habría sido incorrecto. `crear_cliente` y `actualizar_cliente` pasaron a devolver 3 valores `(cliente, error, existente)` — se verificó antes que nadie más los llamaba fuera de sus rutas.

**Nunca anidar `<form>` en el panel web (6 de agosto de 2026):** el mini formulario de cliente dentro del modal de Nuevo expediente no se puede renderizar dentro del `<form>` del expediente, porque un formulario anidado es HTML inválido — el navegador descarta el interno y su botón de submit termina enviando el formulario externo. La solución fue renderizarlo como **hermano**, ocultando el formulario del expediente con `display: none` en vez de desmontarlo, para que no se pierda lo que el usuario ya había escrito. Aplica a cualquier otro formulario dentro de formulario que se quiera agregar después.

**Plan para el diagrama ER del Capítulo IV (pendiente, para la etapa de redacción):** en vez de un diagrama único con las 44 tablas y todos sus campos (ilegible, ya rechazado antes por el asesor con la versión de 28), se hará un diagrama conceptual con solo el nombre de cada tabla y las líneas de relación entre ellas, sin detalle de campos — el detalle de columnas queda en la Tabla 12 (texto), separado del diagrama. Esto también evita el problema de reordenar el índice automático de figuras de Word, al ser una sola figura nueva en el mismo lugar de la anterior (Figura 12), no varias figuras nuevas.

---

## NOTAS IMPORTANTES
- El .env NUNCA se sube a GitHub — está en .gitignore
- Los archivos .bin del modelo ML NUNCA van a GitHub
- La carpeta backend/almacenamiento/ NUNCA se sube a GitHub — está en .gitignore (son archivos binarios de prueba)
- La carpeta backend/almacenamiento/exportaciones/ NUNCA se sube a GitHub — está en .gitignore
- Conexión BD usa Session Pooler (compatible con IPv4 de Render.com)
- Supabase se pausa tras 7 días sin actividad — reactivar manualmente con "Resume project"
- Identity del JWT se serializa como JSON string (compatibilidad flask-jwt-extended 4.7.4)
- Token JWT expira en 15 minutos — si una petición da "Token has expired", simplemente hacer login de nuevo. En la app móvil, el AuthContext ahora muestra un Alert automático y redirige a login sin necesidad de reiniciar. En el panel web pasa lo mismo desde el fix del 404 de Vercel: el AuthContext valida `exp` al arrancar y escucha `authEvents` para redirigir con React Router, mostrando un toast de sesión expirada
- El backend corriendo en local escribe en la MISMA base de Supabase de producción (`DATABASE_URL` apunta al pooler de Supabase, no hay base de pruebas separada). Cualquier prueba que cree registros deja datos reales — usar nombres identificables tipo "TEST ..." y borrarlos con DELETE, porque el endpoint de borrado es soft delete y solo los desactiva
- En el panel web NUNCA usar `window.location.href` ni `window.location.reload()` para redirigir — siempre `navigate()` de React Router o `<Navigate>`. Una recarga completa hace que Vercel busque la ruta como archivo real en el servidor, y eso fue exactamente lo que causó el 404 NOT_FOUND
- `panel-web/vercel.json` SÍ se sube a GitHub (a diferencia de los .env) — sin ese rewrite catch-all, cualquier carga directa de una ruta que no sea `/` da 404 en Vercel
- Tesseract en local instalado en `C:\Program Files\Tesseract-OCR\` con idioma spa; en Docker se instala vía apt (`tesseract-ocr` + `tesseract-ocr-spa`)
- Poppler en local instalado en `C:\poppler\bin`; en Docker se instala vía apt (`poppler-utils`)
- `TESSERACT_CMD` y `POPPLER_PATH` en `backend/.env` son opcionales: se leen con `os.getenv()`; si no están definidas, pytesseract y pdf2image usan lo que encuentren en el PATH del sistema (caso del contenedor Docker en Render)
- OCR probado con imagen PNG de texto jurídico guatemalteco (local y producción) — resultado exitoso
- SIEMPRE verificar que el venv esté activo antes de pip install o pip freeze (confirmar con: `python -c "import sys; print(sys.executable)"`)
- tipo_persona en clientes: 1 = Natural (requiere primer_nombre + primer_apellido), 2 = Jurídica (requiere razon_social)
- numero_expediente se genera automático con formato [PREFIJO-AREA]-[AÑO]-[SECUENCIA] (ej: NOT-2026-0001). Prefijos: NOT=Notarial, CIV=Civil, LAB=Laboral, PEN=Penal
- Transiciones de estado de expediente: Activo(1)↔EnRevisión(2)↔Pendiente(3)→Cerrado(4)→Archivado(5). Cerrado y Archivado son finales (no editables salvo Cerrado→Archivado)
- Todos los modelos SQLAlchemy referenciados por Foreign Key deben existir como clase Python, aunque la tabla ya exista en Supabase — error típico: NoReferencedTableError
- id_formato en documentos: 1=PDF escaneado, 2=PDF digital, 3=Word, 4=Excel, 5=JPG, 6=PNG. Para PDF se detecta automáticamente con pdfplumber cuál de los dos (1 o 2) corresponde
- to_dict() en Documento NO incluye texto_completo (puede ser muy largo); usar to_dict_completo() solo en detalle individual
- id_criterio en busquedas: 1=nombre_cliente, 2=fecha, 3=area, 4=contenido, 5=numero_expediente
- Criterios 1 y 4 usan func.unaccent() en ambos lados de la comparación ILIKE para ignorar tildes
- Si el primer "git push origin main" da error "src refspec main does not match any", simplemente repetir el comando — es un glitch de timing, no un problema real
- El .env de panel-web NUNCA se sube a GitHub — está en .gitignore (solo panel-web/.env.example se sube como plantilla)
- panel-web/node_modules/ y panel-web/dist/ NUNCA se suben a GitHub — están en .gitignore de la raíz
- El .env de app-movil NUNCA se sube a GitHub — misma convención que backend y panel-web
- preprocesar_imagen() en ocr/services.py convierte a espacio HSV y elimina sellos rojos, azules y dorados (reemplazándolos con blanco) antes de pasar la imagen a Tesseract — mejora la precisión del OCR en documentos escaneados con sellos oficiales
- Almacenamiento migrado a Cloudflare R2: `cargar_documento()` en documentos/services.py ahora sube cada archivo con `subir_archivo()` (app/services/r2_service.py) y guarda el nombre_key resultante en la columna `ruta_almacenamiento` (se reutilizó la columna existente, no se renombró, para evitar migración de esquema en Supabase)
- `guardar_archivo_local()` se dejó comentada (no borrada) en documentos/services.py como respaldo por si algo falla con R2
- Para servir el archivo original al frontend se agregó GET /api/v1/documentos/\<id\>/descarga, que devuelve una URL firmada de R2 (expira en 1 hora) en vez de leer el archivo desde disco
- Probado end-to-end: subida real a R2, generación de URL firmada, descarga del contenido vía esa URL, y eliminación del objeto de prueba — las credenciales del .env funcionan correctamente
- El backend v2 corre en un contenedor Docker con `python:3.13-slim` como imagen base, Tesseract y Poppler instalados vía apt, y Flask arrancando con `python run.py` (migración a gunicorn pendiente). El Procfile del repo NO se usa cuando el runtime es Docker — se mantuvo en el repo por si algún día se hiciera rollback al entorno nativo, pero funcionalmente es inerte hoy
- `ping_propio()` en `run.py` lee la URL desde `SELF_PING_URL` con `os.getenv()`; si la variable no está definida, usa el fallback `https://sistema-villeda-backend-v2.onrender.com/health`. Esto reemplaza al hardcodeo anterior que apuntaba al servicio v1 suspendido

---

## CONVENCIONES DE COMMITS
- Mensajes en español simple, sin prefijos convencionales (nada de `feat`, `fix`, `chore`) y sin punto y coma.
- Ejemplos válidos:
  - `backend: dockerizar para ejecutar tesseract y poppler en render`
  - `movil: sincronizar estado de autenticacion cuando expira el token`
  - `panel: agregar marca visual de documentos duplicados en detalle de expediente`
- Bajo NINGUNA circunstancia se agrega "Co-Authored-By: Claude" ni ninguna mención de Claude como colaborador.