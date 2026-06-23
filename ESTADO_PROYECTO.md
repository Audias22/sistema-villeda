# ESTADO DEL PROYECTO — Sistema Villeda
**Última actualización:** 22 de junio de 2026  
**Desarrollador:** Rudi Audias Guevara Mejicanos — Carné 1190-22-8232  

---

## STACK TECNOLÓGICO
| Capa | Tecnología | Estado |
|------|-----------|--------|
| Backend | Python 3.14.3 + Flask | ✅ Funcionando |
| Base de datos | PostgreSQL — Supabase | ✅ Funcionando |
| Almacenamiento archivos | Cloudflare R2 | ⏳ Pendiente (problema tarjeta) |
| ORM | SQLAlchemy | ✅ Funcionando |
| Validación de entradas | Marshmallow | ✅ Instalado y en uso |
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
| Índice GIN texto_completo | ✅ |
| Usuario ovilleda creado | ✅ |
| Permisos asignados a los 5 roles | ✅ |
| Esquema de `clientes` verificado (14 columnas) | ✅ |
| Esquema de `expedientes` verificado (18 columnas) | ✅ |
| `estados_fisico_doc` ajustada a 3 niveles (Deteriorado=1, Regular=2, Bueno=3) según marco metodológico (variable EFD) | ✅ |
| `tipos_expediente` poblada con 13 tipos base (4 Notarial, 4 Civil, 3 Laboral, 3 Penal) — **PENDIENTE validar con Lic. Villeda** | ⚠️ Provisional |
| 1 cliente real de prueba creado (id_cliente: 1) | ✅ |
| 1 expediente real de prueba creado (id_expediente: 1, numero: NOT-2026-0001) | ✅ |

---

## ESTRUCTURA DE ARCHIVOS — backend/
backend/

├── app/

│   ├── init.py          ✅ Factory function con blueprints (auth, ocr, clientes, expedientes)

│   ├── config.py            ✅ Variables de entorno

│   ├── auth/

│   │   ├── init.py      ✅ Exporta auth_bp

│   │   ├── routes.py        ✅ POST /api/v1/auth/login, POST /api/v1/auth/logout

│   │   └── services.py      ✅ autenticar_usuario()

│   ├── usuarios/

│   │   ├── init.py      ✅ Exporta Usuario

│   │   └── models.py        ✅ Modelo Usuario (SQLAlchemy)

│   ├── common/

│   │   ├── init.py      ✅ Exporta Rol, Permiso, RolPermiso, AreaJuridica, EstadoExpediente, Prioridad, TipoExpediente, require_permission

│   │   ├── models.py        ✅ 7 modelos catálogo (Rol, Permiso, RolPermiso, AreaJuridica, EstadoExpediente, Prioridad, TipoExpediente)

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

│   ├── documentos/          ⏳ Vacío (siguiente módulo — integra OCR + expedientes + clientes)

│   ├── ml/                  ⏳ Vacío

│   ├── busquedas/           ⏳ Vacío

│   ├── reportes/            ⏳ Vacío

│   └── auditoria/           ⏳ Vacío

├── venv/                    ✅ Entorno virtual activo

├── .env                     ✅ Variables configuradas (parcial — faltan R2)

├── requirements.txt         ✅ Actualizado con marshmallow (regenerado correctamente en backend/)

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

---

## FASES DE DESARROLLO
| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Supabase — Base de datos | ✅ Completa |
| Fase 2 | GitHub + estructura carpetas | ✅ Completa |
| Fase 3 | Backend Flask esqueleto | ✅ Completa |
| Fase 4 | JWT + RBAC | ✅ Completa |
| Fase 5 | OCR Tesseract | ✅ Completa |
| Fase 5.5 | Backend completo (clientes, expedientes, documentos) | 🔄 En progreso — clientes ✅, expedientes ✅, documentos pendiente |
| Fase 6 | Dataset etiquetado | ⏳ Pendiente — esperando 197 expedientes físicos |
| Fase 7 | Fine-tuning BETO | ⏳ Pendiente |
| Fase 8 | Fine-tuning RoBERTa-base-bne | ⏳ Pendiente |
| Fase 9 | Panel web + App móvil | ⏳ Pendiente — bloqueada hasta backend completo |
| Fase 10 | Pruebas + medición TBR | ⏳ Pendiente |

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

---

## PENDIENTES INMEDIATOS
1. ⏳ Cloudflare R2 — resolver problema de tarjeta y configurar bucket
2. ⏳ Mover ruta Tesseract del código al .env para producción en Render
3. ⏳ Construir módulo `documentos/` (siguiente paso inmediato — integra OCR + expedientes + clientes)
4. ⏳ Validar con el Lic. Villeda los 13 tipos de expediente provisionales (ajustar tabla `tipos_expediente` según su práctica real)
5. ⏳ Conseguir los 197 expedientes físicos del Lic. Villeda (esta semana, según lo conversado)

---

## DECISIÓN IMPORTANTE TOMADA
**No existe dataset público de expedientes jurídicos guatemaltecos** descargable y anonimizado (se investigó SICEJ, jurisprudencia.oj.gob.gt, CC Guatemala, y datasets legales internacionales — ninguno aplica). Se decidió:
- Esperar a conseguir los 197 expedientes reales (esta semana)
- Mientras tanto, avanzar el backend completo (expedientes, documentos, búsquedas, reportes) que no depende del dataset
- Panel web y app móvil se construyen DESPUÉS de tener el backend completo, no antes — para evitar pantallas sin datos reales

---

## NOTAS IMPORTANTES
- El .env NUNCA se sube a GitHub — está en .gitignore
- Los archivos .bin del modelo ML NUNCA van a GitHub
- Conexión BD usa Session Pooler (compatible con IPv4 de Render.com)
- Supabase se pausa tras 7 días sin actividad — reactivar manualmente con "Resume project"
- Identity del JWT se serializa como JSON string (compatibilidad flask-jwt-extended 4.7.4)
- Tesseract instalado en C:\Program Files\Tesseract-OCR\ con idioma spa
- Poppler instalado en C:\poppler\bin
- OCR probado con imagen PNG de texto jurídico guatemalteco — resultado exitoso
- SIEMPRE verificar que el venv esté activo antes de pip install o pip freeze (confirmar con: python -c "import sys; print(sys.executable)")
- tipo_persona en clientes: 1 = Natural (requiere primer_nombre + primer_apellido), 2 = Jurídica (requiere razon_social)
- numero_expediente se genera automático con formato [PREFIJO-AREA]-[AÑO]-[SECUENCIA] (ej: NOT-2026-0001). Prefijos: NOT=Notarial, CIV=Civil, LAB=Laboral, PEN=Penal
- Transiciones de estado de expediente: Activo(1)↔EnRevisión(2)↔Pendiente(3)→Cerrado(4)→Archivado(5). Cerrado y Archivado son finales (no editables salvo Cerrado→Archivado)
- Todos los modelos SQLAlchemy referenciados por Foreign Key deben existir como clase Python, aunque la tabla ya exista en Supabase — error típico: NoReferencedTableError