import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

interface TokenPayload {
  sub: string;
  role: Role;
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Token de autenticação não fornecido ou inválido.',
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = {
      id: Number(decoded.sub),
      role: decoded.role,
    };
    next();
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Token inválido ou expirado.');
  }
};

export function authorize(...allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Não autenticado.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para realizar esta ação.');
    }

    next();
  };
}
