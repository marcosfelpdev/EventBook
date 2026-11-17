import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MyTicketsPage } from '../MyTicketsPage';
import { ticketsService } from '../../services/ticketsService';
import { ordersService } from '../../services/ordersService';

vi.mock('../../services/ticketsService', () => ({
  ticketsService: {
    listMyTickets: vi.fn(),
  },
}));

vi.mock('../../services/ordersService', () => ({
  ordersService: {
    listMyOrders: vi.fn(),
    cancel: vi.fn(),
  },
}));

describe('MyTicketsPage (Issues #75 e #76)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza ingressos do usuário com código e status', async () => {
    vi.mocked(ticketsService.listMyTickets).mockResolvedValue({
      data: [
        {
          id: 1,
          code: 'TKT-10-101-ABCD1234',
          status: 'VALID',
          eventId: 5,
          lotId: 101,
          orderId: 10,
          createdAt: new Date().toISOString(),
          event: {
            id: 5,
            title: 'Festival da Primavera',
            description: 'Descrição do festival',
            location: 'Parque Central',
            startsAt: new Date(Date.now() + 86400000).toISOString(),
            endsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
            status: 'PUBLISHED',
          },
          lot: {
            id: 101,
            name: 'Pista Inteira',
            price: '80.00',
          },
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
    });

    vi.mocked(ordersService.listMyOrders).mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 50,
      total: 0,
    });

    render(
      <BrowserRouter>
        <MyTicketsPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Festival da Primavera')).toBeDefined();
    });

    expect(screen.getByText('TKT-10-101-ABCD1234')).toBeDefined();
    expect(screen.getByText(/Válido/i)).toBeDefined();
    expect(screen.getByText(/Parque Central/i)).toBeDefined();
    expect(screen.getByText(/Pista Inteira/i)).toBeDefined();
  });

  it('exibe empty state quando não há ingressos', async () => {
    vi.mocked(ticketsService.listMyTickets).mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 50,
      total: 0,
    });

    vi.mocked(ordersService.listMyOrders).mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 50,
      total: 0,
    });

    render(
      <BrowserRouter>
        <MyTicketsPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Você ainda não possui ingressos/i)).toBeDefined();
    });
  });

  it('bloqueia cancelamento de pedido a menos de 12h do evento com aviso da RN-06', async () => {
    vi.mocked(ticketsService.listMyTickets).mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 50,
      total: 0,
    });

    // Evento em 2 horas (< 12h)
    const soonDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    vi.mocked(ordersService.listMyOrders).mockResolvedValue({
      data: [
        {
          id: 99,
          status: 'PAID',
          total: '120.00',
          expiresAt: soonDate,
          createdAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          items: [
            {
              id: 1,
              orderId: 99,
              lotId: 2,
              quantity: 1,
              unitPriceSnapshot: '120.00',
              lot: {
                id: 2,
                name: 'VIP',
                price: '120.00',
                event: {
                  id: 1,
                  title: 'Show Iminente',
                  startsAt: soonDate,
                  endsAt: soonDate,
                  location: 'Teatro',
                },
              },
            },
          ],
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
    });

    render(
      <BrowserRouter>
        <MyTicketsPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Histórico de Pedidos/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Histórico de Pedidos/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pedido #99/i)).toBeDefined();
    });

    expect(
      screen.getByText(/Cancelamento bloqueado a menos de 12h do evento \(RN-06\)/i),
    ).toBeDefined();

    // Botão de cancelamento não deve estar visível/habilitado para pedidos bloqueados
    expect(screen.queryByRole('button', { name: /Cancelar pedido/i })).toBeNull();
  });

  it('permite cancelamento de pedido pago quando faltam mais de 12h para o evento', async () => {
    vi.mocked(ticketsService.listMyTickets).mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 50,
      total: 0,
    });

    // Evento em 48 horas (> 12h)
    const farDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    vi.mocked(ordersService.listMyOrders).mockResolvedValue({
      data: [
        {
          id: 100,
          status: 'PAID',
          total: '200.00',
          expiresAt: farDate,
          createdAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          items: [
            {
              id: 2,
              orderId: 100,
              lotId: 3,
              quantity: 2,
              unitPriceSnapshot: '100.00',
              lot: {
                id: 3,
                name: 'Camarote',
                price: '100.00',
                event: {
                  id: 2,
                  title: 'Mega Festival',
                  startsAt: farDate,
                  endsAt: farDate,
                  location: 'Arena',
                },
              },
            },
          ],
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
    });

    render(
      <BrowserRouter>
        <MyTicketsPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Histórico de Pedidos/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Histórico de Pedidos/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pedido #100/i)).toBeDefined();
    });

    const cancelButton = screen.getByRole('button', { name: /Cancelar pedido/i });
    expect(cancelButton).toBeDefined();

    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Confirmar cancelamento/i })).toBeDefined();
      expect(screen.getByText(/Atenção \(Regra RN-06\):/i)).toBeDefined();
    });
  });
});
