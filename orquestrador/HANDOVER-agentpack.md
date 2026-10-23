# HANDOVER — Projeto AgentPack

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.

---

## 1. O que é prod e o que NÃO é

**Prod = `agentpack-v0`** (project `workspace_nommand`), não o projeto separado `agent-package` (deploy de 28/09, antigo):

| Serviço | ID | URL | Commit | Estado |
|---|---|---|---|---|
| agentpack-backend-ws | W6HIdYaUE2N9CVPaL8fE5 | agentpack-v0-api | 75af7df4 | Up, autoDeploy true |
| agentpack-frontend-ws | b0e_tBASjYIb_MOl7mADq | https://agentpack-v0.mp.serendiped.com | 75af7df4 | Up, autoDeploy true |
| agentpack-prod-postgres | CUVFEt1gH9UVmv2lDSaW5 | :25442 | — | Up |

**O projeto `agent-package` separado do painel é TESTE DO DONO — NÃO TOCAR.** Sem deploy, stop, delete, cleanup. `backend`/`frontend` não são duplicata.

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

### Deploy anterior (2026-10-14) — ainda vale como baseline

`main = 75af7df4` (backend `bkPQ4WIaFbF140AZ0-3T1` + frontend `Qf7awKX88ZWbHyiyR0S1r`, ambos `gitSha 75af7df4`). Verificado por curl e por auditor independente:

- Prod provado por `deployments_list` gitSha + `llms-full.txt` sha256 `6e88441a…` batendo com o commit byte a byte.
- Default MCP catalog medido com o gate real: **53 ferramentas / 13.966 tokens** do teto de 60/15.000. `agentpack_task_timeline_list` está dentro; as 7 ferramentas de decisão (HITL) saíram para o opt-in `decisions` (`task_decision_cancel/create/list/respond/supersede`, `request_more_information`, `return_to_decision`). **Mudança quebradora para quem chama essas 7: precisam habilitar o toolset `decisions`.**
- Screens de roadmap no bundle servido (`Roadmap-*.js`, `RoadmapConfig-*.js`, `taskNavigation-*.js`). O front faz code-split (diferente do LB).
- Nenhum trabalho pela metade: não há TODO/skip/console.log/stubs novos. Os 3 testes `shutdown.test.ts` que falham são o baseline pré-existente.

---

## 3. Deploy do MCP proxy fix — pendente do go do dono

Branch `fix/mcp-proxy-sessoes` (HEAD `1a67c15`, base `26268c0`, NÃO pushado, worktree `/workspace/.worktrees/fix-mcp-proxy-sessoes`). 40 arquivos, cobre 5 de 6 causas:

- C1: cliente SDK v1 `1.30.1` → SDK v2 `2.3.1` com negociação de era (conecta a 4/4 servidores de teste). MyPanel MCP aceita só 2026-07-28; v1 falhava em `initialize` com `-32022`/HTTP 400.
- C2: sessão upstream keyada por (key, project), não por conversa → vazava entre conversas e morria silenciosamente. Agora uma sessão por conversa, TTL 5 min idle, 60 s timeout de saída.
- C3a: SSE legacy — re-handshake em vez de repetir erro por 30 min; reporta status real do upstream.
- C4: catálogo MCP sem escopo de organização → credencial de uma empresa visível a qualquer projeto. Catálogo por empresa com backfill.
- C5: erros opacos ("initialize HTTP 400") com causa real cortada pelo `logSafeError`; catálogo sincroniza só no create, nunca no edit.
- Também: ADR-015 e correções adversárias R1/R2.

**Pendente:** C3b (bridge REA stdio→HTTP) é infra, não código; a ponte `rea-bridge.mjs` está na SB `rea-mcp-proxy`, porta 6402, não supervisionada (o filho REA morre no restart).

O dono já deu go para: deploy da correção do proxy, mover HITL para opt-in, consertar o link "Minha Conta". Aguarda execução.

---

## 4. "Minha Conta" (Conta URL) — D16, ainda aberto

`agentpack-frontend-ws` nunca teve `AGENTPACK_CONTA_URL`. Build args só `BACKEND_UPSTREAM`/`NOMAD_UI_TOKEN`, então o `frontend/Dockerfile:60/65` construía `VITE_CONTA_URL` vazio e o `envSchema` caía no default de dev.

**Fix:** definir env `AGENTPACK_CONTA_URL=https://conta.mp.serendiped.com` e rebuildar o frontend. O fix foi passado ao agente de deploy dos prompts+roadmap para desembarcar no build do frontend.

---

## 5. Extract do Render (privado `PedroPaduelo/render`)

Repo criado 2026-10-13 com só README (visibilidade privada confirmada). O dono pediu um backend+frontend "igualzinho ao AgentPack", só do Render (não o agente inteiro), seguindo a arquitetura existente e usando `@nomad/ui`.

- Phase A (P0..P4) SHIPPED no main do render em 2026-10-14: `main = 3c2aaed`, 52 commits, working tree limpo. `integ/render-fase-a` @ `a8b0df4`. Report: https://sb-render-p8143.mp.serendiped.com. Gates 22/22, 52 suítes / 909 testes (5 skip), 85.85% cobertura, lint ratchet 130.
- **NÃO foi deployado.** Sem serviço, banco, domínio ou env var criado.
- Antes de qualquer deploy o dono deve: aprovar; criar OIDC client `render` na Conta + `CONTA_PROVISIONING_SECRET` exclusivo + entrada `AppSwitcher` e role `apps["render"]`; provisionar Postgres próprio com `max_connections > 1000`; ratificar a decisão do bootstrap-actor (P1 escreve `organization_id` em `audit_events`, mas o actor de bootstrap continua sem empresa — dono deve ratificar).
- `autoDeploy` começa DESLIGADO nos novos serviços.
- P5 (REST, 47 endpoints) construído em `pkg/p5` mas falha 2 gates (knip, coverage-floor) — não entrou no main. P6..P14 e toda a phase B (P-1 toolError, P-2 organizationId + prefix, D6 proxy registration, D7 skills, D13 migration, cutover) intocados — runbook §8.

**Constraint da SB:** a SB `render` foi criada com 1,5 GB (todo o orçamento que havia); o dono disse que aumenta a memória no painel ele mesmo. Aguardar confirmação antes de lançar o build do render.

---

## 6. Traps da SB `agent-package-audit`

- 2 GB de RAM (AGENTS.md erra, diz 6 GB).
- Main clone está em `feat/admin-agent-key` com 2 commits não pushados que não são nossos. Trabalhar só em worktrees a partir de `origin/main`.
- `sandbox_worktree_*` falha até o próximo restart da SB — usar `git worktree` diretamente.
- Nunca destruir estas SBs: `nomad-ui` (edits não commitados do ThemeSwitcher), `load-balance-audit` (script `import-keys-lote.ts` não versionado no GitHub), `template` e `auditoria` (sessões ativas).

---

## 7. Workflows em andamento / concluídos (histórico)

- `wf_12648607-a33` (2026-10-13, concluído): proxy MCP + design do app Render.
- `wf_ee999213-c8f` (2026-10-13, concluído): prompts do agente + roadmap Gantt. Integrados em `integ/features-2026-10-13`, pushados como branches apenas.
- `wf_343bafd9-de8` (2026-10-14, concluído): rodada 2 — deploy do proxy fix + HITL opt-in + roadmap screens. Shipado como `75af7df4`.

---

## 8. Segurança aberta

- `npm audit` reporta `proxy-addr` CRITICAL (via fastify, fixável) e `@modelcontextprotocol/sdk` HIGH (fixado em 1.32.1). O lockfile do Render copia as versões do AgentPack → AgentPack prod tem a mesma exposição. Incluir o bump de dependência na próxima rodada do AgentPack (SB `agent-prompts`).
- 5 achados de auditoria tailwindcss de alta severidade — aberto como task para o dono.

**Memórias relacionadas:** `agentpack-prod-deploy`, `agentpack-nao-encostar`, `agentpack-mcp-catalog-cap`, `render-app-and-mcp-proxy`, `conta-contract-lifecycle`, `conta-resync-resume`, `deliverables-visual-default`, `orchestrator-role`.
