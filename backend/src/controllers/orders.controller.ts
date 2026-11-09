import type { RequestHandler } from 'express';
import * as ordersService from '../services/orders.service.js';
import { AppError } from '../errors/app-error.js';

function parseOrderId(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    throw new AppError(400, 'VALIDATION_ERROR', 'O identificador do pedido deve ser um inteiro positivo.');
  }
  return Number(value);
}

export const getOrder: RequestHandler = async (req, res) => {
  const order = await ordersService.getOrder(parseOrderId(req.params.id), req.user!.id);
  res.status(200).json(order);
};

export const cancelOrder: RequestHandler = async (req, res) => {
  const order = await ordersService.cancelOrder(parseOrderId(req.params.id), req.user!.id);
  res.status(200).json(order);
};

export const createOrder: RequestHandler = async (req, res) => {
  const order = await ordersService.createOrder(req.user!.id, req.body);
  res.status(201).json(order);
};
