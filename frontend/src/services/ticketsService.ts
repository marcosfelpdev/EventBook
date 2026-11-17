import { api } from './api';
import type { CheckinResult, CheckinError, Ticket } from '../types/ticket';

export interface CheckinPayload {
  code: string;
}

export interface PaginatedTickets {
  data: Ticket[];
  page: number;
  pageSize: number;
  total: number;
}

export const ticketsService = {
  async checkin(code: string): Promise<CheckinResult> {
    try {
      const response = await api.post<CheckinResult>(
        `/tickets/${encodeURIComponent(code)}/checkin`,
      );
      return response.data;
    } catch (err: unknown) {
      const error = err as CheckinError;
      throw {
        status: error.status,
        code: error.code,
        message: error.message || 'Erro ao realizar o check-in.',
        details: error.details,
      };
    }
  },
  async listMyTickets(page = 1, pageSize = 20): Promise<PaginatedTickets> {
    const response = await api.get<PaginatedTickets>('/tickets/me', {
      params: { page, pageSize },
    });
    return response.data;
  },
};
