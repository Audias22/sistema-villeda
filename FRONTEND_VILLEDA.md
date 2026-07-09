# SISTEMA VILLEDA — FRONTEND REACT

## INSTRUCCIÓN PRINCIPAL

Construir el panel web del Sistema Villeda usando React 18. Antes de crear cualquier componente, conectarse a la base de datos usando la variable DATABASE_URL del archivo backend/.env y verificar las tablas, columnas y relaciones reales. No asumir estructuras — confirmar contra Supabase.

Consultas útiles para verificar:
```sql
-- Ver todas las tablas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Ver columnas de una tabla específica
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'NOMBRE_TABLA' ORDER BY ordinal_position;

-- Ver roles y permisos
SELECT r.nombre_rol, p.nombre_permiso FROM roles r JOIN roles_permisos rp ON r.id_rol = rp.id_rol JOIN permisos p ON p.id_permiso = rp.id_permiso ORDER BY r.id_rol;

-- Ver áreas jurídicas
SELECT * FROM areas_juridicas;

-- Ver estados de expediente
SELECT * FROM estados_expediente;

-- Ver tipos de expediente
SELECT * FROM tipos_expediente;
```

---

## STACK FRONTEND

- React 18 (create-react-app o Vite)
- React Router DOM para navegación
- Axios para llamadas API
- Recharts para gráficas del dashboard
- React Hot Toast para notificaciones
- Framer Motion para animaciones y transiciones
- Lucide React para iconos
- Ubicación: carpeta `panel-web/` en la raíz del repositorio (al mismo nivel que `backend/`)

---

## DISEÑO VISUAL — IDENTIDAD "DESPACHO JURÍDICO"

### Paleta de colores

```css
:root {
  /* Primarios */
  --azul-notarial: #1B2A4A;
  --azul-medio: #2A3F6E;
  --azul-claro: #3B5998;

  /* Acento */
  --dorado: #D4A853;
  --dorado-hover: #C49A48;
  --dorado-suave: rgba(212, 168, 83, 0.15);

  /* Fondos */
  --fondo-pagina: #F7F5F2;
  --fondo-tarjeta: #FFFFFF;
  --fondo-sidebar: #1B2A4A;

  /* Texto */
  --texto-primario: #1B2A4A;
  --texto-secundario: #5A6578;
  --texto-muted: #8A8580;
  --texto-sidebar: rgba(255, 255, 255, 0.5);
  --texto-sidebar-activo: #D4A853;

  /* Bordes */
  --borde-suave: #E8E4DF;
  --borde-medio: #D5D0CA;

  /* Estados */
  --exito: #3B6D11;
  --exito-fondo: #E8F0E4;
  --peligro: #A32D2D;
  --peligro-fondo: #FCEBEB;
  --advertencia: #854F0B;
  --advertencia-fondo: #FAEEDA;
  --info: #185FA5;
  --info-fondo: #E6F1FB;

  /* Áreas jurídicas */
  --notarial: #3B6D11;
  --notarial-fondo: #E8F0E4;
  --civil: #185FA5;
  --civil-fondo: #E6F1FB;
  --laboral: #854F0B;
  --laboral-fondo: #FAEEDA;
  --penal: #A32D2D;
  --penal-fondo: #FCEBEB;

  /* Sombras */
  --sombra-tarjeta: 0 1px 3px rgba(27, 42, 74, 0.06);
  --sombra-elevada: 0 4px 12px rgba(27, 42, 74, 0.1);

  /* Radios */
  --radio-sm: 6px;
  --radio-md: 8px;
  --radio-lg: 12px;

  /* Transiciones */
  --transicion: all 0.2s ease;
}
```

### Tipografía

```css
/* Importar desde Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

/* Títulos y encabezados */
font-family: 'DM Serif Display', serif;

/* Cuerpo, labels, botones, datos */
font-family: 'DM Sans', sans-serif;
```

Tamaños:
- h1 (título de página): 24px, DM Serif Display
- h2 (subtítulos): 18px, DM Serif Display
- h3 (títulos de tarjeta): 16px, DM Sans, weight 600
- Cuerpo: 14px, DM Sans, weight 400
- Labels/captions: 12px, DM Sans, color texto-muted
- Números grandes (métricas): 28px, DM Sans, weight 600

### Componentes visuales

**Sidebar:**
- Fondo: azul-notarial (#1B2A4A)
- Ancho: 260px fijo
- Logo "Villeda" en DM Serif Display, color dorado
- Ícono de sello circular dorado con "V"
- Items de navegación: texto blanco 50% opacidad, al hacer hover sube a 80%
- Item activo: fondo dorado-suave, texto dorado, borde izquierdo dorado 3px
- Nombre del usuario en la parte inferior del sidebar
- Botón de cerrar sesión discreto

**Tarjetas de métricas:**
- Fondo blanco, borde suave, radio 12px, sombra-tarjeta
- Número grande arriba (28px, weight 600, color azul-notarial)
- Label debajo (12px, color texto-muted)
- Ícono decorativo en la esquina superior derecha (color dorado, opacidad 0.3)
- Hover: sombra-elevada con transición suave

**Tablas:**
- Fondo blanco, radio 12px
- Header: fondo #FAFAF8, texto uppercase 11px, color texto-muted, letter-spacing 0.5px
- Filas: borde inferior borde-suave, hover fondo #FAFAF8
- Badges para áreas jurídicas con los colores definidos arriba

**Botones:**
- Primario: fondo azul-notarial, texto blanco, hover azul-medio
- Secundario: fondo transparente, borde azul-notarial, texto azul-notarial
- Acento: fondo dorado, texto azul-notarial, hover dorado-hover
- Todos con radio-md, padding 10px 20px, transición 0.2s
- Efecto al hacer click: scale(0.98)

**Inputs:**
- Fondo #FAFAF8, borde borde-suave, radio-md
- Focus: borde dorado, sombra 0 0 0 3px dorado-suave
- Label arriba del input (12px, peso 500, color texto-secundario)
- Placeholder: color texto-muted

**Badges de área jurídica:**
- Notarial: fondo notarial-fondo, texto notarial
- Civil: fondo civil-fondo, texto civil
- Laboral: fondo laboral-fondo, texto laboral
- Penal: fondo penal-fondo, texto penal
- Padding: 4px 10px, radio 6px, font-size 12px, weight 500

### Animaciones y transiciones

- Usar Framer Motion para:
  - Transición entre páginas (fade + slide suave de 0.3s)
  - Aparición de tarjetas de métricas (stagger de 0.1s entre cada una)
  - Skeleton loading mientras cargan datos (pulso suave en gris)
  - Filas de tabla que aparecen con fade-in escalonado
  - Sidebar items con hover smooth
  - Modales que entran con scale desde 0.95 a 1 + fade
  - Toast notifications que entran desde arriba

---

## ESTRUCTURA DE CARPETAS

```
panel-web/
├── public/
│   └── index.html
├── src/
│   ├── assets/
│   │   └── logo.svg
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopBar.jsx
│   │   │   └── MainLayout.jsx
│   │   ├── common/
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   └── EmptyState.jsx
│   │   └── charts/
│   │       ├── AreaChart.jsx
│   │       └── PieChart.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Expedientes.jsx
│   │   ├── ExpedienteDetalle.jsx
│   │   ├── CargarDocumento.jsx
│   │   ├── Busqueda.jsx
│   │   ├── Usuarios.jsx
│   │   └── Reportes.jsx
│   ├── services/
│   │   └── api.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useFetch.js
│   ├── styles/
│   │   └── globals.css
│   ├── utils/
│   │   └── formatters.js
│   ├── App.jsx
│   └── main.jsx
├── .env
├── package.json
└── vite.config.js
```

---

## AUTENTICACIÓN

### Flujo JWT

1. Login: POST /api/v1/auth/login con { usuario, password }
2. Respuesta exitosa devuelve: { token, usuario: { id, nombre, rol, permisos } }
3. Guardar token en localStorage
4. Todas las peticiones incluyen header: Authorization: Bearer <token>
5. Si cualquier petición devuelve 401, redirigir a /login y limpiar localStorage
6. Token expira en 15 minutos — manejar renovación o re-login

### Interceptor Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Protección de rutas

Crear componente ProtectedRoute que verifique si hay token en localStorage. Si no hay, redirige a /login. Si hay, renderiza el children envuelto en MainLayout (sidebar + topbar).

---

## PANTALLAS (7 TOTAL)

### 1. LOGIN (/login)

- Pantalla completa, sin sidebar
- Fondo: gradiente azul-notarial a azul-medio
- Tarjeta centrada (400px max-width) con:
  - Sello circular dorado con "V" (60px)
  - Título "Oficina Villeda" en DM Serif Display
  - Subtítulo "Sistema de gestión de expedientes"
  - Input usuario
  - Input contraseña (con toggle mostrar/ocultar)
  - Botón "Iniciar sesión" (dorado, full width)
  - Mensaje de error si falla (toast rojo)
- Endpoint: POST /api/v1/auth/login
- Body: { usuario: string, password: string }

### 2. DASHBOARD (/dashboard)

- Saludo personalizado: "Buenos días, {nombre}" (DM Serif Display)
- Fecha actual debajo del saludo
- 4 tarjetas de métricas en fila:
  - Total expedientes
  - Expedientes activos
  - Documentos cargados
  - TBR promedio (ms)
- Gráfica de distribución por área jurídica (PieChart con Recharts, colores de las áreas)
- Gráfica de expedientes por mes (AreaChart)
- Tabla "Últimos expedientes" (5 registros más recientes)
- Endpoint: GET /api/v1/reportes/dashboard
- Endpoint: GET /api/v1/expedientes?limite=5&orden=reciente

### 3. EXPEDIENTES (/expedientes)

- Título "Expedientes"
- Barra de filtros:
  - Dropdown área jurídica (cargar de la BD: GET áreas)
  - Dropdown estado (cargar de la BD: GET estados)
  - Botón "Nuevo expediente" (dorado)
- Tabla con columnas:
  - Número expediente (ej: NOT-2026-0001)
  - Cliente (nombre completo)
  - Área (badge con color)
  - Estado (badge)
  - Fecha creación
  - Acciones (ver detalle, editar)
- Paginación abajo (10 por página)
- Endpoint: GET /api/v1/expedientes?pagina=1&limite=10&area=&estado=
- Click en fila → navegar a /expedientes/:id

**Detalle de expediente (/expedientes/:id):**
- Información completa del expediente
- Lista de documentos asociados
- Botón para cargar nuevo documento
- Botón para cambiar estado (con transiciones válidas)
- Endpoint: GET /api/v1/expedientes/:id
- Endpoint: GET /api/v1/expedientes/:id/documentos

**Modal nuevo expediente:**
- Campos: descripción, cliente (dropdown búsqueda), área jurídica, tipo expediente, prioridad
- El número de expediente se genera automático en el backend
- Endpoint: POST /api/v1/expedientes

### 4. CARGA DE DOCUMENTOS (/cargar)

- Título "Cargar documento"
- Dropdown para seleccionar expediente existente
- Zona de drag & drop para archivos (PDF, JPG, PNG)
- Preview del archivo seleccionado
- Botón "Cargar y procesar"
- Al cargar:
  - Mostrar barra de progreso
  - El backend procesa OCR automáticamente
  - Mostrar resultado: texto extraído, número de páginas, tiempo de procesamiento
  - Si detecta duplicado (hash), mostrar advertencia
- Endpoint: POST /api/v1/documentos (multipart/form-data)
  - Campos: archivo (file), id_expediente, descripcion

### 5. BÚSQUEDA (/busqueda)

- Título "Búsqueda de expedientes"
- Barra de búsqueda grande con:
  - Dropdown de criterio (nombre cliente, fecha, área, contenido, número expediente)
  - Input de búsqueda (cambia según criterio: texto, datepicker, dropdown)
  - Botón buscar (dorado)
- Resultados en tabla con:
  - Expediente
  - Cliente
  - Área
  - Relevancia/coincidencia
  - TBR de la búsqueda (mostrar en badge: "Encontrado en X ms")
- Si no hay resultados: EmptyState con ícono de búsqueda
- Endpoint: POST /api/v1/busquedas
  - Body: { id_criterio: number, termino: string }
- Historial de búsquedas debajo (últimas 10)
- Endpoint: GET /api/v1/busquedas/historial?limite=10

### 6. GESTIÓN DE USUARIOS (/usuarios)

- Solo visible para rol Administrador
- Título "Gestión de usuarios"
- Tabla con: nombre, usuario, rol, estado, fecha creación
- Botón "Nuevo usuario"
- Modal crear/editar usuario:
  - Nombre completo
  - Usuario
  - Contraseña (solo en creación)
  - Rol (dropdown con los 5 roles)
  - Estado activo/inactivo
- IMPORTANTE: verificar contra la BD qué endpoints de usuarios existen. Si no hay endpoints CRUD de usuarios en el backend, crear primero el módulo backend/app/usuarios/ con routes y services completos antes de construir esta pantalla.

### 7. REPORTES (/reportes)

- Título "Reportes"
- Filtros: rango de fechas, área jurídica
- Tarjetas resumen con totales filtrados
- Gráficas de distribución
- Botón "Exportar Excel" que descarga el archivo
  - Endpoint: GET /api/v1/reportes/expedientes/excel?area=&desde=&hasta=
  - La respuesta es un blob (archivo .xlsx)
- Botón "Exportar PDF" (si el endpoint existe)
- Endpoint: GET /api/v1/reportes/dashboard

---

## ENDPOINTS DEL BACKEND (YA FUNCIONANDO)

Verificar estos contra el backend real antes de conectar:

| Método | Ruta | Protegido | Permiso |
|--------|------|-----------|---------|
| POST | /auth/login | No | — |
| POST | /auth/logout | No | — |
| POST | /clientes | Sí | gestionar_clientes |
| GET | /clientes | Sí | gestionar_clientes |
| GET | /clientes/:id | Sí | gestionar_clientes |
| PUT | /clientes/:id | Sí | gestionar_clientes |
| DELETE | /clientes/:id | Sí | gestionar_clientes |
| POST | /expedientes | Sí | gestionar_expedientes |
| GET | /expedientes | Sí | buscar_expediente |
| GET | /expedientes/:id | Sí | ver_expediente |
| PUT | /expedientes/:id | Sí | gestionar_expedientes |
| PUT | /expedientes/:id/estado | Sí | gestionar_expedientes |
| POST | /documentos | Sí | cargar_documento |
| GET | /expedientes/:id/documentos | Sí | ver_expediente |
| GET | /documentos/:id | Sí | ver_expediente |
| PUT | /documentos/:id | Sí | cargar_documento |
| POST | /busquedas | Sí | buscar_expediente |
| GET | /busquedas/historial | Sí | buscar_expediente |
| GET | /busquedas/metricas | Sí | ver_dashboard |
| GET | /reportes/dashboard | Sí | ver_dashboard |
| GET | /reportes/expedientes/excel | Sí | exportar_reporte |
| GET | /auditoria | Sí | ver_auditoria |
| GET | /auditoria/:id | Sí | ver_auditoria |
| POST | /ocr/procesar | Sí | cargar_documento |

Todos los endpoints están bajo el prefijo /api/v1/

---

## REGLAS DE DESARROLLO

1. NO usar TypeScript — JavaScript puro (.jsx)
2. NO usar Tailwind — CSS puro con las variables definidas arriba
3. Cada componente en su propio archivo
4. Antes de crear cualquier pantalla, verificar el esquema real de la BD y los endpoints
5. Manejar loading states con Skeleton en todas las pantallas
6. Manejar errores con toast notifications (react-hot-toast)
7. Responsive: funcionar bien en desktop (1200px+) y tablet (768px+). Móvil no es prioridad (hay app React Native para eso)
8. Commits en español simple, sin prefijos tipo feat() o fix()
9. Variable de entorno: VITE_API_URL para la URL del backend
10. El backend corre en http://localhost:5000 durante desarrollo

---

## ORDEN DE CONSTRUCCIÓN

1. Inicializar proyecto (Vite + React)
2. Instalar dependencias (axios, react-router-dom, recharts, framer-motion, lucide-react, react-hot-toast)
3. Crear globals.css con todas las variables CSS
4. Crear componentes base (Button, Input, Card, Badge, Table, Modal, Skeleton, Pagination)
5. Crear Layout (Sidebar + TopBar + MainLayout)
6. Crear AuthContext y ProtectedRoute
7. Crear services/api.js (Axios con interceptor)
8. Crear Login
9. Crear Dashboard
10. Crear Expedientes + Detalle
11. Crear Carga de documentos
12. Crear Búsqueda
13. Crear Usuarios (verificar/crear endpoints backend primero)
14. Crear Reportes
15. Probar todo end-to-end con el backend corriendo

Al finalizar cada pantalla, hacer commit y push.
