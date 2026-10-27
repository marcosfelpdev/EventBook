import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.route.js';
import { authRouter } from './routes/auth.route.js';
import { eventsRouter } from './routes/events.route.js';
import { lotsRouter } from './routes/lots.route.js';
import { errorHandler } from './middlewares/error.middleware.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'EventBook API',
    status: 'online',
    message: 'EventBook API está em execução. O frontend está disponível em http://localhost:5173.',
  });
});

app.use(healthRouter);
app.use(authRouter);
app.use(eventsRouter);
app.use(lotsRouter);

app.use((_req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Rota não encontrada.',
  });
});

app.use(errorHandler);
