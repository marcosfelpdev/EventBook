import { api } from './api';
import type { Ticket } from '../types/ticket';

export interface OrderItem {
  id: number;
  orderId: number;
  lotId: number;
  quantity: number;
  unitPriceSnapshot: string;
  lot?: {
    id: number;
    name: string;
    price: string | number;
    event?: {
      id: number;
      title: string;
      startsAt: string;
      endsAt: string;
      location: string;
    };
  };
}

export interface Order {
  id: number;
  userId?: number;
  status: 'PENDING' | 'EXPIRED' | 'CANCELLED' | 'PAID';
  total: string;
  expiresAt: string;
  createdAt?: string;
  paidAt?: string | null;
  cancelledAt?: string | null;
  items?: OrderItem[];
  tickets?: Ticket[];
}

export interface CheckoutPayload {
  paymentMethod?: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  simulateFailure?: boolean;
}

export interface PaginatedOrders {
  data: Order[];
  page: number;
  pageSize: number;
  total: number;
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
  async checkout(id: number, payload?: CheckoutPayload) {
    const response = await api.post<Order>(`/orders/${id}/checkout`, payload ?? {});
    return response.data;
  },
  async listMyOrders(page = 1, pageSize = 20) {
    const response = await api.get<PaginatedOrders>('/orders/me', {
      params: { page, pageSize },
    });
    return response.data;
  },
};
