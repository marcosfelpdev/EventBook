import { AuthLayout } from '../components/AuthLayout';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ApiError } from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function validateForm(): boolean {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'O e-mail é obrigatório.';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Digite um e-mail válido.';
    }

    if (!password) {
      errors.password = 'A senha é obrigatória.';
    } else if (password.length < 6) {
      errors.password = 'A senha deve ter pelo menos 6 caracteres.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await login({ email, password });

      if (loggedUser.role === 'ADMIN' || loggedUser.role === 'ORGANIZER') {
        navigate('/dashboard');
        return;
      }

      if (loggedUser.role === 'STAFF') {
        navigate('/checkin');
        return;
      }

      const returnTo: unknown = state?.returnTo;
      navigate(typeof returnTo === 'string' && /^\/events\/\d+$/.test(returnTo) ? returnTo : '/events');
    } catch (err: unknown) {
      const error = err as ApiError;
      setApiError(error.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">Bom ter você de volta.</h2>

      {apiError && (
        <div role="alert" className="bg-red-950/50 text-red-300 p-3 rounded mb-4 text-sm border border-red-900">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-1">
            E-mail
          </label>
          <input
            id="email" autoComplete="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-3 py-2 border border-slate-600 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.email && <span className="text-red-400 text-xs mt-1 block">{fieldErrors.email}</span>}
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-1">
            Senha
          </label>
          <input
            id="password" autoComplete="current-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            className="w-full px-3 py-2 border border-slate-600 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.password && (
            <span className="text-red-400 text-xs mt-1 block">{fieldErrors.password}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-300 text-center">
        Ainda não tem conta?{' '}
        <Link to="/register" className="text-blue-400 hover:underline">
          Cadastre-se aqui
        </Link>
      </p>
    </AuthLayout>
  );
}
