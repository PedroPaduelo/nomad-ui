#!/usr/bin/env node
/**
 * Contraprova do `scripts/check-scripts.mjs`.
 *
 * Existe porque **gate que só passa no estado bom é decoração** (§12). Um
 * verificador novo nasce verde, e verde é o resultado que ninguém questiona:
 * se ele nunca ficar vermelho, ninguém descobre que ele não mede. Por isso
 * este arquivo não testa o `check-scripts` — **ele o faz reprovar**, de
 * propósito, em código temporário, e exige o código de saída 1.
 *
 * São 6 casos: 4 que o gate tem que **acusar** e 2 que ele tem que **deixar
 * passar**. Os 2 do "passar" não são.health check: são o que separa gate de
 * gate desligado — sem eles, um `check-scripts` que reprova tudo (inclusive o
 * caso certo) também ficaria verde aqui, e esse é o defeito que mata um gate
 * mais rápido (§12: falso-positivo é desligado).
 *
 *   node scripts/check-scripts.test.mjs
 *
 * Sai com código 1 se algum caso não se comportar como esperado.
 *
 * Não é `*.test.ts` de propósito: roda sem vitest, para o gate não depender do
 * runner — o mesmo motivo do `knowledge-summary.test.mjs`.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)))
const GATE = join(RAIZ, 'scripts', 'check-scripts.mjs')

const falhas = []
let ok = 0

/**
 * Roda o gate num app de mentira e devolve `{ codigo, saida }`.
 *
 * ⚠️ O app temporário declara o nome do pacote, mas a identificação do gate é
 * por ASSINATURA (pasta `features/…`), então o fixture precisa reproduzi-la —
 * senão o gate mede "NENHUM app reconhecido" e o caso vira tautologia. Por
 * isso cada fixture copia a pasta que a assinatura exige.
 */
function rodar(nomeApp, arquivos) {
  const dir = mkdtempSync(join(tmpdir(), 'check-scripts-'))
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: nomeApp, version: '0.0.0', private: true }),
    )
    for (const [rel, conteudo] of Object.entries(arquivos)) {
      const alvo = join(dir, rel)
      mkdirSync(dirname(alvo), { recursive: true })
      writeFileSync(alvo, conteudo)
    }
    let codigo = 0
    let saida = ''
    try {
      saida = execFileSync('node', [GATE, '--raiz', dir], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (e) {
      // Status != 0 é o resultado esperado em quase todo o arquivo: o `catch`
      // tem que LER o status e a saída, senão o teste passa com o gate
      // quebrado (a classe que o `publish.test.mjs` já teve).
      codigo = e.status ?? -1
      saida = `${e.stdout ?? ''}${e.stderr ?? ''}`
    }
    // ⚠️⚠️ **UM CRASH NAO É UMA RECUSA.** `node` sai com status 1 tanto
    // quando o gate reprova de propósito quanto quando ele explode — um
    // `ReferenceError` por função faltando tem o mesmo código de saída. Sem
    // esta distinção, o teste fica **verde com o gate quebrado**: foi o que
    // aconteceu em 2026-10-05 quando a unificação da máscara apagou
    // `regexPodeComecarAqui`, o gate passou a morrer em toda execução, e os
    // 6 casos continuaram passando. Um teste de gate que não distingue
    // "reprovou" de "quebrou" mede o código de saída e nada mais.
    //
    // O sinal é o stderr do Node: `ReferenceError`, `SyntaxError`,
    // `TypeError` e o `at ModuleJob` do stack trace. Reprova legítima sai
    // com a mensagem do gate (`✗ check-scripts — N problema(s)`), que é o
    // que o `execFileSync` escreve em stdout/stderr conforme o caso.
    const quebrou = /ReferenceError|SyntaxError|TypeError|ModuleJob\.run|is not defined/.test(saida)
    return { codigo, saida, quebrou }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const espera = (t, o) => ({ ...t, ...o })

function conferir(nome, cond, detalhe, r) {
  // O gate quebrado reprova TUDO, inclusive os 2 casos que ele tem que deixar
  // passar — então o sintoma é "todos os casos falham". Esta é a rede que
  // pega o crash, porque nenhum caso específico o faria.
  if (r?.quebrou) {
    falhas.push(`${nome}\nO GATE QUEBROU (não é recusa):\n${(r.saida || '').slice(0, 400)}`)
    console.log(`  ✗ ${nome} — gate quebrou`)
    return
  }
  if (cond) {
    ok++
    console.log(`  ✓ ${nome}`)
  } else {
    falhas.push(`${nome}\n${detalhe ?? ''}`)
    console.log(`  ✗ ${nome}`)
  }
}

// Identidade por assinatura: o fixture precisa da pasta que o gate procura.
const ASSIN_AG = { 'frontend/src/features/knowledge/.keep': '' }
const ASSIN_CONTA = { 'frontend/src/features/launcher/.keep': '' }
const ASSIN_LB = { 'frontend/src/features/api-keys/.keep': '' }
const ASSIN_MOTOR = { 'fe/src/.keep': '', 'be/src/.keep': '' }

console.log('\ncheck-scripts — o gate tem que ACUSAR:')

// 1) Chamadas sem `timeZone` acima do baseline do app.
//
// ⚠️ O gate segura a DIREÇÃO (§ "baseline"), então a contraprova tem que
// passar do baseline, não só ter 1 violação. Um fixture de 1 chamada num app
// cujo baseline é 27 fica **abaixo** dele e o gate passa — e isso está certo:
// passar é o resultado esperado quando ninguém introduziu regressão. A
// primeira versão deste teste usou 1 chamada, reprovou o gate "errado" e
// quase registrou um defeito que não existe.
{
  // baseline do agent-package: 28 sem timeZone (medido contra o AST).
  //
  // ⚠️ O fixture tem que passar DO baseline, não só ter 1 ocorrência: o gate
  // segura a direção, então uma mutação abaixo dele é o resultado esperado.
  const chamadas = Array.from(
    { length: 30 },
    (_, i) => `export const f${i} = (d) => d.toLocaleDateString('pt-BR')`,
  ).join('\n')
  const r = rodar('agent-package', {
    ...ASSIN_AG,
    'frontend/src/features/knowledge/x.tsx': `${chamadas}\n`,
  })
  conferir(
    'sem timeZone acima do baseline → reprova',
    r.codigo === 1 && /semTimeZone/.test(r.saida),
    `código ${r.codigo}\n${r.saida.slice(0, 300)}`,
    r,
  )
}

// 2) Chamada SEM ARGUMENTO — o pior caso (§5: sai no idioma do navegador).
{
  const r = rodar('conta_nommand', {
    ...ASSIN_CONTA,
    'frontend/src/features/launcher/x.tsx': `export const f = (d) => d.toLocaleDateString()\n`,
  })
  conferir(
    'sem argumento → reprova',
    r.codigo === 1 && /semArgumento/.test(r.saida),
    `código ${r.codigo}\n${r.saida.slice(0, 300)}`,
    r,
  )
}

// 3) Barrels fora da porta acima do baseline (load-balance: 252).
{
  // baseline do load-balance: 253 barrel (medido contra o AST).
  const imports = Array.from(
    { length: 255 },
    (_, i) => `import { Button${i} } from '@nomad/ui'`,
  ).join('\n')
  const r = rodar('load-balance', {
    ...ASSIN_LB,
    'frontend/src/features/api-keys/x.tsx': `${imports}\nexport const B = Button0\n`,
  })
  conferir(
    'barrel fora da porta acima do baseline → reprova',
    r.codigo === 1 && /barrel/.test(r.saida),
    `código ${r.codigo}\n${r.saida.slice(0, 300)}`,
    r,
  )
}

// 4) O gate que NÃO MEDIU: diretório sem nenhum arquivo de código. Tem que
//    reprovar, e a mensagem tem que dizer que não mediu — um 0 aqui seria
//    indistinguível de "app em dia".
{
  const r = rodar('agent-package', { ...ASSIN_AG })
  conferir(
    'diretório sem código → reprova dizendo que não mediu',
    r.codigo === 1 && /não mediu nada/.test(r.saida),
    `código ${r.codigo}\n${r.saida.slice(0, 300)}`,
    r,
  )
}

console.log('\ncheck-scripts — o gate tem que DEIXAR PASSAR:')

// 5) O CASO LEGÍTIMO que a auditoria apontou: `timeZone` em objeto multi-linha.
//    O grep de linha daria falso positivo aqui, e é assim que os "11"
//    saíram errados. Se este caso reprovar, o gate vai morrer na semana 1.
{
  const r = rodar('motor', {
    ...ASSIN_MOTOR,
    'fe/src/x.tsx': [
      `export const f = (d) =>`,
      `  d.toLocaleDateString('pt-BR', {`,
      `    day: '2-digit',`,
      `    year: 'numeric',`,
      `    timeZone: 'UTC',`,
      `  })`,
      ``,
    ].join('\n'),
  })
  conferir(
    'timeZone em multi-linha → passa (falso positivo de grep)',
    r.codigo === 0,
    `código ${r.codigo}\n${r.saida.slice(0, 300)}`,
    r,
  )
}

// 6) O SUBPATH: `@nomad/ui/topbar` é o que a regra §5 pede. Contá-lo como
//    barrel seria acusar o caso correto.
{
  const r = rodar('agent-package', {
    ...ASSIN_AG,
    'frontend/src/features/knowledge/x.tsx': `import { TopBar } from '@nomad/ui/topbar'\nexport const T = TopBar\n`,
  })
  conferir(
    'subpath @nomad/ui/topbar → passa (não é barrel)',
    r.codigo === 0,
    `código ${r.codigo}\n${r.saida.slice(0, 300)}`,
    r,
  )
}

if (falhas.length) {
  console.error(`\n✗ check-scripts.test — ${falhas.length} caso(s) que o gate não cumpriu:\n`)
  for (const f of falhas) console.error(`  · ${f}\n`)
  process.exit(1)
}
console.log(`\n✓ check-scripts.test — ${ok} casos (4 que o gate acusa, 2 que ele deixa passar)`)
