import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { eventsService } from '../services/eventsService';
import type { Event } from '../types/event';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export function EventsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pageSize = 6;

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await eventsService.listEvents({
          page,
          pageSize,
          search: search || undefined,
        });
        setEvents(response.data);
        setTotal(response.total);
      } catch {
        setErrorMessage('Não foi possível carregar os eventos. Verifique a conexão com a API.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, [page, search]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  const totalPages = Math.ceil(total / pageSize);

  function formatDate(isoDate: string) {
    const d = new Date(isoDate);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/events" className="text-xl font-bold text-blue-600 tracking-tight">
            EventBook
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-slate-600 hidden sm:inline">
                  Olá, <strong className="text-slate-800">{user?.name}</strong> ({user?.role})
                </span>

                {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  >
                    Painel do Organizador
                  </button>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                >
                  Cadastre-se
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Próximos Eventos
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Explore palestras, festivais e conferências disponíveis para reserva.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome ou cidade..."
              className="px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-3 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded hover:bg-slate-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </form>
        </div>

        {/* Status Handling */}
        {isLoading && <Loading message="Buscando eventos disponíveis..." />}

        {!isLoading && errorMessage && (
          <ErrorState
            title="Falha ao carregar eventos"
            message={errorMessage}
            onRetry={() => setPage(page)}
          />
        )}

        {!isLoading && !errorMessage && events.length === 0 && (
          <EmptyState
            title="Nenhum evento encontrado"
            description={
              search
                ? `Nenhum evento corresponde à busca "${search}".`
                : 'Não há eventos publicados no momento.'
            }
            actionLabel={search ? 'Ver todos os eventos' : undefined}
            onAction={search ? handleClearSearch : undefined}
          />
        )}

        {!isLoading && !errorMessage && events.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                        {event.capacity} vagas
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {formatDate(event.startsAt)}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 line-clamp-1 mb-2">
                      {event.title}
                    </h2>

                    <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                      {event.description}
                    </p>

                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="font-semibold text-slate-700">Local:</span> {event.location}
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      Org: {event.organizer?.name ?? 'Organizador'}
                    </span>
                    <Link
                      to={`/events/${event.id}`}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Ver Detalhes →
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 border border-slate-300 rounded text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-600">
                  Página <strong>{page}</strong> de <strong>{totalPages}</strong> (Total: {total})
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 border border-slate-300 rounded text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
