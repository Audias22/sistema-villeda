# ESTADO DEL PROYECTO — Sistema Villeda
**Última actualización:** 22 de julio de 2026
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
| App móvil | React Native (Expo SDK 54) — APK Android | 🔄 Fases 1-3, 4A, 4B.1, 4B.2 y 4B.3 completadas (setup base + servicios/tema + login + 5 tabs + detalle de expediente + carga de documentos + reportes con exportación PDF y compartir) |
| OCR | Tesseract 5.x + OpenCV (filtrado HSV de sellos de color) — instalado vía apt en Docker de producción, en `C:\Program Files\Tesseract-OCR\` en local | ✅ Funcionando en producción y en local |
| Modelo baseline | BETO | ⏳ No iniciado |
| Modelo final | RoBERTa-base-bne | ⏳ No iniciado |
| Despliegue ML en producción | Modal (Free tier $30/mes de crédito, requiere tarjeta) | ⏳ Decidido, no iniciado |
| Autenticación | JWT + bcrypt | ✅ Funcionando |
| RBAC | 2 capas (BD + decoradores) | ✅ Funcionando |

---

## SERVICIOS EXTERNOS CONFIGURADOS
| Servicio | Estado | Notas |
|----------|--------|-------|
| Supabase | ✅ Activo | Proyecto: villeda-juridico, región us-east-2 |
| GitHub | ✅ Activo | Repo: Audias22/sistema-villeda (privado) |
| Cloudflare R2 | ✅ Activo | Bucket villeda-archivos |
| Render.com — backend v2 (Docker) | ✅ Activo | https://sistema-villeda-backend-v2.onrender.com |
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

**Migración a servicio nuevo en Render (`sistema-villeda-backend-v2.onrender.com`):** Render no permite cambiar el runtime de un servicio existente de nativo (buildpack de Python) a Docker desde el dashboard, así que se creó un servicio nuevo (`sistema-villeda-backend-v2`) con runtime Docker apuntando al mismo repo. El servicio anterior (`sistema-villeda-backend.onrender.com`) quedó **suspendido, no eliminado**, por si hace falta consultar sus logs históricos. La app móvil (`app-movil/.env`, `EXPO_PUBLIC_API_URL`) y el panel web (`panel-web` en Vercel, variable `VITE_API_URL`) ya apuntan al servicio nuevo.

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
| 28 tablas creadas | ✅ |
| 5 vistas creadas | ✅ |
| 5 triggers creados | ✅ |
| Datos seed (roles, permisos, áreas, etc.) | ✅ |
| Extensión pg_trgm | ✅ |
| Extensión unaccent | ✅ |
| Índice GIN texto_completo | ✅ |
| Usuario ovilleda creado | ✅ |
| Permisos asignados a los 5 roles | ✅ |
| Esquema de `clientes` verificado (14 columnas) | ✅ |
| Esquema de `expedientes` verificado (18 columnas) | ✅ |
| Esquema de `documentos` verificado (16 columnas) | ✅ |
| Esquema de `busquedas` verificado (8 columnas) | ✅ |
| Esquema de `formatos_documento` verificado (6 formatos: PDF escaneado=1, PDF digital=2, Word=3, Excel=4, JPG=5, PNG=6) | ✅ |
| `criterios_busqueda` verificado (5 criterios: nombre_cliente=1, fecha=2, area=3, contenido=4, numero_expediente=5) | ✅ |
| `estados_fisico_doc` ajustada a 3 niveles (Deteriorado=1, Regular=2, Bueno=3) según marco metodológico (variable EFD) | ✅ |
| `tipos_expediente` poblada con 13 tipos base (4 Notarial, 4 Civil, 3 Laboral, 3 Penal) — **PENDIENTE validar con Lic. Villeda** | ⚠️ Provisional |
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

│   │   ├── init.py      ✅ Exporta 11 modelos catálogo + require_permission

│   │   ├── models.py        ✅ Rol, Permiso, RolPermiso, AreaJuridica, EstadoExpediente, Prioridad, TipoExpediente, FormatoDocumento, EstadoFisicoDoc, EstadoCarga, CargaMasiva

│   │   └── decorators.py    ✅ @require_permission con json.loads

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

│   │   ├── services.py      ✅ obtener_dashboard(), exportar_expedientes_excel() con openpyxl (encabezados con color, filtros, freeze panes)

│   │   └── routes.py        ✅ GET /dashboard, GET /expedientes/excel (descarga con send_file)

│   ├── services/            ✅ Servicios transversales (no ligados a un módulo específico)

│   │   ├── init.py

│   │   └── r2_service.py    ✅ Cliente boto3 para Cloudflare R2 — subir_archivo(), obtener_url_firmada()

│   ├── ml/                  ⏳ Vacío

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
| POST | /api/v1/clientes | ✅ Funcionando | Sí — gestionar_clientes |
| GET | /api/v1/clientes | ✅ Funcionando (paginado + búsqueda) | Sí — gestionar_clientes |
| GET | /api/v1/clientes/\<id\> | ✅ Funcionando | Sí — gestionar_clientes |
| PUT | /api/v1/clientes/\<id\> | ✅ Funcionando | Sí — gestionar_clientes |
| DELETE | /api/v1/clientes/\<id\> | ✅ Funcionando (soft delete) | Sí — gestionar_clientes |
| POST | /api/v1/expedientes | ✅ Funcionando (numero_expediente automático) | Sí — gestionar_expedientes |
| GET | /api/v1/expedientes | ✅ Funcionando (paginado + filtros área/estado/usuario) | Sí — buscar_expediente |
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
| GET | /api/v1/reportes/dashboard | ✅ Funcionando (totales + por área + por estado + TBR + duplicados) | Sí — ver_dashboard |
| GET | /api/v1/reportes/expedientes/excel | ✅ Funcionando (descarga real .xlsx con filtros opcionales) | Sí — exportar_reporte |
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
| Dashboard | /dashboard | ✅ Totales, distribución por área/estado, TBR, gráficas (Area/Pie) |
| Expedientes (lista + detalle) | /expedientes, /expedientes/:id | ✅ Listado paginado, filtros, detalle con documentos, modal de nuevo expediente |
| Cargar documento | /cargar | ✅ Subida de archivo con OCR/pdfplumber automático |
| Búsqueda | /busqueda | ✅ Búsqueda por los 5 criterios con medición de TBR |
| Usuarios | /usuarios | ✅ CRUD conectado a /api/v1/usuarios |
| Reportes | /reportes | ✅ Dashboard de reportes + exportación Excel |

**Estructura:** componentes comunes reutilizables (Button, Card, Input, Modal, Table, Badge, Pagination, Skeleton, EmptyState), layout con Sidebar + TopBar, rutas protegidas (ProtectedRoute), contexto de autenticación (AuthContext), hooks (useAuth, useFetch), capa de servicios (api.js) que centraliza las llamadas al backend Flask.

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
| Fase 5 | Funcionalidades nativas (cámara, notificaciones, biometría) | ⏳ Pendiente |

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
- **Rediseño del PDF:** logo del despacho (`assets/logo-villeda.jpg`) embebido en el encabezado del HTML como base64 (leído con `File.downloadFileAsync` sobre el asset resuelto vía `Image.resolveAssetSource`, ya que `Print.printToFileAsync` no puede resolver un `require()` de React Native); CSS agregado (`@page { margin: 1cm }`, fuente base 11px, espaciados compactos entre `h1`/`h2`/`p`/`table`, `page-break-inside: avoid` en las tablas) para que el reporte quede en una sola página en vez de dos.
- **Verificado en dispositivo real (22 de julio, celular físico contra backend v2):** generar reporte con filtros, generar PDF (con logo, una sola página, y el Alert de confirmación), y compartir por WhatsApp — los tres pasos funcionando correctamente.

**Fix — sincronización de sesión ante token expirado (12 de julio de 2026):** el interceptor de `src/services/api.js` limpiaba el storage físico (`clearAll()`) al detectar un 401 fuera de `/auth/login`, pero no tenía forma de actualizar el estado de React de `AuthContext.js` (`isAuthenticated` se calcula como `!!token`, en memoria). Resultado: `RootNavigator` seguía mostrando el stack autenticado hasta reiniciar la app manualmente. Se agregó `src/services/authEvents.js`, un pub/sub minimalista sin librerías nuevas (`onSessionExpired` / `emitSessionExpired`). `api.js` llama a `emitSessionExpired()` justo después de `clearAll()` dentro del bloque de 401. `AuthContext.js` se suscribe con `onSessionExpired()` en un `useEffect` propio (independiente del que carga la sesión guardada); el callback pone `user`/`token` en `null` y muestra `Alert.alert('Sesión expirada', 'Tu sesión expiró, inicia sesión de nuevo.')`, protegido con un `useRef` (`sessionExpiredShown`) para no duplicar el aviso si llegan varios 401 casi simultáneos — el ref se resetea a `false` en `signIn()` y en `signOut()`. Además, los `catch` que originaban el request (`DashboardScreen.js`, `BusquedaScreen.js`, `ExpedientesScreen.js`, los dos de `ExpedienteDetalleScreen.js`, y los tres de `CargarDocumentoScreen.js`) ahora chequean `if (err.code === 'SESSION_EXPIRED') { return }` como primera condición, para no mostrar su mensaje genérico ("revisa tu conexión") como parpadeo antes de que el `Alert` de `AuthContext` tome control — en `CargarDocumentoScreen.js` esto obligó a cambiar dos `.catch(() => ...)` a `.catch((err) => ...)` para poder leer el código de error.

**Bug resuelto — apertura de .png/.jpg desde `ExpedienteDetalleScreen` (21 de julio de 2026):** la hipótesis original de este bug ("Content-Type incorrecto en R2 para imágenes") era incorrecta. La causa real: los dos documentos PNG del expediente de prueba NOT-2026-0001 se cargaron antes de la migración a Cloudflare R2 y su `ruta_almacenamiento` quedó como una ruta local de Windows en vez de una key de R2 — el archivo nunca existió en el bucket, por eso la URL firmada devolvía `NoSuchKey`. No era un bug del visor (`expo-web-browser`) ni del Content-Type. Ver nota completa en "DEPLOY EN PRODUCCIÓN". Los documentos cargados después de la migración a R2 (con key UUID) se abren correctamente.

**Verificación pendiente en producción (móvil):** al 22 de julio, la app móvil apuntando a `sistema-villeda-backend-v2.onrender.com/api/v1` se probó únicamente con login desde Expo Go vía `--tunnel` (la red local aparentemente tiene aislamiento de cliente activado). Falta probar los flujos de subida y visualización de archivos desde móvil contra el backend v2.

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
| Fase 6 | Dataset etiquetado | ⏳ Pendiente — esperando 197 expedientes físicos |
| Fase 7 | Fine-tuning BETO | ⏳ Pendiente |
| Fase 8 | Fine-tuning RoBERTa-base-bne | ⏳ Pendiente |
| Fase 8.5 | Despliegue del modelo ML en Modal (microservicio serverless) | ⏳ Decidido, no iniciado |
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
4. ⏳ Fase 5 móvil — funcionalidades nativas (cámara para escaneo con `expo-camera`, notificaciones push con `expo-notifications`, biometría opcional con `expo-local-authentication`, nombre real de la app + ícono + splash screen, build de APK real con EAS).
5. ⏳ Redactar 4.5.1 / 4.5.2 / 4.6.1 de la tesis (describir sistema construido, pruebas end-to-end reales, despliegue en Render/Docker/Vercel/Supabase/R2/Expo). **Movido a último a propósito:** las pantallas de Expediente/Detalle y Cargar Documento (panel-web y app-movil) van a cambiar visualmente con la mejora UX del punto 3, y Fase 5 móvil (punto 4) agrega pantallas nuevas — redactar el capítulo de interfaz después de ambas evita repetir capturas y texto ya escrito.
6. ⏳ Migración de Flask dev server a `gunicorn` en Docker de producción (warning en logs, no urgente).
7. ⏳ Rotar contraseña de Supabase (se expuso en captura en una sesión anterior — higiene de seguridad).
8. ⏳ Conseguir los 197 expedientes físicos del Lic. Villeda — bloqueante para dataset ML (Fase 6-8), despliegue en Modal (Fase 8.5), Capítulo V, y 4.6.2 Prueba de Aceptación.

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

**Despliegue del modelo ML en Modal (21 de julio de 2026, decisión):** el modelo ML (BETO baseline → RoBERTa-base-bne final) sí correrá en producción, no solo en Colab para la tesis. Se servirá como microservicio serverless en Modal.com. Modal ofrece Free tier con $30/mes de crédito de cómputo (requiere tarjeta para verificación de cuenta, no cobra bajo el crédito). Arquitectura: backend Flask en Render (Docker) → llamada HTTP a Modal para clasificar → respuesta al panel/móvil. Razones para elegir Modal sobre otras alternativas: (a) Render Free tier tiene solo 512 MB RAM, insuficiente para BETO/RoBERTa cargados en memoria; (b) Modal cobra por segundos de cómputo real, no por uptime, lo cual encaja bien con el volumen bajo de la oficina; (c) 4.6.1 Despliegue queda mejor documentado con esta arquitectura defendible; (d) el backend, panel y app siguen en Free tier con costo cero, y Modal se activa solo cuando llegue la Fase 8.5.

**Duplicados de documento tratados como AVISO** (201 con `documento.aviso`), NO como error, para preservar la posibilidad de asociar el mismo documento a varios expedientes (útil legalmente para copias de DPI, poderes, etc.). Marca visual en el UI queda pendiente como mejora futura.

---

## NOTAS IMPORTANTES
- El .env NUNCA se sube a GitHub — está en .gitignore
- Los archivos .bin del modelo ML NUNCA van a GitHub
- La carpeta backend/almacenamiento/ NUNCA se sube a GitHub — está en .gitignore (son archivos binarios de prueba)
- La carpeta backend/almacenamiento/exportaciones/ NUNCA se sube a GitHub — está en .gitignore
- Conexión BD usa Session Pooler (compatible con IPv4 de Render.com)
- Supabase se pausa tras 7 días sin actividad — reactivar manualmente con "Resume project"
- Identity del JWT se serializa como JSON string (compatibilidad flask-jwt-extended 4.7.4)
- Token JWT expira en 15 minutos — si una petición da "Token has expired", simplemente hacer login de nuevo. En la app móvil, el AuthContext ahora muestra un Alert automático y redirige a login sin necesidad de reiniciar
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