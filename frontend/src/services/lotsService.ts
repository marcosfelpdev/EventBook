import { api } from './api';
import type { TicketLot, CreateLotPayload, UpdateLotPayload } from '../types/lot';

export async function listLots(eventId: number): Promise<TicketLot[]> {
  const response = await api.get<TicketLot[]>(`/events/${eventId}/lots`);
  return response.data;
}

export async function createLot(eventId: number, data: CreateLotPayload): Promise<TicketLot> {
  const response = await api.post<TicketLot>(`/events/${eventId}/lots`, data);
  return response.data;
}

export async function updateLot(
  eventId: number,
  lotId: number,
  data: UpdateLotPayload,
): Promise<TicketLot> {
  const response = await api.patch<TicketLot>(`/events/${eventId}/lots/${lotId}`, data);
  return response.data;
}

export const lotsService = {
  listLots,
  createLot,
  updateLot,
};
