export interface Ticket {
  id: number;
  code: string;
  status: 'VALID' | 'USED' | 'CANCELLED';
  eventId: number;
  lotId: number;
  orderId: number;
  createdAt: string;
  usedAt?: string | null;
}

export interface Checkin {
  id: number;
  ticketId: number;
  staffId: number;
  checkedInAt: string;
  staff: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CheckinResult {
  ticket: Ticket;
  checkin: Checkin;
}

export interface CheckinError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}
