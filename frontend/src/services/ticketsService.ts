import { api } from './api';
import type { CheckinResult, CheckinError } from '../types/ticket';

export interface CheckinPayload {
  code: string;
}

export const ticketsService = {
  async checkin(code: string): Promise<CheckinResult> {
    try {
      const response = await api.post<CheckinResult>(`/tickets/${encodeURIComponent(code)}/checkin`);
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
};
