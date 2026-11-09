import { expireOrders } from '../services/orders.service.js';

export const EXPIRATION_INTERVAL_MS = 60 * 1000;

export function startOrdersExpirationJob() {
  let running: Promise<void> | undefined;
  let stopped = false;

  const tick = () => {
    if (stopped || running) {
      return;
    }
    running = expireOrders()
      .then(() => undefined)
      .catch((error: unknown) => {
        console.error('Falha ao expirar reservas; nova tentativa no próximo ciclo.', error);
      })
      .finally(() => {
        running = undefined;
      });
  };

  const timer = setInterval(tick, EXPIRATION_INTERVAL_MS);
  timer.unref();
  tick();

  return async () => {
    stopped = true;
    clearInterval(timer);
    await running;
  };
}
