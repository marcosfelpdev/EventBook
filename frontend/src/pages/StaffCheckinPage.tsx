import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketsService } from '../services/ticketsService';
import type { CheckinError, CheckinResult } from '../types/ticket';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { Brand } from '../components/Brand';

export function StaffCheckinPage() {
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);

  function clearState() {
    setErrorMessage(null);
    setResult(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearState();

    if (!code.trim()) {
      setErrorMessage('Informe o código do ingresso.');
      return;
    }

    setIsLoading(true);
    try {
      const checkinResult = await ticketsService.checkin(code.trim());
      setResult(checkinResult);
    } catch (err: unknown) {
      const error = err as CheckinError;
      if (error.code === 'TICKET_NOT_FOUND') {
        setErrorMessage('Ingresso não encontrado. Verifique o código digitado.');
      } else if (error.code === 'TICKET_WRONG_EVENT') {
        setErrorMessage('Este ingresso não pertence a um evento da sua equipe.');
      } else if (error.code === 'TICKET_INVALID') {
        setErrorMessage('Este ingresso está cancelado e não permite check-in.');
      } else if (error.code === 'TICKET_ALREADY_USED') {
        setErrorMessage('Este ingresso já foi utilizado.');
      } else if (error.code === 'CHECKIN_WINDOW_CLOSED') {
        setErrorMessage('O check-in não está disponível neste horário.');
      } else if (error.code === 'FORBIDDEN') {
        setErrorMessage('Você não é membro da equipe deste evento.');
      } else if (error.status === 401) {
        setErrorMessage('Sessão expirada. Faça login novamente.');
        navigate('/login');
      } else {
        setErrorMessage(error.message || 'Erro ao realizar o check-in. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  function formatDateTime(iso: string | undefined | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-[#0b1726]">
      <main className="site-container py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <Brand className="mb-2" />
            <h1 className="text-2xl font-bold text-slate-50">Check-in de Ingressos</h1>
            <p className="text-sm text-slate-300 mt-1">
              Valide a entrada de participantes digitando o código do ingresso.
            </p>
          </div>
        </div>

        {isLoading && <Loading message="Validando ingresso..." />}

        {!isLoading && errorMessage && (
          <ErrorState
            title="Não foi possível realizar o check-in"
            message={errorMessage}
            onRetry={() => {
              setIsLoading(true);
            }}
          />
        )}

        {!isLoading && !errorMessage && result && (
          <div className="bg-[#122337] border border-emerald-500/30 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-emerald-400">✓</span>
              <h2 className="text-lg font-semibold text-slate-50">Check-in realizado com sucesso</h2>
            </div>
            <table className="w-full text-left text-sm text-slate-200 divide-y divide-white/10">
              <tbody>
                <tr>
                  <td className="px-4 py-3 w-1/3 text-slate-400 font-medium">Código</td>
                  <td className="px-4 py-3 font-mono text-blue-300">{result.ticket.code}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-400 font-medium">Status</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-emerald-900 text-emerald-300 text-xs font-semibold rounded">
                      Utilizado
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-400 font-medium">Check-in em</td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {formatDateTime(result.checkin.checkedInAt)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-400 font-medium">Atendente</td>
                  <td className="px-4 py-3 text-slate-300">{result.checkin.staff.name}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setCode('');
                }}
                className="px-4 py-2 border border-slate-600 text-slate-200 text-xs font-semibold rounded-lg hover:bg-[#0b1726] transition-colors"
              >
                Validar outro ingresso
              </button>
            </div>
          </div>
        )}

        {!isLoading && !errorMessage && !result && (
          <form onSubmit={handleSubmit} className="bg-[#122337] border border-white/10 rounded-xl shadow-sm p-6 max-w-lg">
            <div className="mb-6">
              <label className="block font-semibold text-slate-200 mb-2">
                Código do ingresso
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: ABC-123-XYZ"
                className="w-full px-4 py-3 border border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">
                Digite o código impresso no ingresso do participante.
              </p>
            </div>
            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Validando...' : 'Realizar Check-in'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
