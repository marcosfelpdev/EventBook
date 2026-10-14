import type { Event } from "./events.types";

export interface ListPublishedEventsParams {
  skip: number;
  take: number;
}

export interface EventsRepository {
  findPublished(params: ListPublishedEventsParams): Promise<Event[]>;
  countPublished(): Promise<number>;
  findById(id: number): Promise<Event | null>;
}