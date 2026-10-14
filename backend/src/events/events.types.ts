export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface Event {
  id: number;
  organizer_id: number;
  title: string;
  description: string;
  location: string;
  capacity: number;
  starts_at: Date;
  ends_at: Date;
  status: EventStatus;
  created_at: Date;
}