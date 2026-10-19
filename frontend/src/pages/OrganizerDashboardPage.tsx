import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { eventsService } from '../services/eventsService';
import type { Event, CreateEventPayload, UpdateEventPayload } from '../types/event';
import type { ApiError } from '../services/api';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export function OrganizerDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state
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
    }

    if (!endsAt) {
      errors.endsAt = 'Data de término é obrigatória.';
    }

    if (startsAt && endsAt) {
      const start = new Date(startsAt);
      const end = new Date(endsAt);

      if (editingEvent === null && start <= new Date()) {
        errors.startsAt = 'A data de início deve estar no futuro.';
      }

      if (end <= start) {
        errors.endsAt = 'A data de término deve ser posterior à data de início.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormApiError(null);

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gerenciamento de Eventos</h1>
            <p className="text-sm text-slate-600 mt-1">
              Crie novos eventos ou gerencie os já cadastrados.
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
                {events.map((event) => (
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
                    <td className="px-6 py-4 text-right space-x-2">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

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
              <div role="alert" className="mb-4 bg-red-50 text-red-700 p-3 rounded text-sm border border-red-200">
                {formApiError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Título do Evento
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Conferência de Tecnologia 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.title && (
                  <span className="text-red-600 text-xs mt-1 block">{formErrors.title}</span>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Descrição
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações completas sobre o evento..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.description && (
                  <span className="text-red-600 text-xs mt-1 block">{formErrors.description}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Localização
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Cidade / Endereço"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.location && (
                    <span className="text-red-600 text-xs mt-1 block">{formErrors.location}</span>
                  )}
                </div>

                <div>
                  <label htmlFor="capacity" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Capacidade Máxima
                  </label>
                  <input
                    id="capacity"
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.capacity && (
                    <span className="text-red-600 text-xs mt-1 block">{formErrors.capacity}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startsAt" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Data e Hora de Início
                  </label>
                  <input
                    id="startsAt"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.startsAt && (
                    <span className="text-red-600 text-xs mt-1 block">{formErrors.startsAt}</span>
                  )}
                </div>

                <div>
                  <label htmlFor="endsAt" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Data e Hora de Término
                  </label>
                  <input
                    id="endsAt"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.endsAt && (
                    <span className="text-red-600 text-xs mt-1 block">{formErrors.endsAt}</span>
                  )}
                </div>
              </div>

              {editingEvent && (
                <div>
                  <label htmlFor="status" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Status do Evento
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'CANCELLED')}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DRAFT">DRAFT (Rascunho)</option>
                    <option value="PUBLISHED">PUBLISHED (Publicado)</option>
                    <option value="CANCELLED">CANCELLED (Cancelado)</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
