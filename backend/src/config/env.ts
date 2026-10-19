import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().default('default-secret-key'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error('Configuração de variáveis de ambiente inválida.');
}

export const env = parsedEnv.data;
