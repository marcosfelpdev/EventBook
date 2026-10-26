import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateLotSchema } from './lots.schema.js';
import * as lotsController from './lots.controller.js';

export const lotsRouter = Router();

lotsRouter.get('/events/:id/lots', optionalAuthenticate, lotsController.listEventLots);
lotsRouter.patch(
  '/events/:id/lots/:lotId',
  authenticate,
  authorize(Role.ORGANIZER),
  validate(updateLotSchema),
  lotsController.updateEventLot,
);
