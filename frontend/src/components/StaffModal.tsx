import { useState, useEffect, type FormEvent } from 'react';
import { Users, UserPlus, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { staffService, type StaffMember } from '../services/staffService';
import type { Event } from '../types/event';
import type { ApiError } from '../services/api';
import { Loading } from './Loading';

interface StaffModalProps {
  event: Event;
  onClose: () => void;
}

export function StaffModal({ event, onClose }: StaffModalProps) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Delete state
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchStaff() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await staffService.listStaff(event.id);
        if (isMounted) {
          setStaffList(data);
        }
      } catch (err) {
        if (isMounted) {
          const apiError = err as ApiError;
          setErrorMessage(apiError.message || 'Não foi possível carregar a equipe deste evento.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchStaff();

    return () => {
      isMounted = false;
    };
  }, [event.id, reloadKey]);

  async function handleAddStaff(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);

    const val = staffIdentifier.trim();
    if (!val) {
      setFormError('Informe o e-mail ou o ID do usuário STAFF.');
      return;
    }

    const isNumeric = /^[1-9]\d*$/.test(val);
    const payload = isNumeric ? { userId: Number(val) } : { email: val };

    setIsSubmitting(true);
    try {
      const added = await staffService.addStaff(event.id, payload);
      setStaffIdentifier('');
      setFeedback(`Membro ${added.user.name} adicionado à equipe com sucesso!`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.code === 'INVALID_ROLE') {
        setFormError('O usuário informado não possui perfil de STAFF.');
      } else if (apiError.code === 'NOT_FOUND') {
        setFormError('Usuário não encontrado. Verifique o identificador digitado.');
      } else if (apiError.code === 'STAFF_ALREADY_EXISTS') {
        setFormError('Este usuário já faz parte da equipe deste evento.');
      } else {
        setFormError(apiError.message || 'Erro ao adicionar membro à equipe.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveStaff(userId: number) {
    setDeletingUserId(userId);
    setFormError(null);
    setFeedback(null);
    try {
      await staffService.removeStaff(event.id, userId);
      setFeedback('Membro removido da equipe.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      const apiError = err as ApiError;
      setErrorMessage(apiError.message || 'Não foi possível remover o membro da equipe.');
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#122337] p-6 text-slate-100 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Users size={20} />
              <span className="text-xs font-semibold uppercase tracking-wider">Gestão de Equipe</span>
            </div>
            <h2 className="text-xl font-bold text-white">{event.title}</h2>
            <p className="text-xs text-slate-300 mt-1">
              Membros cadastrados nesta equipe estão autorizados a realizar check-in no dia do evento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Feedback */}
        {feedback && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Add Staff Form */}
        <div className="rounded-xl border border-white/10 bg-[#0b1726] p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <UserPlus size={15} />
            Adicionar Novo Membro
          </h3>

          <form onSubmit={handleAddStaff} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={staffIdentifier}
                onChange={(e) => setStaffIdentifier(e.target.value)}
                placeholder="E-mail ou ID do usuário STAFF"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-700 bg-[#122337] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !staffIdentifier.trim()}
              className="button-primary small whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <UserPlus size={15} />
              {isSubmitting ? 'Adicionando...' : 'Adicionar Staff'}
            </button>
          </form>

          {formError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={13} />
              {formError}
            </p>
          )}
        </div>

        {/* Staff Members List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Equipe Vinculada ({staffList.length})
            </h3>
          </div>

          {isLoading ? (
            <Loading message="Carregando equipe..." />
          ) : staffList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-400 text-sm">
              Nenhum membro da equipe vinculado a este evento até o momento.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {staffList.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0b1726]/60 p-3 hover:border-white/10 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-100">{member.user.name}</p>
                    <p className="text-xs text-slate-400">
                      {member.user.email} • ID: {member.userId}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={deletingUserId === member.userId}
                    onClick={() => handleRemoveStaff(member.userId)}
                    className="button-ghost small text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    title="Remover membro da equipe"
                  >
                    <Trash2 size={14} />
                    <span>{deletingUserId === member.userId ? 'Removendo...' : 'Remover'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-white/10 pt-4">
          <button type="button" onClick={onClose} className="button-ghost small">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
