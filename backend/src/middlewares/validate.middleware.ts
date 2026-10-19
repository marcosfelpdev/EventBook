import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../errors/app-error.js';

export function validate(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Dados inválidos.',
        result.error.flatten().fieldErrors,
      );
    }

    req.body = result.data;
    next();
  };
}
