import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { addEventStaffSchema } from '../schemas/event-staff.schema.js';
import * as eventStaffController from '../controllers/event-staff.controller.js';

export const eventStaffRouter = Router();

eventStaffRouter.post(
  '/events/:eventId/staff',
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  validate(addEventStaffSchema),
  eventStaffController.addStaff,
);

eventStaffRouter.delete(
  '/events/:eventId/staff/:userId',
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  eventStaffController.removeStaff,
);

eventStaffRouter.get(
  '/events/:eventId/staff',
  authenticate,
  authorize(Role.ORGANIZER, Role.ADMIN),
  eventStaffController.listStaff,
);
