/**
 * Reparo pontual da página de knowledge `[NUI] Padrão Frontend Nomad v1` (v6).
 *
 * Por que um script e não edição à mão: em 2026-10-01 a transcrição manual
 * introduziu três defeitos em português (uma palavra em espanhol, uma em
 * holandês, uma aspa trocada) que a revisão estrutural não pegou — versão,
 * ids e âncoras certas, texto errado. Este script faz só as três substituições,
 * cada uma com a string exata que o verificador pode conferir, e nada mais.
 *
 *   node scripts/repair-knowledge-v6.mjs > /tmp/knowledge-v7.md
 *
 * Não escreve nada no AgentPack: imprime o corpo corrigido para revisão antes
 * de publicar (publicar é `agentpack_knowledge_update`, feito à mão, com o
 * `expectedVersion` da página).
 */
import { readFileSync, writeFileSync } from 'node:fs'

const src = process.argv[2] ?? '/tmp/knowledge-v6.md'
let text = readFileSync(src, 'utf8')

/** Substituições verificadas: [de, para, descrição]. */
const FIXES = [
  [
    'a republicação do conteúdo da `v1.5.0` (la tag `v1.5.0` apontava para o commit da `v1.4.1`)',
    'a republicação do conteúdo da `v1.5.0` (a tag `v1.5.0` apontava para o commit da `v1.4.1`)',
    'la → a (espanhol)',
  ],
  [
    'eles tipam tegen de zod que o app tem, seja 3 ou 4',
    'eles tipam contra o zod que o app tem, seja 3 ou 4',
    'tegen → contra (holandês)',
  ],
  [
    '`/login` ("Entrar com a Conta Nommand"), `/auth/logged-out", `/auth/no-access`',
    '`/login` ("Entrar com a Conta Nommand"), `/auth/logged-out`, `/auth/no-access`',
    'aspas duplas no lugar de apóstrofos (quebrava o exemplo de rota)',
  ],
]

let changed = 0
for (const [from, to, why] of FIXES) {
  const n = text.split(from).length - 1
  if (n !== 1) {
    console.error(`✗ "${why}": esperado 1 ocorrência, achei ${n} — aborted (o texto mudou; releia a página)`)
    process.exit(1)
  }
  text = text.replace(from, to)
  changed += 1
}

// Rejeita qualquer coisa que o verificador pegaria (palavra estrangeira, CJK).
const bad = ['versión', 'tegen', 'la tag `v1.5.0`', '`/auth/logged-out",']
for (const b of bad) {
  if (text.includes(b)) {
    console.error(`✗ o defeito "${b}" continua no texto — nada foi escrito`)
    process.exit(1)
  }
}
if (/[Ѐ-ӿ一-鿿]/.test(text)) {
  console.error('✗ caractere cirílico/CJK no texto — nada foi escrito')
  process.exit(1)
}

const out = process.argv[3] ?? '/tmp/knowledge-v7.md'
writeFileSync(out, text, 'utf8')
console.error(`✓ ${changed} correções aplicadas → ${out} (revisar antes de publicar)`)
