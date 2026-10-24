# HANDOVER — Projeto Motor

> Status: mantido como source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.
> Auditoria de validação: 2026-10-24 (dossiê de claims; produção medida no mesmo dia). Vereditos CONFIRMED mantidos byte a byte; STALE/WRONG reescritos com a medição mais recente; UNVERIFIABLE marcados.

---

## 1. Estado de produção (deploy 2026-10-20; verificado em 2026-10-24)

| Serviço | ID | Commit | Estado | Última mudança |
|---|---|---|---|---|
| motor-be-ws | XfpK4JQ6dIQ8bVd1T0IBY | 038bcc3c | Up (healthy) | deploy 2026-10-20 (B8ZN51_xR6NMYdTcsQSlJ) |
| motor-worker-ws | kttpPrtp3QiiJz2DZetcB | 038bcc3c | Up (6 filas ativas) | deploy 2026-10-20 (Y-n66mAGWidybcX18IRA1) |
| motor-fe-ws | XOXZjJVaX-d7vn-rruoRY | 038bcc3c | Up | deploy 2026-10-20 (ZoiCuYH7Oemch-VmM-4db) |

**Commit de produção: `038bcc3c`** (main). Deploy ordem autorizada: be → worker → fe.

### Novidades 2026-10-24 (pós-handover de 21/10)
- **Produção parada no tempo:** nenhum deploy do Motor depois de 2026-10-20 14:46Z. `origin/main` = `038bcc3c` com 0 commits pendentes (remote checado 2026-10-24T07:47:41Z). Uptime de 2026-10-21 a 2026-10-24: os três serviços com **0 s fora do ar**.
- **A env de retenção sobreviveu a 4 deploys:** `RETENTION_MAILBOX_UNCONSUMED_DAYS` continua no worker e o boot de 2026-10-20 14:45:26Z mostra `retention.mailboxUnconsumedDays:30` (consumidos 7, threads 30, `mailboxWriteBudget` 300, batch 500 × maxBatches 20). Desde esse boot: **22 ticks de retenção, 338 `mailbox_items` apagados, `mailboxUnconsumedDeleted` sempre 0**.
- **Host reiniciou em 2026-10-19, entre ~19:56Z e 20:04Z** (`motor-prod-postgres` FinishedAt 19:56:40Z → StartedAt 20:04:38Z; o `monitoring_uptime` marca 488 s "unknown" em 19/10 para todos os serviços). Depois disso o painel mostra serviços de imagem (`motor-prod-postgres`, `motor-prod-redis`) como "stopped" enquanto os containers estão Up — **dessincronização do painel, não queda**. O mesmo padrão "painel stopped / container healthy" vale para o agentpack-backend-ws.
- **SB `motor`: o main local está 2 commits à frente do origin e sem push** — `7a696224` "feat(fe): a página /arquitetura mapeia o motor" e `dec5a04f` "fix(fe): a tabela do mapa rola na horizontal" (2026-10-21 19:53–20:01Z, autor "Claude Fable 5.1", 22 arquivos, +2347 linhas). **Não estão em prod; um push do main da SB os levaria junto.**
- **Caminho nativo (SDK Anthropic) em uso em prod:** 7 erros de turno "falha do provedor no caminho nativo" entre 01:38Z e 07:53Z de 2026-10-24, todos vindos do LB — 503 `overloaded_error` ("All configured providers are unavailable") em lb-api …/fiscaliza/conta e …/fiscaliza/nui, e 400 `invalid_request_error` ("Esta URL do load balancer não tem nenhuma conta ativa") em …/fiscaliza/conta. **Setups apontados para essas URLs do LB falham; é problema do pool do LB, não do Motor.**
- **MCPs carregados pelo Motor em prod:** os turnos do BE conectam mp (76 tools), browser (70), agentpack (196) e new_agentpack (361); o worker (workflows) conecta mp (76), browser (70) e agentpack (50).
- **Host em 2026-10-24 ~07:56Z:** CPU 6,5%, RAM 30,8% de ~47 GiB, disco 59%, 79 de 81 containers rodando; motor-be-ws usa 498 MB de 2 GB.
- **SB `motor`: o clone principal tem 47 entradas de rascunho não rastreadas** (`.adv*`, `.med*`, `.advpg/`, `.env-besuite.sh` — este não lido), criadas entre 2026-10-16 e 2026-10-21.

### Deployados em 2026-10-20 (bb7024b4 → 038bcc3c, 2 merges)
Em 2026-10-20 o fe foi deployado **duas vezes**: `f7a39332` de madrugada (deployment intermediário só-do-fe `3sFd3ypkLJyIsPSiHExu9`, 05:15Z) e `038bcc3c` às 14:46Z (`ZoiCuYH7Oemch-VmM-4db`).
4. **`f7a39332` — tool fechada por padrão** (`fix/tool-call-colapsada-1019`): a tool nascia ABERTA e nunca fechava (3 elos: `blocks.tsx` passava `defaultIsOpen` sempre → `tool-calls.tsx` abria só a rodando → `useState` não reinicializa e a `key` do caller é estável → a tool já terminada continuava aberta). Correção: `useState(false)` fixo em `ToolCallBlock.tsx:102` + prop `defaultIsOpen` REMOVIDA do contrato do ToolCallBlock (impede reintroduzir). Preservado: clique abre/fecha, ícone/duração, conteúdo ao expandir, fetch do resultado. Cobre o subagente (mesmo componente; a conversa do subagente JÁ nascia fechada). **Correção confirmada no ar em 2026-10-24:** `f7a39332` é ancestral de `038bcc3c` e o `ToolCallBlock.tsx` é byte-idêntico entre os dois. **A prova antiga envelheceu:** o bundle `index-1MS4_20X.js` (sha256 `a3441deb…`) pertencia ao deploy intermediário só-do-fe `3sFd3ypkLJyIsPSiHExu9` e foi apagado quando `ZoiCuYH7Oemch-VmM-4db` reempacotou o fe em `038bcc3c` — em 2026-10-24 dá 404. O `useState(false)` está na linha **102** (a 92 é o comentário). Os `defaultIsOpen` que restam em `fe/src` são do `ThinkingBlock` e de comentários de teste.
5. **`038bcc3c` — bug do "não salvou" ao salvar setup** (`fix/setup-secret-save-1019`, 12 commits): o front **adivinhava** o que o servidor gravou; o segredo volta redigido (`•••`) e a URL é canonizada, então o retrato do salvo nunca batia com o rascunho → `isDirty` true para sempre → barra presa em "1 alteração não salva" + botão Descartar + Duplicar desabilitado. **Correção na causa:** o front reconcilia o rascunho com a **RESPOSTA do servidor** (`useReconcile.ts`, `secret-reconcile.ts`) e compara por TEXTO (nenhuma comparação cola URLs distintas); o espelho `proxy-url.ts` do FE foi **DELETADO**; o BE passou a normalizar o **override** (não o body) em `setups/service.ts:467` (POST) e `:559` (PATCH), depois do Zod e antes do `preserveStoredSecrets` — o no-op do body era bug pré-existente de `114bfbbb`. `originOf` do FE alinhado ao do BE (0 divergências em 20 vetores). Prova em prod: `grep normalizeOverrideURLs` no container → linhas 467/559; bundle `index-E37v4Tos.js` byte a byte idêntico ao build local (sha256 9eab727d…); marcador `sentSecretsOf` presente no chunk servido. **Falta o clique humano** para confirmar o efeito na tela.

### Validação adversarial do deploy 038bcc3c (2026-10-21) — 5 agentes, revisor adversarial
**[PROVADO]** `038bcc3c` nos três serviços (pendingUpdate null). No container de prod: `normalizeOverrideURLs` nas linhas **51 (import), 467 (POST), 559 (PATCH)**, na ordem Zod(444/524) → normalize(467/559) → `preserveStoredSecrets`(469/560) — conferido por `docker_exec`, não por leitura de código.
**[PROVADO]** Agulhas de controle refeitas pelo revisor: BE — mutar para chamar com o body → **4 failed / 3 passed**; revertido → 7/7. Regressão ampliada `be/src/setups/` + `secret-origin-paridade` = **39/39**, 0 pulos, contra Postgres local real (5433) + Redis (6380) + `be/.env` com UUID válido. FE — mutação que neutraliza a conciliação → **19 failed** (assinatura exata: `expected saved / received dirty`); revertido → **330/330** em 35 arquivos, 0 pulos. Árvore dos dois lados limpa no fim (`git status --porcelain` vazio).
**[PROVADO]** Bundle: **42/42 assets servidos byte-idênticos** ao build local (38 js + 4 css); `index-E37v4Tos.js` sha256 `9eab727d…`, `page-DD2QAS5j.js` sha256 `b2218d5…`; chunk velho `mount-BInVqvc8.js` → **404**, novo `mount-QsnF-y8g.js` → 200.
**Runtime (retrato de 21/10, refeito em 2026-10-24):** o retrato original (3.000 linhas, zero level≥50, zero 5xx) foi re-medido em 2026-10-24 nas últimas 5.000 linhas do BE (00:47–07:53Z): **zero linhas de log pino de nível ≥40**, `/healthz` 200 e `/readyz` 200; porém houve **4×502 em `POST /api/mcp/test`** (01:59Z e 3× 06:30Z, testando `https://agentpack-v0.mp.serendiped.com/mcp`) e **7 erros de turno** "falha do provedor no caminho nativo" vindos do LB (01:38–07:53Z, detalhados em Novidades). Status no período de 24/10: 200×2047, 201×6, 302×6, 401×3, 404×34 (scanners em `/`, `/support`, `/contact`…), 502×4. Retenção no log do worker: `mailboxUnconsumedDays:30` no boot + deleção observada à 01:14.
**[REFUTADO]** "Marcador `sentSecretsOf` ausente = falta a correção" — **FALSO**: a função **está** no bundle, só com identificador mangled (`function hr(e){let n=e.basic?.apiKey…}`). A causa é mangling, **não** tree-shaking. O marcador positivo `__url.` (só existe a partir de `038bcc3c`, `git grep` em `038bcc3c^` vazio) está presente **só** no chunk de setups.
**[REFUTADO]** Contagens de marcadores publicadas (por linha, não por ocorrência): real no chunk servido = `__url.`=1, `basic.apiKey`=**4**, `context.compactor.apiKey`=**4**, `•••`=**14**, `hasStoredApiKey`=**10**. Local idêntico — a igualdade 42/42 continua de pé, os números publicados é que não.
**[REFUTADO]** Status codes publicados (200×1454, 401×3): real = 200×1369, 201×5, 302×3, 401×5, 404×1; `/api/threads` = 632×200 + 3×201 + 2×401 (o "469, todas 200" é falso). E "3001 linhas parseadas como JSON" é falso: 3.000 linhas, 2.832 JSON + 168 texto.
**[REFUTADO]** O aviso `REAPER_ENABLED!=1` **não está no log de produção** (0 ocorrências de `REAPER_ENABLED!=1`, `NENHUMA replica`, `orfaos de crash`; o único "reaper" é a rota `/api/system/reaper`). Veio do BE local da SB.
**[NÃO PROVADO]** Suíte completa do BE (só os arquivos do commit; as 7 falhas pré-existentes do commit não foram reproduzidas — sem baseline).

**Dois riscos de higiene (novos):**
- **Dois lockfiles para o mesmo front:** raiz = react-query 5.101.2 / rolldown 1.2.11; `fe/` = 5.104.0 / 1.2.12 (md5 distintos). **Só o `fe/` reproduz o bundle de prod.** Qualquer verificação futura de "bundle local == servido" precisa do mesmo recipe do Docker (`npm ci` com `fe/package-lock.json`, `VITE_API_BASE=/`, `VITE_WS_BASE=/`, conteúdo integral do `fe/`) — o build com o `node_modules` da raiz produz 9 chunks divergentes (falso-negativo).
- **SB `motor`: `be/.env` com `DEFAULT_ORG_ID` inválido ⇒ `url-matriz` falha com 7 SKIPPED** (verde falso). Sem sobrepor `DEFAULT_ORG_ID`/`DEFAULT_USER_ID` em UUID válido, a suíte não prova nada.

### Deployados em 2026-10-18 (fa44a999 → bb7024b4, 4 merges — correção da auditoria 2026-10-24)
Foram **4 merges** (não 3), todos em 2026-10-18. Saíram em **3 deploys, só de be e worker**: `ce5ca6c1` às 19:20Z, `05d9686c` às 21:12Z e `bb7024b4` às 23:37Z. **O fe não teve nenhum deploy em 18/10:** foi de `fa44a999` (17/10, deployment `3HfsX9UXyr4ogiv9N01cN`) direto para `f7a39332` (20/10, `3sFd3ypkLJyIsPSiHExu9`); `git log fa44a999..bb7024b4 -- fe/` é vazio.
1. **`7a664675` — prompt agnóstico** (`prompt-agnostico-1018`): system-prompt.md reescrito agnóstico (famílias nativas 1-linha, sem catálogo hardcoded).
2. **`ce5ca6c1` — seed v1** (`feat/seed-setups-padrao`, first-parent `7a664675`): `ensureStandardSetups` idempotente, roda no boot (fatal) + listSetups (best-effort). Seed v1 criou 6 setups na org default f2bde715 **(não verificado em 24/10)**.
3. **`05d9686c` — SEM teto de tempo de turno** (`fix/subagent-sem-limite-tempo-1018`): `turnTimeoutMs: 60*60_000 → 0` (teto era **ÚNICO** e compartilhado entre chat e subagente — remover tirou dos dois, inseparável no desenho); watchdog de lease do MCP (`mcp-pool.ts`) teve teto fantasma de 5 min removido junto. Intactos: abort do usuário, heartbeat 25s, stall 5 min, TTL MCP 2 min. Rollback por env `AGENT_TURN_TIMEOUT_MS` > 0 sem código.
4. **`bb7024b4` — setups v2 profissionais** (`feat/setups-v2-profissionais`): lineup de 9 (explorador/planejador/executor/revisor/pesquisador/debugger reescritos + testador/seguranca/documentador novos), prompts densos (protocolo, critérios de pronto, formato de entrega, damping de mercado), configOverride/subagentPolicy por papel (effort, maxStepsPerTurn, maxDepth — NUNCA basic.model, o .strict() rejeita). Migração por **fingerprint**: prompt gravado === texto v1 exato → migra conteúdo (preservando name/description/override customizados do operador, version++ DM-20, WHERE anti-TOCTOU com fingerprint completo); customizado → nunca toca. Fixture v1 hardcoded no teste com teste de deriva. Boot de 23:37 registrou 6 `migrated` + 3 `created` **(não verificado em 24/10: o container de 18/10 foi trocado em 20/10 e o log se perdeu; o log atual do BE só sai em janelas de 5.000 linhas e o banco de prod não foi lido nesta auditoria)**.

### ⚠️ PENDENTE: rotação de credenciais do motor-be-ws
Em 2026-10-18 um agente de deploy leu `/proc/1/environ` do container `minipanel-motor-be-ws` para caçar GIT_SHA — **as credenciais do conjunto (DATABASE_URL, AUTH_SECRET, SESSION_ENC_KEY, OIDC, etc.) foram para o transcript do agente**. Dono avisado; rotação é dele. **(não verificado em 24/10 — não é possível provar a rotação sem comparar valores, o que é proibido).**

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
- Bloco unconsumed só apaga órfãos: kind=subagent_result, consumedAt=null, mais velho que N dias, thread dona TERMINAL. Grava o texto em `events` da thread dona antes de apagar (2 escritas/linha). Unconsumed seguem 7 dias.
- Antes da aplicação: 1.255 mailbox_items, 5 unconsumed, `mailboxUnconsumedDeleted: 0` nos 4 ticks observados **(não verificado em 24/10: o banco de prod não foi lido; indício indireto: `mailboxUnconsumedDeleted=0` em todos os 22 ticks desde 2026-10-20)**. Orçamento 10.000/tick → folga ~2.000×.

### Gaps de UI de subagentes (scout 2026-10-17)
Todos com "fio pronto, falta ligar", mapeados em `fa44a999`:

| # | Gap | Onde está o fio |
|---|---|---|
| 1 | Linha da timeline (SubagentBlock `blocks.tsx:417`) é beco sem saída — não abre a conversa do filho | Sidebar `SubagentSidebar.tsx:230` tem `onSelectSubagent`; `SubagentConversationDialog.tsx:57` |
| 2 | `tokens` vem do `SubagentNotification` do WS mas `SubagentItem` (`types.ts:128-160`) não declara o campo | Patch `timeline-live.ts:263-269` não copia `tokens`; workflow já mostra custo/tokens em `RunSummary.tsx:129,131` |
| 3 | "Cancelado em cascata" × "cancelado" não diferenciam na tela | `rotuloDeCancelamento()` em `orphan-badge.ts:52-58`, só usada em teste; `abortKind` gravado em `timeline-live.ts:319` |
| 4 | Órfão não marcado na timeline | `statusDeOrfao()` em `orphan-badge.ts:32` sem consumidor; sidebar usa `textoDeOrfao()` em `orphan-badge.ts:98,120` |
| 5 | Edge de merge do grafo estático, sem pulso | `orphan-badge.ts:52-58`; gating `prefers-reduced-motion` já existe (`:41,487-493`) |

**Workflow dos 5 gaps: TERMINOU em 2026-10-17, esperando go do dono** (correção da auditoria de 2026-10-24 — não está mais "pausado"). O run `wf_77f293c5-072` foi **morto** (killed, 2026-10-17T15:34:13Z, após 529 Overloaded no agente `gaps-timeline-1-4`); o **mesmo script** rodou de novo como `wf_567fdfac-56e` (sessão diferente) e **completou** em 2026-10-17T19:48:15Z com veredito "PRONTO (esperando go do dono)". Resultado: branch `ui-gaps-1017` @ `7f833194` com 4 commits (`f54a7d25` gaps 1–4, `bc05f4e2` gap 5, 2 merges), **presente só na SB `motor`, não no origin**, com **25 commits atrás do `origin/main`** e **conflito em `fe/src/components/timeline/ui/blocks.tsx`** (o `f7a39332` de 2026-10-20 também mexeu no arquivo). A branch liga `rotuloDeCancelamento` e `statusDeOrfao` no `blocks.tsx`; em prod, "cancelado em cascata" aparece 0 vezes no bundle. Gate do workflow: typecheck 0 erros, 40/40 testes focados, suite do fe 1542 passed + 1 fail. Worktrees na SB: `ui-gap-timeline-1017`, `ui-gap-grafo-1017`, `ui-gaps-1017`, `inimigo-ui-gaps-1017`. O arquivo do script existe. **Integração futura exige rebase + gate de novo por causa do conflito:** mockups → go do dono → rebase de `ui-gaps-1017` sobre `038bcc3c` + suíte → push → deploy só do fe.

### VETO e histórico de correções (2026-10-16)
Os 4 bloqueios do VETO fecharam: envs no compose (`compose.prod.yml:213-215`), cota antes do SELECT (`retention.ts:414`), cota com teste (`retention-cota-300-invariant.test.ts`), índice parcial (`20261016150000_mailbox_unconsumed_order`, `CREATE INDEX` comum, não CONCURRENTLY — a migração está na imagem de prod, mas a existência do índice no banco não foi medida **(não verificado em 24/10)**). A migração mediu 1.4–1.9s no local (1,22M itens, 101 666 unconsumed) e 704–1 151 ms pior espera de escrita durante o build. Em prod são 5 unconsumed **(não verificado em 24/10)**.

Lições gravadas na memória:
- `npm ci --workspaces=false` dentro de `be/` é PROIBIDO → 9 erros falsos de typecheck. Cura: `npm ci` na raiz (autocurativo).
- `comm` SEMPRE com `LC_ALL=C` (nomes com acento).
- `DEFAULT_ORG_ID`/`DEFAULT_USER_ID` no `.env` não são UUIDs válidos → 505 testes SKIP (falso verde se comparar total bruto).
- Sem `be/.env` → `src/env.ts` fail-fast em `ANTHROPIC_BASE_URL` → 0 testes rodam.
- `prisma db push` não materializa o índice parcial `agents_org_id_default_uniq` → 19ª falha falsa.
- `CREATE INDEX CONCURRENTLY` é proibido (deadlock 40P01 que derrubou o Motor 5/5).
- CJK caracteres corromperam um memory — verificar com grep antes de confiar.

### Retomar subagente parado — ANÁLISE de 2026-10-21 (nada executado)
Pedido do dono: *"quando eu pego o agente principal e ele para, eu preciso que ele dê um toque no agente que estava parado… ele tem que conseguir ir lá e mandar uma mensagem para esse agente, para esse agente continuar."*

**Veredito: dá pra fazer.** O motor **não tem barreira de status** para retomar — o dispatcher despacha por **fila** (o status é consequência, não causa); o único leitor de status é a guarda `filaDeSubagenteCancelado`, que descarta **só `subagent_result`**. A mensagem de pessoa passa e joga o turno. Padrão de código a copiar já existe: `orchestrator.ts:863-868` (`data: { notifiedParentAt: null, status: 'active' }`).

**Os 3 bloqueios:** (1) o `status` nunca volta a `active` (só 2 escritas de `status:'active'` em produção, nenhuma em `runTurn`); (2) o pai nunca é avisado — o abort marca `notifiedParentAt` (`abort-cascata.ts:384`) e o `onTurnEnd` só notifica se for `NULL` → `claimed.count===0` → sai calado; (3) não há botão nem tool — as nativas são só `agent_spawn`/`agent_list`/`agent_status`/`agent_abort`, e o `MailboxKind.agent_message` existe no enum ("reservado") mas **nenhum código o usa** (e plugá-lo sem mexer no `toItem` faz a tool falhar em silêncio).

**Bugs encontrados no caminho:**
- **`agent_spawn` com o mesmo `toolCallId` anuncia "retomado" e NÃO retoma** — o predicado `isTerminalAndNotified` (`orchestrator.ts:374-377`) só olha `errored`/`aborted`, então `completed` (o caso normal) cai no `reused` → **retorna sem `dispatcher.submit`**. O pai acredita que retomou; o filho está morto. Nenhum teste cobre.
- **`subagent_abort` não é persistido** — emitido só via WS (`orchestrator.ts:1202`), sem `appendEvent`. O `timeline-history.ts` (caminho do F5) não tem case para ele, e o `subagent_spawned` reabre com `status:'running'` hardcoded (`:167`) → **após F5 o bloco do subagente cancelado na conversa do pai volta a "trabalhando…"**. Provavelmente é o sintoma do dono. E o rótulo "cancelado em cascata" **nunca aparece em produção** (`rotuloDeCancelamento` só tem 1 consumidor, e é um teste).

**Ordem recomendada (invertida pelo revisor adversarial):** (0) persistir o `subagent_abort` + case no `timeline-history.ts`; (1) o botão (`POST /api/threads/:id/resume`, 3–4 arquivos, **0 migração**) — o composer tem que ser componente novo, o `SubagentConversationDialog` está com teto **congelado em 415** na `SIZE_EXCEPTIONS`; (2) a tool `agent_send` (só se o PAI é que dá o toque). **Em qualquer fase: contador de retomadas** — `turnTimeoutMs=0` deixa o subagente retomado sem teto de duração, e o `turn-caps` é por turno.

Relatório visual: `https://sb-agent-package-audit-p5173.mp.serendiped.com/retomar-subagente.html` · memória `motor-retomar-subagente-parado`. Confirmado em 2026-10-24: nada executado — nenhuma branch de resume/agent_send/subagent_abort existe; os únicos commits pós-21/10 em qualquer branch são os 2 da página /arquitetura no main local da SB.

### Pendências do Motor
- Doc debt `docs/_pendente-operacao-leak-mcp.md` (4 seções não coladas em `operacao.md`) — **adiada pelo dono**.
- Comentário `retention.ts:197` diz "mata 5 testes" (real: 6); "8841 de 40015" não verificável (adv mediu 8753). Sem mudança de comportamento, não urgente.
- `docs/typecheck-9-erros.md` alega "@fastify/busboy 2.1.1 é o que o runtime usa" de 57 pacotes divergentes — **nunca medido**, não virar fato sem medição.
- ~~Plano `memoized-orbiting-comet.md`~~ — **NÃO é pendência (corrigido na auditoria de 2026-10-24): já está em produção.** O plano (2026-10-10) É o D11/D12 (setup público/privado + Duplicar + chave presa à origem) e foi implementado e deployado em **2026-10-11 como `ed42e5b`** (backend `ea4ec04` + frontend `2e670899`; migração `20261010000000_agent_visibility` aplicada no boot). Deploys daquele dia: be `h9aun-oqsAMkkJG5OKXvI` (02:27Z), worker `xprCZIW0Z8E1EOTR79IVo`, fe `cDYL5gMpmIw5OcHKzo12x`. `ea4ec04` e `ed42e5b` são ancestrais de `038bcc3c`; o container de prod tem `be/src/setups/visibility.ts`, `be/src/config/secret-origin.ts` e a pasta da migração, e "Duplicar" aparece em 3 chunks do bundle servido. **Regra da memória `motor-setup-visibility`: nunca reverter abaixo de `ea4ec04` enquanto existir setup privado.**
- ~58 entradas no `git worktree list` (57 worktrees + o clone principal) e 65 branches locais na SB `motor` — limpeza não pedida (corrigido de "~110 worktrees" em 24/10).

**Memórias relacionadas:** `motor-mailbox-dossier-30d`, `motor-fechamento-deploy-mut-ret-fora`, `motor-validacao-1016-4-consertos`, `motor-fechamento-1016-provas-fora-da-branch`, `motor-sb-and-deploy`, `motor-sb-main-working-tree-sujo`, `motor-incidente-1ms-nao-existe-no-commitado`, `motor-producao-2026-10-15`, `motor-setup-visibility`, `motor-retomar-subagente-parado`.

---

## 2. Como o trabalho do Motor chega até mim (modo de orquestração)

Eu não implemento. Faço: pesquisa, brief, review, decisão. Toda execução vai para subagentes/workflows em background (Ultracode ON). Antes de delegar: reafirmo o pedido, checo regras cross-app, e o brief do agente carrega sandbox, convenções do repo, regras de deploy e de segredo. Relatório do agente é repassado fielmente; nunca predito. Merge e push só com go do dono.

---

**Arquivo do handover intermediário (sessão 2026-10-17):** `HANDOVER-motor-1017.md` na raiz do orquestrador (contém o dossiê completo do mailbox e do workflow de gaps).