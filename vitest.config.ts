import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      all: true,
      // Enforce 100% coverage thresholds
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    },
    // Increase timeout for heavy component tests
    testTimeout: 30000,
    // Watch files and re-run automatically in dev mode
    watch: false
  }
});
