import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
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
  const [error, setError] = useState('');
  const seconds = order ? Math.max(0, Math.ceil((Date.parse(order.expiresAt) - now) / 1000)) : 0;
  const pending = order?.status === 'PENDING' && seconds > 0;

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

  return (
    <div className="mt-4 border-t border-dashed border-white/20 pt-4 text-sm">
      {error && (
        <p role="alert" className="mb-3 text-red-300">
          {error}
        </p>
      )}
      {order && pending ? (
        <div className="space-y-2">
          <p role="status" className="font-bold text-emerald-300">
            Reserva #{order.id} confirmada
          </p>
          <p>
            Total reservado:{' '}
            {Number(order.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p>
            Tempo restante:{' '}
            <span role="timer">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </span>
          </p>
          <p className="text-slate-300">Nenhum pagamento foi realizado.</p>
          <button
            type="button"
            disabled={busy}
            className="button-ghost"
            onClick={() => void cancel(order.id)}
          >
            Cancelar reserva
          </button>
        </div>
      ) : (
        <>
          {order?.status === 'CANCELLED' && (
            <p role="status" className="mb-3">
              Reserva cancelada.
            </p>
          )}
          {(order?.status === 'EXPIRED' || order?.status === 'PENDING') && (
            <p role="status" className="mb-3">
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
              <label className="grid gap-1">
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
                  className="w-20 rounded-lg border border-slate-600 bg-[#0b1726] p-2"
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
