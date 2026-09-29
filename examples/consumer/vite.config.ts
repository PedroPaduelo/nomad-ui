import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  server: { port: 5176 },
  // O link file:../.. resolve peers pelo repo host; force as cópias do app.
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
})
