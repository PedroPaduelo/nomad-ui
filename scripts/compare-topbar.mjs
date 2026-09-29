#!/usr/bin/env node
/**
 * Prova de igualdade visual: renderiza, com os MESMOS dados falsos e o mesmo
 * tema, a barra ORIGINAL (`@nomad/topbar` da Conta Nommand, tag
 * `topbar-v1.0.0`, sha 303541e) e a do pacote (`@nomad/ui/topbar`), e compara
 * os PNG recortados da barra (1440 × 56 + 16 de respiro).
 *
 * Saída: pngs lado a lado em `docs/evidencias/nui-02/` + relatório JSON + MD.
 *
 * Pré-requisitos:
 *   - `node scripts/build-orig-topbar.mjs` (gera o bundle do original em
 *     /workspace/.ref/conta_nommand/packages/topbar/dist/topbar.js).
 *   - `npm run build` aqui (gera dist/topbar.js).
 *
 * Uso:
 *   PORT_ORIG=5174 PORT_PKG=5175 node scripts/compare-topbar.mjs
 */

import { chromium } from 'playwright'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import http from 'node:http'

const PORT_ORIG = process.env.PORT_ORIG || '5174'
const PORT_PKG = process.env.PORT_PKG || '5175'
const OUT = process.env.OUT || 'docs/evidencias/nui-02'

const REFS = '/workspace/.ref/conta_nommand/packages/topbar'
const PKG = '/workspace/.wt/topbar'

await mkdir(OUT, { recursive: true })

const origJs = await readFile(`${REFS}/dist/topbar.js`, 'utf8')
const origCss = await readFile(`${REFS}/src/topbar.css`, 'utf8')
const pkgJs = await readFile(`${PKG}/dist/topbar.js`, 'utf8')
const pkgCss = await readFile(`${PKG}/src/topbar/topbar.css`, 'utf8')

// Mesmos tokens nos DOIS servidores (paleta slate-blue-gold, modo light).
// A comparação visual fica assim: barra original vs barra do pacote, com a
// mesma pele. Diferenças remanescentes vêm só do JS/CSS da barra.
const TOKENS = `
:root, [data-theme="light"], html {
  --mark-bg: #172033; --mark-on: #ffffff;
  --surface-body: #eef1f5; --surface-base: #f7f8fa; --surface-raised: #ffffff; --surface-overlay: #e8ecf1;
  --surface-hover: rgba(15, 23, 42, 0.05);
  --surface-panel: #ffffff; --surface-pop: #ffffff; --surface-inset: #f7f8fa;
  --color-text-primary: #172033; --color-text-secondary: #4b5868; --color-text-tertiary: #5e6a7c;
  --color-text-disabled: #9aa5b3; --color-text-accent: #1855dc; --color-text-on-accent: #ffffff;
  --color-border: rgba(15, 23, 42, 0.10); --color-border-hover: rgba(15, 23, 42, 0.20);
  --color-accent: #2563eb; --color-accent-hover: #1d4ed8; --color-accent-muted: rgba(37, 99, 235, 0.10);
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06); --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 12px 40px rgba(15, 23, 42, 0.14);
  --fs-body: 14px; --fs-cap: 12px; --lh-body: 20px;
  --radius-control: 8px; --radius-card: 12px; --header-height: 56px;
  --av1-bg: #dbe6fe; --av1-fg: #1e40af; --av2-bg: #fde6d4; --av2-fg: #9a3412;
  --av3-bg: #d6f0ea; --av3-fg: #115e59; --av4-bg: #e7e3fb; --av4-fg: #4338ca;
  --av5-bg: #fbecc8; --av5-fg: #854d0e; --av6-bg: #fbdcdc; --av6-fg: #9f1239;
  --transition-fast: 120ms ease;
}
`

const PROFILE = { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null }
const ORGS = [
  { id: 'o1', name: 'Nomad Labs', slug: 'nomad-labs', role: 'owner', canOpenApp: true },
  { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'admin', canOpenApp: true },
  { id: 'o3', name: 'Filial Sem App', slug: 'filial', role: 'member', canOpenApp: false },
]
const APPS = [
  { id: '1', slug: 'motor', name: 'Motor', iconUrl: null, launchUrl: 'https://m.example/auth/sso', description: 'Automação' },
  { id: '2', slug: 'loadbalance', name: 'Loadbalance', iconUrl: null, launchUrl: 'https://lb.example/auth/sso', description: null },
  { id: '3', slug: 'agent-package', name: 'Agent Package', iconUrl: null, launchUrl: 'https://ap.example/auth/sso', description: null },
  { id: '4', slug: 'conta', name: 'Conta', iconUrl: null, launchUrl: 'https://c.example/auth/sso', description: null },
]

const EXPORTS = [
  'TopBar',
  'TopBarBrand',
  'OrgSwitcher',
  'AppSwitcher',
  'AccountMenu',
  'Avatar',
  'OrgMark',
  'Popover',
  'usePopoverClose',
  'initials',
  'roleLabel',
  'toneOf',
  'launchHref',
  'fetchLauncherApps',
]

function bundleToBindings(bundle, exports) {
  // O bundle é ESM e re-exporta no final. Para rodar em inline <script>, basta
  // remover a última `export {...};` e marcar tudo no escopo global.
  const cleaned = bundle.replace(/^export\s*\{[^}]*\};?\s*$/m, '')
  return `${cleaned}\n;window.__NomadBar = { ${exports
    .map((n) => `${JSON.stringify(n)}: typeof ${n} !== 'undefined' ? ${n} : undefined`)
    .join(', ')} }`
}

function pageHtml(bundle, css) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1440" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>${TOKENS}${css}</style>
</head>
<body style="margin:0;padding-top:16px;background:#fff;font-family:'Inter',system-ui,sans-serif;">
<div id="root"></div>
<script type="module">
import React from 'https://esm.sh/react@19.3.0'
import { createRoot } from 'https://esm.sh/react-dom@19.3.0/client'
</script>
<script type="module">
${bundleToBindings(bundle, EXPORTS)}
const { TopBar, TopBarBrand, OrgSwitcher, AppSwitcher, AccountMenu } = window.__NomadBar
const noop = () => {}
const NL = ${JSON.stringify(PROFILE)}
const ORGS = ${JSON.stringify(ORGS)}
const APPS = ${JSON.stringify(APPS)}
function NommandMark() {
  return React.createElement('svg', { width: 28, height: 28, viewBox: '0 0 32 32' },
    React.createElement('rect', { width: 32, height: 32, rx: 8, fill: 'var(--mark-bg)' }),
    React.createElement('g', { fill: 'none', stroke: 'var(--mark-on)', strokeWidth: 2.75, strokeLinecap: 'round', strokeLinejoin: 'round' },
      React.createElement('path', { d: 'M10.5 22.5V9.5l11 13v-13' })))
}
createRoot(document.getElementById('root')).render(React.createElement(TopBar, {
  brand: React.createElement(TopBarBrand, { logo: React.createElement(NommandMark), name: 'Nommand', product: 'Loadbalance' }),
  org: React.createElement(OrgSwitcher, { organizations: ORGS, currentOrgId: 'o1', onSwitch: noop }),
  search: React.createElement('input', { 'aria-label': 'Buscar', placeholder: 'Buscar ou ir para…  Ctrl K' }),
  actions: React.createElement('button', { type: 'button', 'aria-label': 'Ação' }, '·'),
  apps: React.createElement(AppSwitcher, { apps: APPS, orgId: 'o1', currentAppSlug: 'loadbalance', accountUrl: 'https://c.example/' }),
  account: React.createElement(AccountMenu, { user: NL, organization: { name: 'Nomad Labs', role: 'owner' }, manageAccountHref: 'https://c.example/', onSignOut: noop })
}))
</script>
</body>
</html>`
}

function startServer(html, port) {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => res.writeHead(200, { 'Content-Type': 'text/html' }).end(html))
    s.listen(port, '0.0.0.0', () => resolve(s))
  })
}

const srvOrig = await startServer(pageHtml(origJs, origCss), Number(PORT_ORIG))
const srvPkg = await startServer(pageHtml(pkgJs, pkgCss), Number(PORT_PKG))

const browser = await chromium.launch({ headless: true })
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const capture = async (port, out) => {
    const p = await ctx.newPage()
    const errors = []
    p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    p.on('console', (m) => m.type() === 'error' && errors.push(`console.error: ${m.text()}`))
    await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
    await p.waitForSelector('.ntb-bar', { timeout: 15000 })
    const box = await p.locator('.ntb-bar').first().boundingBox()
    await p.screenshot({ path: out, clip: { x: 0, y: box.y - 8, width: 1440, height: box.height + 16 } })
    await p.close()
    return { box, errors }
  }
  const origPath = path.join(OUT, 'topbar-original-conta.png')
  const pkgPath = path.join(OUT, 'topbar-pacote-nomad-ui.png')
  const origR = await capture(Number(PORT_ORIG), origPath)
  const pkgR = await capture(Number(PORT_PKG), pkgPath)

  const a = await readFile(origPath)
  const b = await readFile(pkgPath)
  const equal = a.equals(b)
  const report = {
    palette: 'slate-blue-gold',
    mode: 'light',
    ports: { orig: Number(PORT_ORIG), pkg: Number(PORT_PKG) },
    barBox: { orig: origR.box, pkg: pkgR.box },
    files: { orig: origPath, pkg: pkgPath },
    pixelBytesEqual: equal,
    pageErrors: { orig: origR.errors, pkg: pkgR.errors },
    note: equal
      ? 'PNG bytes identicos: a barra do @nomad/ui/topbar e visualmente igual a do @nomad/topbar 1.0.0 (sha 303541e) com os mesmos tokens.'
      : 'PNG bytes diferentes: ver compare-report.md e olhar os pngs lado a lado.',
  }
  await writeFile(path.join(OUT, 'compare-report.json'), JSON.stringify(report, null, 2))
  const md = [
    '# Comparacao visual da barra',
    '',
    '- **Paleta**: `slate-blue-gold`, **modo**: `light`',
    '- **Original**: `@nomad/topbar` da Conta Nommand, tag `topbar-v1.0.0` (sha `303541e`)',
    `  -> \`${path.basename(origPath)}\``,
    '- **Pacote**: `@nomad/ui/topbar` na `main` (PedroPaduelo/nomad-ui)',
    `  -> \`${path.basename(pkgPath)}\``,
    '',
    '## Resultado',
    '',
    `**PNG bytes iguais? ${equal ? 'SIM (prova forte de igualdade visual)' : 'NAO'}**`,
    '',
    `Bounding box da barra original: ${JSON.stringify(origR.box)}`,
    '',
    `Bounding box do pacote: ${JSON.stringify(pkgR.box)}`,
    '',
    `Erros de pagina: original = ${origR.errors.length}, pacote = ${pkgR.errors.length}.`,
    '',
    origR.errors.length || pkgR.errors.length
      ? '## Erros\n\n' +
        (origR.errors.length ? '**Original:**\n\n```\n' + origR.errors.join('\n') + '\n```\n\n' : '') +
        (pkgR.errors.length ? '**Pacote:**\n\n```\n' + pkgR.errors.join('\n') + '\n```\n\n' : '')
      : '',
    '## Como rodar de novo',
    '',
    '```bash',
    '# 1) Bundle do original (esbuild, uma vez):',
    'node scripts/build-orig-topbar.mjs',
    '# 2) Build do pacote:',
    'npm run build',
    '# 3) Harness:',
    'PORT_ORIG=5174 PORT_PKG=5175 node scripts/compare-topbar.mjs',
    '```',
    '',
  ].join('\n')
  await writeFile(path.join(OUT, 'compare-report.md'), md)
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
  srvOrig.close()
  srvPkg.close()
}