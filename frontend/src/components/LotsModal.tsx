import { useState, useEffect, type FormEvent } from 'react';
import { lotsService } from '../services/lotsService';
import type { Event } from '../types/event';
import type { TicketLot, CreateLotPayload, UpdateLotPayload } from '../types/lot';
import type { ApiError } from '../services/api';
import { Loading } from './Loading';

interface LotsModalProps {
  event: Event;
  onClose: () => void;
  onLotsChanged?: () => void;
}

export function LotsModal({ event, onClose, onLotsChanged }: LotsModalProps) {
  const [lots, setLots] = useState<TicketLot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<TicketLot | null>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | string>(50);
  const [quantity, setQuantity] = useState<number | string>(100);
  const [salesStartAt, setSalesStartAt] = useState('');
  const [salesEndAt, setSalesEndAt] = useState('');
  const [active, setActive] = useState(true);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formApiError, setFormApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchLots() {
      try {
        const data = await lotsService.listLots(event.id);
        if (isMounted) {
          setLots(data);
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Não foi possível carregar os lotes deste evento.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchLots();

    return () => {
      isMounted = false;
    };
  }, [event.id, reloadKey]);

  const totalAllocated = lots.reduce((acc, l) => acc + l.quantity, 0);
  const remainingCapacity = Math.max(0, event.capacity - totalAllocated);
  const capacityPercent = Math.min(100, Math.round((totalAllocated / event.capacity) * 100));

  function openCreateLotForm() {
    setEditingLot(null);
    setName('');
    setPrice(50);
    setQuantity(Math.min(100, remainingCapacity || 50));

    // Default dates: now to event endsAt
    const now = new Date();
    setSalesStartAt(now.toISOString().slice(0, 16));
    setSalesEndAt(new Date(event.endsAt).toISOString().slice(0, 16));
    setActive(true);

    setFormErrors({});
    setFormApiError(null);
    setIsFormOpen(true);
  }

  function openEditLotForm(lot: TicketLot) {
    setEditingLot(lot);
    setName(lot.name);
    setPrice(lot.price);
    setQuantity(lot.quantity);
    setSalesStartAt(new Date(lot.salesStartAt).toISOString().slice(0, 16));
    setSalesEndAt(new Date(lot.salesEndAt).toISOString().slice(0, 16));
    setActive(lot.active);

    setFormErrors({});
    setFormApiError(null);
    setIsFormOpen(true);
  }

  function closeLotForm() {
    setIsFormOpen(false);
    setEditingLot(null);
    setFormErrors({});
    setFormApiError(null);
  }

  function validateLotForm(): boolean {
    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 3) {
      errors.name = 'O nome do lote deve ter pelo menos 3 caracteres.';
    }

    if (price === '' || Number(price) < 0) {
      errors.price = 'O preço deve ser maior ou igual a zero.';
    }

    const qty = Number(quantity);
    if (!quantity || qty < 1) {
      errors.quantity = 'A quantidade mínima é de 1 ingresso.';
    } else {
      const otherLotsTotal = lots
        .filter((l) => !editingLot || l.id !== editingLot.id)
        .reduce((acc, l) => acc + l.quantity, 0);

      if (otherLotsTotal + qty > event.capacity) {
        errors.quantity = `A quantidade excede a capacidade do evento (${otherLotsTotal + qty} > ${event.capacity}).`;
      }
    }

    if (!salesStartAt) {
      errors.salesStartAt = 'Informe a data de início das vendas.';
    }

    if (!salesEndAt) {
      errors.salesEndAt = 'Informe a data de término das vendas.';
    }

    if (salesStartAt && salesEndAt) {
      const start = new Date(salesStartAt);
      const end = new Date(salesEndAt);
      const eventEnd = new Date(event.endsAt);

      if (end <= start) {
        errors.salesEndAt = 'A data de término deve ser posterior à data de início.';
      }

      if (end > eventEnd) {
        errors.salesEndAt = 'A data de término não pode ultrapassar o término do evento.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmitLot(e: FormEvent) {
    e.preventDefault();
    if (!validateLotForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormApiError(null);

    const payload: CreateLotPayload | UpdateLotPayload = {
      name: name.trim(),
      price: Number(price),
      quantity: Number(quantity),
      salesStartAt: new Date(salesStartAt).toISOString(),
      salesEndAt: new Date(salesEndAt).toISOString(),
      active,
    };

    try {
      if (editingLot) {
        await lotsService.updateLot(event.id, editingLot.id, payload);
      } else {
        await lotsService.createLot(event.id, payload as CreateLotPayload);
      }

      closeLotForm();
      setReloadKey((k) => k + 1);
      onLotsChanged?.();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFormApiError(apiErr.message || 'Erro ao salvar lote. Verifique os dados informados.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(lot: TicketLot) {
    try {
      await lotsService.updateLot(event.id, lot.id, { active: !lot.active });
      setReloadKey((k) => k + 1);
      onLotsChanged?.();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr.message || 'Erro ao alterar status do lote.');
    }
  }

  function formatCurrency(val: number | string) {
    return `R$ ${Number(val).toFixed(2).replace('.', ',')}`;
  }

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Gestão de Lotes
              </span>
              <span className="text-xs text-slate-500 font-mono">ID: {event.id}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{event.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Capacity Bar */}
        <div className="my-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
            <span>Alocação de Capacidade</span>
            <span>
              {totalAllocated} de {event.capacity} ingressos ({capacityPercent}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                capacityPercent >= 100 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 mt-2">
            <span>Disponível para novos lotes: <strong>{remainingCapacity} ingressos</strong></span>
            <span>Capacidade máxima do evento: <strong>{event.capacity}</strong></span>
          </div>
        </div>

        {/* Form Modal (Inline overlay or accordion) */}
        {isFormOpen && (
          <form
            onSubmit={handleSubmitLot}
            className="mb-6 p-5 bg-blue-50/50 border border-blue-200 rounded-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingLot ? `Editar Lote: ${editingLot.name}` : 'Cadastrar Novo Lote'}
              </h3>
              <button
                type="button"
                onClick={closeLotForm}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>

            {formApiError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {formApiError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nome do Lote *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: 1º Lote - Pista"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.name && (
                  <span className="text-red-600 text-[11px] mt-0.5 block">{formErrors.name}</span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preço (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.price && (
                  <span className="text-red-600 text-[11px] mt-0.5 block">{formErrors.price}</span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantidade de Ingressos *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex: 100"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.quantity && (
                  <span className="text-red-600 text-[11px] mt-0.5 block">
                    {formErrors.quantity}
                  </span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Início das Vendas *
                </label>
                <input
                  type="datetime-local"
                  value={salesStartAt}
                  onChange={(e) => setSalesStartAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.salesStartAt && (
                  <span className="text-red-600 text-[11px] mt-0.5 block">
                    {formErrors.salesStartAt}
                  </span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Término das Vendas *
                </label>
                <input
                  type="datetime-local"
                  value={salesEndAt}
                  onChange={(e) => setSalesEndAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.salesEndAt && (
                  <span className="text-red-600 text-[11px] mt-0.5 block">
                    {formErrors.salesEndAt}
                  </span>
                )}
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="lotActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="lotActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Lote ativo (visível para o público e disponível para compra)
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeLotForm}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : editingLot ? 'Atualizar Lote' : 'Salvar Lote'}
              </button>
            </div>
          </form>
        )}

        {/* Action Header */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-800">
            Lotes Cadastrados ({lots.length})
          </h3>

          {!isFormOpen && (
            <button
              type="button"
              onClick={openCreateLotForm}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              + Novo Lote
            </button>
          )}
        </div>

        {/* Lots List */}
        {isLoading && <Loading message="Carregando lotes do evento..." />}

        {!isLoading && errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && lots.length === 0 && (
          <div className="p-8 border border-dashed border-slate-300 rounded-xl text-center bg-slate-50/50">
            <p className="text-sm font-medium text-slate-700 mb-1">
              Nenhum lote cadastrado para este evento.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Eventos precisam de pelo menos 1 lote cadastrado para serem publicados (RN-01).
            </p>
            <button
              type="button"
              onClick={openCreateLotForm}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-sm"
            >
              Cadastrar Primeiro Lote
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && lots.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Quantidade</th>
                  <th className="px-4 py-3">Período de Vendas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {lot.name}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">
                      {formatCurrency(lot.price)}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {lot.quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] leading-relaxed">
                      <div>De: {formatDateTime(lot.salesStartAt)}</div>
                      <div>Até: {formatDateTime(lot.salesEndAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(lot)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider cursor-pointer transition-colors ${
                          lot.active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title="Clique para alternar o status ativo/inativo"
                      >
                        {lot.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditLotForm(lot)}
                        className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
