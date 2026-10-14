import express from "express";
import type { ErrorRequestHandler } from "express";
import type { EventsRepository } from "./events/events.repository";
import { EventsService } from "./events/events.service";
import { createEventsRouter } from "./events/events.routes";

export function createApp(repository: EventsRepository) {
  const app = express();

  app.use(express.json());

  const eventsService = new EventsService(repository);

  app.use("/events", createEventsRouter(eventsService));

  app.use((_req, res) => {
    res.status(404).json({
      code: "NOT_FOUND",
      message: "Rota não encontrada.",
    });
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    _req,
    res,
    _next,
  ) => {
    console.error(error);

    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Ocorreu um erro interno.",
    });
  };

  app.use(errorHandler);

  return app;
}