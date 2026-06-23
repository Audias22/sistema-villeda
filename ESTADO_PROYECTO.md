# ESTADO DEL PROYECTO — Sistema Villeda
**Última actualización:** 22 de junio de 2026  
**Desarrollador:** Rudi Audias Guevara Mejicanos — Carné 1190-22-8232  

---

## STACK TECNOLÓGICO
| Capa | Tecnología | Estado |
|------|-----------|--------|
| Backend | Python 3.14.3 + Flask | ✅ Funcionando |
| Base de datos | PostgreSQL — Supabase | ✅ Funcionando |
| Almacenamiento archivos | Local temporal (backend/almacenamiento/) | ✅ Funcionando — se migrará a Cloudflare R2 |
| Almacenamiento archivos (definitivo) | Cloudflare R2 | ⏳ Pendiente (problema tarjeta) |
| ORM | SQLAlchemy | ✅ Funcionando |
| Validación de entradas | Marshmallow | ✅ Instalado y en uso |
| Extracción PDF digital | pdfplumber | ✅ Funcionando |
| Búsqueda insensible a acentos | PostgreSQL unaccent | ✅ Funcionando |
| Panel web | React 18 — Vercel | ⏳ No iniciado |
| App móvil | React Native — APK Android | ⏳ No iniciado |
| OCR | Tesseract 5.5.0 | ✅ Funcionando |
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
| Cloudflare R2 | ⏳ Pendiente | Problema con tarjeta de débito |
| Render.com | ⏳ Pendiente | Se configura al final |
| Vercel | ⏳ Pendiente | Se configura con panel web |

---

## VARIABLES DE ENTORNO (.env) — backend/
| Variable | Estado |
|----------|--------|
| DATABASE_URL | ✅ Configurada (Session Pooler Supabase) |
| JWT_SECRET_KEY | ✅ Configurada |
| FLASK_ENV | ✅ Configurada (development) |
| PORT | ✅ Configurada (5000) |
| TESSERACT_CMD | ✅ Hardcodeado en services.py (C:\Program Files\Tesseract-OCR\tesseract.exe) |
| R2_ACCOUNT_ID | ⏳ Pendiente |
| R2_ACCESS_KEY_ID | ⏳ Pendiente |
| R2_SECRET_ACCESS_KEY | ⏳ Pendiente |
| R2_BUCKET_NAME | ⏳ Pendiente |

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

---

## ESTRUCTURA DE ARCHIVOS — backend/
backend/

├── app/

│   ├── init.py          ✅ Factory function con blueprints (auth, ocr, clientes, expedientes, documentos, busquedas)

│   ├── config.py            ✅ Variables de entorno

│   ├── auth/

│   │   ├── init.py      ✅ Exporta auth_bp

│   │   ├── routes.py        ✅ POST /api/v1/auth/login, POST /api/v1/auth/logout

│   │   └── services.py      ✅ autenticar_usuario()

│   ├── usuarios/

│   │   ├── init.py      ✅ Exporta Usuario

│   │   └── models.py        ✅ Modelo Usuario (SQLAlchemy)

│   ├── common/

│   │   ├── init.py      ✅ Exporta 11 modelos catálogo + require_permission

│   │   ├── models.py        ✅ Rol, Permiso, RolPermiso, AreaJuridica, EstadoExpediente, Prioridad, TipoExpediente, FormatoDocumento, EstadoFisicoDoc, EstadoCarga, CargaMasiva

│   │   └── decorators.py    ✅ @require_permission con json.loads

│   ├── ocr/

│   │   ├── init.py      ✅ Exporta ocr_bp

│   │   ├── routes.py        ✅ POST /api/v1/ocr/procesar

│   │   └── services.py      ✅ procesar_archivo(), calcular_hash()

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

│   ├── ml/                  ⏳ Vacío

│   ├── reportes/            ⏳ Vacío

│   └── auditoria/           ⏳ Vacío

├── almacenamiento/          ✅ Carpeta de archivos subidos (NO se sube a GitHub — en .gitignore)

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
| POST | /api/v1/busquedas | ✅ Funcionando (mide y registra TBR real) | Sí — buscar_expediente |
| GET | /api/v1/busquedas/historial | ✅ Funcionando (paginado + filtros usuario/criterio) | Sí — buscar_expediente |
| GET | /api/v1/busquedas/metricas | ✅ Funcionando (promedio/min/max TBR) | Sí — ver_dashboard |

---

## FASES DE DESARROLLO
| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Supabase — Base de datos | ✅ Completa |
| Fase 2 | GitHub + estructura carpetas | ✅ Completa |
| Fase 3 | Backend Flask esqueleto | ✅ Completa |
| Fase 4 | JWT + RBAC | ✅ Completa |
| Fase 5 | OCR Tesseract | ✅ Completa |
| Fase 5.5 | Backend completo (clientes, expedientes, documentos, busquedas) | ✅ Completa |
| Fase 6 | Dataset etiquetado | ⏳ Pendiente — esperando 197 expedientes físicos |
| Fase 7 | Fine-tuning BETO | ⏳ Pendiente |
| Fase 8 | Fine-tuning RoBERTa-base-bne | ⏳ Pendiente |
| Fase 9 | Panel web + App móvil | ⏳ Próximo paso — backend core completo y probado end-to-end |
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
**Confirmado funcionando completo:** Cliente → Expediente → Documento (carga con OCR/pdfplumber automático) → Texto extraído y almacenado → Detección de duplicados por hash → Búsqueda (5 criterios) con medición real de TBR → Métricas agregadas.

Prueba real ejecutada: documento jurídico guatemalteco (PNG) cargado al expediente NOT-2026-0001, texto extraído correctamente con Tesseract, segunda carga del mismo archivo detectada como duplicado exacto del documento ID 1, búsqueda por número de expediente y por contenido (con y sin tildes) funcionando, 4 búsquedas registradas con TBR real entre 93-117 ms.

---

## PENDIENTES INMEDIATOS
1. ⏳ Cloudflare R2 — resolver problema de tarjeta y migrar `guardar_archivo_local()` a subida real a R2
2. ⏳ Mover ruta Tesseract del código al .env para producción en Render
3. ⏳ Validar con el Lic. Villeda los 13 tipos de expediente provisionales (ajustar tabla `tipos_expediente` según su práctica real)
4. ⏳ Conseguir los 197 expedientes físicos del Lic. Villeda (esta semana, según lo conversado)
5. ⏳ Construir módulo `reportes/` (dashboard, exportar Excel/PDF)
6. ⏳ Decidir si se arranca el panel web (React) ahora o se completa primero `reportes/`

---

## DECISIÓN IMPORTANTE TOMADA
**No existe dataset público de expedientes jurídicos guatemaltecos** descargable y anonimizado (se investigó SICEJ, jurisprudencia.oj.gob.gt, CC Guatemala, y datasets legales internacionales — ninguno aplica). Se decidió:
- Esperar a conseguir los 197 expedientes reales (esta semana)
- Mientras tanto, avanzar el backend completo (expedientes, documentos, búsquedas, reportes) que no depende del dataset
- Panel web y app móvil se construyen DESPUÉS de tener el backend completo, no antes — para evitar pantallas sin datos reales

**Diferenciación PDF digital vs escaneado:** se decidió detectar automáticamente con pdfplumber si un PDF tiene texto extraíble (id_formato=2, sin OCR) o es escaneado (id_formato=1, requiere OCR con Tesseract), en lugar de asumir siempre un solo tipo. Esto preserva la precisión de las métricas de OCR para el Capítulo V.

**Medición de TBR:** se usa `time.perf_counter()` (no `time.time()`) porque está diseñado específicamente para medir duraciones cortas con mayor precisión y no se ve afectado por ajustes del reloj del sistema. El tiempo se mide únicamente alrededor de la consulta a la base de datos, sin incluir validación de esquema ni serialización de la respuesta — esto asegura que el TBR reflejado en el Capítulo V sea el tiempo real de búsqueda y recuperación, no el tiempo total de la petición HTTP.

**Búsqueda insensible a acentos:** se detectó que ILIKE de PostgreSQL no ignora tildes ("jurídico" ≠ "juridico"), lo cual afectaría la usabilidad real en la oficina. Se resolvió con la extensión `unaccent` de PostgreSQL aplicada en los criterios de búsqueda por nombre de cliente y por contenido OCR.

---

## NOTAS IMPORTANTES
- El .env NUNCA se sube a GitHub — está en .gitignore
- Los archivos .bin del modelo ML NUNCA van a GitHub
- La carpeta backend/almacenamiento/ NUNCA se sube a GitHub — está en .gitignore (son archivos binarios de prueba)
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