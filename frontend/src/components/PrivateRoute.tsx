import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types/auth';
import { Loading } from './Loading';
import { ErrorState } from './ErrorState';

interface PrivateRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading message="Verificando credenciais..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-14 p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
        <ErrorState
          title="Acesso Negado (403)"
          message={`Seu perfil (${user.role}) não tem permissão para acessar esta página.`}
        />
        <button
          type="button"
          onClick={logout}
          className="mt-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors"
        >
          Sair / Trocar de conta
        </button>
      </div>
    );
  }

  return <>{children}</>;
}