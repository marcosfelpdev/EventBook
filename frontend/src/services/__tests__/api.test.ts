import { describe, it, expect } from 'vitest';
import { api, type ApiError } from '../api';

describe('API Service & Error Audit (Issue #89)', () => {
  it('deve mapear erros com códigos HTTP 400, 401, 403, 404, 409, 422, 429 e 500 para mensagens amigáveis', async () => {
    const errorCodes = [400, 401, 403, 404, 409, 422, 429, 500];

    for (const status of errorCodes) {
      api.defaults.adapter = async () => {
        const error = new Error('Request failed') as unknown as {
          response: { status: number; data: Record<string, unknown> };
        };
        error.response = { status, data: {} };
        throw error;
      };

      try {
        await api.get('/test-error');
        expect.unreachable('Deveria ter lançado erro');
      } catch (err) {
        const apiError = err as ApiError;
        expect(apiError.status).toBe(status);
        expect(typeof apiError.message).toBe('string');
        expect(apiError.message.length).toBeGreaterThan(5);
      }
    }
  });

  it('deve preservar mensagens customizadas retornadas pela API se presentes', async () => {
    api.defaults.adapter = async () => {
      const error = new Error('Request failed') as unknown as {
        response: { status: number; data: Record<string, unknown> };
      };
      error.response = {
        status: 422,
        data: {
          code: 'CANCELLATION_WINDOW_CLOSED',
          message: 'Cancelamento permitido apenas com 12h de antecedência.',
        },
      };
      throw error;
    };

    try {
      await api.get('/test-custom');
      expect.unreachable('Deveria ter lançado erro');
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError.status).toBe(422);
      expect(apiError.code).toBe('CANCELLATION_WINDOW_CLOSED');
      expect(apiError.message).toBe('Cancelamento permitido apenas com 12h de antecedência.');
    }
  });
});
