import { api } from './api';
import { type User, ROLES } from '../types/auth';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Muda para false quando o Backend da equipa estiver a rodar!
const USE_MOCK = true;

export const authService = {
  async login(data: LoginPayload): Promise<AuthResponse> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800)); // Simula loading
      if (data.email === 'erro@teste.com') {
        throw { status: 401, message: 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.' };
      }
      return {
        token: 'fake-jwt-token-123',
        user: { id: '1', name: 'Utilizador Teste', email: data.email, role: ROLES.BUYER },
      };
    }

    const response = await api.post<AuthResponse>('/login', data);
    return response.data;
  },

  async register(data: RegisterPayload): Promise<AuthResponse> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800));
      if (data.email === 'existente@teste.com') {
        throw { status: 409, message: 'Este e-mail já está registado.' };
      }
      return {
        token: 'fake-jwt-token-456',
        user: { id: '2', name: data.name, email: data.email, role: ROLES.BUYER },
      };
    }

    const response = await api.post<AuthResponse>('/register', data);
    return response.data;
  },
  
  async getMe(): Promise<User> {
    if (USE_MOCK) {
      const savedUser = localStorage.getItem('@EventBook:user');
      if (savedUser) return JSON.parse(savedUser);
      throw { status: 401, message: 'Não autenticado' };
    }

    const response = await api.get<User>('/me');
    return response.data;
  },
};