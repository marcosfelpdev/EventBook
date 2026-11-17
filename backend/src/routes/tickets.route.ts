import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as ticketsController from '../controllers/tickets.controller.js';

export const ticketsRouter = Router();

ticketsRouter.get('/tickets/me', authenticate, ticketsController.listMyTickets);
