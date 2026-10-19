import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContextBase';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }

  return context;
}
