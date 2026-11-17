import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, CreditCard, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { TicketLot } from '../types/lot';
import type { ApiError } from '../services/api';
import { ordersService, type Order } from '../services/ordersService';

export function LotReservation({ lot, available }: { lot: TicketLot; available: boolean }) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState('1');
  const [order, setOrder] = useState<Order>();
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX' | 'BOLETO'>(
    'CREDIT_CARD',
  );
  const [simulateFailure, setSimulateFailure] = useState(false);

  const seconds = order ? Math.max(0, Math.ceil((Date.parse(order.expiresAt) - now) / 1000)) : 0;
  const pending = order?.status === 'PENDING' && seconds > 0;
  const isPaid = order?.status === 'PAID';

  useEffect(() => {
    if (!pending) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !available || pending) {
      return;
    }
    setBusy(true);
    setError('');
    setPaymentError('');
    try {
      const result = await ordersService.create(lot.id, Number(quantity));
      setNow(Date.now());
      setOrder(result);
    } catch (failure) {
      setError((failure as ApiError).message || 'Não foi possível reservar os ingressos.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: number) {
    setBusy(true);
    setError('');
    setPaymentError('');
    try {
      setOrder(await ordersService.cancel(id));
    } catch (failure) {
      const apiError = failure as ApiError;
      if (apiError.code === 'ORDER_EXPIRED') {
        setNow(Date.now());
        setOrder((current) => current && { ...current, status: 'EXPIRED' });
      } else {
        setError(apiError.message || 'Não foi possível cancelar a reserva.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    if (!order || paying || busy) return;
    setPaying(true);
    setPaymentError('');
    try {
      const updatedOrder = await ordersService.checkout(order.id, {
        paymentMethod,
        simulateFailure,
      });
      setOrder(updatedOrder);
    } catch (err) {
      const apiError = err as ApiError;
      setPaymentError(apiError.message || 'Falha no processamento do pagamento simulado.');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="mt-4 border-t border-dashed border-white/20 pt-4 text-sm">
      {error && (
        <p role="alert" className="mb-3 text-red-300">
          {error}
        </p>
      )}

      {isPaid ? (
        <div className="rounded-xl border border-emerald-500/30 bg-[#122337] p-4 text-slate-100 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCircle2 size={18} />
            <span>Pagamento Aprovado com Sucesso!</span>
          </div>
          <p className="text-slate-300 text-xs">
            Pedido #{order.id} concluído. Seus ingressos já estão emitidos e disponíveis na sua
            conta.
          </p>
          <div className="pt-2">
            <Link
              to="/my-tickets"
              className="button-primary small inline-flex items-center gap-1.5"
            >
              <Ticket size={15} />
              Ver Meus Ingressos
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : order && pending ? (
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#122337] p-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p role="status" className="font-bold text-emerald-300">
                Reserva #{order.id} confirmada
              </p>
              <span
                role="timer"
                className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/20"
              >
                Expira em {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
              </span>
            </div>
            <p className="text-slate-200">
              Total a pagar:{' '}
              <strong className="text-white">
                {Number(order.total).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </strong>
            </p>
          </div>

          <div className="border-t border-white/10 pt-3 space-y-3">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Simulação de Pagamento
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-colors ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                    : 'border-slate-700 bg-[#0b1726] text-slate-300 hover:border-slate-500'
                }`}
              >
                Cartão
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('PIX')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-colors ${
                  paymentMethod === 'PIX'
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                    : 'border-slate-700 bg-[#0b1726] text-slate-300 hover:border-slate-500'
                }`}
              >
                Pix
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BOLETO')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-colors ${
                  paymentMethod === 'BOLETO'
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                    : 'border-slate-700 bg-[#0b1726] text-slate-300 hover:border-slate-500'
                }`}
              >
                Boleto
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="rounded border-slate-700 bg-[#0b1726] text-indigo-600 focus:ring-0"
              />
              <span>Simular falha no gateway (teste de rollback)</span>
            </label>

            {paymentError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/20 p-2.5 text-xs text-red-300"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
                <div className="flex-1">
                  <p>{paymentError}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={paying || busy}
                onClick={checkout}
                className="button-primary small flex items-center gap-1.5"
              >
                {paying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Processando...
                  </>
                ) : paymentError ? (
                  <>
                    <RefreshCw size={14} />
                    Tentar novamente
                  </>
                ) : (
                  <>
                    <CreditCard size={14} />
                    Pagar Ingressos
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={paying || busy}
                className="button-ghost small text-xs"
                onClick={() => void cancel(order.id)}
              >
                Cancelar reserva
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {order?.status === 'CANCELLED' && (
            <p role="status" className="mb-3 text-slate-400">
              Reserva cancelada.
            </p>
          )}
          {(order?.status === 'EXPIRED' || (order?.status === 'PENDING' && seconds <= 0)) && (
            <p role="status" className="mb-3 text-amber-300">
              A reserva expirou.
            </p>
          )}
          {available && !user && (
            <Link
              to="/login"
              state={{ returnTo: `/events/${lot.eventId}` }}
              className="button-ghost"
            >
              Entrar para reservar
            </Link>
          )}
          {available && user?.role === 'BUYER' && (
            <form onSubmit={reserve} className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-slate-200">
                Ingressos
                <input
                  type="number"
                  min={1}
                  max={lot.quantity}
                  step={1}
                  required
                  value={quantity}
                  disabled={busy}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-20 rounded-lg border border-slate-600 bg-[#0b1726] p-2 text-white"
                />
              </label>
              <button type="submit" disabled={busy} className="button-primary small">
                <Ticket size={16} />
                {busy ? 'Reservando…' : 'Reservar'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
