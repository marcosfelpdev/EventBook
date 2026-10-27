export interface TicketLot {
  id: number;
  eventId: number;
  name: string;
  price: number | string;
  quantity: number;
  salesStartAt: string;
  salesEndAt: string;
  active: boolean;
  createdAt?: string;
}

export interface CreateLotPayload {
  name: string;
  price: number;
  quantity: number;
  salesStartAt: string;
  salesEndAt: string;
  active?: boolean;
}

export interface UpdateLotPayload {
  name?: string;
  price?: number;
  quantity?: number;
  salesStartAt?: string;
  salesEndAt?: string;
  active?: boolean;
}
