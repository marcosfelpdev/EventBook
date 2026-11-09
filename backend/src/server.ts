import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { startOrdersExpirationJob } from './jobs/orders-expiration.job.js';

const server = app.listen(env.PORT, () => {
  console.log(`Servidor rodando na porta ${env.PORT}`);
});

const stopExpirationJob = startOrdersExpirationJob();
let stopping = false;

const shutdown = () => {
  if (stopping) {
    return;
  }
  stopping = true;
  server.close(() => {
    void stopExpirationJob().then(() => prisma.$disconnect());
  });
  void stopExpirationJob();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
