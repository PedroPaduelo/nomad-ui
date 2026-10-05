import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// *.browser.test.* precisam de navegador real (contraste com o axe): rodam no
// vitest.a11y.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/**/*.browser.test.{ts,tsx}', 'node_modules/**'],
    css: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    restoreMocks: true,
  },
})
