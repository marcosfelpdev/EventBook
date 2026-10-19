import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventsService } from '../services/eventsService';
import type { Event } from '../types/event';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { useAuth } from '../hooks/useAuth';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      if (!id) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await eventsService.getEventById(Number(id));
        setEvent(data);
      } catch {
        setErrorMessage('Evento não encontrado ou indisponível para visualização pública.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  function formatDate(isoDate: string) {
    const d = new Date(isoDate);
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link
            to="/events"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            ← Voltar para a lista de eventos
          </Link>

          {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-200 text-slate-800 rounded hover:bg-slate-300 transition-colors"
            >
              Painel do Organizador
            </button>
          )}
        </div>

        {isLoading && <Loading message="Carregando detalhes do evento..." />}

        {!isLoading && errorMessage && (
          <ErrorState
            title="Evento Indisponível"
            message={errorMessage}
            onRetry={() => navigate('/events')}
          />
        )}

        {!isLoading && event && (
          <article className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100">
              <div className="flex flex-wrap gap-2 items-center mb-4">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    event.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : event.status === 'DRAFT'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {event.status}
                </span>

                <span className="text-xs text-slate-500 font-medium">
                  Capacidade total: <strong>{event.capacity} participantes</strong>
                </span>
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
                {event.title}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-sm">
                <div>
                  <span className="block text-xs uppercase font-bold text-slate-500 mb-1">
                    Início do Evento
                  </span>
                  <span className="text-slate-800 font-medium">{formatDate(event.startsAt)}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase font-bold text-slate-500 mb-1">
                    Término do Evento
                  </span>
                  <span className="text-slate-800 font-medium">{formatDate(event.endsAt)}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="block text-xs uppercase font-bold text-slate-500 mb-1">
                    Localização
                  </span>
                  <span className="text-slate-800 font-medium">{event.location}</span>
                </div>
              </div>
            </div>

            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-3">Sobre este Evento</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line mb-8">
                {event.description}
              </p>

              {/* Área reservada para Lotes (M04) */}
              <section className="border-t border-slate-200 pt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Ingressos e Lotes</h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                    Milestone 04
                  </span>
                </div>

                <div className="p-6 border border-dashed border-blue-300 rounded-xl bg-blue-50/50 text-center">
                  <p className="text-sm text-slate-700 font-medium mb-1">
                    A venda e gestão de lotes será disponibilizada na próxima etapa (M04).
                  </p>
                  <p className="text-xs text-slate-500">
                    Aqui você poderá selecionar a quantidade de ingressos por lote, verificar o estoque disponível e avançar para o checkout.
                  </p>
                </div>
              </section>
            </div>

            <footer className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Organizado por: <strong>{event.organizer?.name ?? 'Organizador'}</strong></span>
              <span>Contato: {event.organizer?.email ?? 'contato@eventbook.test'}</span>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}
