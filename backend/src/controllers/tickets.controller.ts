import type { RequestHandler } from 'express';
import * as ticketsService from '../services/tickets.service.js';
import { listTicketsQuerySchema } from '../schemas/tickets.schema.js';

export const listMyTickets: RequestHandler = async (req, res) => {
  const query = listTicketsQuerySchema.parse(req.query);
  const result = await ticketsService.listMyTickets(req.user!.id, query);
  res.status(200).json(result);
};
