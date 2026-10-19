import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { PrivateRoute } from './components/PrivateRoute';
import { EmptyState } from './components/EmptyState';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ROLES } from './types/auth';

function EventsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto my-10 p-6">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">Catálogo de Eventos</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            Olá, <strong className="text-slate-800">{user?.name}</strong> ({user?.role})
          </span>
          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>
      <EmptyState
        title="Nenhum evento disponível ainda"
        description="Quando a Milestone 03 (Gestão de Eventos) estiver pronta, os eventos aparecerão aqui!"
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/events"
            element={
              <PrivateRoute allowedRoles={[ROLES.BUYER, ROLES.ORGANIZER, ROLES.ADMIN, ROLES.STAFF]}>
                <EventsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.ORGANIZER]}>
                <h1 className="text-center text-2xl font-bold text-slate-800 mt-12">
                  Painel do Organizador / Admin
                </h1>
              </PrivateRoute>
            }
          />

          <Route
            path="/checkin"
            element={
              <PrivateRoute allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
                <h1 className="text-center text-2xl font-bold text-slate-800 mt-12">
                  Área de Staff / Check-in
                </h1>
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
