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
  // Entradas do Base UI que os componentes importam: pré-otimizadas para o Vite
  // não recarregar o teste no meio da coleta (v1.1.0: `switch` entrou com o kit
  // extra e derrubou a suíte na primeira otimização).
  optimizeDeps: {
    include: [
      '@base-ui/react/collapsible',
      '@base-ui/react/combobox',
      '@base-ui/react/menu',
      '@base-ui/react/popover',
      '@base-ui/react/switch',
      '@base-ui/react/tabs',
    ],
  },
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
