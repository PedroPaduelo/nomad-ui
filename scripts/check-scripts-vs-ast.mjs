#!/usr/bin/env node
/**
 * O `check-scripts.mjs` é um SCANNER DE TEXTO, e scanner de texto erra. Este
 * arquivo é a verificação de que ele erra **no tamanho do número**: mede os
 * mesmos arquivos com o **AST do TypeScript** — o mesmo parser do `tsc`, que
 * é o que define o que é código — e exige que as contagens batam.
 *
 *   node scripts/check-scripts-vs-ast.mjs
 *   node scripts/check-scripts-vs-ast.mjs --raiz /caminho/do/app
 *
 * ⚠️⚠️ **Por que este arquivo existe, e o que ele impede.**
 *
 * A primeira versão do gate passou em 6 casos de contraprova e, ao mesmo
 * tempo, **tinha 5 dos 5 números errados**. A contraprova provava que o gate
 * *reprova uma mutação* — mas não que *conta o código certo*. Uma sessão
 * mediu regex contra regex, os dois com o mesmo defeito, e declarou
 * conformidade.
 *
 * ⚠️ **Conferir regex contra regex não prova nada.** O AST é o único
 * instrumento independente que o repositório tem: `typescript` já é
 * dependência de dev, e é ele que decide o que é um `ImportDeclaration` com
 * `moduleSpecifier` igual a `@nomad/ui` — não o que um padrão casa.
 *
 * ⚠️ **A CONFERÊNCIA É SOBRE ARQUIVOS DE TESTE, não sobre os apps.** Um gate
 * que dependesse de `/tmp/ap-hist` não rodaria no `npm run gates` de
 * ninguém. Este arquivo cria os fixtures e compara.
 *
 * ⚠️ **Se os dois discordarem, o gate não tem razão.** Não há "achar um meio
 * termo": quem mede é o AST, e o scanner que se ajusta.
 *
 * Sai com código 1 se alguma contagem divergir.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)))
const GATE = join(RAIZ, 'scripts', 'check-scripts.mjs')

/** `typescript` é devDependency do próprio repo — por isso este arquivo roda. */
const { createRequire } = await import('node:module')
const require = createRequire(import.meta.url)
const ts = require('typescript')

const INTL = ['DateTimeFormat', 'NumberFormat', 'RelativeTimeFormat', 'ListFormat', 'Segmenter']
const TO_LOCALE = ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']

/** Verdade de campo: o que o AST acha num conjunto de arquivos. */
function porAst(arquivos) {
  const acc = { semTimeZone: 0, semArgumento: 0, comTimeZone: 0, barrel: 0 }
  for (const { nome, src } of arquivos) {
    let sf
    try {
      sf = ts.createSourceFile(nome, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    } catch {
      continue
    }
    const porta = /(^|\/)(main|providers)\.[jt]sx$/.test(nome)
    const registrar = (args, texto) => {
      if (args.length === 0) acc.semArgumento++
      else if (/timeZone/.test(texto)) acc.comTimeZone++
      else acc.semTimeZone++
    }
    const v = (n) => {
      if (
        !porta &&
        (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
        n.moduleSpecifier &&
        ts.isStringLiteral(n.moduleSpecifier) &&
        n.moduleSpecifier.text === '@nomad/ui'
      ) {
        acc.barrel++
      }
      // `x.toLocaleDateString(...)` e `Intl.DateTimeFormat(...)`
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const alvo = n.expression.name.text
        const dono = n.expression.expression
        const ehIntl =
          ts.isPropertyAccessExpression(dono) &&
          ts.isIdentifier(dono.expression) &&
          dono.expression.text === 'Intl' &&
          INTL.includes(alvo)
        if (TO_LOCALE.includes(alvo) || ehIntl) {
          registrar(n.arguments, n.arguments.map((a) => a.getText(sf)).join(','))
        }
      }
      // `new Intl.NumberFormat(...)` — NewExpression, e a primeira versão
      // deste arquivo ESQUECIA dele (e media 10 em vez de 13 no motor).
      if (ts.isNewExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const dono = n.expression.expression
        if (
          ts.isIdentifier(dono) &&
          dono.text === 'Intl' &&
          INTL.includes(n.expression.name.text)
        ) {
          registrar(n.arguments ?? [], (n.arguments ?? []).map((a) => a.getText(sf)).join(','))
        }
      }
      ts.forEachChild(n, v)
    }
    v(sf)
  }
  return acc
}

/** O gate, no mesmo diretório. */
function porGate(dir) {
  let saida = ''
  try {
    saida = execFileSync('node', [GATE, '--raiz', dir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (e) {
    saida = `${e.stdout ?? ''}${e.stderr ?? ''}`
  }
  const num = (rot) => {
    const m = new RegExp(`${rot}[^0-9]*(\\d+)`).exec(saida)
    return m ? Number(m[1]) : null
  }
  return {
    semTimeZone: num('sem timeZone'),
    semArgumento: num('das quais sem argumento'),
    comTimeZone: num('com timeZone'),
    barrel: num('barrel fora da porta'),
    saida,
  }
}

// ---------------------------------------------------------------------------
// Os fixtures. Cada um junta um caso que o AST e o gate têm que contar igual.
// ---------------------------------------------------------------------------

/** Um diretório de fixture com assinatura de app, para o gate não avisar. */
function fixture(nome, arquivos) {
  const dir = mkdtempSync(join(tmpdir(), 'vs-ast-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: nome, version: '0.0.0' }))
  // assinatura que o gate reconhece
  const assinatura =
    nome === 'motor'
      ? { 'fe/src/.keep': '' }
      : {
          [`frontend/src/features/${nome === 'load-balance' ? 'api-keys' : 'knowledge'}/.keep`]: '',
        }
  for (const [rel, src] of Object.entries({ ...assinatura, ...arquivos })) {
    const alvo = join(dir, rel)
    mkdirSync(dirname(alvo), { recursive: true })
    writeFileSync(alvo, src)
  }
  return dir
}

const CASOS = [
  {
    nome: 'contagem basica',
    arquivos: {
      'frontend/src/features/knowledge/a.tsx': [
        "export const a = (d) => d.toLocaleDateString('pt-BR')",
        "export const b = (d) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })",
        'export const c = (d) => d.toLocaleDateString()',
        "export const n = new Intl.NumberFormat('pt-BR')",
        "export const l = new Intl.ListFormat('pt-BR', { style: 'long' })",
        '',
      ].join('\n'),
    },
  },
  {
    // Foi aqui que o scanner errou: apostrofo e `from` DENTRO de comentário.
    nome: 'comentario com apostrofo e from',
    arquivos: {
      'frontend/src/features/knowledge/b.tsx': [
        "/* o import usa: import { X } from '@nomad/ui' */",
        "export const x = (d) => d.toLocaleDateString('pt-BR')",
        'const s = "aspas \\\\ e parentes ( sao"',
        "export const y = (d) => d.toLocaleString('pt-BR')",
        '',
      ].join('\n'),
    },
  },
  {
    // Crase dentro de regex: a mascara antiga abria string que nao fechava.
    nome: 'regex com crase e aspas',
    arquivos: {
      'frontend/src/features/knowledge/c.tsx': [
        'const RE = /[\'"()`]/g',
        "export const f = (d) => d.toLocaleDateString('pt-BR')",
        "export const g = (s) => s.replace(RE, '')",
        '',
      ].join('\n'),
    },
  },
  {
    // Template com ${...}: o codigo dentro do template e codigo.
    nome: 'template com expressao',
    arquivos: {
      'frontend/src/features/knowledge/d.tsx': [
        "export const h = (x) => `${x.toLocaleDateString('pt-BR')} e ${x}`",
        '',
      ].join('\n'),
    },
  },
  {
    // Import/export multilinha com comentario no meio (motor, ui/index.ts).
    nome: 'import multilinha com comentario',
    arquivos: {
      'frontend/src/features/knowledge/e.tsx': [
        'import {',
        '  a,',
        '  // isto vem do subpath `@nomad/ui/markdown`, nao e do barrel',
        '  b,',
        "} from '@nomad/ui'",
        '',
        "export { c } from '@nomad/ui'",
        "export { D } from '@nomad/ui/topbar'",
        '',
      ].join('\n'),
    },
  },
  {
    // Bloco cercado de markdown: e documentacao, nao codigo.
    nome: 'bloco cercado de exemplo',
    arquivos: {
      'frontend/src/features/knowledge/f.tsx': [
        'export const exemplo = (',
        '  <pre>',
        '    {`\\`\\`\\`ts',
        "    import { Markdown } from '@nomad/ui'",
        '    \\`\\`\\`}`}',
        '  </pre>',
        ')',
        "export const real = (d) => d.toLocaleDateString('pt-BR')",
        '',
      ].join('\n'),
    },
  },
  {
    // A porta: main.tsx pode usar o barrel.
    nome: 'portao main.tsx',
    arquivos: {
      'frontend/src/features/knowledge/main.tsx': "import { ThemeProvider } from '@nomad/ui'\n",
      'frontend/src/features/knowledge/g.tsx': "import { Button } from '@nomad/ui'\n",
    },
  },
]

const falhas = []

for (const caso of CASOS) {
  const app = caso.nome === 'portao main.tsx' ? 'agent-package' : 'agent-package'
  const dir = fixture(app, caso.arquivos)
  try {
    // O AST recebe os mesmos arquivos que o gate vê.
    const lista = []
    for (const [rel, src] of Object.entries(caso.arquivos)) lista.push({ nome: rel, src })
    const ast = porAst(lista)
    const gate = porGate(dir)

    const campos = ['semTimeZone', 'semArgumento', 'comTimeZone', 'barrel']
    const diffs = campos
      .filter((c) => ast[c] !== gate[c])
      .map((c) => `${c}: AST ${ast[c]} vs gate ${gate[c]}`)

    if (diffs.length) {
      falhas.push(`${caso.nome}\n    ${diffs.join('\n    ')}`)
      console.log(`  ✗ ${caso.nome} — ${diffs.join(' · ')}`)
    } else {
      console.log(
        `  ✓ ${caso.nome} (${ast.semTimeZone} sem timeZone, ${ast.semArgumento} sem argumento, ${ast.barrel} barrel)`,
      )
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (falhas.length) {
  console.error(
    `\n✗ check-scripts-vs-ast — ${falhas.length} caso(s) onde o scanner discorda do AST:\n`,
  )
  for (const f of falhas) console.error(`  · ${f}\n`)
  console.error('  Quem mede é o AST. Ajuste o SCANNER, nunca o oráculo.\n')
  process.exit(1)
}
console.log(`\n✓ check-scripts-vs-ast — ${CASOS.length} casos, scanner e AST concordam`)
