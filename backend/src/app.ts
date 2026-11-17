import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.route.js';
import { authRouter } from './routes/auth.route.js';
import { eventsRouter } from './routes/events.route.js';
import { lotsRouter } from './routes/lots.route.js';
import { ordersRouter } from './routes/orders.route.js';
import { ticketsRouter } from './routes/tickets.route.js';
import { checkinRouter } from './routes/checkin.route.js';
import { eventStaffRouter } from './routes/event-staff.route.js';
import { errorHandler } from './middlewares/error.middleware.js';

export const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (mobile, curl, healthcheck, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS_NOT_ALLOWED'));
    },
    credentials: true,
  }),
);

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
app.use(ordersRouter);
app.use(ticketsRouter);
app.use(checkinRouter);
app.use(eventStaffRouter);

app.use((_req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Rota não encontrada.',
  });
});

app.use(errorHandler);
