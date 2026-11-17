import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StaffModal } from '../StaffModal';
import { staffService } from '../../services/staffService';
import type { Event } from '../../types/event';

vi.mock('../../services/staffService', () => ({
  staffService: {
    listStaff: vi.fn(),
    addStaff: vi.fn(),
    removeStaff: vi.fn(),
  },
}));

describe('StaffModal (Issue M07 UI)', () => {
  const mockEvent: Event = {
    id: 1,
    title: 'Festival da Primavera',
    description: 'Festival ao ar livre',
    location: 'Parque',
    capacity: 200,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'PUBLISHED',
    organizerId: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza membros da equipe e título do evento', async () => {
    vi.mocked(staffService.listStaff).mockResolvedValue([
      {
        id: 1,
        eventId: 1,
        userId: 20,
        user: { id: 20, name: 'Lucas Staff', email: 'lucas@eventbook.local' },
      },
    ]);

    render(<StaffModal event={mockEvent} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Festival da Primavera')).toBeDefined();
    });

    expect(screen.getByText('Lucas Staff')).toBeDefined();
    expect(screen.getByText(/lucas@eventbook.local/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Remover/i })).toBeDefined();
  });

  it('exibe mensagem quando não há membros na equipe', async () => {
    vi.mocked(staffService.listStaff).mockResolvedValue([]);

    render(<StaffModal event={mockEvent} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum membro da equipe vinculado a este evento/i),
      ).toBeDefined();
    });
  });

  it('adiciona novo membro à equipe ao submeter formulário', async () => {
    vi.mocked(staffService.listStaff).mockResolvedValue([]);
    vi.mocked(staffService.addStaff).mockResolvedValue({
      id: 2,
      eventId: 1,
      userId: 25,
      user: { id: 25, name: 'Novo Membro', email: 'novo@staff.com' },
    });

    render(<StaffModal event={mockEvent} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/E-mail ou ID do usuário STAFF/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/E-mail ou ID do usuário STAFF/i);
    fireEvent.change(input, { target: { value: 'novo@staff.com' } });

    const addButton = screen.getByRole('button', { name: /Adicionar Staff/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(staffService.addStaff).toHaveBeenCalledWith(1, { email: 'novo@staff.com' });
    });
  });

  it('remove membro ao clicar no botão Remover', async () => {
    vi.mocked(staffService.listStaff).mockResolvedValue([
      {
        id: 1,
        eventId: 1,
        userId: 20,
        user: { id: 20, name: 'Lucas Staff', email: 'lucas@eventbook.local' },
      },
    ]);
    vi.mocked(staffService.removeStaff).mockResolvedValue();

    render(<StaffModal event={mockEvent} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Lucas Staff')).toBeDefined();
    });

    const removeBtn = screen.getByRole('button', { name: /Remover/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(staffService.removeStaff).toHaveBeenCalledWith(1, 20);
    });
  });
});
