import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validate(registerSchema), authController.register);
authRouter.post('/login', authRateLimiter, validate(loginSchema), authController.login);
authRouter.get('/me', authenticate, authController.getMe);
