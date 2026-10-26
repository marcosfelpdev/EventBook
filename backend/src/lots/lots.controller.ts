import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import * as lotsService from './lots.service.js';

function parsePositiveId(value: string | string[] | undefined, fieldName: string) {
  const id = typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(400, 'VALIDATION_ERROR', `O identificador de ${fieldName} é inválido.`);
  }
  return id;
}

export const listEventLots: RequestHandler = async (req, res) => {
  const eventId = parsePositiveId(req.params.id, 'evento');
  const lots = await lotsService.listEventLots(eventId, req.user);
  res.status(200).json(lots);
};

export const updateEventLot: RequestHandler = async (req, res) => {
  const eventId = parsePositiveId(req.params.id, 'evento');
  const lotId = parsePositiveId(req.params.lotId, 'lote');
  const lot = await lotsService.updateEventLot(eventId, lotId, req.user!.id, req.body);
  res.status(200).json(lot);
};
