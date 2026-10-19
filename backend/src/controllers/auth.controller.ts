import type { RequestHandler } from 'express';
import * as authService from '../services/auth.service.js';

export const register: RequestHandler = async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json(user);
};

export const login: RequestHandler = async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
};

export const getMe: RequestHandler = async (req, res) => {
  const user = await authService.getMe(req.user!.id);
  res.status(200).json(user);
};
