import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import type { EventsRepository } from "./events.repository";

function setup() {
  const repository: EventsRepository = {
    findPublished: vi.fn().mockResolvedValue([]),
    countPublished: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(null),
  };

  return {
    app: createApp(repository),
    repository,
  };
}

describe("GET /events", () => {
  it("retorna uma lista vazia sem exigir login", async () => {
    const { app } = setup();

    const response = await request(app).get("/events");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it("calcula o deslocamento e o total de páginas", async () => {
    const { app, repository } = setup();

    vi.mocked(repository.countPublished).mockResolvedValue(25);

    const response = await request(app)
      .get("/events?page=2&limit=10");

    expect(response.status).toBe(200);
    expect(repository.findPublished).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
    });
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it.each([
    "page=0",
    "page=-1",
    "page=abc",
    "page=1.5",
    "limit=0",
    "limit=101",
  ])("rejeita paginação inválida: %s", async (query) => {
    const { app, repository } = setup();

    const response = await request(app).get(`/events?${query}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(repository.findPublished).not.toHaveBeenCalled();
  });

  it("não expõe detalhes internos quando a consulta falha", async () => {
    const { app, repository } = setup();

    vi.mocked(repository.findPublished).mockRejectedValue(
      new Error("Detalhe interno do banco"),
    );

    const response = await request(app).get("/events");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: "INTERNAL_ERROR",
      message: "Ocorreu um erro interno.",
    });
  });
});