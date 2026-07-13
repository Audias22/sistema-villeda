# ESTADO DEL PROYECTO — Sistema Villeda
**Última actualización:** 11 de julio de 2026  
**Desarrollador:** Rudi Audias Guevara Mejicanos — Carné 1190-22-8232  

---

## STACK TECNOLÓGICO
| Capa | Tecnología | Estado |
|------|-----------|--------|
| Backend | Python 3.14.3 + Flask | ✅ Funcionando |
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
| App móvil | React Native (Expo) — APK Android | 🔄 Fases 1-3, 4A, 4B.1 y 4B.2 completadas (setup base + servicios/tema + login + 5 tabs + detalle de expediente + carga de documentos) |
| OCR | Tesseract 5.5.0 + OpenCV (filtrado HSV de sellos de color) | ✅ Funcionando — precisión mejorada |
| Modelo baseline | BETO | ⏳ No iniciado |
| Modelo final | RoBERTa-base-bne | ⏳ No iniciado |
| Autenticación | JWT + bcrypt | ✅ Funcionando |
| RBAC | 2 capas (BD + decoradores) | ✅ Funcionando |

---

## SERVICIOS EXTERNOS CONFIGURADOS
| Servicio | Estado | Notas |
|----------|--------|-------|
| Supabase | ✅ Activo | Proyecto: villeda-juridico, región us-east-2 |
| GitHub | ✅ Activo | Repo: Audias22/sistema-villeda (privado) |
| Cloudflare R2 | ✅ Activo | Bucket villeda-archivos |
| Render.com | ✅ Activo | Backend desplegado — https://sistema-villeda-backend.onrender.com |
| Vercel | ✅ Activo | Panel web desplegado — https://sistema-villeda-panel.vercel.app |

---

## DEPLOY EN PRODUCCIÓN
| Item | Estado | Notas |
|------|--------|-------|
| Backend en Render.com | ✅ Completado | https://sistema-villeda-backend.onrender.com |
| Frontend en Vercel | ✅ Completado | https://sistema-villeda-panel.vercel.app |
| Fix seguridad — debugger de Flask | ✅ Completado | `debug` ahora depende de `FLASK_ENV` (desactivado en producción, activo en local) |
| Fix codificación — requirements.txt | ✅ Completado | Convertido de UTF-16 a UTF-8 sin BOM, sin cambios de dependencias |
| Ping anti-pausa (Render free tier) | ✅ Activo | Hilo en background solo si `FLASK_ENV=production`, ping cada 14 min a /health |
| Prueba end-to-end en producción | ✅ Exitosa | Subida de documento + OCR + almacenamiento en R2 + descarga vía URL firmada, todo contra el backend desplegado |

---

## VARIABLES DE ENTORNO (.env) — backend/
| Variable | Estado |
|----------|--------|
| DATABASE_URL | ✅ Configurada (Session Pooler Supabase) |
| JWT_SECRET_KEY | ✅ Configurada |
| FLASK_ENV | ✅ Configurada (development) |
| PORT | ✅ Configurada (5000) |
| TESSERACT_CMD | ✅ Hardcodeado en services.py (C:\Program Files\Tesseract-OCR\tesseract.exe) |
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
| 2 documentos reales de prueba creados (id_documento: 1 y 2 — el 2 es duplicado detectado del 1) | ✅ |
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

│   │   └── services.py      ✅ procesar_archivo(), calcular_hash(), preprocesar_imagen() — filtrado de color HSV con OpenCV para eliminar sellos (rojo, azul, dorado) antes de Tesseract

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

│   │   ├── services.py      ✅ cargar_documento() integra OCR+pdfplumber+hash+almacenamiento local

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

├── .env                     ✅ Variables configuradas (parcial — faltan R2)

├── requirements.txt         ✅ Actualizado con marshmallow + pdfplumber (regenerado correctamente en backend/)

├── run.py                   ✅ Punto de entrada con /health y endpoint de prueba

└── Procfile                 ✅ Para Render.com

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

**Desplegado en Vercel, con variables de entorno de producción configuradas y prueba end-to-end contra el backend desplegado en Render.com exitosa.**

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
| Fase 4B.3 | Pantalla de Reportes (con exportar PDF) | ⏳ Pendiente — próxima sesión |
| Fase 5 | Funcionalidades nativas (cámara, notificaciones, biometría) | ⏳ Pendiente |

**Fase 1 — detalle:**
- Proyecto creado con `create-expo-app` (template blank), JavaScript puro (sin TypeScript), consistente con el panel web — SDK 54 (bajado desde SDK 57 por compatibilidad con la versión de Expo Go disponible en Play Store)
- Estructura `src/{assets,components,navigation,screens,services}` preservada (pre-creada, aún vacía — pantallas se agregan en fases siguientes)
- Navegación: `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`
- HTTP: `axios`
- Almacenamiento seguro: `expo-secure-store` (para el token JWT en fases siguientes)
- Fuentes: `expo-font` + `@expo-google-fonts/dm-serif-display` + `@expo-google-fonts/dm-sans`
- Variable de entorno `EXPO_PUBLIC_API_URL` apuntando a `https://sistema-villeda-backend.onrender.com/api/v1` (prefijo `EXPO_PUBLIC_` obligatorio en Expo para exponer variables al cliente)
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
- `src/navigation/AppNavigator.js` — ampliado a 5 tabs en orden Dashboard / Expedientes / Búsqueda / Reportes / Perfil; el tab Expedientes renderiza `ExpedientesStack`, el tab Reportes renderiza un placeholder temporal ("Reportes (Fase 4B.3)") dentro del propio archivo
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

**Fix — sincronización de sesión ante token expirado (12 de julio de 2026):** el interceptor de `src/services/api.js` limpiaba el storage físico (`clearAll()`) al detectar un 401 fuera de `/auth/login`, pero no tenía forma de actualizar el estado de React de `AuthContext.js` (`isAuthenticated` se calcula como `!!token`, en memoria). Resultado: `RootNavigator` seguía mostrando el stack autenticado hasta reiniciar la app manualmente. Se agregó `src/services/authEvents.js`, un pub/sub minimalista sin librerías nuevas (`onSessionExpired` / `emitSessionExpired`). `api.js` llama a `emitSessionExpired()` justo después de `clearAll()` dentro del bloque de 401. `AuthContext.js` se suscribe con `onSessionExpired()` en un `useEffect` propio (independiente del que carga la sesión guardada); el callback pone `user`/`token` en `null` y muestra `Alert.alert('Sesión expirada', 'Tu sesión expiró, inicia sesión de nuevo.')`, protegido con un `useRef` (`sessionExpiredShown`) para no duplicar el aviso si llegan varios 401 casi simultáneos — el ref se resetea a `false` en `signIn()` y en `signOut()`. Además, los `catch` que originaban el request (`DashboardScreen.js`, `BusquedaScreen.js`, `ExpedientesScreen.js`, los dos de `ExpedienteDetalleScreen.js`, y los tres de `CargarDocumentoScreen.js`) ahora chequean `if (err.code === 'SESSION_EXPIRED') { return }` como primera condición, para no mostrar su mensaje genérico ("revisa tu conexión") como parpadeo antes de que el `Alert` de `AuthContext` tome control — en `CargarDocumentoScreen.js` esto obligó a cambiar dos `.catch(() => ...)` a `.catch((err) => ...)` para poder leer el código de error.

**Bugs conocidos pendientes:**
- Al tocar un documento .png o .jpg desde `ExpedienteDetalleScreen`, el navegador del sistema no lo abre correctamente. Los .pdf sí funcionan. Probable causa: Content-Type incorrecto en R2 para imágenes, o comportamiento de `expo-web-browser` con imágenes vía Custom Tabs en Android. Detectado en producción con expedientes reales. Fase pendiente: diagnóstico y corrección (posiblemente en `backend/documentos_services.py` al determinar `content_type`, o en la app usando un Image viewer nativo en vez de `openBrowserAsync`).

---

## FASES DE DESARROLLO
| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Supabase — Base de datos | ✅ Completa |
| Fase 2 | GitHub + estructura carpetas | ✅ Completa |
| Fase 3 | Backend Flask esqueleto | ✅ Completa |
| Fase 4 | JWT + RBAC | ✅ Completa |
| Fase 5 | OCR Tesseract | ✅ Completa |
| Fase 5.5 | Backend completo (clientes, expedientes, documentos, busquedas, reportes) | ✅ Completa |
| Fase 6 | Dataset etiquetado | ⏳ Pendiente — esperando 197 expedientes físicos |
| Fase 7 | Fine-tuning BETO | ⏳ Pendiente |
| Fase 8 | Fine-tuning RoBERTa-base-bne | ⏳ Pendiente |
| Fase 9 | Panel web + App móvil | 🔄 Panel web (React) completo con 7 pantallas, desplegado en Vercel. App móvil: Fases 1-3, 4A, 4B.1 y 4B.2 (setup Expo + servicios/tema + login + 5 tabs + detalle de expediente + carga de documentos) completadas |
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

---

## FLUJO END-TO-END VALIDADO
**Confirmado funcionando completo:** Cliente → Expediente → Documento (carga con OCR/pdfplumber automático) → Texto extraído y almacenado → Detección de duplicados por hash → Búsqueda (5 criterios) con medición real de TBR → Métricas agregadas → Dashboard consolidado → Exportación Excel descargable.

Prueba real ejecutada: documento jurídico guatemalteco (PNG) cargado al expediente NOT-2026-0001, texto extraído correctamente con Tesseract, segunda carga del mismo archivo detectada como duplicado exacto del documento ID 1, búsqueda por número de expediente y por contenido (con y sin tildes) funcionando, 4 búsquedas registradas con TBR real entre 93-117 ms, dashboard mostrando todos los totales y distribuciones correctamente, archivo Excel descargado con formato profesional (encabezados con color, filtros automáticos, panel congelado).

**Prueba end-to-end en producción (11 de julio de 2026):** el mismo flujo (subida de documento + OCR + almacenamiento en Cloudflare R2 + descarga vía URL firmada) se repitió contra el backend ya desplegado en Render.com y el panel web desplegado en Vercel, con resultado exitoso.

---

## PENDIENTES INMEDIATOS
1. ⏳ App móvil React Native (APK Android) — Fases 1-3, 4A, 4B.1 y 4B.2 (setup Expo + servicios/tema + login + 5 tabs + detalle de expediente + carga de documentos) completadas, faltan Fase 4B.3 (Reportes) y Fase 5 (funcionalidades nativas)
2. ⏳ Migración a gunicorn en Render (actualmente warning de development server de Flask — no urgente, no bloquea uso)
3. ⏳ Conseguir los 197 expedientes físicos del Lic. Villeda — bloqueante para el dataset de ML (Fase 6-8) y el Capítulo V

**Completado:** deploy de backend (Render.com) y frontend (Vercel), fix de seguridad del debugger de Flask, fix de codificación de requirements.txt, ping anti-pausa activo, y prueba end-to-end en producción (subida + OCR + almacenamiento R2 + descarga vía URL firmada) exitosa. Además, el nombre de archivo en la tabla "Documentos" de ExpedienteDetalle.jsx ya es un link que llama a GET /api/v1/documentos/\<id\>/descarga y abre la URL firmada de R2 en pestaña nueva.

---

## DECISIÓN IMPORTANTE TOMADA
**No existe dataset público de expedientes jurídicos guatemaltecos** descargable y anonimizado (se investigó SICEJ, jurisprudencia.oj.gob.gt, CC Guatemala, y datasets legales internacionales — ninguno aplica). Se decidió:
- Esperar a conseguir los 197 expedientes reales (esta semana)
- Mientras tanto, avanzar el backend completo (expedientes, documentos, búsquedas, reportes) que no depende del dataset
- Panel web y app móvil se construyen DESPUÉS de tener el backend completo, no antes — para evitar pantallas sin datos reales

**Diferenciación PDF digital vs escaneado:** se decidió detectar automáticamente con pdfplumber si un PDF tiene texto extraíble (id_formato=2, sin OCR) o es escaneado (id_formato=1, requiere OCR con Tesseract), en lugar de asumir siempre un solo tipo. Esto preserva la precisión de las métricas de OCR para el Capítulo V.

**Medición de TBR:** se usa `time.perf_counter()` (no `time.time()`) porque está diseñado específicamente para medir duraciones cortas con mayor precisión y no se ve afectado por ajustes del reloj del sistema. El tiempo se mide únicamente alrededor de la consulta a la base de datos, sin incluir validación de esquema ni serialización de la respuesta — esto asegura que el TBR reflejado en el Capítulo V sea el tiempo real de búsqueda y recuperación, no el tiempo total de la petición HTTP.

**Búsqueda insensible a acentos:** se detectó que ILIKE de PostgreSQL no ignora tildes ("jurídico" ≠ "juridico"), lo cual afectaría la usabilidad real en la oficina. Se resolvió con la extensión `unaccent` de PostgreSQL aplicada en los criterios de búsqueda por nombre de cliente y por contenido OCR.

**Reporte Excel priorizado sobre PDF:** se decidió construir primero el listado de expedientes en Excel (más útil para uso diario del Lic. Villeda y demuestra integración de 4 tablas) y dejar la exportación PDF individual para después, ya que tiene menor prioridad para el Capítulo V que el panel web.

---

## NOTAS IMPORTANTES
- El .env NUNCA se sube a GitHub — está en .gitignore
- Los archivos .bin del modelo ML NUNCA van a GitHub
- La carpeta backend/almacenamiento/ NUNCA se sube a GitHub — está en .gitignore (son archivos binarios de prueba)
- La carpeta backend/almacenamiento/exportaciones/ NUNCA se sube a GitHub — está en .gitignore
- Conexión BD usa Session Pooler (compatible con IPv4 de Render.com)
- Supabase se pausa tras 7 días sin actividad — reactivar manualmente con "Resume project"
- Identity del JWT se serializa como JSON string (compatibilidad flask-jwt-extended 4.7.4)
- Token JWT expira en 15 minutos — si una petición da "Token has expired", simplemente hacer login de nuevo
- Tesseract instalado en C:\Program Files\Tesseract-OCR\ con idioma spa
- Poppler instalado en C:\poppler\bin
- OCR probado con imagen PNG de texto jurídico guatemalteco — resultado exitoso
- SIEMPRE verificar que el venv esté activo antes de pip install o pip freeze (confirmar con: python -c "import sys; print(sys.executable)")
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
- preprocesar_imagen() en ocr/services.py convierte a espacio HSV y elimina sellos rojos, azules y dorados (reemplazándolos con blanco) antes de pasar la imagen a Tesseract — mejora la precisión del OCR en documentos escaneados con sellos oficiales
- Almacenamiento migrado a Cloudflare R2: `cargar_documento()` en documentos/services.py ahora sube cada archivo con `subir_archivo()` (app/services/r2_service.py) y guarda el nombre_key resultante en la columna `ruta_almacenamiento` (se reutilizó la columna existente, no se renombró, para evitar migración de esquema en Supabase)
- `guardar_archivo_local()` se dejó comentada (no borrada) en documentos/services.py como respaldo por si algo falla con R2
- Para servir el archivo original al frontend se agregó GET /api/v1/documentos/\<id\>/descarga, que devuelve una URL firmada de R2 (expira en 1 hora) en vez de leer el archivo desde disco
- Probado end-to-end: subida real a R2, generación de URL firmada, descarga del contenido vía esa URL, y eliminación del objeto de prueba — las credenciales del .env funcionan correctamente