import { defineConfig } from 'vitest/config';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('Defina TEST_DATABASE_URL para um banco MySQL isolado com nome terminado em _test.');
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: { DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
  },
});
