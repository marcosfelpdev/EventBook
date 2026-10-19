import { useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types/auth';
import { authService, type LoginPayload, type RegisterPayload } from '../services/authService';
import { AuthContext } from './AuthContextBase';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('@EventBook:token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  function logout() {
    localStorage.removeItem('@EventBook:token');
    localStorage.removeItem('@EventBook:user');
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    async function loadSession() {
      const storedToken = localStorage.getItem('@EventBook:token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getMe();
        setUser(currentUser);
        setToken(storedToken);
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();

    function handleUnauthorized() {
      logout();
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  async function login(payload: LoginPayload): Promise<User> {
    const { token: newToken, user: loggedUser } = await authService.login(payload);
    localStorage.setItem('@EventBook:token', newToken);
    localStorage.setItem('@EventBook:user', JSON.stringify(loggedUser));
    setToken(newToken);
    setUser(loggedUser);
    return loggedUser;
  }

  async function register(payload: RegisterPayload): Promise<User> {
    const { token: newToken, user: newUser } = await authService.register(payload);
    localStorage.setItem('@EventBook:token', newToken);
    localStorage.setItem('@EventBook:user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: user !== null && token !== null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}