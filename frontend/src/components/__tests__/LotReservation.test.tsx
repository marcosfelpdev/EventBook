import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LotReservation } from '../LotReservation';
import { ordersService } from '../../services/ordersService';
import type { TicketLot } from '../../types/lot';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 7, name: 'Comprador Teste', email: 'buyer@test.com', role: 'BUYER' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../services/ordersService', () => ({
  ordersService: {
    create: vi.fn(),
    cancel: vi.fn(),
    checkout: vi.fn(),
  },
}));

describe('LotReservation - Simulação de Pagamento (RN-05)', () => {
  const mockLot: TicketLot = {
    id: 1,
    eventId: 10,
    name: 'Lote Promocional',
    price: 50.0,
    quantity: 100,
    salesStartAt: '2026-01-01T00:00:00Z',
    salesEndAt: '2026-12-31T23:59:59Z',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite reservar e exibe formulário de simulação de pagamento', async () => {
    vi.mocked(ordersService.create).mockResolvedValue({
      id: 42,
      status: 'PENDING',
      total: '100.00',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });

    render(
      <BrowserRouter>
        <LotReservation lot={mockLot} available={true} />
      </BrowserRouter>,
    );

    const reserveButton = screen.getByRole('button', { name: /Reservar/i });
    fireEvent.click(reserveButton);

    await waitFor(() => {
      expect(screen.getByText(/Reserva #42 confirmada/i)).toBeDefined();
    });

    expect(screen.getByText(/Simulação de Pagamento/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Pagar Ingressos/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Cancelar reserva/i })).toBeDefined();
  });

  it('processa pagamento com sucesso e exibe confirmação e link para Meus Ingressos', async () => {
    vi.mocked(ordersService.create).mockResolvedValue({
      id: 42,
      status: 'PENDING',
      total: '100.00',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });

    vi.mocked(ordersService.checkout).mockResolvedValue({
      id: 42,
      status: 'PAID',
      total: '100.00',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      paidAt: new Date().toISOString(),
    });

    render(
      <BrowserRouter>
        <LotReservation lot={mockLot} available={true} />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Reservar/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pagar Ingressos/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Pagar Ingressos/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pagamento Aprovado com Sucesso!/i)).toBeDefined();
      expect(screen.getByText(/Ver Meus Ingressos/i)).toBeDefined();
    });

    expect(ordersService.checkout).toHaveBeenCalledWith(42, {
      paymentMethod: 'CREDIT_CARD',
      simulateFailure: false,
    });
  });

  it('exibe estado de falha com opção de tentar novamente quando o pagamento falha', async () => {
    vi.mocked(ordersService.create).mockResolvedValue({
      id: 42,
      status: 'PENDING',
      total: '100.00',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });

    vi.mocked(ordersService.checkout).mockRejectedValue({
      code: 'PAYMENT_FAILED',
      message: 'Falha no processamento do pagamento simulado.',
    });

    render(
      <BrowserRouter>
        <LotReservation lot={mockLot} available={true} />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Reservar/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pagar Ingressos/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Pagar Ingressos/i }));

    await waitFor(() => {
      expect(screen.getByText(/Falha no processamento do pagamento simulado./i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeDefined();
    });
  });
});
