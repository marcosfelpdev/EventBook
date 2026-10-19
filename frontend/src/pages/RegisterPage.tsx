import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ApiError } from '../services/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function validateForm(): boolean {
    const errors: typeof fieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim() || name.trim().length < 3) {
      errors.name = 'O nome deve ter pelo menos 3 caracteres.';
    }

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

    if (confirmPassword !== password) {
      errors.confirmPassword = 'As senhas não coincidem.';
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
      await register({ name, email, password });
      navigate('/events');
    } catch (err: unknown) {
      const error = err as ApiError;
      setApiError(error.message || 'Erro ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto my-14 p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Criar Conta - EventBook</h2>

      {apiError && (
        <div role="alert" className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm border border-red-200">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Nome completo
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.name && <span className="text-red-600 text-xs mt-1 block">{fieldErrors.name}</span>}
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.email && <span className="text-red-600 text-xs mt-1 block">{fieldErrors.email}</span>}
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.password && (
            <span className="text-red-600 text-xs mt-1 block">{fieldErrors.password}</span>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
            Confirmar Senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha"
            className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.confirmPassword && (
            <span className="text-red-600 text-xs mt-1 block">{fieldErrors.confirmPassword}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Cadastrando...' : 'Criar Conta'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600 text-center">
        Já possui uma conta?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">
          Faça login
        </Link>
      </p>
    </div>
  );
}