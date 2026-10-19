import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { authRouter } from '../src/routes/auth.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { authenticate, authorize } from '../src/middlewares/auth.middleware.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const testApp = express();
testApp.use(express.json());
testApp.use(authRouter);
testApp.get('/test-admin-rbac', authenticate, authorize(Role.ADMIN), (_req, res) => {
  res.status(200).json({ allowed: true });
});
testApp.use(errorHandler);

describe('Testes de autenticação e RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /register', () => {
    it('cadastra o usuário como BUYER e não expõe o hash', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockImplementation(({ data }) =>
        Promise.resolve({
          id: 1,
          name: data.name,
          email: data.email,
          role: Role.BUYER,
          createdAt: new Date(),
        }),
      );

      const res = await request(testApp).post('/register').send({
        name: 'Comprador Teste',
        email: 'novo@teste.com',
        password: 'senhaSegura123',
      });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('BUYER');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('retorna 409 quando o e-mail já existe', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1,
        name: 'Existente',
        email: 'existente@teste.com',
        passwordHash: 'hash',
        role: Role.BUYER,
        createdAt: new Date(),
      });

      const res = await request(testApp).post('/register').send({
        name: 'Outro Nome',
        email: 'existente@teste.com',
        password: 'senhaSegura123',
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('retorna 400 quando o payload é inválido', async () => {
      const res = await request(testApp).post('/register').send({
        email: 'email-invalido',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /login', () => {
    it('retorna token e dados do usuário quando as credenciais são válidas', async () => {
      const passwordHash = await bcrypt.hash('senhaValida123', 6);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1,
        name: 'Comprador',
        email: 'user@teste.com',
        passwordHash,
        role: Role.BUYER,
        createdAt: new Date(),
      });

      const res = await request(testApp).post('/login').send({
        email: 'user@teste.com',
        password: 'senhaValida123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('user@teste.com');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('retorna 401 quando o e-mail não existe', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(testApp).post('/login').send({
        email: 'naoexiste@teste.com',
        password: 'qualquersenha',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('retorna 401 quando a senha está incorreta', async () => {
      const passwordHash = await bcrypt.hash('senhaCorreta', 6);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1,
        name: 'Comprador',
        email: 'user@teste.com',
        passwordHash,
        role: Role.BUYER,
        createdAt: new Date(),
      });

      const res = await request(testApp).post('/login').send({
        email: 'user@teste.com',
        password: 'senhaIncorreta',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('RBAC e GET /me', () => {
    it('retorna 401 ao acessar rota autenticada sem token', async () => {
      const res = await request(testApp).get('/me');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('retorna os dados do usuário autenticado no GET /me', async () => {
      const token = jwt.sign({ sub: '1', role: Role.BUYER }, env.JWT_SECRET);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1,
        name: 'Usuario Logado',
        email: 'me@teste.com',
        role: Role.BUYER,
        createdAt: new Date(),
      });

      const res = await request(testApp)
        .get('/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('me@teste.com');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('retorna 403 ao acessar rota com perfil insuficiente (RBAC)', async () => {
      const token = jwt.sign({ sub: '1', role: Role.BUYER }, env.JWT_SECRET);

      const res = await request(testApp)
        .get('/test-admin-rbac')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('permite acesso quando o perfil é autorizado (RBAC)', async () => {
      const token = jwt.sign({ sub: '2', role: Role.ADMIN }, env.JWT_SECRET);

      const res = await request(testApp)
        .get('/test-admin-rbac')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.allowed).toBe(true);
    });
  });
});
