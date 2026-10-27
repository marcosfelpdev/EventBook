import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LotsModal } from '../LotsModal';
import { lotsService } from '../../services/lotsService';
import type { Event } from '../../types/event';

vi.mock('../../services/lotsService', () => ({
  lotsService: {
    listLots: vi.fn(),
    createLot: vi.fn(),
    updateLot: vi.fn(),
  },
}));

describe('LotsModal', () => {
  const mockEvent: Event = {
    id: 1,
    title: 'Show de Rock',
    description: 'Descrição do show',
    location: 'Estádio',
    capacity: 500,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'DRAFT',
    organizerId: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o título do evento e a barra de capacidade', async () => {
    vi.mocked(lotsService.listLots).mockResolvedValue([]);

    render(<LotsModal event={mockEvent} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Show de Rock')).toBeDefined();
    });
    expect(screen.getByText(/Alocação de Capacidade/i)).toBeDefined();
    expect(screen.getByText(/Capacidade máxima do evento:/i)).toBeDefined();
  });

  it('exibe mensagem quando não há lotes cadastrados', async () => {
    vi.mocked(lotsService.listLots).mockResolvedValue([]);

    render(<LotsModal event={mockEvent} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum lote cadastrado para este evento.')).toBeDefined();
    });
  });

  it('renderiza a lista de lotes quando existem lotes cadastrados', async () => {
    const mockLots = [
      {
        id: 101,
        eventId: 1,
        name: '1º Lote Pista',
        price: 120.0,
        quantity: 250,
        salesStartAt: new Date(Date.now() - 86400000).toISOString(),
        salesEndAt: new Date(Date.now() + 86400000).toISOString(),
        active: true,
      },
    ];

    vi.mocked(lotsService.listLots).mockResolvedValue(mockLots);

    render(<LotsModal event={mockEvent} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('1º Lote Pista')).toBeDefined();
      expect(screen.getByText('R$ 120,00')).toBeDefined();
      expect(screen.getByText('250')).toBeDefined();
    });
  });
});
