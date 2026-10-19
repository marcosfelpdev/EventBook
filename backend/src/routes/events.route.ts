import { Router } from 'express';
import { Role } from '@prisma/client';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate, optionalAuthenticate, authorize } from '../middlewares/auth.middleware.js';
import { createEventSchema, updateEventSchema } from '../schemas/events.schema.js';
import * as eventsController from '../controllers/events.controller.js';

export const eventsRouter = Router();

eventsRouter.get('/events', eventsController.listEvents);
eventsRouter.get('/events/:id', optionalAuthenticate, eventsController.getEvent);
eventsRouter.post(
  '/events',
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  validate(createEventSchema),
  eventsController.createEvent,
);
eventsRouter.patch(
  '/events/:id',
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  validate(updateEventSchema),
  eventsController.updateEvent,
);
