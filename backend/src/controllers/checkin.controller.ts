import type { RequestHandler } from 'express';
import * as checkinService from '../services/checkin.service.js';

export const checkinTicket: RequestHandler = async (req, res) => {
  const { code } = req.params;
  const staffId = req.user!.id;

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw new Error('O código do ingresso é obrigatório.');
  }

  const result = await checkinService.checkinTicket(code.trim(), staffId);
  res.status(200).json({
    ticket: {
      id: result.ticket.id,
      code: result.ticket.code,
      status: result.ticket.status,
      usedAt: result.ticket.usedAt,
    },
    checkin: {
      id: result.checkin.id,
      checkedInAt: result.checkin.checkedInAt,
      staff: result.checkin.staff,
    },
  });
};
