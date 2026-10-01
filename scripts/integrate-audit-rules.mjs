#!/usr/bin/env node
/**
 * Integra por âncora as regras da auditoria de 2026-10-01 no documento do
 * padrão (`docs/padrao-frontend.md`), a partir do insumo em bloco (por padrão
 * `/tmp/orq/texto-v1.6.4.md`).
 *
 * Por que um script e não edição à mão: em 2026-10-01 a transcrição manual de
 * texto longo introduziu defeitos três vezes no mesmo dia (palavra em espanhol,
 * palavra em holandês, aspa trocada quebrando um exemplo de rota). O texto do
 * insumo é copiado por `readFileSync`; o script escolhe **onde** cada bloco entra
 * (âncora) e **como** cada regra é adaptada, e nada mais. As adaptações
 * decididas com a revisão estão em `ADAPTATIONS`, com a razão de cada uma.
 *
 *   node scripts/integrate-audit-rules.mjs            # aplica
 *   node scripts/integrate-audit-rules.mjs --check    # só conferiria (não escreve)
 *
 * Idempotente: rodar duas vezes não duplica (detecta a regra já presente).
 */
import { readFileSync } from 'node:fs'

const DOC = 'docs/padrao-frontend.md'
const SOURCE = process.env.AUDIT_SOURCE ?? '/tmp/orq/texto-v1.6.4.md'
const checkOnly = process.argv.includes('--check')

let doc = readFileSync(DOC, 'utf8')
const source = readFileSync(SOURCE, 'utf8')

/** Pega um bloco `## BLOCO N — título` do insumo, até o próximo `## ` ou `---`. */
function blockOf(n) {
  // Aceita fim de arquivo (o BLOCO 8 é o último do insumo). A regex é montada
  // por concatenação, sem escapes ambíguos dentro de template literal — já
  // errou duas vezes assim (casava barra+s e perdia o corpo do bloco).
  const ANY = '[\\s\\S]'
  const re = new RegExp(
    `^## BLOCO ${n} — (.+?)` + '$' + `(${ANY}*?)` + '(?=^## BLOCO |^---[ \\t]*$|$(?!\\n))',
    'm',
  )
  const m = source.match(re)
  if (!m) throw new Error(`BLOCO ${n} não encontrado em ${SOURCE}`)
  return { title: m[1], body: m[2].replace(/^\n+/, '').replace(/\n+$/, '') }
}

// Adaptações decididas na revisão (2026-10-01, orquestrador-93 + esta sessão).
// Cada uma é uma NÃO transcrição: o texto muda de propósito, e a razão fica
// escrita para a próxima revisão não ter que adivinhar.
const ADAPT = {
  1: {
    // "Onde já aconteceu. Três apps quebraram isso ao mesmo tempo." — caso de
    // app sai do padrão (vive em docs/auditoria-apps.md).
    drop: [/^\*\*Onde já aconteceu\.\*\*[\s\S]*?$/m],
    reword: (b) => b,
  },
  2: {},
  3: {
    // A linha de "Variáveis de segurança (NODE_ENV, flag de recurso, chave, URL
    // pública, CORS)" lista bem o que é variável de segurança; fica. O texto
    // sobre a suíte com env completa ("A suíte com env completa não pega nada
    // disso") é a ideia central do gate, mantém.
    reword: (b) => b,
  },
  4: {
    // O parágrafo de "Por que" do BLOCO 4 nomeia deploy/conTAINER; o padrão é
    // sobre o app, e o caso fica na auditoria. Mantém a regra e o teste; corta
    // o "Por que" que cita a suíte de dev e o deploy.
    drop: [/^\*\*Por que\.\*\* O orquestrador injeta[\s\S]*?identidade por e-mail\.$/m],
  },
  5: {
    // O marcador `[verificável no pacote: ...]` vira a frase honesta: o pacote
    // ainda não impõe max-lines no preset (verificado: presets/eslint.js não
    // tem max-lines nem SIZE_EXCEPTIONS).
    replace: [
      [
        /^\*\*Referência no `@nomad\/ui`:\*\*.*$/m,
        '*O `@nomad/ui` ainda não impõe `max-lines` no preset — vale para o pacote no dia em que passar a\n' +
          'impor, com o baseline dele no mesmo release. Enquanto isso o teto é prosa, e prosa não é teto.*',
      ],
    ],
  },
  6: {},
  7: {
    // "Helper de teste" e "asserção frouxa" viram sub-regras nomeadas sob o
    // mesmo bloco (a emenda fica visível); o parágrafo do CI sobe para §12.
    reword: (b) =>
      b
        .replace(/^\*\*Regra\.\*\*/, '**Regra (helper de teste).**')
        .replace(
          /^E: \*\*asserção que diz "tem um X" afirma o valor\.\*\*/m,
          '**Regra (asserção frouxa).**',
        )
        .replace(/^E: /gm, 'E: '),
    moveToCI:
      /^\*\*O mesmo vale para o CI:\*\*[\s\S]*?quando os testes que dependem dele rodam\.$/m,
  },
  8: {},
}

/** Onde cada regra entra, por âncora no documento. */
const PLACEMENT = {
  1: { after: /^### Zod nas bordas$/m, level: 4, order: 'depois da tabela de bordas' },
  2: { after: /^### Zod nas bordas$/m, level: 4, order: 'depois da tabela de bordas' },
  3: { after: /^### Zod nas bordas$/m, level: 4, order: 'depois da tabela de bordas' },
  4: { after: /^### Zod nas bordas$/m, level: 4, order: 'depois da tabela de bordas' },
  5: { after: /^### Zod nas bordas$/m, level: 4, order: 'depois da tabela de bordas' },
  6: { after: /^### Zod nas bordas$/m, level: 4, order: 'depois da tabela de bordas' },
  7: { after: /^### Zod nas bordas$/m, level: 4, order: 'depois da tabela de bordas' },
  8: { after: /^## 11\. Gates obrigatórios$/m, level: 2, order: 'seção nova depois dos gates' },
}

const applied = []
for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
  const rule = ADAPT[n] ?? {}
  let { title, body } = blockOf(n)

  if (rule.drop) for (const re of rule.drop) body = body.replace(re, '')
  if (rule.replace) for (const [re, to] of rule.replace) body = body.replace(re, to)
  if (rule.reword) body = rule.reword(body)

  // O BLOCO 7 perde a nota de CI (vira item do checklist de gates).
  if (rule.moveToCI)
    body = body
      .replace(rule.moveToCI, '')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd()

  const num = `A${n}`
  const h = '#'.repeat(PLACEMENT[n].level)

  // Idempotência, testada no MESMO cabeçalho que a escrita usa. A8 é seção de
  // topo numerada (§12); A1..A7 são sub-seções `#### A<N> —` dentro de §5, que
  // não entram na sequência numérica.
  const headerRe =
    n === 8
      ? /^## 12\. Gate que não existe é gate que não pega$/m
      : new RegExp(`^${'#'.repeat(PLACEMENT[n].level)} ${num} — `, 'm')
  if (headerRe.test(doc)) {
    applied.push(`${num}: já presente, ignorada`)
    continue
  }

  const heading = n === 8 ? `## 12. ${title}` : `${h} ${num} — ${title}`
  const block = `${heading}\n\n${body}\n`

  if (n === 8) {
    // Seção de topo antes do checklist; a sequência numérica precisa
    // continuar, então o checklist passa de §12 para §13.
    doc = doc.replace(
      /^## 12\. Checklist de migração de um app$/m,
      `${block}\n## 13. Checklist de migração de um app`,
    )
    applied.push('A8: inserida como §12 (checklist renumerado para §13)')
    continue
  }

  // Regras A1..A7: todas caem em §5, depois de "### Zod nas bordas" — ou
  // seja, no fim da subseção, antes de "### Zustand". Insiro em bloco, uma a
  // uma, sempre antes de "### Zustand", para a ordem do insumo se manter.
  const anchor = /^### Zustand$/m
  // Forma de FUNÇÃO no `replace`: com replacement string, `${anchor}` seria o
  // *padrão* em texto (`/^### Zustand$/m`) em vez do texto casado — foi o que
  // fez a primeira versão inserir só A1 e o resto sumir.
  doc = doc.replace(anchor, () => `${block}\n### Zustand`)
  applied.push(`${num}: inserida em §5 antes de "### Zustand"`)
}

doc = doc.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '\n')

if (checkOnly) {
  console.log('—check: nada foi escrito. O que seria aplicado:')
  for (const a of applied) console.log('  ·', a)
  process.exit(0)
}

const { writeFileSync } = await import('node:fs')
writeFileSync(DOC, doc, 'utf8')
console.log(`✓ ${DOC} — ${applied.length} regras aplicadas`)
for (const a of applied) console.log('  ·', a)
