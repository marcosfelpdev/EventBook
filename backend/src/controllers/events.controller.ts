import type { RequestHandler } from 'express';
import * as eventsService from '../services/events.service.js';
import { listEventsQuerySchema } from '../schemas/events.schema.js';

export const listEvents: RequestHandler = async (req, res) => {
  const query = listEventsQuerySchema.parse(req.query);
  const result = await eventsService.listEvents(query);
  res.status(200).json(result);
};

export const getEvent: RequestHandler = async (req, res) => {
  const eventId = Number(req.params.id);
  const event = await eventsService.getEventById(eventId, req.user);
  res.status(200).json(event);
};

export const createEvent: RequestHandler = async (req, res) => {
  const event = await eventsService.createEvent(req.user!.id, req.body);
  res.status(201).json(event);
};

export const updateEvent: RequestHandler = async (req, res) => {
  const eventId = Number(req.params.id);
  const event = await eventsService.updateEvent(eventId, req.user!.id, req.body, req.user!.role);
  res.status(200).json(event);
};
