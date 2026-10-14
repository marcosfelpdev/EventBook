import { describe, expect, it, vi } from "vitest";
import type { Event } from "./events.types";
import type { EventsRepository } from "./events.repository";
import { EventsService } from "./events.service";

function setup(status: Event["status"] = "PUBLISHED") {
  const event: Event = {
    id: 1,
    organizer_id: 10,
    title: "Encontro de Tecnologia",
    description: "Um evento para estudantes.",
    location: "Auditório",
    capacity: 100,
    starts_at: new Date("2027-01-20T18:00:00Z"),
    ends_at: new Date("2027-01-20T22:00:00Z"),
    status,
    created_at: new Date("2026-10-13T12:00:00Z"),
  };

  const repository: EventsRepository = {
    findPublished: vi.fn().mockResolvedValue([]),
    countPublished: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(event),
  };

  return {
    event,
    repository,
    service: new EventsService(repository),
  };
}

describe("Detalhes do evento — regra da #40", () => {
  it("permite consultar um evento publicado sem login", async () => {
    const { service, event, repository } = setup();

    const result = await service.getById(1);

    expect(result).toEqual(event);
    expect(repository.findById).toHaveBeenCalledWith(1);
  });

  it("retorna null quando o evento não existe", async () => {
    const { service, repository } = setup();

    vi.mocked(repository.findById).mockResolvedValue(null);

    expect(await service.getById(999)).toBeNull();
  });

  it.each(["DRAFT", "CANCELLED"] as const)(
    "oculta evento %s de visitantes sem login",
    async (status) => {
      const { service } = setup(status);

      expect(await service.getById(1)).toBeNull();
    },
  );

  it.each(["DRAFT", "CANCELLED"] as const)(
    "oculta evento %s de outro usuário",
    async (status) => {
      const { service } = setup(status);

      expect(await service.getById(1, 20)).toBeNull();
    },
  );

  it.each(["DRAFT", "CANCELLED"] as const)(
    "permite ao dono consultar seu evento %s",
    async (status) => {
      const { service, event } = setup(status);

      expect(await service.getById(1, 10)).toEqual(event);
    },
  );
});