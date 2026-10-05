import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'

/**
 * Testes que precisam de navegador de verdade (`*.browser.test.tsx`): contraste
 * com o axe em todas as paletas × claro/escuro. O número não é escrito aqui
 * porque os testes iteram `PALETTES` — a cobertura acompanha o código.
 * `npm run test:a11y`; precisa do Chromium do Playwright
 * (`npx playwright install --with-deps chromium`).
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
      // `zod` entra pelo schema do TopBarModel; sem listar aqui, a primeira
      // execução numa worktree nova otimiza no meio da coleta e o Vite
      // recarrega a página de teste no meio da suite (todos os arquivos
      // falham a importação com "Failed to fetch dynamically imported
      // module"). Vira um flake só na primeira rodada.
      'zod',
    ],
  },
  test: {
    include: ['src/**/*.browser.test.{ts,tsx}'],
    // ⚠️ `passWithNoTests: false` é OBRIGATÓRIO aqui, e o motivo é medido
    // (2026-10-03). Com `true`, esta configuração devolve **exit 0 sem rodar
    // um único teste** quando o `include` não casa nada — que é o pior
    // desfecho de um gate: verde que não mediu nada.
    //
    // Os três modos, medidos um a um:
    //   · Chromium ausente ......... exit 1 (o unhandled error acusa) — o
    //     menos perigoso, porque o erro do Playwright aparece.
    //   · `-t` que casa 0 teste ...... exit 0 com **242 skipped**.
    //   · `--dir`/cwd que casa 0 .... exit 0 com "No test files found".
    //
    // ⚠️ **Não é a ausência do Chromium que faz o gate sair 0** — é o filtro
    // que não casa. E `include` é relativo ao cwd: rodar o gate de outra
    // pasta faz o `src/**` não achar nada e o gate passar em silêncio.
    // Foi assim que o `gates` de 4 apps "rodou" a11y sem nunca medir
    // layout mobile em nenhuma sandbox.
    //
    // ⚠️ O Chromium continua sendo pré-requisito, e a ausência dele é um
    // problema real: `npx playwright install --with-deps chromium` (≈150 MB,
    // fora do `gates` de propósito — o gate não instala o que ele mede).
    passWithNoTests: false,
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
