import { useState, useEffect } from 'react';
import { BarChart3, Users, CheckCircle2, DollarSign, Ticket, X, AlertCircle } from 'lucide-react';
import { occupancyService, type EventOccupancy } from '../services/occupancyService';
import type { Event } from '../types/event';
import type { ApiError } from '../services/api';
import { Loading } from './Loading';

interface OccupancyModalProps {
  event: Event;
  onClose: () => void;
}

export function OccupancyModal({ event, onClose }: OccupancyModalProps) {
  const [occupancy, setOccupancy] = useState<EventOccupancy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOccupancy() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await occupancyService.getEventOccupancy(event.id);
        if (isMounted) {
          setOccupancy(data);
        }
      } catch (err) {
        if (isMounted) {
          const apiError = err as ApiError;
          setErrorMessage(apiError.message || 'Não foi possível carregar as métricas de ocupação.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchOccupancy();

    return () => {
      isMounted = false;
    };
  }, [event.id]);

  function formatCurrency(val: string | number) {
    return Number(val).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl border border-white/10 bg-[#122337] p-6 text-slate-100 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <BarChart3 size={20} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Estatísticas e Ocupação (RN-10)
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{event.title}</h2>
            <p className="text-xs text-slate-300 mt-1">
              Métricas agregadas diretamente no banco de dados em tempo real.
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

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <Loading message="Calculando ocupação e métricas no banco..." />
        ) : occupancy ? (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Capacidade */}
              <div className="rounded-xl border border-white/10 bg-[#0b1726] p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium">Capacidade</span>
                  <Users size={16} className="text-indigo-400" />
                </div>
                <p className="text-2xl font-bold text-white">{occupancy.capacity}</p>
                <p className="text-[11px] text-slate-400">
                  Lotes: {occupancy.totalLotsQuantity} lugares
                </p>
              </div>

              {/* Vendidos */}
              <div className="rounded-xl border border-white/10 bg-[#0b1726] p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium">Ingressos Vendidos</span>
                  <Ticket size={16} className="text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400">{occupancy.soldTickets}</p>
                <div className="flex items-center gap-1 text-[11px] text-emerald-300/80">
                  <span>{occupancy.occupancyRate}% de ocupação</span>
                </div>
              </div>

              {/* Check-ins */}
              <div className="rounded-xl border border-white/10 bg-[#0b1726] p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium">Check-ins</span>
                  <CheckCircle2 size={16} className="text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-blue-400">{occupancy.checkedInTickets}</p>
                <p className="text-[11px] text-blue-300/80">
                  {occupancy.checkinRate}% comparecimento
                </p>
              </div>

              {/* Receita Total */}
              <div className="rounded-xl border border-white/10 bg-[#0b1726] p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium">Receita Estimada</span>
                  <DollarSign size={16} className="text-amber-400" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-amber-300">
                  {formatCurrency(occupancy.totalRevenue)}
                </p>
                <p className="text-[11px] text-slate-400">Total arrecadado</p>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="rounded-xl border border-white/10 bg-[#0b1726] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">Ocupação Geral do Evento</span>
                <span className="text-emerald-400 font-bold">{occupancy.occupancyRate}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, occupancy.occupancyRate)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{occupancy.soldTickets} ingressos emitidos</span>
                <span>
                  {Math.max(0, occupancy.capacity - occupancy.soldTickets)} lugares restantes
                </span>
              </div>
            </div>

            {/* Lots Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Desempenho por Lote ({occupancy.lots.length})
              </h3>

              {occupancy.lots.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-400 text-sm">
                  Nenhum lote cadastrado para este evento.
                </div>
              ) : (
                <div className="space-y-3">
                  {occupancy.lots.map((lot) => (
                    <div
                      key={lot.lotId}
                      className="rounded-xl border border-white/5 bg-[#0b1726]/60 p-4 space-y-3 hover:border-white/10 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <h4 className="font-bold text-slate-100 text-sm">{lot.lotName}</h4>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatCurrency(lot.price)} por ingresso
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-300">
                            <strong>{lot.sold}</strong> / {lot.quantity} vendidos
                          </span>
                          <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 font-bold text-indigo-300">
                            {lot.occupancyRate}%
                          </span>
                        </div>
                      </div>

                      {/* Lot Progress Bar */}
                      <div className="space-y-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, lot.occupancyRate)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Check-ins: {lot.checkedIn}</span>
                          <span>Disponíveis: {lot.available}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

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
