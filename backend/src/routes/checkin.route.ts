import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as checkinController from '../controllers/checkin.controller.js';

export const checkinRouter = Router();

checkinRouter.post(
  '/tickets/:code/checkin',
  authenticate,
  authorize(Role.STAFF),
  checkinController.checkinTicket,
);
