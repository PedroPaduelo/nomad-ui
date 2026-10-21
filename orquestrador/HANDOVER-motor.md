# HANDOVER — Projeto Motor

> Status: mantido como source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.

---

## 1. Estado de produção (2026-10-17)

| Serviço | ID | Commit | Estado | Última mudança |
|---|---|---|---|---|
| motor-be-ws | XfpK4JQ6dIQ8bVd1T0IBY | fa44a999 | Up 12h (healthy) | deploy 2026-10-16 |
| motor-worker-ws | kttpPrtp3QiiJz2DZetcB | fa44a999 | Up (recriado 13:40) | env 30 dias, 2026-10-17 |
| motor-fe-ws | XOXZjJVaX-d7vn-rruoRY | fa44a999 | Up 12h (healthy) | deploy 2026-10-16 |

**Commit de produção: `fa44a999`** (main). Deploy ordem autorizada: be → worker → fe, executada.

### 30 dias de retenção — APLICADO E PROVADO

- Env criada no painel: `RETENTION_MAILBOX_UNCONSUMED_DAYS = "30"` (isSecret false), serviço worker, id `nHAPW8LiPwXqaAndQY49C`, 13:36:32.
- Container recriado: deployment `6hk_7dJm8WS16IWBsJ9pN`, mesmo commit fa44a999, zero código trocado.
- Boot 13:40:22 confirma `"mailboxUnconsumedDays":30` no bloco `"retention"` — linha literal conferida.
- Mecanismo: env do painel SOBREPÕE o `${VAR:-}` do compose no recreate do container. `services_restart` NÃO basta (Env é imutável).
- be e fe não mudaram.
- **Rollback:** apagar a env no painel + recriar o worker.

**A retenção do Mailbox:**
- `mailbox_items`: id UUID, threadId, orgId, seq BigInt autoincrement, kind (user_message|subagent_result|agent_message-reservado), payload JsonB, createdAt, consumedAt.
- É a fila interna que avisa a thread-pai que um subagente terminou. `consumedAt IS NULL` = não entregue ainda. Drain atômico `UPDATE ... SET consumed_at = now() ... FOR UPDATE SKIP LOCKED` = exatamente-uma entrega entre réplicas. Postgres por escolha (não Redis): não pode perder mensagem, volume baixo.
- O usuário NÃO vê UI de mailbox (zero tela/rota/métrica). Vê o efeito: linha do subagente virar `done` na timeline + mensagens digitadas durante turno rodando enfileirarem.
- 6 produtores (ws/handler, orchestrator spawn, fim de subagente, reaper, notify-launcher, mid-turn-drain), 2 consumidores (drain no início do turno, drainNotifications mid-turn).
- Bloco unconsumed só apaga órfãos: kind=subagent_result, consumedAt=null, mais velho que N dias, thread dona TERMINAL. Grava o texto em `events` da thread dona antes de apagar (3 escritas/linha). Consumidos seguem 7 dias.
- Antes da aplicação: 1.255 mailbox_items, 5 unconsumed, `mailboxUnconsumedDeleted: 0` nos 4 ticks observados. Orçamento 10.000/tick → folga ~2.000×.

### Gaps de UI de subagentes (scout 2026-10-17)

Todos com "fio pronto, falta ligar", mapeados em `fa44a999`:

| # | Gap | Onde está o fio |
|---|---|---|
| 1 | Linha da timeline (SubagentBlock `blocks.tsx:417`) é beco sem saída — não abre a conversa do filho | Sidebar `SubagentSidebar.tsx:230` tem `onSelectSubagent`; `SubagentConversationDialog.tsx:57` |
| 2 | `tokens` vem no `SubagentNotification` do WS mas `SubagentItem` (`types.ts:128-160`) nem declara o campo | Patch `timeline-live.ts:263-269` não copia `tokens`; workflow já mostra custo/tokens em `RunSummary.tsx:129,131` |
| 3 | "Cancelado em cascata" × "cancelado" não diferenciam na tela | `rotuloDeCancelamento()` em `orphan-badge.ts:52-58`, só usada em teste; `abortKind` gravado em `timeline-live.ts:319` |
| 4 | Órfão não marcado na timeline | `statusDeOrfao()` em `orphan-badge.ts:32` sem consumidor; sidebar usa `textoDeOrfao()` em `SubagentSidebar.tsx:98,102` |
| 5 | Edge de merge do grafo estático, sem pulso | `SubagentGraph.tsx:239-240`, `graph-layout.ts:244`; gating `prefers-reduced-motion` já existe (`:41,487-493`) |

**Workflow pausado** dos 5 gaps: `wf_77f293c5-072`, script salvo em `motor-ui-gaps-1017-wf_77f293c5-072.js`. Nenhum worktree criado ainda. Comando de retomada no `HANDOVER-motor-1017.md` na raiz do orquestrador. Quando der PRONTO: mockups → go do dono → deploy só do fe.

### VETO e histórico de correções (2026-10-16)

Os 4 bloqueios do VETO fecharam: envs no compose (`compose.prod.yml:213-215`), cota antes do SELECT (`retention.ts:414`), cota com teste (`retention-cota-300-invariant.test.ts`), índice parcial (`20261016150000_mailbox_unconsumed_order`, `CREATE INDEX` comum, não CONCURRENTLY). A migração mediu 1.4–1.9s no local (1,22M itens, 101 666 unconsumed) e 704–1 151 ms pior espera de escrita durante o build. Em prod são 5 unconsumed.

Lições gravadas na memória:
- `npm ci --workspaces=false` dentro de `be/` é PROIBIDO → 9 erros falsos de typecheck. Cura: `npm ci` na raiz (autocurativo).
- `comm` SEMPRE com `LC_ALL=C` (nomes com acento).
- `DEFAULT_ORG_ID`/`DEFAULT_USER_ID` no `.env` não são UUIDs válidos → 505 testes SKIP (falso verde se comparar total bruto).
- Sem `be/.env` → `src/env.ts` fail-fast em `ANTHROPIC_BASE_URL` → 0 testes rodam.
- `prisma db push` não materializa o índice parcial `agents_org_id_default_uniq` → 19ª falha falsa.
- `CREATE INDEX CONCURRENTLY` é proibido (deadlock 40P01 que derrubou o Motor 5/5).
- CJK caracteres corromperam um memory — verificar com grep antes de confiar.

### Pendências do Motor

- Doc debt `docs/_pendente-operacao-leak-mcp.md` (4 seções não coladas em `operacao.md`) — **adiada pelo dono**.
- Comentário `retention.ts:197` diz "mata 5 testes" (real: 6); "8841 de 40015" não verificável (adv mediu 8753). Sem mudança de comportamento, não urgente.
- `docs/typecheck-9-erros.md` alega "@fastify/busboy 2.1.1 é o que o runtime usa" de 57 pacotes divergentes — **nunca medido**, não virar fato sem medição.
- Plano `memoized-orbiting-comet.md` (setup público/privado + Duplicar + chave presa à origem D11/D12) — não começado, o dono deve dar go antes de deployar.
- ~110 worktrees antigos na SB — limpeza não pedida.

**Memórias relacionadas:** `motor-mailbox-dossier-30d`, `motor-fechamento-deploy-mut-ret-fora`, `motor-validacao-1016-4-consertos`, `motor-fechamento-1016-provas-fora-da-branch`, `motor-sb-and-deploy`, `motor-sb-main-working-tree-sujo`, `motor-incidente-1ms-nao-existe-no-commitado`, `motor-producao-2026-10-15`.

---

## 2. Como o trabalho do Motor chega até mim (modo de orquestração)

Eu não implemento. Faço: pesquisa, brief, review, decisão. Toda execução vai para subagentes/workflows em background (Ultracode ON). Antes de delegar: reafirmo o pedido, checo regras cross-app, e o brief do agente carrega SB, convenções do repo, regras de deploy e de segredo. Relatório do agente é repassado fielmente; nunca predito. Merge e push só com go do dono.

---

**Arquivo do handover da raiz do orquestrador:** `/home/nommand/code/tmp/orquestrador/HANDOVER-motor-1017.md`
