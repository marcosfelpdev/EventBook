import axios, { type AxiosError } from 'axios';

// 1. Instância com baseURL via env
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor de envio automático do token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('@EventBook:token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Estrutura padronizada de erro para a UI consumir facilmente (usada na #36!)
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>; // útil para erros 422 de validação de campos
}

// 3. Interceptor de erros (400, 401, 403, 404, 409, 422, 500)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const status = error.response?.status || 500;
    const serverMessage = error.response?.data?.message;

    const defaultMessages: Record<number, string> = {
      400: 'Requisição inválida. Verifique os dados enviados.',
      401: 'Sessão expirada ou credenciais inválidas. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Recurso não encontrado.',
      409: 'Conflito de dados (ex: este e-mail já está cadastrado).',
      422: 'Erro de validação nos campos preenchidos.',
      500: 'Erro interno no servidor. Tente novamente mais tarde.',
    };

    if (status === 401) {
      localStorage.removeItem('@EventBook:token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    const formattedError: ApiError = {
      status,
      message: serverMessage || defaultMessages[status] || 'Ocorreu um erro inesperado.',
      errors: error.response?.data?.errors,
    };

    return Promise.reject(formattedError);
  }
);
