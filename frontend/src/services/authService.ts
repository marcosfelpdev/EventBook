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

const USE_MOCK = true;

export async function login(data: LoginPayload): Promise<AuthResponse> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (data.email === 'erro@teste.com') {
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciais inválidas. Verifique seu e-mail e senha.',
      };
    }
    return {
      token: 'fake-jwt-token-123',
      user: {
        id: '1',
        name: 'Usuário Teste',
        email: data.email,
        role: ROLES.BUYER,
      },
    };
  }

  const response = await api.post<AuthResponse>('/login', data);
  return response.data;
}

export async function register(data: RegisterPayload): Promise<AuthResponse> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (data.email === 'existente@teste.com') {
      throw {
        status: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Este e-mail já está cadastrado.',
      };
    }
    return {
      token: 'fake-jwt-token-456',
      user: {
        id: '2',
        name: data.name,
        email: data.email,
        role: ROLES.BUYER,
      },
    };
  }

  const response = await api.post<AuthResponse>('/register', data);
  return response.data;
}

export async function getMe(): Promise<User> {
  if (USE_MOCK) {
    const savedUser = localStorage.getItem('@EventBook:user');
    if (savedUser) {
      return JSON.parse(savedUser);
    }
    throw {
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Não autenticado.',
    };
  }

  const response = await api.get<User>('/me');
  return response.data;
}

export const authService = {
  login,
  register,
  getMe,
};