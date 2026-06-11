# ESTADO DEL PROYECTO — Sistema Villeda
**Última actualización:** 11 de junio de 2026  
**Desarrollador:** Rudi Audias Guevara Mejicanos — Carné 1190-22-8232  

---

## STACK TECNOLÓGICO
| Capa | Tecnología | Estado |
|------|-----------|--------|
| Backend | Python 3.14.3 + Flask | ✅ Funcionando |
| Base de datos | PostgreSQL — Supabase | ✅ Funcionando |
| Almacenamiento archivos | Cloudflare R2 | ⏳ Pendiente (problema tarjeta) |
| ORM | SQLAlchemy | ✅ Instalado |
| Panel web | React 18 — Vercel | ⏳ No iniciado |
| App móvil | React Native — APK Android | ⏳ No iniciado |
| OCR | Tesseract 5.x | ⏳ No iniciado |
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

---

## ESTRUCTURA DE ARCHIVOS — backend/
backend/
├── app/
│   ├── init.py          ✅ Factory function con blueprints
│   ├── config.py            ✅ Variables de entorno
│   ├── auth/
│   │   ├── init.py      ✅ Exporta auth_bp
│   │   ├── routes.py        ✅ POST /api/v1/auth/login, POST /api/v1/auth/logout
│   │   └── services.py      ✅ autenticar_usuario()
│   ├── usuarios/
│   │   ├── init.py      ✅ Exporta Usuario
│   │   └── models.py        ✅ Modelo Usuario (SQLAlchemy)
│   ├── common/
│   │   ├── init.py      ✅ Exporta Rol, Permiso, RolPermiso, require_permission
│   │   ├── models.py        ✅ Modelos Rol, Permiso, RolPermiso
│   │   └── decorators.py    ✅ @require_permission con json.loads
│   ├── clientes/            ⏳ Vacío
│   ├── expedientes/         ⏳ Vacío
│   ├── documentos/          ⏳ Vacío
│   ├── ocr/                 ⏳ Vacío
│   ├── ml/                  ⏳ Vacío
│   ├── busquedas/           ⏳ Vacío
│   ├── reportes/            ⏳ Vacío
│   └── auditoria/           ⏳ Vacío
├── venv/                    ✅ Entorno virtual activo
├── .env                     ✅ Variables configuradas (parcial — faltan R2)
├── requirements.txt         ✅ Dependencias guardadas
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

---

## FASES DE DESARROLLO
| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Supabase — Base de datos | ✅ Completa |
| Fase 2 | GitHub + estructura carpetas | ✅ Completa |
| Fase 3 | Backend Flask esqueleto | ✅ Completa |
| Fase 4 | JWT + RBAC | ✅ Completa |
| Fase 5 | OCR Tesseract | ⏳ Pendiente |
| Fase 6 | Dataset etiquetado | ⏳ Pendiente |
| Fase 7 | Fine-tuning BETO | ⏳ Pendiente |
| Fase 8 | Fine-tuning RoBERTa-base-bne | ⏳ Pendiente |
| Fase 9 | Panel web + App móvil | ⏳ Pendiente |
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

---

## PENDIENTES INMEDIATOS
1. ⏳ Cloudflare R2 — resolver problema de tarjeta y configurar bucket
2. ⏳ Instalar Tesseract 5.x en Windows con idioma español (spa)
3. ⏳ Crear servicio OCR en backend/app/ocr/

---

## NOTAS IMPORTANTES
- El .env NUNCA se sube a GitHub — está en .gitignore
- Los archivos .bin del modelo ML NUNCA van a GitHub
- Conexión BD usa Session Pooler (compatible con IPv4 de Render.com)
- Supabase se pausa tras 7 días sin actividad — Render hará ping cada 3 días
- Identity del JWT se serializa como JSON string (compatibilidad flask-jwt-extended 4.7.4)
