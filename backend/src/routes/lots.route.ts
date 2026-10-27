import { Router } from 'express';
import { Role } from '@prisma/client';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate, optionalAuthenticate, authorize } from '../middlewares/auth.middleware.js';
import { createLotSchema, updateLotSchema } from '../schemas/lots.schema.js';
import * as lotsController from '../controllers/lots.controller.js';

export const lotsRouter = Router();

lotsRouter.get('/events/:id/lots', optionalAuthenticate, lotsController.listLots);
lotsRouter.post(
  '/events/:id/lots',
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  validate(createLotSchema),
  lotsController.createLot,
);
lotsRouter.patch(
  '/events/:id/lots/:lotId',
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  validate(updateLotSchema),
  lotsController.updateLot,
);
