import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ApiError } from '../services/api';

export const RegisterPage: React.FC = () => {
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

  // 1. Validação de campos
  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim() || name.trim().length < 3) {
      errors.name = 'O nome deve ter pelo menos 3 caracteres.';
    }

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

    if (confirmPassword !== password) {
      errors.confirmPassword = 'As palavras-passe não coincidem.';
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
      await register({ name, email, password });
      // 3. Redirecionamento após sucesso
      navigate('/events');
    } catch (err) {
      // 2. Exibição de erros vindos da API (ex: 409 e-mail já registado)
      const error = err as ApiError;
      setApiError(error.message || 'Erro ao criar conta.');
      if (error.errors) {
        setFieldErrors({
          name: error.errors.name?.[0],
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
      <h2>Criar Conta - EventBook</h2>

      {apiError && (
        <div role="alert" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '4px' }}>Nome completo</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="O seu nome"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          {fieldErrors.name && <span style={{ color: '#dc2626', fontSize: '12px' }}>{fieldErrors.name}</span>}
        </div>

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
            placeholder="Mínimo 6 caracteres"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          {fieldErrors.password && <span style={{ color: '#dc2626', fontSize: '12px' }}>{fieldErrors.password}</span>}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '4px' }}>Confirmar Palavra-passe</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a palavra-passe"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          {fieldErrors.confirmPassword && <span style={{ color: '#dc2626', fontSize: '12px' }}>{fieldErrors.confirmPassword}</span>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isLoading ? 'A registar...' : 'Criar Conta'}
        </button>
      </form>

      <p style={{ marginTop: '16px', fontSize: '14px', textAlign: 'center' }}>
        Já possui uma conta? <Link to="/login">Inicie sessão</Link>
      </p>
    </div>
  );
};