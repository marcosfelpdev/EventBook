import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'test' ? 1000 : 30, // 30 requisições por janela em prod/dev, 1000 em testes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas de requisição. Tente novamente em alguns minutos.',
    });
  },
});
