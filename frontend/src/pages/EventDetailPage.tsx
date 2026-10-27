import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventsService } from '../services/eventsService';
import { lotsService } from '../services/lotsService';
import type { Event } from '../types/event';
import type { TicketLot } from '../types/lot';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [lots, setLots] = useState<TicketLot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLots, setIsLoadingLots] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEventAndLots() {
      if (!id) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const eventData = await eventsService.getEventById(Number(id));
        setEvent(eventData);

        // Fetch lots
        setIsLoadingLots(true);
        try {
          const lotsData = await lotsService.listLots(Number(id));
          setLots(lotsData);
        } catch {
          // Fallback to event.lots if present
          if (eventData.lots) {
            setLots(eventData.lots);
          }
        } finally {
          setIsLoadingLots(false);
        }
      } catch {
        setErrorMessage('Evento não encontrado ou indisponível para visualização pública.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchEventAndLots();
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

  function formatPrice(price: number | string) {
    const num = Number(price);
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  }

  function isWithinSaleWindow(startIso: string, endIso: string) {
    const now = new Date();
    const start = new Date(startIso);
    const end = new Date(endIso);
    return now >= start && now <= end;
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

              {/* Lotes e Ingressos (M04) */}
              <section className="border-t border-slate-200 pt-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Ingressos e Lotes</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Confira os lotes disponíveis para este evento.
                    </p>
                  </div>

                  {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') &&
                    user.id === Number(event.organizerId) && (
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Gerenciar Lotes
                      </button>
                    )}
                </div>

                {isLoadingLots && <Loading message="Carregando lotes..." />}

                {!isLoadingLots && lots.length === 0 && (
                  <EmptyState
                    title="Ingressos em breve"
                    description="Nenhum lote de ingressos está disponível para este evento no momento."
                  />
                )}

                {!isLoadingLots && lots.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lots.map((lot) => {
                      const isOpen = isWithinSaleWindow(lot.salesStartAt, lot.salesEndAt);
                      const isSoldOut = lot.quantity === 0;

                      return (
                        <div
                          key={lot.id}
                          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-shadow shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-900 text-base">{lot.name}</h4>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  isSoldOut
                                    ? 'bg-red-100 text-red-700'
                                    : isOpen
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isSoldOut ? 'Esgotado' : isOpen ? 'Vendas Abertas' : 'Encerrado'}
                              </span>
                            </div>

                            <div className="text-2xl font-black text-slate-900 mb-3">
                              {formatPrice(lot.price)}
                            </div>

                            <div className="space-y-1 text-xs text-slate-600">
                              <div>
                                <span className="font-semibold text-slate-700">Quantidade:</span>{' '}
                                {lot.quantity} ingressos
                              </div>
                              <div>
                                <span className="font-semibold text-slate-700">Vendas até:</span>{' '}
                                {new Date(lot.salesEndAt).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(lot.salesEndAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-400 italic">
                              Compra de ingressos disponível no M05
                            </span>
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                            >
                              Comprar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <footer className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>
                Organizado por: <strong>{event.organizer?.name ?? 'Organizador'}</strong>
              </span>
              <span>Contato: {event.organizer?.email ?? 'contato@eventbook.test'}</span>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}
