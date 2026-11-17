import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket as TicketIcon,
  ShoppingBag,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { ticketsService } from '../services/ticketsService';
import { ordersService, type Order } from '../services/ordersService';
import type { Ticket } from '../types/ticket';
import type { ApiError } from '../services/api';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export function MyTicketsPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'orders'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [now] = useState(() => Date.now());

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [ticketsResponse, ordersResponse] = await Promise.all([
          ticketsService.listMyTickets(1, 50),
          ordersService.listMyOrders(1, 50),
        ]);
        if (active) {
          setTickets(ticketsResponse.data || []);
          setOrders(ordersResponse.data || []);
        }
      } catch (err) {
        if (active) {
          const apiError = err as ApiError;
          setError(apiError.message || 'Erro ao carregar ingressos e pedidos.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void fetchData();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function handleCopy(code: string) {
    void navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function handleConfirmCancel() {
    if (!cancellingOrder) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await ordersService.cancel(cancellingOrder.id);
      setCancellingOrder(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const apiError = err as ApiError;
      setCancelError(apiError.message || 'Não foi possível cancelar o pedido.');
    } finally {
      setIsCancelling(false);
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

  function formatCurrency(amount: string | number | undefined | null) {
    if (amount === undefined || amount === null) return 'R$ 0,00';
    return Number(amount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function getOrderStatusBadge(status: Order['status']) {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 size={12} /> Pago
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
            <Clock size={12} /> Pendente
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800/50 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
            <Clock size={12} /> Expirado
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
            <XCircle size={12} /> Cancelado
          </span>
        );
    }
  }

  function getTicketStatusBadge(status: Ticket['status']) {
    switch (status) {
      case 'VALID':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 size={12} /> Válido
          </span>
        );
      case 'USED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
            <Check size={12} /> Utilizado
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
            <XCircle size={12} /> Cancelado
          </span>
        );
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1726]">
      <main className="site-container py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-50">Minha Conta</h1>
          <p className="text-sm text-slate-300 mt-1">
            Gerencie seus ingressos comprados e acompanhe o histórico de pedidos.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-8 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'tickets'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TicketIcon size={16} />
            Meus Ingressos
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {tickets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag size={16} />
            Histórico de Pedidos
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {orders.length}
            </span>
          </button>
        </div>

        {/* Global Loading / Error */}
        {isLoading && <Loading message="Carregando informações..." />}

        {!isLoading && error && (
          <ErrorState
            title="Não foi possível carregar os dados"
            message={error}
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        )}

        {/* Tickets Tab Content */}
        {!isLoading && !error && activeTab === 'tickets' && (
          <div>
            {tickets.length === 0 ? (
              <EmptyState
                title="Você ainda não possui ingressos"
                description="Seus ingressos adquiridos para eventos aparecerão aqui."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-xl border border-white/10 bg-[#122337] p-5 flex flex-col justify-between space-y-4 hover:border-white/20 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-bold text-slate-100 text-base leading-snug">
                          {ticket.event?.title || 'Evento'}
                        </h3>
                        <div>{getTicketStatusBadge(ticket.status)}</div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                        {ticket.event?.startsAt && (
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            <span>{formatDateTime(ticket.event.startsAt)}</span>
                          </div>
                        )}
                        {ticket.event?.location && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400" />
                            <span>{ticket.event.location}</span>
                          </div>
                        )}
                        {ticket.lot && (
                          <div className="flex items-center gap-2">
                            <TicketIcon size={14} className="text-slate-400" />
                            <span>
                              {ticket.lot.name} • {formatCurrency(ticket.lot.price)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Código do Ingresso:</span>
                        {ticket.status === 'USED' && ticket.checkin && (
                          <span className="text-blue-300">
                            Check-in em: {formatDateTime(ticket.checkin.checkedInAt)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-[#0b1726] p-2.5">
                        <code className="font-mono text-sm font-bold tracking-wider text-indigo-300">
                          {ticket.code}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(ticket.code)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                          title="Copiar código"
                        >
                          {copiedCode === ticket.code ? (
                            <>
                              <Check size={14} className="text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Link
                          to={`/events/${ticket.eventId}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                        >
                          Ver detalhes do evento <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab Content */}
        {!isLoading && !error && activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <EmptyState
                title="Nenhum pedido encontrado"
                description="Seus pedidos de reserva e compra de ingressos aparecerão aqui."
              />
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  // Check RN-06 cancellation policy
                  const firstItem = order.items?.[0];
                  const eventStartsAt = firstItem?.lot?.event?.startsAt;
                  const diffMs = eventStartsAt ? new Date(eventStartsAt).getTime() - now : Infinity;
                  const isLockedByRN06 = diffMs < TWELVE_HOURS_MS;

                  const canCancel =
                    order.status === 'PENDING' || (order.status === 'PAID' && !isLockedByRN06);

                  return (
                    <div
                      key={order.id}
                      className="rounded-xl border border-white/10 bg-[#122337] p-5 space-y-4 hover:border-white/20 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-100 text-base">
                              Pedido #{order.id}
                            </h3>
                            {getOrderStatusBadge(order.status)}
                          </div>
                          <p className="text-xs text-slate-400">
                            Realizado em: {formatDateTime(order.createdAt)}
                            {order.paidAt && ` • Pago em: ${formatDateTime(order.paidAt)}`}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs text-slate-400">Total do pedido</p>
                          <p className="font-bold text-lg text-white">
                            {formatCurrency(order.total)}
                          </p>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        {order.items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 gap-1 bg-[#0b1726]/60 rounded-lg p-2.5 border border-white/5"
                          >
                            <div>
                              <strong className="text-slate-100">
                                {item.lot?.event?.title || 'Evento'}
                              </strong>
                              <span className="text-slate-400 ml-2">
                                (Lote: {item.lot?.name || 'Ingresso'})
                              </span>
                            </div>
                            <div>
                              <span>
                                {item.quantity}x {formatCurrency(item.unitPriceSnapshot)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Actions and RN-06 Alerts */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/10 pt-3">
                        <div className="text-xs">
                          {order.status === 'PAID' && isLockedByRN06 && (
                            <div className="flex items-center gap-1.5 text-amber-300">
                              <AlertTriangle size={14} className="shrink-0" />
                              <span>Cancelamento bloqueado a menos de 12h do evento (RN-06).</span>
                            </div>
                          )}
                          {order.status === 'PAID' && !isLockedByRN06 && (
                            <span className="text-slate-400">
                              Cancelamento disponível até 12 horas antes do evento.
                            </span>
                          )}
                          {order.status === 'PENDING' && (
                            <span className="text-amber-400">Reserva pendente de pagamento.</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => setCancellingOrder(order)}
                              className="button-ghost small text-xs text-red-400 hover:text-red-300"
                            >
                              Cancelar {order.status === 'PAID' ? 'pedido' : 'reserva'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#122337] p-6 text-slate-100 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-bold">Confirmar cancelamento</h3>
              </div>

              <p className="text-sm text-slate-300">
                Você tem certeza que deseja cancelar o Pedido #{cancellingOrder.id}?
              </p>

              {cancellingOrder.status === 'PAID' && (
                <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-300 space-y-1">
                  <p className="font-semibold">Atenção (Regra RN-06):</p>
                  <p>
                    Ao cancelar este pedido pago, todos os ingressos associados serão imediatamente
                    invalidados e os lugares retornarão para a disponibilidade do lote.
                  </p>
                </div>
              )}

              {cancelError && (
                <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-300">
                  {cancelError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => {
                    setCancellingOrder(null);
                    setCancelError(null);
                  }}
                  className="button-ghost small"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancel}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
