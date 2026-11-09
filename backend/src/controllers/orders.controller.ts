import type { RequestHandler } from 'express';
import * as ordersService from '../services/orders.service.js';

export const createOrder: RequestHandler = async (req, res) => {
  const order = await ordersService.createOrder(req.user!.id, req.body);
  res.status(201).json(order);
};
