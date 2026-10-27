import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { eventsService } from '../services/eventsService';
import type { Event, CreateEventPayload, UpdateEventPayload } from '../types/event';
import type { ApiError } from '../services/api';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { LotsModal } from '../components/LotsModal';

export function OrganizerDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state for events
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState<number | string>(100);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'CANCELLED'>('DRAFT');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formApiError, setFormApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lots management state
  const [managingLotsEvent, setManagingLotsEvent] = useState<Event | null>(null);

  // Publication state feedback
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [publishingEventId, setPublishingEventId] = useState<number | null>(null);

  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardEvents() {
      try {
        const response = await eventsService.listEvents({ pageSize: 50 });
        if (isMounted) {
          setEvents(response.data);
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Erro ao carregar os eventos do painel.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboardEvents();

    return () => {
      isMounted = false;
    };
  }, [reloadCounter]);

  function openCreateModal() {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setLocation('');
    setCapacity(100);

    // Default dates: tomorrow to day after tomorrow
    const tomorrow = new Date(Date.now() + 86400000);
    const dayAfter = new Date(Date.now() + 2 * 86400000);
    setStartsAt(tomorrow.toISOString().slice(0, 16));
    setEndsAt(dayAfter.toISOString().slice(0, 16));
    setStatus('DRAFT');

    setFormErrors({});
    setFormApiError(null);
    setIsModalOpen(true);
  }

  function openEditModal(event: Event) {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    setLocation(event.location);
    setCapacity(event.capacity);
    setStartsAt(new Date(event.startsAt).toISOString().slice(0, 16));
    setEndsAt(new Date(event.endsAt).toISOString().slice(0, 16));
    setStatus(event.status);

    setFormErrors({});
    setFormApiError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingEvent(null);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 3) {
      errors.title = 'O título deve ter pelo menos 3 caracteres.';
    }

    if (!description.trim() || description.trim().length < 10) {
      errors.description = 'A descrição deve ter pelo menos 10 caracteres.';
    }

    if (!location.trim() || location.trim().length < 3) {
      errors.location = 'A localização deve ter pelo menos 3 caracteres.';
    }

    if (!capacity || Number(capacity) < 1) {
      errors.capacity = 'A capacidade mínima é de 1 participante.';
    }

    if (!startsAt) {
      errors.startsAt = 'Data de início é obrigatória.';
    } else {
      const start = new Date(startsAt);
      if (!editingEvent && start <= new Date()) {
        errors.startsAt = 'A data de início deve estar no futuro.';
      }
    }

    if (!endsAt) {
      errors.endsAt = 'Data de término é obrigatória.';
    } else if (startsAt && new Date(endsAt) <= new Date(startsAt)) {
      errors.endsAt = 'A data de término deve ser posterior à data de início.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEvent) {
        const payload: UpdateEventPayload = {
          title,
          description,
          location,
          capacity: Number(capacity),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          status,
        };
        await eventsService.updateEvent(editingEvent.id, payload);
      } else {
        const payload: CreateEventPayload = {
          title,
          description,
          location,
          capacity: Number(capacity),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        };
        await eventsService.createEvent(payload);
      }

      closeModal();
      setReloadCounter((c) => c + 1);
    } catch (err: unknown) {
      const error = err as ApiError;
      setFormApiError(error.message || 'Erro ao processar operação com o evento.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublishEvent(event: Event) {
    setPublishingEventId(event.id);
    setActionFeedback(null);

    try {
      await eventsService.publishEvent(event.id);
      setActionFeedback({
        type: 'success',
        message: `O evento "${event.title}" foi publicado com sucesso e agora está visível na vitrine pública!`,
      });
      setReloadCounter((c) => c + 1);
    } catch (err: unknown) {
      const error = err as ApiError;
      let msg = error.message;
      if (error.code === 'EVENT_WITHOUT_LOTS') {
        msg = 'Não é possível publicar: o evento não possui nenhum lote cadastrado. Adicione pelo menos um lote antes de publicar (RN-01).';
      } else if (error.code === 'EVENT_IN_PAST') {
        msg = 'Não é possível publicar: o evento já iniciou ou ocorreu no passado (RN-01).';
      }
      setActionFeedback({
        type: 'error',
        message: msg || 'Erro ao publicar o evento.',
      });
    } finally {
      setPublishingEventId(null);
    }
  }

  function formatDate(isoDate: string) {
    return new Date(isoDate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link to="/events" className="text-xl font-bold tracking-tight text-white hover:text-slate-200">
              EventBook
            </Link>
            <span className="text-xs bg-blue-600 px-2.5 py-1 rounded font-semibold uppercase tracking-wider">
              Painel do Organizador
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              {user?.name} ({user?.role})
            </span>
            <Link
              to="/events"
              className="px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700 rounded hover:bg-slate-800 transition-colors"
            >
              Vitrine Pública
            </Link>
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 rounded hover:bg-red-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gerenciamento de Eventos</h1>
            <p className="text-sm text-slate-600 mt-1">
              Crie novos eventos, configure lotes de ingressos e publique para os participantes.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
          >
            + Criar Novo Evento
          </button>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div
            className={`mb-6 p-4 rounded-xl border text-sm flex justify-between items-center ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">{actionFeedback.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{actionFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-xs font-bold px-2 py-1 rounded hover:bg-black/5"
            >
              Fechar
            </button>
          </div>
        )}

        {isLoading && <Loading message="Carregando eventos do painel..." />}

        {!isLoading && errorMessage && (
          <ErrorState
            title="Erro no painel"
            message={errorMessage}
            onRetry={() => {
              setIsLoading(true);
              setReloadCounter((c) => c + 1);
            }}
          />
        )}

        {!isLoading && !errorMessage && events.length === 0 && (
          <EmptyState
            title="Nenhum evento gerenciado"
            description="Você ainda não criou nenhum evento. Clique no botão acima para cadastrar o primeiro!"
            actionLabel="Criar Meu Primeiro Evento"
            onAction={openCreateModal}
          />
        )}

        {!isLoading && !errorMessage && events.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Evento</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Capacidade</th>
                  <th className="px-6 py-4">Data Início</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => {
                  const isPublishing = publishingEventId === event.id;

                  return (
                    <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div>{event.title}</div>
                        <div className="text-xs text-slate-500 font-normal">{event.location}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            event.status === 'PUBLISHED'
                              ? 'bg-green-100 text-green-800'
                              : event.status === 'DRAFT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono">
                        {event.capacity}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                        {formatDate(event.startsAt)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Botão Publicar se for DRAFT */}
                        {event.status === 'DRAFT' && (
                          <button
                            type="button"
                            disabled={isPublishing}
                            onClick={() => handlePublishEvent(event)}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors disabled:opacity-50"
                            title="Publicar evento (requer ao menos 1 lote cadastrado - RN-01)"
                          >
                            {isPublishing ? 'Publicando...' : 'Publicar'}
                          </button>
                        )}

                        {/* Botão Gerenciar Lotes */}
                        <button
                          type="button"
                          onClick={() => setManagingLotsEvent(event)}
                          className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 transition-colors"
                        >
                          Lotes
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(event)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal de Gestão de Lotes (M04) */}
      {managingLotsEvent && (
        <LotsModal
          event={managingLotsEvent}
          onClose={() => setManagingLotsEvent(null)}
          onLotsChanged={() => setReloadCounter((c) => c + 1)}
        />
      )}

      {/* Modal de Criação / Edição de Evento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formApiError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {formApiError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Título do Evento *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Festival de Verão 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.title && (
                  <span className="text-red-600 text-[11px] mt-0.5 block">{formErrors.title}</span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição Completa *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva as atrações, programação e detalhes do evento..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.description && (
                  <span className="text-red-600 text-[11px] mt-0.5 block">{formErrors.description}</span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Localização *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Arena Centro, São Paulo - SP"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.location && (
                  <span className="text-red-600 text-[11px] mt-0.5 block">{formErrors.location}</span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Capacidade Total *</label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Ex: 500"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.capacity && (
                  <span className="text-red-600 text-[11px] mt-0.5 block">{formErrors.capacity}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Início *</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.startsAt && (
                    <span className="text-red-600 text-[11px] mt-0.5 block">{formErrors.startsAt}</span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Término *</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.endsAt && (
                    <span className="text-red-600 text-[11px] mt-0.5 block">{formErrors.endsAt}</span>
                  )}
                </div>
              </div>

              {editingEvent && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'CANCELLED')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DRAFT">DRAFT (Rascunho)</option>
                    <option value="PUBLISHED">PUBLISHED (Publicado)</option>
                    <option value="CANCELLED">CANCELLED (Cancelado)</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingEvent ? 'Salvar Alterações' : 'Criar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
