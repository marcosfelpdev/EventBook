import { Router } from "express";
import { z } from "zod";
import type { EventsService } from "./events.service";

const positiveInteger = z
  .string()
  .regex(/^[1-9]\d*$/, "Informe um número inteiro maior que zero.")
  .transform(Number)
  .pipe(
    z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  );

const paginationSchema = z.object({
  page: positiveInteger.default(1),
  limit: positiveInteger.pipe(z.number().max(100)).default(10),
});

export function createEventsRouter(service: EventsService) {
  const router = Router();

  // #39: lista os eventos publicados com paginação.
  router.get("/", async (req, res, next) => {
    const parsed = paginationSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Parâmetros de paginação inválidos.",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    const { page, limit } = parsed.data;

    if (!Number.isSafeInteger((page - 1) * limit)) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Parâmetros de paginação inválidos.",
        details: [
          {
            field: "page",
            message: "O número da página é muito grande.",
          },
        ],
      });
      return;
    }

    try {
      const result = await service.listPublished(page, limit);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  // #40: consulta os detalhes de um evento.
  router.get("/:id", async (req, res, next) => {
    const parsedId = positiveInteger.safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "ID do evento inválido.",
        details: [
          {
            field: "id",
            message: "Informe um número inteiro positivo válido.",
          },
        ],
      });
      return;
    }

    try {
      // Pendente: integrar a identidade validada pela autenticação.
      // Por enquanto, todas as consultas são feitas como visitante.
      const event = await service.getById(parsedId.data);

      if (!event) {
        res.status(404).json({
          code: "NOT_FOUND",
          message: "Evento não encontrado.",
        });
        return;
      }

      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  });

  return router;
}