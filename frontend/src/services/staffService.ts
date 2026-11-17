import { api } from './api';

export interface StaffMember {
  id: number;
  eventId: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AddStaffPayload {
  userId?: number;
  email?: string;
}

export const staffService = {
  async listStaff(eventId: number): Promise<StaffMember[]> {
    const response = await api.get<StaffMember[]>(`/events/${eventId}/staff`);
    return response.data;
  },

  async addStaff(eventId: number, payload: AddStaffPayload): Promise<StaffMember> {
    const response = await api.post<StaffMember>(`/events/${eventId}/staff`, payload);
    return response.data;
  },

  async removeStaff(eventId: number, userId: number): Promise<void> {
    await api.delete(`/events/${eventId}/staff/${userId}`);
  },
};
