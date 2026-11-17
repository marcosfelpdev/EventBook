import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OccupancyModal } from '../OccupancyModal';
import { occupancyService } from '../../services/occupancyService';
import type { Event } from '../../types/event';

vi.mock('../../services/occupancyService', () => ({
  occupancyService: {
    getEventOccupancy: vi.fn(),
  },
}));

describe('OccupancyModal (Milestone 08 - RN-10)', () => {
  const mockEvent: Event = {
    id: 1,
    title: 'Festival da Primavera',
    description: 'Festival ao ar livre',
    location: 'Parque Central',
    capacity: 200,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'PUBLISHED',
    organizerId: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os cards de KPI de ocupação e receita', async () => {
    vi.mocked(occupancyService.getEventOccupancy).mockResolvedValue({
      eventId: 1,
      title: 'Festival da Primavera',
      capacity: 200,
      totalLotsQuantity: 150,
      soldTickets: 60,
      checkedInTickets: 40,
      totalRevenue: '4400.00',
      occupancyRate: 30,
      checkinRate: 66.67,
      lots: [
        {
          lotId: 1,
          lotName: 'Pista',
          price: '50.00',
          quantity: 100,
          sold: 40,
          checkedIn: 25,
          available: 60,
          occupancyRate: 40,
        },
        {
          lotId: 2,
          lotName: 'Camarote',
          price: '120.00',
          quantity: 50,
          sold: 20,
          checkedIn: 15,
          available: 30,
          occupancyRate: 40,
        },
      ],
    });

    render(<OccupancyModal event={mockEvent} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Festival da Primavera')).toBeDefined();
    });

    expect(screen.getByText(/Estatísticas e Ocupação \(RN-10\)/i)).toBeDefined();
    expect(screen.getByText('200')).toBeDefined(); // capacidade
    expect(screen.getByText('60')).toBeDefined(); // vendidos
    expect(screen.getAllByText('40').length).toBeGreaterThan(0); // checkins / vendidos lote
    expect(screen.getByText(/30% de ocupação/i)).toBeDefined();
    expect(screen.getByText(/66.67% comparecimento/i)).toBeDefined();

    // Lotes
    expect(screen.getByText('Pista')).toBeDefined();
    expect(screen.getByText('Camarote')).toBeDefined();
  });

  it('exibe mensagem de erro quando o serviço falha', async () => {
    vi.mocked(occupancyService.getEventOccupancy).mockRejectedValue({
      message: 'Falha ao buscar ocupação.',
    });

    render(<OccupancyModal event={mockEvent} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Falha ao buscar ocupação.')).toBeDefined();
    });
  });
});
