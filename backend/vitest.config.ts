import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Cargar .env.test si existe, sino .env.example como fallback
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/server.ts', 'src/shared/db/migrations/**'],
    },
  },
  resolve: {
    // Necesario para imports con extensión .js en TypeScript con NodeNext
    alias: {
      '@': '/src',
    },
  },
});
