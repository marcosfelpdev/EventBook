export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  capacity: number;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  organizerId: number | string;
  createdAt?: string;
  organizer?: {
    id: number | string;
    name: string;
    email: string;
  };
}

export interface PaginatedEvents {
  data: Event[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  location: string;
  capacity: number;
  startsAt: string;
  endsAt: string;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  location?: string;
  capacity?: number;
  startsAt?: string;
  endsAt?: string;
  status?: EventStatus;
}
