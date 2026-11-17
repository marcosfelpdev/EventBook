import { api } from './api';

export interface LotOccupancy {
  lotId: number;
  lotName: string;
  price: string;
  quantity: number;
  sold: number;
  checkedIn: number;
  available: number;
  occupancyRate: number;
}

export interface EventOccupancy {
  eventId: number;
  title: string;
  capacity: number;
  totalLotsQuantity: number;
  soldTickets: number;
  checkedInTickets: number;
  totalRevenue: string;
  occupancyRate: number;
  checkinRate: number;
  lots: LotOccupancy[];
}

export const occupancyService = {
  async getEventOccupancy(eventId: number): Promise<EventOccupancy> {
    const response = await api.get<EventOccupancy>(`/events/${eventId}/occupancy`);
    return response.data;
  },
};
