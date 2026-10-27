import type { RequestHandler } from 'express';
import * as lotsService from '../services/lots.service.js';

export const listLots: RequestHandler = async (req, res) => {
  const eventId = Number(req.params.id);
  const lots = await lotsService.listLots(eventId, req.user);
  res.status(200).json(lots);
};

export const createLot: RequestHandler = async (req, res) => {
  const eventId = Number(req.params.id);
  const lot = await lotsService.createLot(eventId, req.user!.id, req.body, req.user!.role);
  res.status(201).json(lot);
};

export const updateLot: RequestHandler = async (req, res) => {
  const eventId = Number(req.params.id);
  const lotId = Number(req.params.lotId);
  const lot = await lotsService.updateLot(eventId, lotId, req.user!.id, req.body, req.user!.role);
  res.status(200).json(lot);
};
