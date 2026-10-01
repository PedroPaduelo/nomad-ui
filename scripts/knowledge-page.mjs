#!/usr/bin/env node
/**
 * Gera o corpo da página de knowledge `[NUI] Padrão Frontend Nomad v1`
 * (AgentPack `690df27c`).
 *
 * ## O que mudou em 2026-10-01 (e por que)
 *
 * A página era uma CÓPIA do documento do repo, sincronizada à mão. Duas vezes
 * no mesmo dia a transcrição introduziu defeitos que a revisão estrutural não
 * pegou — na cópia: palavra em espanhol, palavra em holandês, aspa trocada
 * quebrando um exemplo de rota; no repo: três seções da auditoria escritas por
 * outra sessão. A lição: em documento normativo, o defeito é a transcrição, não
 * a revisão. Um gerador que ainda precisa de alguém para colar o texto na API
 * mantém o defeito — a mão vai para o meio de novo.
 *
 * Então a página deixou de ser cópia. Agora ela é um **ponteiro**: o resumo
 * (~90 linhas) e a regra de leitura, com o documento inteiro sustituído por
 * `link:repo:docs/padrao-frontend.md`. Quem consultou a página há learns o que
 * precisa; quem implementa abre o documento no repo, que é a fonte única. Não
 * há segunda cópia para divergir.
 *
 * ## O que este script NÃO faz
 *
 * Não escreve no AgentPack: quem publica é a sessão com a API, lendo o
 * arquivo gerado. Publicar continua sendo um argumento de tool — a diferença é
 * que o argumento é pequeno, gerado e verificado, em vez de 400 linhas
 * transcritas à mão.
 *
 * ## Uso
 *
 *   node scripts/knowledge-page.mjs              # gera dist/knowledge-690df27c.md
 *   node scripts/check-doc.mjs dist/knowledge-690df27c.md
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'

const REPO_DOC = 'docs/padrao-frontend.md'
const SUMMARY = 'knowledge.knowledge.md'
const OUT_DIR = 'dist'
const OUT = `${OUT_DIR}/knowledge-690df27c.md`
const REPO_URL = 'https://github.com/PedroPaduelo/nomad-ui/blob/main'
const REPO_AUDIT = `${REPO_URL}/docs/auditoria-apps.md`

const fail = (msg) => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// 0) Todo caminho que o ponteiro cita tem que EXISTIR no repo. Um ponteiro
//    para arquivo que saiu ou mudou de nome é mentira silenciosa — a mesma
//    classe de defeito que o knowledge-summary.test.mjs caça no texto, agora
//    no alvo (pedido do orquestrador-93, 2026-10-01).
const POINTER_TARGETS = [REPO_DOC, 'docs/auditoria-apps.md', 'CHANGELOG.md', 'README.md']
const missing = POINTER_TARGETS.filter((t) => !existsSync(t))
if (missing.length) {
  fail(
    `ponteiro aponta para alvo inexistente: ${missing.join(', ')} — corrija o ponteiro ou o repo`,
  )
}

// 1) o doc do repo existe e passa no verificador (fonte corrompida não vira página)
let check
try {
  check = spawnSync('node', ['scripts/check-doc.mjs', REPO_DOC], { encoding: 'utf8' })
} catch {
  fail('scripts/check-doc.mjs não encontrado — a verificação é obrigatória')
}
process.stdout.write(check.stdout ?? '')
process.stderr.write(check.stderr ?? '')
if (check.status !== 0) fail('o documento do repo não passa no verificador — nada foi gerado')

// 2) o resumo (julgamento humano) + o ponteiro
const summary = readFileSync(SUMMARY, 'utf8')
  .replace(/^<!--[\s\S]*?-->\s*/m, '')
  .replace(/\n+$/, '\n')
const pointer = [
  '---',
  '',
  '## O documento',
  '',
  'O padrão completo está no repositório, em **um** lugar: `docs/padrao-frontend.md`.',
  'Os casos concretos por app estão em `docs/auditoria-apps.md`; o que cada versão do pacote',
  'trouxe, em `CHANGELOG.md`; o pacote em si (entradas, vitrine, release), no `README.md`.',
  '',
  'Esta página é o resumo e o ponteiro — não é uma cópia. Se as duas divergirem, o repositório vence.',
  '',
  'Para decidir, leia o resumo. Para implementar, abra o documento no repositório: é a versão',
  'que os quatro apps copiam, e nada nesta página a substitui.',
  '',
].join('\n')

const page = `${summary}\n${pointer}`

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT, page, 'utf8')

// 3) a saída passa no verificador, e não é cópia do documento
const checkOut = spawnSync('node', ['scripts/check-doc.mjs', OUT], { encoding: 'utf8' })
process.stdout.write(checkOut.stdout ?? '')
process.stderr.write(checkOut.stderr ?? '')
if (checkOut.status !== 0)
  fail(`a página gerada não passa no verificador — ${OUT} deixado para inspeção, não publicar`)
if (page.includes(readFileSync(REPO_DOC, 'utf8')))
  fail('a página ainda contém o documento inteiro — ela deve ser ponteiro, não cópia')
for (const t of POINTER_TARGETS) {
  if (!page.includes(t)) fail(`a página gerada não cita o alvo do ponteiro: ${t}`)
}

const lines = page.split('\n').length
console.log(`✓ ${OUT} — ${lines} linhas (resumo + ponteiro; o documento fica no repo)`)
console.log(
  `  publicar: agentpack_knowledge_update(id: 690df27c, content: <${resolve(OUT)}>, expectedVersion: <atual>)`,
)
console.log(`  caminho: ${resolve(OUT)}`)
