import type { RequestHandler } from 'express';
import * as occupancyService from '../services/occupancy.service.js';
import { AppError } from '../errors/app-error.js';

function parseId(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    throw new AppError(400, 'VALIDATION_ERROR', 'O identificador deve ser um inteiro positivo.');
  }
  return Number(value);
}

export const getOccupancy: RequestHandler = async (req, res) => {
  const eventId = parseId(req.params.id);
  const result = await occupancyService.getEventOccupancy(eventId, req.user!.id, req.user!.role);
  res.status(200).json(result);
};
