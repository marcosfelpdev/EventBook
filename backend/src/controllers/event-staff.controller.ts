import type { RequestHandler } from 'express';
import * as eventStaffService from '../services/event-staff.service.js';

function parseId(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    throw new Error(`O identificador de ${fieldName} deve ser um inteiro positivo.`);
  }
  return Number(value);
}

export const addStaff: RequestHandler = async (req, res) => {
  const eventId = parseId(req.params.eventId, 'evento');
  const organizerId = req.user!.id;

  const eventStaff = await eventStaffService.addStaffToEvent(eventId, organizerId, req.body);
  res.status(201).json(eventStaff);
};

export const removeStaff: RequestHandler = async (req, res) => {
  const eventId = parseId(req.params.eventId, 'evento');
  const organizerId = req.user!.id;
  const userId = parseId(req.params.userId, 'usuário');

  const deleted = await eventStaffService.removeStaffFromEvent(eventId, organizerId, userId);
  res.status(200).json(deleted);
};

export const listStaff: RequestHandler = async (req, res) => {
  const eventId = parseId(req.params.eventId, 'evento');
  const organizerId = req.user!.id;

  const staff = await eventStaffService.listEventStaff(eventId, organizerId);
  res.status(200).json(staff);
};
