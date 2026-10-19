import { createContext } from 'react';
import type { User } from '../types/auth';
import type { LoginPayload, RegisterPayload } from '../services/authService';

export interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<User>;
  register: (data: RegisterPayload) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextData | null>(null);
