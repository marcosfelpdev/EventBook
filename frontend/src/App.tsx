import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { EmptyState } from './components/EmptyState';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ROLES } from './types/auth';

const EventsPage = () => {
  const { user, logout } = useAuth();
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Catálogo de Eventos</h1>
        <div>
          <span style={{ marginRight: '12px' }}>Olá, <strong>{user?.name}</strong> ({user?.role})</span>
          <button onClick={logout} style={{ padding: '6px 12px', cursor: 'pointer' }}>Sair</button>
        </div>
      </header>
      <EmptyState
        title="Nenhum evento disponível ainda"
        description="Quando a Milestone 03 (Gestão de Eventos) estiver pronta, os eventos aparecerão aqui!"
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Qualquer utilizador autenticado pode ver eventos */}
          <Route
            path="/events"
            element={
              <PrivateRoute allowedRoles={[ROLES.BUYER, ROLES.ORGANIZER, ROLES.ADMIN, ROLES.STAFF]}>
                <EventsPage />
              </PrivateRoute>
            }
          />

          {/* Apenas ADMIN e ORGANIZER podem aceder ao Dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.ORGANIZER]}>
                <h1 style={{ textAlign: 'center', marginTop: '50px' }}>Painel do Organizador / Admin</h1>
              </PrivateRoute>
            }
          />

          {/* Apenas STAFF e ADMIN podem aceder ao Check-in */}
          <Route
            path="/checkin"
            element={
              <PrivateRoute allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
                <h1 style={{ textAlign: 'center', marginTop: '50px' }}>Área de Staff / Check-in</h1>
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;