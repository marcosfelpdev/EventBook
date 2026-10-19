import express from 'express';
import { healthRouter } from './routes/health.route.js';
import { errorHandler } from './middlewares/error.middleware.js';

export const app = express();

app.use(express.json());
app.use(healthRouter);
app.use(errorHandler);
