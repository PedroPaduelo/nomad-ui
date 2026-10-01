#!/usr/bin/env node
/**
 * Verificador mecânico de documento normativo (`docs/padrao-frontend.md` e a
 * página de knowledge derivada). Existe porque a transcrição manual de texto
 * longo já erra duas vezes no mesmo dia (2026-10-01) — acentos de outro
 * idioma, aspas trocadas, número que não bate. Revisão humana não pega isso;
 * o script pega.
 *
 *   node scripts/check-doc.mjs docs/padrao-frontend.md
 *
 * Sai com código 1 se algo estiver errado (para travar o gate).
 */
import { readFileSync } from 'node:fs'

const file = process.argv[2] ?? 'docs/padrao-frontend.md'
const text = readFileSync(file, 'utf8')
const problems = []

// Palavras não-portuguesas que escaparam de transcrição/anotação automática.
// Lista curta e específica de propósito: um dicionário genérico de línguas
// acusaria nomes próprios e siglas; aqui estão as que realmente apareceram.
const FOREIGN = [
  'versión', 'tipam tegen', 'tietap', 'tenken', 'gegen', 'versión', 'verzió', 'artefacto',
  'jladda', 'proshch', '归', '其他', '定', '是',
]
// Palavras russas/cinasas que já entraram em mensagens/task deste projeto.
const CJK_CYRILLIC = /[Ѐ-ӿ一-鿿぀-ヿ]/

// 1) Palavra não-portuguesa em contexto português.
for (const w of FOREIGN) {
  if (text.toLowerCase().includes(w)) problems.push(`palavra estrangeira: "${w}"`)
}
// 1b) Qualquer caractere CJK/cirílico no documento.
const cjk = text.match(CJK_CYRILLIC)
if (cjk) {
  const i = text.indexOf(cjk[0])
  const ctx = text.slice(Math.max(0, i - 40), i + 40).replace(/\n/g, ' ')
  problems.push(`caractere fora do português/inglês técnico: "${cjk[0]}" em …${ctx}…`)
}

// 2) Balanço de aspas e backticks em blocos de código.
//    Uma aspa trocada por apóstrofo quebra o exemplo inteiro sem erro de
//    sintaxe — foi o caso de `/auth/logged-out", `/auth/no-access`.
const ticks = (text.match(/`/g) ?? []).length
if (ticks % 2 !== 0) problems.push(`número ímpar de backticks (${ticks}) — bloco inline ou código não fechado`)

// Aspas duplas dentro de linha que já está em código inline deve ser apóstrofo
// ou closing backtick. Heurística: `"/auth/...` no meio do texto.
const suspiciousQuote = text.match(/`\/auth\/[a-z-]+",\s*`/g)
if (suspiciousQuote) problems.push(`aspas duplas onde esperado apóstrofo: ${suspiciousQuote.join(' | ')}`)

// 3) Tabelas markdown: contagem de colunas constante (cabeçalho, separador e linhas).
const lines = text.split('\n')
for (let i = 0; i < lines.length; i++) {
  const l = lines[i]
  if (!l.trim().startsWith('|')) continue
  const cols = l.split('|').length
  const isSep = /^\|[\s:-|]+\|$/.test(l.trim())
  if (isSep) continue
  // compara com a linha de separador imediatamente acima
  const prev = lines[i - 1] ?? ''
  if (/^\|[\s:-|]+\|$/.test(prev.trim())) {
    const prevCols = prev.split('|').length
    if (cols !== prevCols) {
      problems.push(`tabela desalinhada na linha ${i + 1}: ${cols - 2} colunas, cabeçalho tem ${prevCols - 2}`)
    }
  }
}

// 4) Versões citadas: toda tag `vX.Y.Z` que o documento afirma existir.
const declared = new Set([...text.matchAll(/^\| \`(v\d+\.\d+\.\d+)\`/gm)].map((m) => m[1]))
const referenced = new Set([...text.matchAll(/nomad-ui\.git#(v\d+\.\d+\.\d+)/g)].map((m) => m[1]))
for (const r of referenced) {
  if (!declared.has(r)) problems.push(`tag referada mas ausente da tabela de versões: ${r}`)
}

// 5) HEADERS: numeração de seção sequencial e sem duplicata.
const heads = [...text.matchAll(/^## (\d+)\./gm)].map((m) => Number(m[1]))
for (let i = 0; i < heads.length; i++) {
  if (heads[i] !== i + 1) problems.push(`numeração de seção fora de ordem: esperava ${i + 1}, achou ${heads[i]}`)
}

if (problems.length) {
  console.error(`✗ ${file} — ${problems.length} problema(s):`)
  for (const p of problems) console.error(`  · ${p}`)
  process.exit(1)
}
console.log(`✓ ${file} — ok (${lines.length} linhas, ${declared.size} versões, ${heads.length} seções)`)
