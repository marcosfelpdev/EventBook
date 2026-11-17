import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createOrderSchema, checkoutSchema } from '../schemas/orders.schema.js';
import * as ordersController from '../controllers/orders.controller.js';

export const ordersRouter = Router();

ordersRouter.post(
  '/orders',
  authenticate,
  authorize(Role.BUYER),
  validate(createOrderSchema),
  ordersController.createOrder,
);
ordersRouter.get('/orders/me', authenticate, ordersController.listMyOrders);
ordersRouter.get('/orders/:id', authenticate, ordersController.getOrder);
ordersRouter.post(
  '/orders/:id/checkout',
  authenticate,
  validate(checkoutSchema),
  ordersController.checkoutOrder,
);
ordersRouter.post('/orders/:id/cancel', authenticate, ordersController.cancelOrder);
