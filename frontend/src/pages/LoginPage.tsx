import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ApiError } from '../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Validação de campos no Frontend
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'O e-mail é obrigatório.';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Introduza um e-mail válido.';
    }

    if (!password) {
      errors.password = 'A palavra-passe é obrigatória.';
    } else if (password.length < 6) {
      errors.password = 'A palavra-passe deve ter pelo menos 6 caracteres.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const loggedUser = await login({ email, password });

      // 3. Redirecionamento após sucesso (de acordo com o perfil/Role)
      if (loggedUser.role === 'ADMIN' || loggedUser.role === 'ORGANIZER') {
        navigate('/dashboard');
      } else if (loggedUser.role === 'STAFF') {
        navigate('/checkin');
      } else {
        navigate('/events');
      }
    } catch (err) {
      // 2. Exibição de erros vindos da API
      const error = err as ApiError;
      setApiError(error.message || 'Erro ao efetuar login.');
      if (error.errors) {
        setFieldErrors({
          email: error.errors.email?.[0],
          password: error.errors.password?.[0],
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '24px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>Entrar no EventBook</h2>

      {/* Exibição do erro vindo da API */}
      {apiError && (
        <div role="alert" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '4px' }}>E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          {fieldErrors.email && <span style={{ color: '#dc2626', fontSize: '12px' }}>{fieldErrors.email}</span>}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '4px' }}>Palavra-passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          {fieldErrors.password && <span style={{ color: '#dc2626', fontSize: '12px' }}>{fieldErrors.password}</span>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isLoading ? 'A entrar...' : 'Entrar'}
        </button>
      </form>

      <p style={{ marginTop: '16px', fontSize: '14px', textAlign: 'center' }}>
        Ainda não tem conta? <Link to="/register">Registe-se aqui</Link>
      </p>
    </div>
  );
};