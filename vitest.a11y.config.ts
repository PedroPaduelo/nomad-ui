import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'

/**
 * Testes que precisam de navegador de verdade (`*.browser.test.tsx`): contraste
 * com o axe nas 10 paletas × claro/escuro. `npm run test:a11y`; precisa do
 * Chromium do Playwright (`npx playwright install --with-deps chromium`).
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.browser.test.{ts,tsx}'],
    passWithNoTests: true,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium', viewport: { width: 1440, height: 900 } }],
    },
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
})
