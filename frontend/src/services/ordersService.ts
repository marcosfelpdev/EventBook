import { api } from './api';

export interface Order {
  id: number;
  status: 'PENDING' | 'EXPIRED' | 'CANCELLED' | 'PAID';
  total: string;
  expiresAt: string;
}

export const ordersService = {
  async create(lotId: number, quantity: number) {
    const response = await api.post<Order>('/orders', { lotId, quantity });
    return response.data;
  },
  async cancel(id: number) {
    const response = await api.post<Order>(`/orders/${id}/cancel`);
    return response.data;
  },
};
