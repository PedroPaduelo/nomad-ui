/**
 * O resumo da página de knowledge (`knowledge.knowledge.md`) não pode afirmar
 * nada que o documento do repo (`docs/padrao-frontend.md`) não contenha.
 *
 * Existe porque em 2026-10-01 uma transcrição manual pôs na página coisas que
 * o repo nunca disse, e a revisão estrutural não pegou (ids certos, texto
 * errado). O resumo é escrito à mão — então ele é verificado: cada afirmação
 * marcável abaixo tem que existir no documento. Se o documento mudar e o resumo
 * ficar para trás, este teste falha em vez de a página divergir em silêncio.
 *
 *   node scripts/knowledge-summary.test.mjs
 *
 * Não é `*.test.ts` de propósito: roda sem vitest, para o gate ser
 * `node scripts/check-doc.mjs && node scripts/knowledge-summary.test.mjs` e não
 * depender do runner.
 */
import { readFileSync } from 'node:fs'

const REPO_DOC = 'docs/padrao-frontend.md'
const SUMMARY = 'knowledge.knowledge.md'

const doc = readFileSync(REPO_DOC, 'utf8')
const summary = readFileSync(SUMMARY, 'utf8')
const norm = (s) => s.replace(/\s+/g, ' ').trim()
const docN = norm(doc)

/** [o que o resumo afirma, o que tem que existir no documento]. */
const CLAIMS = [
  ['regra: estado de servidor só no Query', 'Estado de servidor só no TanStack Query'],
  ['Zod nas bordas', 'Zod nas bordas'],
  ['Zustand só estado de tela', 'Zustand só para estado de tela'],
  ['fronteira de import', 'Fronteira de import'],
  ['instalar por git+https', 'git+https://github.com/PedroPaduelo/nomad-ui.git#'],
  ['bump força a resolução', 'npm install @nomad/ui@git+https://'],
  ['conferir a versão instalada', "require('@nomad/ui/package.json').version"],
  ['lock da raiz manda no workspace', 'Lock da raiz manda no workspace'],
  ['regra de tamanho de arquivo', 'Tamanho de arquivo (ESLint `max-lines`'],
  ['.catch() proibido em schema', '.catch()'],
  ['campo opcional com .optional()', '.optional()'],
  ['transform só roda depois do parse', 'transform'],
  ['schema do cliente é cópia de leitura', 'cópia de leitura'],
  ['uuid()/datetime() no cliente', 'uuid()'],
  ['z.string().url() não é o mesmo contrato', 'z.string().url()'],
  ['variável de segurança sem default', 'sem default'],
  ['guard na direção errada não protege', 'direção errada'],
  ['dotenv sem override', 'override'],
  ['.env.example comenta a linha sensível', '.env.example'],
  ['teto só desce / baseline', 'baseline'],
  ['contagem pelo algoritmo da regra', 'skipBlankLines'],
  ['o pacote ainda não impõe max-lines (prosa honesta)', 'O `@nomad/ui` ainda não impõe'],
  ['test/ entra no typecheck', 'include: ["src/**/*"]'],
  ['typecheck do CI é o mesmo do dev', 'listFilesOnly'],
  ['helper de teste lança em >= 400', 'expectStatus'],
  ['expect.any(Number) aceita zero', 'expect.any(Number)'],
  ['apps rodam as duas metades do pacote', 'as duas metades do pacote'],
  ['gate que não existe não pega', 'Gate que não existe'],
  ['gate roda o que o nome diz', 'roda o que o nome diz'],
  ['skipIf com variável que o CI não define', 'skipIf'],
  ['passo de setup que falha', 'skipped'],
  ['gates obrigatórios', 'Gates obrigatórios'],
  ['a11y: axe no Chromium', 'test:a11y'],
  // O resumo escreve "Referência em documento normativo se confere antes de
  // integrar"; o documento escreve "Referência se confere antes de integrar".
  // A claim casa com o documento (é ele que é conferido).
  ['referência se confere antes de integrar', 'Referência se confere antes de integrar'],
  ['o defeito é a transcrição, não a revisão', 'defeito é a transcrição'],
]

const missing = CLAIMS.filter(([, needle]) => !docN.includes(norm(needle)))
if (missing.length) {
  console.error(`✗ ${SUMMARY} afirma coisas que ${REPO_DOC} não contém:`)
  for (const [claim] of missing) console.error(`  · ${claim}`)
  process.exit(1)
}

// O resumo não pode ser cópia: se contiver o documento inteiro, voltou a ser
// a configuração que divergiu duas vezes.
if (summary.includes(doc)) {
  console.error('✗ o resumo contém o documento inteiro — a página voltou a ser cópia')
  process.exit(1)
}

// Toda seção `## N.` do resumo aponta para a seção correspondente do doc, sem
// pular número (o verificador do doc checa a sequência; aqui, a do resumo).
const secs = [...summary.matchAll(/^## (\d+)\./gm)].map((m) => Number(m[1]))
for (let i = 0; i < secs.length; i++) {
  if (secs[i] !== i + 1) {
    console.error(`✗ seção do resumo fora de ordem: esperava ${i + 1}, acheou ${secs[i]}`)
    process.exit(1)
  }
}

console.log(
  `✓ ${SUMMARY} — ${CLAIMS.length} afirmações conferidas em ${REPO_DOC}, ` +
    `${secs.length} seções, não é cópia`,
)
