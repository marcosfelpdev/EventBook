import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types/auth';
import { Loading } from './Loading';
import { ErrorState } from './ErrorState';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const location = useLocation();

  // 1. Mostra o Loading (#34) enquanto verifica o token salvo
  if (isLoading) {
    return <Loading message="A verificar credenciais..." />;
  }

  // 2. Se não estiver logado, redireciona para /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Checagem de perfil (RBAC): verifica se a role do utilizador está na lista permitida
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ maxWidth: '500px', margin: '60px auto', padding: '24px' }}>
        <ErrorState
          title="Acesso Negado (403)"
          message={`O seu perfil (${user.role}) não tem permissão para aceder a esta página.`}
        />
        <button
          onClick={logout}
          style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          Terminar sessão / Trocar de conta
        </button>
      </div>
    );
  }

  return <>{children}</>;
};