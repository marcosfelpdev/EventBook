import { api } from './api';
import type {
  Event,
  PaginatedEvents,
  CreateEventPayload,
  UpdateEventPayload,
} from '../types/event';

export interface ListEventsParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function listEvents(params?: ListEventsParams): Promise<PaginatedEvents> {
  const response = await api.get<PaginatedEvents>('/events', { params });
  return response.data;
}

export async function getEventById(eventId: number): Promise<Event> {
  const response = await api.get<Event>(`/events/${eventId}`);
  return response.data;
}

export async function createEvent(data: CreateEventPayload): Promise<Event> {
  const response = await api.post<Event>('/events', data);
  return response.data;
}

export async function updateEvent(eventId: number, data: UpdateEventPayload): Promise<Event> {
  const response = await api.patch<Event>(`/events/${eventId}`, data);
  return response.data;
}

export const eventsService = {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
};
