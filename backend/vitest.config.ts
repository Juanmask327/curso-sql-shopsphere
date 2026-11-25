import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Cargar .env.test si existe, sino .env.example como fallback
    setupFiles: ['./src/test-setup.ts'],
    // Los tests de integración comparten la misma base de datos y cada archivo
    // hace TRUNCATE en su beforeAll. Si corren en paralelo, un archivo puede
    // borrar los datos del otro a mitad de un test (pasaba en CI con el flujo
    // de certificados). Se ejecutan los archivos de uno en uno.
    fileParallelism: false,
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
