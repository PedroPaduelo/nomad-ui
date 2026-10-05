import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  // Com file:../.. o pacote linkado resolve seus peers no repo host. Aponte
  // tudo para as cópias do consumer (uma instalação git já resolve assim).
  resolve: {
    alias: [
      { find: /^react$/, replacement: resolve(import.meta.dirname, 'node_modules/react/index.js') },
      {
        find: /^react-dom$/,
        replacement: resolve(import.meta.dirname, 'node_modules/react-dom/index.js'),
      },
      {
        find: /^@tanstack\/react-query$/,
        replacement: resolve(
          import.meta.dirname,
          'node_modules/@tanstack/react-query/build/modern/index.js',
        ),
      },
    ],
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    restoreMocks: true,
  },
})
