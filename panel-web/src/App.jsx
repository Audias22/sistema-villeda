import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Expedientes from './pages/Expedientes'
import ExpedienteDetalle from './pages/ExpedienteDetalle'
import CargarDocumento from './pages/CargarDocumento'
import Busqueda from './pages/Busqueda'
import Usuarios from './pages/Usuarios'
import Reportes from './pages/Reportes'

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expedientes"
          element={
            <ProtectedRoute>
              <Expedientes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expedientes/:id"
          element={
            <ProtectedRoute>
              <ExpedienteDetalle />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cargar"
          element={
            <ProtectedRoute>
              <CargarDocumento />
            </ProtectedRoute>
          }
        />
        <Route
          path="/busqueda"
          element={
            <ProtectedRoute>
              <Busqueda />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute>
              <Usuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <ProtectedRoute>
              <Reportes />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default App
