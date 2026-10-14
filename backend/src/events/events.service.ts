import type { EventsRepository } from "./events.repository";

export class EventsService {
  constructor(private readonly repository: EventsRepository) {}

  async listPublished(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.repository.findPublished({
        skip,
        take: limit,
      }),
      this.repository.countPublished(),
    ]);

    return {
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: number, authenticatedUserId?: number) {
    const event = await this.repository.findById(id);

    if (!event) {
      return null;
    }

    const isPublished = event.status === "PUBLISHED";

    const isOwner =
      authenticatedUserId !== undefined &&
      event.organizer_id === authenticatedUserId;

    if (!isPublished && !isOwner) {
      return null;
    }

    return event;
  }
}