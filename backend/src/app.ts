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
app.use(healthRouter);
app.use(authRouter);
app.use(eventsRouter);
app.use(lotsRouter);
app.use(errorHandler);
