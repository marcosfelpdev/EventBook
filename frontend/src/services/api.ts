import axios, { type AxiosError } from 'axios';

export interface ApiError {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('@EventBook:token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ code?: string; message?: string; details?: unknown }>) => {
    const status = error.response?.status || 500;
    const serverMessage = error.response?.data?.message;
    const serverCode = error.response?.data?.code;

    const defaultMessages: Record<number, string> = {
      400: 'Requisição inválida. Verifique os dados enviados.',
      401: 'Sessão expirada ou credenciais inválidas. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Recurso não encontrado.',
      409: 'Conflito de dados. Este e-mail já pode estar em uso.',
      422: 'Erro de validação de regra de negócio.',
      500: 'Erro interno no servidor. Tente novamente mais tarde.',
    };

    if (status === 401) {
      localStorage.removeItem('@EventBook:token');
      localStorage.removeItem('@EventBook:user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    const formattedError: ApiError = {
      status,
      code: serverCode,
      message: serverMessage || defaultMessages[status] || 'Ocorreu um erro inesperado.',
      details: error.response?.data?.details,
    };

    return Promise.reject(formattedError);
  },
);
