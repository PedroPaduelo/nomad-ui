#!/usr/bin/env node
/**
 * Preflight do `test:a11y` (o gate de contraste no Chromium).
 *
 * ## Por que isto existe
 *
 * `vitest.a11y.config.ts` roda `*.browser.test.tsx` no Chromium de verdade. Sem
 * o browser, o vitest imprime um `Unhandled Error` gigante (o despejo do
 * Playwright) e a pessoa precisa adivinhar o comando — e o aviso do Playwright
 * sugere `npx playwright install`, **sem** `--with-deps`, que não basta: falta
 * a biblioteca do sistema (`libglib-2.0.so.0`) e o erro seguinte é outro,
 * sobre um `.so` que ninguém sabe de onde veio.
 *
 * Medido em 2026-10-03 nesta sandbox, nesta ordem de falha:
 *   1. sem browser ............ `Executable doesn't exist at …chrome-headless-shell`
 *   2. browser sem libs do SO . `libglib-2.0.so.0: cannot open shared object file`
 *
 * ⚠️ **Este script NÃO instala nada.** O `gates` não baixa 150 MB para medir
 * contraste — o gate não instala o que ele mede. Ele só diz qual é o comando,
 * que é a diferença entre um erro que se conserta em 30 s e um que se
 * abandona.
 *
 * ⚠️ **Por que isto é `preflight` e não uma config do vitest:** a ausência do
 * browser sai com o vitest já aberto, e a mensagem de erro é do Playwright,
 * não nossa. Quem precisa da mensagem certa é quem **ainda não rodou nada** —
 * por isso a checagem vem antes.
 *
 *   node scripts/a11y-preflight.mjs
 *
 * Sai 0 quando o Chromium está presente; sai 1 com o comando quando não está.
 */
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const COMANDO = 'npx playwright install --with-deps chromium'

/** O mesmo que o Playwright usa por padrão; `PLAYWRIGHT_BROWSERS_PATH` vence. */
const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), '.cache', 'ms-playwright')

/**
 * O cache do Playwright guarda diretórios `chromium-<rev>` e
 * `chromium_headless_shell-<rev>`, e o `headless: true` do vitest usa o
 * headless shell. Aceitar **qualquer** diretório `chromium*` é o bastante: o
 * objetivo é detectar ausência, não validar revisão (o Playwright já diz qual
 * revisão ele quer quando ela falta).
 */
function temBrowser() {
  // O cache pode não existir, e isso não pode ser erro — é justamente o
  // caso que este script existe para reportar.
  try {
    return readdirSync(raiz).some((d) => d.startsWith('chromium'))
  } catch {
    return false
  }
}

if (temBrowser()) {
  console.log(`✓ a11y: Chromium presente (${raiz}) — o gate vai medir de verdade.`)
  process.exit(0)
}

console.error(
  [
    '',
    '✗ a11y: o Chromium do Playwright NÃO está instalado — o gate de contraste',
    '  não vai medir nada, e isso não é aceitável num gate.',
    '',
    '  Instale com o comando completo:',
    `      ${COMANDO}`,
    '',
    '  ⚠️ O `--with-deps` não é opcional. Sem ele o browser baixa mas falta a',
    '  biblioteca do sistema, e o erro seguinte é sobre `libglib-2.0.so.0`, que',
    '  não diz de onde veio (medido 2026-10-03: foi o que aconteceu aqui).',
    '',
    '  É um download de ~150 MB, uma vez por sandbox. O `gates` NÃO faz isso de',
    '  propósito: gate que instala o que mede deixa de medir o que instala.',
    '',
  ].join('\n'),
)
process.exit(1)
