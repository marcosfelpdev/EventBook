import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import type { Event } from "./events.types";
import type { EventsRepository } from "./events.repository";

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
    app: createApp(repository),
    repository,
    event,
  };
}

describe("GET /events/:id — acesso público", () => {
  it("retorna os detalhes de um evento publicado sem login", async () => {
    const { app, repository, event } = setup();

    const response = await request(app).get("/events/1");

    expect(response.status).toBe(200);
    expect(repository.findById).toHaveBeenCalledWith(1);
    expect(response.body).toEqual({
      ...event,
      starts_at: event.starts_at.toISOString(),
      ends_at: event.ends_at.toISOString(),
      created_at: event.created_at.toISOString(),
    });
  });

  it("retorna 404 quando o evento não existe", async () => {
    const { app, repository } = setup();

    vi.mocked(repository.findById).mockResolvedValue(null);

    const response = await request(app).get("/events/999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: "NOT_FOUND",
      message: "Evento não encontrado.",
    });
  });

  it.each(["DRAFT", "CANCELLED"] as const)(
    "retorna 404 para evento %s sem login",
    async (status) => {
      const { app } = setup(status);

      const response = await request(app).get("/events/1");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        code: "NOT_FOUND",
        message: "Evento não encontrado.",
      });
    },
  );

  it.each(["0", "-1", "abc", "1.5", "9007199254740992"])(
    "rejeita o ID inválido %s",
    async (id) => {
      const { app, repository } = setup();

      const response = await request(app).get(`/events/${id}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
      expect(repository.findById).not.toHaveBeenCalled();
    },
  );

  it("não aceita organizer_id na URL como prova de identidade", async () => {
    const { app } = setup("DRAFT");

    const response = await request(app)
      .get("/events/1?organizer_id=10");

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("retorna 500 sem expor detalhes internos", async () => {
    const { app, repository } = setup();

    vi.mocked(repository.findById).mockRejectedValue(
      new Error("Detalhe interno da consulta"),
    );

    const response = await request(app).get("/events/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: "INTERNAL_ERROR",
      message: "Ocorreu um erro interno.",
    });
  });
});