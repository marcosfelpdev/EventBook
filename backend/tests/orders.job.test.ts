import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startOrdersExpirationJob } from '../src/jobs/orders-expiration.job.js';
import { expireOrders } from '../src/services/orders.service.js';

vi.mock('../src/services/orders.service.js', () => ({ expireOrders: vi.fn() }));

describe('Job de expiração', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(expireOrders).mockReset();
    vi.mocked(expireOrders).mockResolvedValue({ count: 1 });
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('executa ao iniciar, repete a cada minuto e para no encerramento', async () => {
    const stop = startOrdersExpirationJob();
    await vi.advanceTimersByTimeAsync(60000);
    expect(expireOrders).toHaveBeenCalledTimes(2);
    await stop();
    await vi.advanceTimersByTimeAsync(120000);
    expect(expireOrders).toHaveBeenCalledTimes(2);
  });
  it('não sobrepõe execuções e aguarda a operação em andamento ao parar', async () => {
    let resolve!: (value: { count: number }) => void;
    vi.mocked(expireOrders).mockReturnValue(new Promise((done) => { resolve = done; }) as ReturnType<typeof expireOrders>);
    const stop = startOrdersExpirationJob();
    await vi.advanceTimersByTimeAsync(120000);
    expect(expireOrders).toHaveBeenCalledTimes(1);
    let stopped = false;
    const pending = stop().then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false);
    resolve({ count: 1 });
    await pending;
    expect(stopped).toBe(true);
  });
  it('registra falha e tenta novamente no próximo ciclo', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(expireOrders).mockRejectedValueOnce(new Error('Falha simulada'));
    const stop = startOrdersExpirationJob();
    await vi.advanceTimersByTimeAsync(60000);
    expect(log).toHaveBeenCalledTimes(1);
    expect(expireOrders).toHaveBeenCalledTimes(2);
    await stop();
  });
});
