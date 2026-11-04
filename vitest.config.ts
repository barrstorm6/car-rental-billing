import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
const mode = process.env.TEST_MODE || 'main';
if (process.env.CHALLENGE_TEST_RUN !== '1') throw new Error('Use npm test / npm run test:infra / npm run test:bonus');
const include = mode === 'infra' ? ['tests/infra.test.ts'] : mode === 'bonus' ? ['tests/bonus/*.test.ts'] : ['tests/*.test.ts'];
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include,
    exclude: mode === 'main' ? ['tests/infra.test.ts'] : [],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['tests/helpers/setup.ts'],
  },
});
