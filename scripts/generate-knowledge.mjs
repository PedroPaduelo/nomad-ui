#!/usr/bin/env node
/**
 * Gera o corpo da página de knowledge `[NUI] Padrão Frontend Nomad v1`
 * (AgentPack `690df27c`) a partir de `docs/padrao-frontend.md` no repositório.
 *
 * ## Por que existe
 *
 * A página de knowledge e o documento do repo são o mesmo texto, e sincronizá-los
 * à mão erode: em 2026-10-01 a transcrição manual introduziu três defeitos que
 * a revisão estrutural não pegou (uma palavra em espanhol, uma em holandês, uma
 * aspa trocada quebrando um exemplo de rota). O problema não é revisão, é
 * transcrição — o texto passa por um contexto humano em vez de ser copiado.
 *
 * Aqui a direção é invertida: o documento do repo é a fonte, o script monta o
 * corpo, o verificador confere, e a publicação acontece do lado que tem a API
 * do AgentPack. O texto não passa por transcrição em lugar nenhum.
 *
 * ## O que este script NÃO faz (decisão de projeto)
 *
 * A página tem um **template fino** (`knowledge.knowledge.md`): o cabeçalho
 * próprio da página AgentPack (título de适用范围, o bloco de "revisar na v1.0.0",
 * a nota de que a auditoria por app vive em `docs/auditoria-apps.md`). Esse
 * cabeçalho tem julgamento humano e muda com menos frequência que o corpo, e
 * é o único ponto do arquivo que o script preserva literalmente. Tudo abaixo
 * do marcador `<!-- repo:docs/padrao-frontend.md -->` é derivado.
 *
 * ## Uso
 *
 *   node scripts/generate-knowledge.mjs            # gera ./dist/knowledge-690df27c.md
 *   node scripts/check-doc.mjs dist/knowledge-690df27c.md   # verifica a saída
 *
 * Sai com código 1 se o resultado não passar no verificador. Não escreve no
 * AgentPack: quem publica é a sessão com a API, lendo o arquivo gerado.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'

const REPO_DOC = 'docs/padrao-frontend.md'
const TEMPLATE = 'knowledge.knowledge.md'
const ANCHOR = '<!-- repo:docs/padrao-frontend.md -->'
const OUT_DIR = 'dist'
const OUT = `${OUT_DIR}/knowledge-690df27c.md`

const fail = (msg) => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// 1) o template existe e tem o marcador do corpo
const template = readFileSync(TEMPLATE, 'utf8')
const at = template.indexOf(ANCHOR)
if (at === -1) fail(`${TEMPLATE} não tem o marcador ${ANCHOR}`)

// 2) o doc do repo passa no verificador ANTES de gerar (fonte corrompida não vira página)
const check = spawnSync('node', ['scripts/check-doc.mjs', REPO_DOC], { encoding: 'utf8' })
process.stdout.write(check.stdout ?? '')
process.stderr.write(check.stderr ?? '')
if (check.status !== 0) fail('o documento do repo não passa no verificador — nada foi gerado')

// 3) corpo = cabeçalho do template + o documento do repo inteiro
const head = template.slice(0, at).replace(/\n+$/, '\n')
const body = readFileSync(REPO_DOC, 'utf8')
const page = `${head}\n<!-- Derivado de ${REPO_DOC} por scripts/generate-knowledge.mjs.\n     Não edite abaixo deste bloco: a próxima geração sobrescreve. Edite o repo. -->\n\n${body}`

// 4) a saída também tem de passar no verificador
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT, page, 'utf8')
const checkOut = spawnSync('node', ['scripts/check-doc.mjs', OUT], { encoding: 'utf8' })
process.stdout.write(checkOut.stdout ?? '')
process.stderr.write(checkOut.stderr ?? '')
if (checkOut.status !== 0) fail(`a página gerada não passa no verificador — ${OUT} foi deixado para inspeção, não publicar`)

// 5) prova de que é o mesmo texto: a página contém o repo inteiro, sem reescrita
const bodyStart = page.indexOf(ANCHOR) + ANCHOR.length
if (!page.slice(bodyStart).includes(body)) fail('o corpo da página não contém o documento do repo literalmente')

const lines = page.split('\n').length
console.log(`✓ ${OUT} — ${lines} linhas (cabeçalho do template + ${REPO_DOC} literal)`)
console.log(`  publicar: agentpack_knowledge_update(id: 690df27c, content: <conteúdo de ${resolve(OUT)}>, expectedVersion: <versão atual>)`)
console.log(`  caminho do arquivo: ${resolve(OUT)}`)
