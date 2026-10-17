import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types/auth';
import { authService, type LoginPayload, type RegisterPayload } from '../services/authService';

interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<User>;
  register: (data: RegisterPayload) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('@EventBook:token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    localStorage.removeItem('@EventBook:token');
    localStorage.removeItem('@EventBook:user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const loadSession = async () => {
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
    };

    loadSession();

    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (payload: LoginPayload): Promise<User> => {
    const { token: newToken, user: loggedUser } = await authService.login(payload);
    localStorage.setItem('@EventBook:token', newToken);
    localStorage.setItem('@EventBook:user', JSON.stringify(loggedUser));
    setToken(newToken);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    const { token: newToken, user: newUser } = await authService.register(payload);
    localStorage.setItem('@EventBook:token', newToken);
    localStorage.setItem('@EventBook:user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);