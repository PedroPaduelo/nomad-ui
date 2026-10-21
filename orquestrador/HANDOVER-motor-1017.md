# 🤝 HANDOVER — Sessão Motor 2026-10-17

> **Ponto de retomada.** Este documento carrega TODO o estado: o que foi feito, o que está no ar, o que está pausado e como retomar cada coisa. Escrito para a próxima sessão continuar de onde esta parou, sem refazer trabalho.

---

## ⚡ RETOMADA EM 3 LINHAS

1. **Deploy de ontem (fa44a999) no ar e sadio** — be/worker/fe healthy. Nada pendente de produção.
2. **30 dias de retenção aplicados e provados** — env no painel + container recriado; boot log de 13:40:22 confirma `mailboxUnconsumedDays: 30`.
3. **Workflow dos 5 gaps de UI PAUSADO, relançável com 1 comando** — nenhum worktree criado ainda, nenhuma linha escrita. Relançar NÃO perde nada.

---

## 1. ESTADO DE PRODUÇÃO (verificado por mim, 2026-10-17)

| Serviço | ID | Estado | Commit | Última mudança |
|---|---|---|---|---|
| `motor-be-ws` | `XfpK4JQ6dIQ8bVd1T0IBY` | `Up 12h (healthy)` | `fa44a999` | deploy 2026-10-16 (fechamento) |
| `motor-worker-ws` | `kttpPrtp3QiiJz2DZetcB` | `Up` (recriado 13:40) | `fa44a999` | env 30 dias 2026-10-17 |
| `motor-fe-ws` | `XOXZjJVaX-d7vn-rruoRY` | `Up 12h (healthy)` | `fa44a999` | deploy 2026-10-16 |

- **main do repo = `fa44a999`** — é o que está em produção. Branch de trabalho: `tec-le1-mut-ret` na SB (mesmo SHA).
- **A 30 dias — prova literal no log de boot do worker (13:40:22):**
```
"retention":{"threadsDeletedDays":30,"mailboxConsumedDays":7,"mailboxUnconsumedDays":30,
"webhookDeliveriesDays":90,"workflowRunsDays":180,"batch":500,"maxBatches":20,"mailboxWriteBudget":300}
```
- **Env criada:** `RETENTION_MAILBOX_UNCONSUMED_DAYS = "30"`, `isSecret: false`, serviço `kttpPrtp3QiiJz2DZetcB`, env-id `nHAPW8LiPwXqaAndQY49C`, 13:36:32.
- **Rollback (1 clique):** apagar a env no painel + recriar o worker. Consumidos seguem em 7 de propósito.
- ⚠️ **Mecanismo confirmado:** env de painel só pega com **recreate** do container (Env é imutável em container existente; `services_restart` NÃO basta). A prova sempre é o **log de boot do worker** — ele imprime a config EFETIVA.

---

## 2. O MAILBOX — dossiê fechado (pergunta do dono)

**O que é:** fila durável em Postgres (`mailbox_items`, `be/src/engine/mailbox-db.ts`). Avisa a thread-pai que um subagente terminou. `FOR UPDATE SKIP LOCKED` + `consumed_at = now()` na mesma statement = exatamente-uma entrega entre réplicas. Postgres e não Redis de propósito (não se pode perder mensagem; volume baixo — 1 item por spawn, não por token).

**6 produtores** (todos via `mailbox.push` → `mailboxItem.create`, `mailbox-db.ts:87`): humano via WS (`ws/handler.ts:594`), spawn (`orchestrator.ts:663`), fim de subagente (`orchestrator.ts:771+838`), reaper de órfãos (`reaper.ts:497`), avisos de workflow (`workflows/notify-launcher.ts:142`), reenfileiramento mid-turn (`mid-turn-drain.ts:259`).

**Consumo:** `drain` (tudo pendente, início do turno — `dispatcher.ts:238`) e `drainNotifications` (só `subagent_result`, mid-turn — `turn-runner.ts:1648`). **Mensagem do usuário durante turno NUNCA é drenada no meio** — enfileira e ganha turno próprio cada uma.

**Sem teto de fila, de propósito (D4):** a defesa é o rate limiter por `(orgId, userId)` ANTES do push (`dispatcher.ts:354`) → 429. Notificação vira "user message" sintética pro modelo, cortada a 8.000 chars; texto integral fica no evento (tela + pull via `agent_status`).

**O usuário vê ZERO UI do mailbox** — sem rota HTTP, sem painel, sem métrica (`grep mailbox be/src/routes` = vazio; `fe/src` só comentários + tipo gerado). Vê o EFEITO: linha da timeline virar `done` + mensagens enfileiradas.

---

## 3. GAPS DE UI — o insumo do workflow pausado

Scout mapeou a UI em `fa44a999` (cidades com `arquivo:linha` validadas por mim):

**O que JÁ EXISTE (não inventar de novo):**
- Rail lateral de subagentes no Playground: `fe/src/features/playground/components/PlaygroundSubagents.tsx:40` (281px ≥md; Drawer <md)
- Contador no header: **"3 rodando · 5 total"** — `SubagentSidebar.tsx:135`
- Modo Lista/Graph: `SubagentSidebar.tsx:121-124`; grafo git com lifelines + edges de merge: `SubagentGraph.tsx:39`, layout `graph-layout.ts` (edge merge `:244`, trigger `:137`)
- Modal de conversa do filho: `SubagentConversationDialog.tsx:57` (960px; só alcançável pela sidebar via `PlaygroundPage.tsx:231,257-263`)
- Estados "na fila"/"travado…"(2min)/"finalizando…"/"ainda sem eventos": `status.ts:31,45,39`

**Os 5 gaps a consertar:**

| # | Gap | Fio já existe em |
|---|---|---|
| 1 | Linha da timeline abre a conversa do filho (hoje é beco sem saída) | `SubagentBlock` (`blocks.tsx:417`, Collapsible `:456`); handler da sidebar `:230` |
| 2 | Tokens por subagente | Backend manda `tokens` no `SubagentNotification`; `SubagentItem` (`types.ts:128-160`) nem declara o campo; patch `timeline-live.ts:263-269` não copia |
| 3 | "Cancelado em cascata" × "cancelado" | `rotuloDeCancelamento()` (`orphan-badge.ts:52-58`) pronta, só usada em teste; `abortKind` gravado em `timeline-live.ts:319` |
| 4 | Órfão marcado na timeline | `statusDeOrfao()` (`orphan-badge.ts:32`) sem consumidor; sidebar usa `textoDeOrfao` (`SubagentSidebar.tsx:98,102`) |
| 5 | Pulso no edge de merge do grafo | Edge estático (`SubagentGraph.tsx:239-240`); gating reduced-motion já existe (`:41,487-493`) |

**Campos que o backend manda e o front joga fora** (medi): `siblingsRunning` → 0 usos, `enqueuedAt` → 0 usos, `tokens` → 0 usos no `SubagentItem` (mas 105 usos gerais no fe). Workflow mostra custo/tokens (`RunSummary.tsx:129,131`), subagente não.

---

## 4. 🔴 WORKFLOW PAUSADO — como relançar

**Run:** `wf_77f293c5-072` (task `w1mpgrqie`) — "motor-ui-gaps-1017".
**Script salvo em:** `/home/nommand/.claude/projects/-home-nommand-code-tmp-orquestrador/159f05fc-0737-4517-bd69-ba2a4bd41254/workflows/scripts/motor-ui-gaps-1017-wf_77f293c5-072.js`

**Estado no pause:** fase Implementar; `gaps-timeline-1-4` morreu 1× (relançado como retry, id `a9d01984d6cd5e6a6`); `gap-5-pulso-grafo` ainda rodando. **Nenhum worktree criado, nenhum branch, zero linhas de código** (confirmei: `git worktree list | grep ui-gap` vazio na SB `motor`). Relançar não perde nada.

**Relançar (1 comando):**
```
Workflow({scriptPath: '/home/nommand/.claude/projects/-home-nommand-code-tmp-orquestrador/159f05fc-0737-4517-bd69-ba2a4bd41254/workflows/scripts/motor-ui-gaps-1017-wf_77f293c5-072.js', resumeFromRunId: 'wf_77f293c5-072'})
```

**O que o workflow faz (3 fases):**
1. **Implementar** — 2 agentes paralelos em branches separados na SB: `ui-gap-timeline-1017` (gaps 1–4) e `ui-gap-grafo-1017` (gap 5), ambos base `fa44a999`.
2. **Gate** — agente integra em `ui-gaps-1017`: baseline da suite fe em fa44a999 → merge dos 2 → suite de novo → `comm -13/-23` **com LC_ALL=C** (os 2 vazios) + agulha de controle + `tsc --noEmit` 0 erros + build + cycles.
3. **Inimigo** — mutação em cada fio (teste novo TEM que morrer) + caça ao que ninguém olhou (affordance fora do playground, reduced-motion real, `undefined`/NaN de tokens, button vs div, testes decorativos).

**Regras críticas embutidas nos briefs (não repassar de novo):** sem push/merge em main/deploy; sem dependência nova; worktree próprio por agente com base explícita `fa44a999`; `npm ci` só na RAIZ; comm com `LC_ALL=C`; conferir escritas (a sessão já perdeu ~7 chars silenciosos).

**Depois do PRONTO do inimigo:** eu mostro os **mockups/arranjo final pro dono** (regra do dono: toda config precisa de tela; visual primeiro) e **só com o go dele** push + deploy (só o `fe` muda — be e worker ficam).

---

## 5. ARQUIVOS IMPORTANTES DESTA SESSÃO

| Caminho | O que é |
|---|---|
| `/home/nommand/code/tmp/orquestrador/HANDOVER-motor-1017.md` | **Este handover** |
| `~/.claude/projects/-home-nommand-code-tmp/memory/motor-mailbox-dossier-30d.md` | Memória nova: mailbox + gaps + 30 dias aplicados |
| `~/.claude/projects/-home-nommand-code-tmp/memory/MEMORY.md` | Índice de memórias (entrada nova no fim) |
| `.../workflows/scripts/motor-ui-gaps-1017-wf_77f293c5-072.js` | Script do workflow pausado |
| `.../subagents/workflows/wf_77f293c5-072/` | Transcripts dos agentes do workflow pausado |

**Memórias relevantes já existentes (ler na retomada):**
- `motor-fechamento-deploy-mut-ret-fora` — deploy de ontem, cota 300, migration do índice
- `motor-validacao-1016-4-consertos` — 4 bloqueios fechados, `comm` com LC_ALL=C, `npm ci --workspaces=false` proibido
- `motor-fechamento-1016-provas-fora-da-branch` — `git merge-base --is-ancestor` antes de qualquer merge
- `agentpack-nao-encostar` — projeto AgentPack separado é teste do dono, NÃO ENCOSTAR
- `dono-ja-sabe-dos-riscos` — NÃO repetir avisos de segurança (bancos abertos, rotação de chave)

---

## 6. REGRAS PERMANENTES COM O DONO (Myke Pedro Paduelo, PT-BR)

1. **Orquestrador/tech lead:** só pesquiso, briefo, reviso, verifico e decido. **Execução SEMPRE em subagentes/workflows.**
2. **Ultracode ON** — workflow pra toda tarefa substantiva.
3. **Falar claro e breve.** PT-BR sempre.
4. **Deliverables visuais** — números grandes, diagramas, ordem de risco. Toda config tem tela. UI nova: **mockup primeiro**, go depois.
5. **Prod: perguntar antes, SEMPRE** — só executa deploy com go explícito. (O go do 30 dias foi "poe 30 dias na retenção".)
6. **NÃO tocar** no projeto AgentPack separado (teste do dono).
7. **NÃO repetir** avisos de segurança (bancos abertos fica; rotação é dele, depois).
8. Owner: Myke Pedro Paduelo. Git user: `Myke Pedro Paduelo`. Commits: fim com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## 7. PENDÊNCIAS QUE NÃO SÃO DESTE WORKFLOW (não esquecer)

| Pendência | Estado |
|---|---|
| Doc debt `docs/_pendente-operacao-leak-mcp.md` (4 seções não coladas em `operacao.md`) | **Adiado pelo dono** ("não entendi ok") — não puxar sem ele pedir |
| Comentários errados em `retention.ts:197` ("mata 5", real 6) e "8841 de 40015" (não verificável, adv mediu 8753) | Conhecidos, sem comportamento, sem urgência |
| `docs/typecheck-9-erros.md` alega "@fastify/busboy 2.1.1 é o que o runtime usa" de 57 pacotes divergentes | **Nunca medido** — medir antes de virar fato |
| Plano `memoized-orbiting-comet.md` (setup público/privado + Duplicar + chave presa à origem D11/D12) | **Não começado** — plano completo em `~/.claude/plans/memoized-orbiting-comet.md`; diz pra perguntar antes de deployar |
| Subir `RETENTION_MAILBOX_CONSUMED_DAYS` (consumidos, 7 dias)? | Decisão do dono — ele só pediu os unconsumed |
| ~110 worktrees antigos na SB | Limpeza não pedida |

---

## 8. TRAPS DE AMBIENTE (ja pagos nesta sessão — checklist rápido)

- `sandbox_bash` exige `sandbox: "motor"` — sem o param, falha.
- Shell **reseta cwd** após cada Bash: sempre `cd` dentro do comando ou caminho absoluto.
- `docker_exec` precisa do nome completo: `minipanel-motor-<svc>-ws`, não `motor-<svc>-ws`.
- SB: `DATABASE_URL`→`localhost:25435` e `REDIS_URL`→`localhost:26382` são **túneis mortos**; usar local:5432/local:6379 (e `scram-sha-256` — `postgres:postgres@localhost:5432` NÃO autentica).
- `DEFAULT_ORG_ID=63a46fe74d8b5429` / `DEFAULT_USER_ID=93f7a3d968610f4d` não são UUIDs → 505 testes SKIP (falso verde se comparar total bruto).
- Sem `be/.env`, `src/env.ts` fail-fast em `ANTHROPIC_BASE_URL` → 0 testes rodam.
- `npm ci --workspaces=false` dentro de `be/` **PROIBIDO** (9 erros falsos; cura = `npm ci` na raiz, autocurativo).
- `prisma db push` não materializa o índice parcial `agents_org_id_default_uniq` → 19ª falha falsa. Usar `migrate deploy`.
- `comm` sempre `LC_ALL=C`. `QUEUE_PREFIX` próprio por agente (worker em outro prefixo ignora job em silêncio).
- vitest `--maxWorkers=2` na SB (12 workers OOM em 8 GB).
- Memória real: `/home/nommand/.claude/projects/-home-nommand-code-tmp/memory/` (hífen). `sandbox_preview` exige port com app rodando.
- Workflow scripts: **sem** `Date.now()`/`Math.random()`; `phase()` recebe string; primeiro erro de parse do dia foi template literal não fechado (`MAPA` — conferir backticks ao editar).

---

## 9. PRÓXIMOS PASSOS NA RETOMADA (ordem)

1. **Dono decide:** relançar o workflow dos gaps? → comando da §4. (Se ele quiser mudar algo no escopo, editar o script salvo e relançar com `resumeFromRunId` — agentes concluídos voltam do cache.)
2. Quando o workflow der **PRONTO do inimigo**: mockups pros 5 gaps → **go do dono** → merge `ui-gaps-1017` em main → push → **deploy só do `fe`** → confirmar pelo hash do bundle (`docker_exec` em `minipanel-motor-fe-ws`, `ls /usr/share/nginx/html/assets`).
3. Não iniciar nada da §7 sem o dono pedir — especialmente o plano `memoized-orbiting-comet.md` (pede go antes de deploy) e a dívida de doc (adiada).
4. Estado de produção: NADA pendente. Se algo de prod quebrar na retomada, os `file:line` da §1–2 e os traps da §8 cobrem o diagnóstico.

---

*Fim do handover. Gerado por Claude (Orchestrator) em 2026-10-17 ~12:45, a pedido do dono ("Faz um handover... Gigante! Eu quero tudo nele"). Tudo aqui foi medido ou citado com arquivo:linha — nada estimado.*
