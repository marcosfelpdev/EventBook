import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage';
import { ROLES } from './types/auth';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.ORGANIZER]}>
                <OrganizerDashboardPage />
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

          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
