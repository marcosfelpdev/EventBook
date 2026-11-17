import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof Error && err.message === 'CORS_NOT_ALLOWED') {
    res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Origem não permitida pela política de CORS.',
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor.',
  });
};
