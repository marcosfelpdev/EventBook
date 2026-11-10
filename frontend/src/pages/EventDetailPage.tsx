import { Ticket } from 'lucide-react';
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
    <div className="min-h-screen bg-[#0b1726] py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link
            to="/events"
            className="text-sm font-medium text-blue-400 hover:text-blue-200 transition-colors flex items-center gap-1"
          >
            ← Voltar para a lista de eventos
          </Link>

          {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs font-semibold px-3 py-1.5 bg-[#223a53] text-slate-100 rounded hover:bg-slate-300 transition-colors"
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
          <article className="bg-[#122337] border border-white/10 rounded-2xl shadow-sm overflow-hidden">
            <div className="detail-cover" aria-hidden="true"><Ticket strokeWidth={0.8} /><span>VIVA O MOMENTO. GUARDE A HISTÓRIA.</span></div><div className="p-5 sm:p-8 border-b border-white/10">
              <div className="flex flex-wrap gap-2 items-center mb-4">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    event.status === 'PUBLISHED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : event.status === 'DRAFT'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-red-950 text-red-300 border border-red-900'
                  }`}
                >
                  {{ PUBLISHED: 'Publicado', DRAFT: 'Rascunho', CANCELLED: 'Cancelado' }[event.status]}
                </span>

                <span className="text-xs text-slate-400 font-medium">
                  Capacidade total: <strong>{event.capacity} participantes</strong>
                </span>
              </div>

              <h1 className="text-3xl font-extrabold text-slate-50 tracking-tight mb-4">
                {event.title}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0b1726] p-4 rounded-xl text-sm">
                <div>
                  <span className="block text-xs uppercase font-bold text-slate-400 mb-1">
                    Início do Evento
                  </span>
                  <span className="text-slate-100 font-medium">{formatDate(event.startsAt)}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase font-bold text-slate-400 mb-1">
                    Término do Evento
                  </span>
                  <span className="text-slate-100 font-medium">{formatDate(event.endsAt)}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="block text-xs uppercase font-bold text-slate-400 mb-1">
                    Localização
                  </span>
                  <span className="text-slate-100 font-medium">{event.location}</span>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              <h2 className="text-xl font-bold text-slate-100 mb-3">Sobre este Evento</h2>
              <p className="text-slate-200 leading-relaxed whitespace-pre-line mb-8">
                {event.description}
              </p>

              {/* Lotes e Ingressos (M04) */}
              <section className="border-t border-white/10 pt-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-50">Ingressos e Lotes</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Confira os lotes disponíveis para este evento.
                    </p>
                  </div>

                  {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') &&
                    user.id === Number(event.organizerId) && (
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="text-xs font-semibold px-3 py-1.5 bg-blue-950 text-blue-300 border border-blue-800 rounded-lg hover:bg-blue-900 transition-colors"
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
                      const isOpen = lot.active && isWithinSaleWindow(lot.salesStartAt, lot.salesEndAt);
                      const isSoldOut = lot.quantity === 0;

                      return (
                        <div
                          key={lot.id}
                          className="bg-[#122337] border border-white/10 rounded-xl p-5 hover:border-slate-600 transition-shadow shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-50 text-base">{lot.name}</h4>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  isSoldOut
                                    ? 'bg-red-950 text-red-300'
                                    : isOpen
                                      ? 'bg-emerald-950 text-emerald-300'
                                      : 'bg-[#182d44] text-slate-300'
                                }`}
                              >
                                {isSoldOut ? 'Esgotado' : isOpen ? 'Vendas Abertas' : 'Encerrado'}
                              </span>
                            </div>

                            <div className="text-2xl font-black text-slate-50 mb-3">
                              {formatPrice(lot.price)}
                            </div>

                            <div className="space-y-1 text-xs text-slate-300">
                              <div>
                                <span className="font-semibold text-slate-200">Quantidade:</span>{' '}
                                {lot.quantity} ingressos
                              </div>
                              <div>
                                <span className="font-semibold text-slate-200">Vendas até:</span>{' '}
                                {new Date(lot.salesEndAt).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(lot.salesEndAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                            <span className="text-slate-400 italic">
                              Reserva online em breve
                            </span>
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 bg-[#182d44] text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
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

            <footer className="px-5 sm:px-8 py-4 bg-[#0b1726] border-t border-white/10 flex flex-wrap gap-3 justify-between items-center text-xs text-slate-400">
              <span>
                Organizado por: <strong>{event.organizer?.name ?? 'Organizador'}</strong>
              </span>
              <span>Contato: {event.organizer?.email ?? 'Não informado'}</span>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}
