import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { app } from '../src/app.js';

describe('Security Hardening (Issue #88)', () => {
  describe('Helmet HTTP Headers', () => {
    it('deve incluir cabeçalhos de segurança Helmet em respostas HTTP', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
  });

  describe('CORS Restrictions', () => {
    it('deve permitir requisições sem header Origin (requisições de ferramentas internas/healthchecks)', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    it('deve permitir requisições da origem frontend http://localhost:5173', async () => {
      const response = await request(app).get('/health').set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('deve bloquear requisições de origens não autorizadas com status 403', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-site.example.com');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        code: 'FORBIDDEN',
        message: 'Origem não permitida pela política de CORS.',
      });
    });
  });

  describe('Rate Limiter Structure and 429 Handling', () => {
    it('deve retornar status 429 com formato padronizado quando o limite for excedido', async () => {
      const testApp = express();
      const testLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => {
          res.status(429).json({
            code: 'TOO_MANY_REQUESTS',
            message: 'Muitas tentativas de requisição. Tente novamente em alguns minutos.',
          });
        },
      });

      testApp.post('/test-limit', testLimiter, (_req, res) => {
        res.status(200).json({ ok: true });
      });

      // 1st request - ok
      const res1 = await request(testApp).post('/test-limit');
      expect(res1.status).toBe(200);

      // 2nd request - ok
      const res2 = await request(testApp).post('/test-limit');
      expect(res2.status).toBe(200);

      // 3rd request - rate limited
      const res3 = await request(testApp).post('/test-limit');
      expect(res3.status).toBe(429);
      expect(res3.body).toEqual({
        code: 'TOO_MANY_REQUESTS',
        message: 'Muitas tentativas de requisição. Tente novamente em alguns minutos.',
      });
    });
  });
});
