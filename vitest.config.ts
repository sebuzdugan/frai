import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.{js,ts}'],
    exclude: ['node_modules', 'dist', '.pnpm']
  }
});
