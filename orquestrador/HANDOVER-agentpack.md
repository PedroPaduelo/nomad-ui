# HANDOVER — Projeto AgentPack

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.

---

⚠️ Atenção do dono
Cliente MCP do orquestrador (agentpack-orq) RECONECTADO na sessão de 2026-10-24 (medido: `project_context` responde; 63 memórias + página raiz publicadas por ele). Ressalva: o `.mcp.json` local ainda aponta o host morto `agentpack-api.mp.serendiped.com` com a chave `apk_` legada (401) — se a sessão cair, só o dono emite chave nova pela UI (POST /api/agent-keys exige JWT de usuário).
- Link "Gerenciar sua Conta Nommand" do Render em prod está quebrado (bundle com VITE_CONTA_URL vazio → default sb-conta-nommand-app morto) — mesmo bug do D16.
- Servidor MCP em prod recusa protocolVersion 2026-07-28 (aceita 2025-11-25 até 2024-10-07) — cliente que fale só 2026-07-28 falha.
- npm audit de 2026-10-24: dompurify CRITICAL (<=3.4.16) no backend e no frontend em prod, mais highs com fix disponível.
- Painel dessincronizado: 6 recursos (agentpack-backend-ws, agentpack-prod-postgres, render-backend/frontend/postgres, sb-nomad-ui) aparecem 'stopped' com containers Up healthy.

---

## 1. O que é prod e o que NÃO é

**Prod = `agentpack-v0`** (project `workspace_nommand`):

| Serviço | ID | URL | Commit | Estado |
|---|---|---|---|---|
| agentpack-backend-ws | W6HIdYaUE2N9CVPaL8fE5 | agentpack-v0-api | 75af7df4 | Up, autoDeploy true |
| agentpack-frontend-ws | b0e_tBASjYIb_MOl7mADq | https://agentpack-v0.mp.serendiped.com | abf8e399 | Up, autoDeploy true |
| agentpack-prod-postgres | CUVFEt1gH9UVmv2lDSaW5 | :25442 | — | Up |

**O projeto separado `agent-package` NÃO existe mais no painel em 2026-10-24** (projects_list = 4: Sandboxes, databases_dev, databases_prod, workspace_nommand; 40 serviços sem `backend`/`frontend` fora dos `*-ws`; 19 domínios sem `agentpack.mp.serendiped.com`; 82 containers só com os 9 `minipanel-agentpack-*`). Era TESTE DO DONO — a regra de NÃO TOCAR continua valendo se ele reaparecer. `backend`/`frontend` não são duplicata.

---

## 2. Último deploy confirmado (2026-10-21)

`main = abf8e399` no **frontend** `agentpack-frontend-ws` (`b0e_tBASjYIb_MOl7mADq`,
container `97ce020830dd`, `pendingUpdate: null`). O backend segue em
`bkPQ4WIaFbF140AZ0-3T1`.

- **Correção dos cards de Projetos no ar** (2026-10-21): o card invadia o
  vizinho (flex item sem `min-w-0`) e o 3 pontinhos não abria o menu. Commit
  `2ac3ae5e` (correção) + `abf8e399` (gate reforçado, só teste). Bundle
  `Home-luCh0W6u.js` (era `Home-HiFcmfBb.js`), sha256 `abafc741…`, **byte-idêntico
  ao build local**. Gate: 3/3 rodadas verdes, mutantes M0–M5 todos morrem.
  Relatório: https://sb-agent-package-audit-p5173.mp.serendiped.com/deploy-cards.html
  Detalhe completo em `~/.claude/projects/-home-nommand-code-tmp/memory/agentpack-cards-projetos-min-w-0.md`.

### Deploy anterior (2026-10-14) — vale como baseline SÓ para o backend

`main = 75af7df4` (backend `bkPQ4WIaFbF140AZ0-3T1` + frontend `Qf7awKX88ZWbHyiyR0S1r`, ambos `gitSha 75af7df4`). O front teve 5 deploys depois: `a3e4b855` (merge fix-skills-projectid-1017, 2026-10-18 00:05Z), `2cf472d0` (fix-roadmap-ui-1017, 2026-10-18 01:21Z), `02967533` (fix-roadmap-filters-1017, 2026-10-18 02:02Z), `2ac3ae5e` e `abf8e399` em 2026-10-21. Verificado por curl e por auditor independente:

- Prod provado por `deployments_list` gitSha + `llms-full.txt` sha256 `6e88441a…` batendo com o commit byte a byte.
- Default MCP catalog medido com o gate real: **53 ferramentas / 13.966 tokens** do teto de 60/15.000. `agentpack_task_timeline_list` está dentro; as 7 ferramentas de decisão (HITL) saíram para o opt-in `decisions` (`task_decision_cancel/create/list/respond/supersede`, `request_more_information`, `return_to_decision`). **Mudança quebradora para quem chama essas 7: precisam habilitar o toolset `decisions`.** (não verificado em 24/10)
- Screens de roadmap no bundle servido (`Roadmap-*.js`, `RoadmapConfig-*.js`, `taskNavigation-*.js`). O front faz code-split (diferente do LB).
- Nenhum trabalho pela metade: não há TODO/skip/console.log/stubs novos. Os 3 testes `shutdown.test.ts` que falham são o baseline pré-existente.

---

## 3. Deploy do MCP proxy fix — EM PROD desde 2026-10-14 09:03Z (não pendente)

`1a67c150` é ancestral de `75af7df4`, então o fix está no ar desde 2026-10-14. A branch EXISTE no GitHub (`origin/fix/mcp-proxy-sessoes = 53421318`, também ancestral de `75af7df4` e de `origin/main`). Backend em prod = `75af7df4` (currentVersion + deployment `bkPQ4WIaFbF140AZ0-3T1` gitSha `75af7df4` + client 2.3.1 / server 2.3.1 / sdk 1.32.1 + `dist` com `mcp-proxy-pool.js`/`mcp-headers.js`). HITL opt-in (toolset `decisions`) e Minha Conta (`AGENTPACK_CONTA_URL` no ar, `VITE_CONTA_URL` no bundle) também executados. Backend tem pendingUpdate `abf8e399` mas os 10 commits são 100% frontend (`git diff 75af7df4..abf8e399 -- backend/` vazio) — aplicar não muda o backend. A §7 deste handover (“Shipado como 75af7df4”) confirma esta seção; o “pendente do go” antigo estava errado.

O que o fix cobriu (5 de 6 causas):

- C1: cliente SDK v1 `1.30.1` → SDK v2 `2.3.1` com negociação de era (conecta a 4/4 servidores de teste). MyPanel MCP aceita só 2026-07-28; v1 falhava em `initialize` com `-32022`/HTTP 400.
- C2: sessão upstream keyada por (key, project), não por conversa → vazava entre conversas e morria silenciosamente. Agora uma sessão por conversa, TTL 5 min idle, 60 s timeout de saída.
- C3a: SSE legacy — re-handshake em vez de repetir erro por 30 min; reporta status real do upstream.
- C4: catálogo MCP sem escopo de organização → credencial de uma empresa visível a qualquer projeto. Catálogo por empresa com backfill.
- C5: erros opacos ("initialize HTTP 400") com causa real cortada pelo `logSafeError`; catálogo sincroniza só no create, nunca no edit.
- Também: ADR-015 e correções adversárias R1/R2.

**C3b (bridge REA stdio→HTTP) perdida:** a SB `rea-mcp-proxy` não existe mais em 2026-10-24 (11 SBs, nenhuma `rea-mcp-proxy`), então a ponte `rea-bridge.mjs` (porta 6402, não supervisionada) se perdeu.

---

## 4. "Minha Conta" (Conta URL) — D16 FECHADO

`AGENTPACK_CONTA_URL=https://conta.mp.serendiped.com` existe (não secreta) desde 2026-10-14 03:01:14. Todos os deploys do front desde 2026-10-14 03:54Z listam o build arg `AGENTPACK_CONTA_URL` (junto a `BACKEND_UPSTREAM`, `NOMAD_UI_TOKEN`, `GIT_SHA`, `GIT_BRANCH`). O bundle servido tem `VITE_CONTA_URL` baked = `https://conta.mp.serendiped.com` e nenhuma referência a localhost. D16 fechado.

---

## 5. Extract do Render (privado `PedroPaduelo/render`)

Repo criado 2026-10-13 (visibilidade privada confirmada). O dono pediu um backend+frontend "igualzinho ao AgentPack", só do Render (não o agente inteiro), seguindo a arquitetura existente e usando `@nomad/ui`.

**O Render FOI deployado em 2026-10-15 e está no ar em 2026-10-24** (a linha antiga “NÃO foi deployado” estava errada): backend `render-backend-ws` (`n7OzaPcEe2mpsDOZvhCTK`) com 3 deploys (`3c2aaed` 00:22Z, `cc695553` 01:22Z, `2dbc653d` 07:36Z) e frontend `render-frontend-ws` (`Bdd3Da07p4IDAtRxxH7Hr`, 3 falhas e depois `2dbc653d` ok às 03:02Z); `render-prod-postgres` (`KcpL5jwOrrs9_Jir5Ah8J`) em `:25446`; domínios `render-v0-api` e `render-v0`. Containers Up 4 days (healthy); o painel mostra 'stopped' nos três (dessincronizado).

- `origin/main = 2dbc653d` (2026-10-15 03:01, “Integra a fase A do Render (P0..P5) + a casca do frontend (P8) na main”), 24 commits depois de `3c2aaed`. Escopo no ar: P0..P5 + casca P8 (inclui as 47 rotas REST — `backend/src/routes/render.ts` etc. — que o texto antigo dizia “não entrou no main”). P6, P7 e P9..P14 intocados (só `main`, `integ/render-fase-a` e `pkg/p0..p5` no remoto; `pkg/p8` só local na SB, já mergeada). `currentVersion = 2dbc653d` com `pendingUpdate: null` nos dois serviços; FE 200, API 401 (auth esperado).
- Postgres resolvido: `postgresql.auto.conf = '1200'` (2026-10-14 23:04:34Z, anterior ao boot do postmaster em 2026-10-19 20:04:40Z, sem override) — `DB_CONNECTION_LIMIT=1000` cabe, não é decorativo.
- Backend tem env completa de prod confirmada via build args do deploy no ar (sem releitura de valores, para não vazar segredo).
- **Front quebrado na Conta:** o `builderConfig` tem `RENDER_CONTA_URL=https://conta.mp.serendiped.com`, mas é config morta — o deploy de 2026-10-15 03:01Z só recebeu `BACKEND_UPSTREAM, NODE_ENV, PORT, GIT_SHA, GIT_BRANCH`. O bundle servido (`assets/index-DpqTDmZK.js`, 322.797 B) embute `VITE_CONTA_URL` vazio e cai no default `https://sb-conta-nommand-app.mp.serendiped.com` (host morto, HTTP 000). Com isso o link “Gerenciar sua Conta Nommand” do Render em prod está quebrado — mesmo bug do D16 do AgentPack.
- `autoDeploy` começa DESLIGADO nos novos serviços.
- Report antigo fora do ar: `https://sb-render-p8143.mp.serendiped.com` dá HTTP 000; a SB `render` não tem preview ports.

**Constraint da SB:** a SB `render` agora tem 2 GB (limits `memoryMb 2048`) e container Up 4 days. O aumento pedido ao dono já aparece aplicado.

---

## 6. Traps da SB `agent-package-audit`

- 2 GB de RAM (AGENTS.md erra, diz 6 GB).
- Clone principal em `main @ abf8e399` em 2026-10-24, 0/0 vs `origin/main`, working tree limpo (7 entradas não versionadas são só pastas de artefato: `.ri-clean/`, `.ri2/`, `audit-ux/`, `mockups-roadmap-1017/`, `mockups-roadmap-filters-1017/`, `mockups-skills-1017/`, `relatorio-cards/`). A branch local `feat/admin-agent-key` está em `26268c0f` (73 atrás) e a remota em `b2faf5c7` (2026-10-11); todo patch dela já está em `main`. Trabalhar a partir de `origin/main`.
- `sandbox_worktree_*` FUNCIONA em 2026-10-24 (11 entradas: clone + 10 worktrees, todos 0 ahead). A falha pertencia à encarnação anterior do container (antes do restart de ~2026-10-22; container Up 2 days).
- Nunca destruir: `nomad-ui` (edits não commitados de `ThemeSwitcher.tsx` + teste — única cópia; HEAD local `b5c9b74` de 05/10, `main` do GitHub em `7c0f343` sem os paths), `auditoria` (existe e rodando). `load-balance-audit` perdeu o motivo antigo (`backend/scripts/import-keys-lote.ts` está no `origin/main` em `684ddfef`, 2026-10-22). `template` não existe mais. Painel mostra 'stopped' para `sb-nomad-ui` com container running Up 4 days (dessincronia).

---

## 7. Workflows em andamento / concluídos (histórico)

- `wf_12648607-a33` (2026-10-13, concluído): proxy MCP + design do app Render.
- `wf_ee999213-c8f` (2026-10-13, concluído): prompts do agente + roadmap Gantt. Integrados em `integ/features-2026-10-13`, pushados como branches apenas.
- `wf_343bafd9-de8` (2026-10-14, concluído): rodada 2 — deploy do proxy fix + HITL opt-in + roadmap screens. Shipado como `75af7df4` (confirmado em 2026-10-24: `1a67c150` ancestral, roadmap no bundle servido).

---

## 8. Segurança aberta

- `npm audit` reporta `proxy-addr` CRITICAL (via fastify, fixável) e `@modelcontextprotocol/sdk` HIGH (fixado em 1.32.1). O lockfile do Render copia as versões do AgentPack → AgentPack prod tem a mesma exposição. Incluir o bump de dependência na próxima rodada do AgentPack (SB `agent-prompts`).
- 5 achados de auditoria tailwindcss de alta severidade — aberto como task para o dono. (não verificado em 24/10)
- A SB `agent-prompts` não existe mais em 2026-10-24 — o bump precisa de novo local.

---

## 9. Novidades 2026-10-24

- MCP do orquestrador QUEBRADO: `https://agentpack-api.mp.serendiped.com/mcp` sem vhost (HTTP 000), projeto configurado do banco legado, servidor desabilitado na config local. Prod saudável em `https://agentpack-v0-api.mp.serendiped.com/mcp` (401 sem auth). Dono precisa emitir chave nova pela UI.
- Servidor MCP recusa `protocolVersion 2026-07-28` (suportadas: 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07), visto em 2026-10-24 07:46:29Z.
- `pendingUpdate abf8e399` do backend é cosmético (10 commits, `backend/` vazio) — redeploy não muda código.
- npm audit de 2026-10-24 (lock de prod com sdk 1.32.1 e proxy-addr 2.0.8, sem os achados antigos): backend 13 vulns (1 critical `dompurify` + 4 high) e frontend 11 vulns (1 critical `dompurify` + 4 high), todos com fix.
- Três deploys do front de 2026-10-18 antes ausentes: `a3e4b855`, `2cf472d0`, `02967533`.
- SBs `template`, `agent-prompts` e `rea-mcp-proxy` não existem mais. SB `agent-package-audit` reiniciou ~2026-10-22 (Up 2 days), relatório porta 5173 no ar (200), 10 worktrees antigos zerados.
- Dessincronia do painel após restart do minipanel-server (~07:25Z 2026-10-24): 6 recursos 'stopped' com containers Up (backends e bancos Up 4 days, desde ~2026-10-19 20:04Z).
- A cópia deste handover na memória do orquestrador (`memory/handover-agentpack.md`, e o mesmo para o Render) é byte-idêntica — aplicar as mesmas correções lá.

**Memórias relacionadas:** `agentpack-prod-deploy`, `agentpack-nao-encostar`, `agentpack-mcp-catalog-cap`, `render-app-and-mcp-proxy`, `conta-contract-lifecycle`, `conta-resync-resume`, `deliverables-visual-default`, `orchestrator-role`.
