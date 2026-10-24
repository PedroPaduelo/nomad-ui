# HANDOVER — Projeto Render (extracto do AgentPack)

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.
> Atualizado em 2026-10-24 a partir do dossiê de validação (medições de 2026-10-24; handover anterior de 2026-10-21, cujo estado era de 2026-10-14).

---

## 1. O que é

Backend + frontend "igualzinho ao AgentPack", só do Render (não o agente inteiro). Repo privado `PedroPaduelo/render`, criado 2026-10-13 com só README (visibilidade privada confirmada). Segue a arquitetura existente e usa `@nomad/ui` ("não reinventar a roda").

O AgentPack mantém seu próprio Render até um passo posterior onde o dono "mata" o Render lá.

## 2. Estado de produção (medido em 2026-10-24)

**O Render está em produção desde 2026-10-15.** O estado anterior de 2026-10-14 dizia "SHIPPED no main, NÃO deployado" — isso era falso. O deploy foi autorizado pelo dono (ver §2.2).

| Serviço | ID | Host | Commit | Estado em 2026-10-24 |
|---|---|---|---|---|
| render-backend-ws | n7OzaPcEe2mpsDOZvhCTK | render-v0-api.mp.serendiped.com | `2dbc653d` | container **running (healthy)**, `/health/live` 200, `/health/ready` 200 (db ok, 2 ms) |
| render-frontend-ws | Bdd3Da07p4IDAtRxxH7Hr | render-v0.mp.serendiped.com | `2dbc653d` | servindo `assets/index-DpqTDmZK.js` (200, 322.797 bytes), `/healthz` 200 |
| render-prod-postgres | KcpL5jwOrrs9_Jir5Ah8J | :25446 | — | running (postgres:16-alpine 16.15, 4 GB) |

- `pendingUpdate: null` e `pendingCommits: 0` nos dois serviços (`remoteCheckedAt` 2026-10-24T07:47:57Z); `autoDeploy` **ausente** no `sourceConfig` do Render (o AgentPack tem `autoDeploy: true`).
- `domains_verify` do host da API devolve `reachable: false, status: 401` — **401 é o esperado** (exige auth), não "inaccessible".
- **Ressalva operacional:** o painel MyPanel mostra `stopped` nos 4 serviços (backend, frontend, postgres e a sandbox). É dessincronização do painel: os containers estão "Up 4 days" com RestartCount 0, voltando pela restart policy após o restart geral do host em 2026-10-19 (19:56Z→20:04Z). Confiar no docker, não no status do painel.

### 2.1 O que o deploy de 15/10 inclui

- `origin/main = 2dbc653d` (2026-10-15 03:01:14Z, "Integra a fase A do Render (P0..P5) + a casca do frontend (P8) na main"), **76 commits**, working tree limpo. **A main não andou desde 2026-10-15** — não há nada novo para deployar.
- `integ/render-fase-a` @ `3c32974` (`a8b0df4` é ancestral de `2dbc653d`).
- **P5 (47 endpoints REST) ENTROU na main e está em produção.** Cadeia verificada com `git merge-base --is-ancestor`: merge `1b63972` (2026-10-15T01:20:44Z, "Integra pkg/p5 (P5, rotas REST do Render)") → `cc69555` (01:20:59Z) → `2dbc653d`. Os 6 arquivos-core do P5 têm blob SHA idêntico entre `origin/pkg/p5` e main; as 47 rotas batem (40 em `backend/src/routes/render.ts` + 7 em `backend/src/routes/render-scoped.ts`, registrado em render.ts:169), com contrato em `backend/tests/render-http.test.ts`. Os 2 gates que travavam o P5 foram resolvidos antes da integração (piso de cobertura sobe em `9fea358`, ratchet de avisos travado em 129 por `cb5de26`).
- **P8 (casca do frontend: Vite, React, TopBar Nomad, nginx) foi feito e deployado**: `a91fa62` (2026-10-15 02:29Z), integração `4a13f50` (02:45Z), merge na main e deploy em produção.
- **P6, P7 e P9..P14 e o resto da Phase B (P-1 toolError, P-2 organizationId + prefix, D6 proxy registration, D7 skills, D13 migration, cutover) continuam intocados**: sem branch `pkg/p6+` local ou remota (o remoto tem só `main`, `integ/render-fase-a` e `pkg/p0..p5`; `pkg/p8` existe só como branch local na sandbox, já mergeada) e zero commits mencionando esses itens em todo o histórico.
- **Gates 22/22, 52 suítes / 909 testes (5 skip), 85.85% cobertura de linha, lint ratchet 130** (não verificado em 24/10) — são números históricos de `3c2aaed`; a suíte não foi re-executada em `2dbc653d`. Depois de `3c2aaed` entraram `9fea358` (piso de cobertura sobe para o medido no P5) e `cb5de26` (ratchet de avisos travado em 129).
- Report visual da fase A: **fora do ar**. Em 2026-10-21 era `https://sb-render-p8143.mp.serendiped.com` (index + `runbook.html`); medido em 2026-10-24, nenhum processo escuta na sandbox.
- P0 caveats: 4 fechados ou registrados; P1 escreve `organization_id` em `audit_events`, mas o bootstrap actor continua sem empresa — dono deve ratificar (ver §3.4).

### 2.2 Autorização e histórico de deploy

- O deploy de 2026-10-15 **foi autorizado pelo dono em 2026-10-14T21:49:59Z** (sessão 159f05fc, respondendo ao pedido de ok das 21:43:57Z: "1 ok … pode fazer você como você tem acesso ao mypanel …"). Foi executado pelo workflow `wf_7d653619-622` da mesma sessão: criação de postgres, serviços e domínios entre 22:39Z e 22:52Z, e OIDC/segredos na Conta entre 23:12Z e 23:59Z. Deploys entre 00:21Z e 03:01Z por subagentes; o deploy do backend que está no ar (07:34:55Z, `2dbc653d`) foi disparado pela sessão principal 159f05fc. **O Render fica no ar.**
- Backend: 3 deploys em 2026-10-15 — `3c2aaed` (00:22), `cc69555` (01:22), `2dbc653d` (07:36). Todos `status: running`; o vivo é o das 07:36.
- Frontend: 3 deploys falharam antes do que funcionou — 00:25 (`3c2aaed`, "Dockerfile not found: /frontend/Dockerfile"), 02:45 (`ef3d580`) e 02:57 (`add6a14`), ambos npm ci "Missing: typescript@5.9.3 from lock file". O de 03:01 (`2dbc653d`) foi o que funcionou.

### 2.3 Banco: max_connections efetivo = 1200

- `render-prod-postgres` tem **`max_connections` efetivo = 1200**, via `ALTER SYSTEM` gravado em `postgresql.auto.conf` em 2026-10-14 23:04:34Z — anterior aos dois boots do postmaster (2026-10-14 23:04:39Z e 2026-10-19 20:04:40Z), logo está em vigor. `postgresql.conf` mantém o default 100, mas o auto.conf prevalece; `postmaster.opts` é `/usr/local/bin/postgres` puro (sem `-c`) e o Cmd do container é `['postgres']`.
- Como **1200 > `DB_CONNECTION_LIMIT=1000`**, o pool cabe com folga: o risco "pool de 1000 contra Postgres default 100" **não existe**.

### 2.4 ⚠ Defeito em produção: o FE do Render aponta para a Conta de DEV (morta)

- O bundle servido (`assets/index-DpqTDmZK.js`, 200, 322.797 B) embute `VITE_CONTA_URL` **vazio** e o zod cai no default `https://sb-conta-nommand-app.mp.serendiped.com` — host **morto** (curl exit 35 / tlsv1 alert internal error, HTTP 000). **Zero** ocorrências de `conta.mp.serendiped.com` em qualquer asset.
- Afeta os links "Gerenciar conta" (HeaderUserMenu), o fallback de accountUrl do Header, a página NoAccess, o aviso de loop de SSO e as telas Settings/Home.
- Causa medida: o painel monta os build args a partir das **env vars**, não do `builderConfig`. O único build bem-sucedido (deploy `qixTWdiAryB-yObcj_UYB`, gitSha `2dbc653d`) loga "Build args available: BACKEND_UPSTREAM, NODE_ENV, PORT, GIT_SHA, GIT_BRANCH"; as env vars do serviço do FE são só BACKEND_UPSTREAM, NODE_ENV e PORT.
- **O Render FE não tem `AGENTPACK_CONTA_URL`** — o `AGENTPACK_CONTA_URL=https://conta.mp.serendiped.com` está no `agentpack-frontend-ws`, não no Render. **O Render FE tem `RENDER_CONTA_URL` no `builderConfig`**, mas é config morta: o `frontend/Dockerfile` declara `ARG RENDER_CONTA_URL` e o build não a recebe; o `frontend/src/config/envSchema.ts:21` cai no default de DEV.
- Mesmo caso do D16 do AgentPack. Correção: criar a env var `RENDER_CONTA_URL=https://conta.mp.serendiped.com` no serviço `render-frontend-ws` (o painel a repassa como build arg) e redeployar.

### 2.5 Integração Conta ↔ Render e operação

- A integração **funciona em produção**: log do FE desde 15/10 com 12 `/auth/sso` 302, 9 `/auth/callback` 302, 7 `/api/auth/me` 200 e 7 `/api/auth/oidc/topbar` 200. Backend: `POST /api/auth/oidc/backchannel-logout` 200 em 2026-10-23 19:47Z e 3× `POST /api/auth/oidc/provisioning` 200 "Provisioning event applied" em 2026-10-24 07:18:05Z, todos via Caddy (172.16.5.13 = mypanel-caddy-1).
- Backend com 37 env vars de prod e todos os valores conferem: `OIDC_CLIENT_ID=render`, `OIDC_REDIRECT_URI=https://render-v0.mp.serendiped.com/auth/callback`, `MCP_ALLOWED_HOSTS=render-v0-api.mp.serendiped.com`, `DB_CONNECTION_LIMIT=1000`, `AUTH_ENFORCED=true`, `JWT_TTL=7d`, `AUDIT_RETENTION_DAYS=365`.
- Lado Conta: o `appCatalog.ts` do commit de prod da Conta (9529768) só tem LOADBALANCE, MOTOR e AGENT_PACKAGE — não há `APP_FRONT_URL_RENDER` e o `CORS_ORIGINS` não inclui `render-v0`. A entrada do Render no trocador de apps, se existir, está só no banco (não verificável sem psql). `CONTA_PROVISIONING_SECRET_RENDER` está presente no processo da Conta.
- `/health/ready` (2026-10-24 07:58Z): db ok (2 ms), redis "disabled", shot "disabled" — o serviço de screenshot não está ligado em prod, embora `SHOT_TOKEN` exista.
- Uso real baixo: entre 1 e 25 requisições não-health por dia no FE desde 2026-10-18; no backend, nas últimas ~20 h, só health checks, 6× 401 de varredura (incluindo `GET /.env`) e as chamadas de integração.

## 3. Decisões do dono (1 e 3 fechados; 2, 4 e 5 abaixo)

1. ~~Aprovar o deploy.~~ **Fechado: aprovado pelo dono em 2026-10-14T21:49:59Z (sessão 159f05fc) e consumado em 2026-10-15.**
2. Criar OIDC client `render` na Conta + `CONTA_PROVISIONING_SECRET` exclusivo + entrada `AppSwitcher` e role `apps["render"]`.
3. ~~Provisionar Postgres próprio com `max_connections > 1000`.~~ **Feito: `render-prod-postgres` (postgres:16-alpine 16.15, 4 GB, porta 25446) com `max_connections` efetivo = 1200** (ver §2.3).
4. Ratificar a decisão do bootstrap-actor. (não verificado em 24/10: o go de 2026-10-14 21:49Z cobre os itens 1 a 3; nenhuma mensagem do dono daquela sessão cita o bootstrap actor.)
5. `autoDeploy` começa DESLIGADO nos novos serviços. (confirmado em 2026-10-24: a chave não existe no `sourceConfig` dos serviços do Render.)

## 4. Constraint da sandbox `render`

- Sandbox de trabalho do MyPanel (ambiente Linux isolado) usada para desenvolver o Render, com o repo clonado. Criada 2026-10-13 com **1,5 GB** (todo o orçamento que havia); medido em 2026-10-24: **2 GB** (`limits.memoryMb 2048`, "used 154 MB of 2048 MB"). O build da fase A (P5 + P8) já foi feito e deployado.
- Serviço `seCEq2LGf7gDS8iox-7JF`, TTL 7 dias, repo clonado na main.

## 5. Achado de segurança cross-app

`npm audit` reporta `proxy-addr` CRITICAL (via fastify, fixável) e `@modelcontextprotocol/sdk` HIGH (fixo em 1.32.1). O lockfile do Render copia as versões do AgentPack → AgentPack prod tem a mesma exposição. Incluir o bump de dependência na próxima rodada do AgentPack (SB `agent-prompts`).

## Novidades 2026-10-24

- Dependências de prod do Render (`npm audit --omit=dev` sobre o lock de `2dbc653d`, medido em 2026-10-24): **1 critical, 5 high, 7 moderate, 1 low**. O lock do AgentPack em produção (75af7df4) já está corrigido para `proxy-addr` (2.0.8) e MCP SDK (1.32.1); o Render segue com 2.0.7 e 1.30.1.
- Fora do escopo do Render, para o orquestrador cruzar com a auditoria da Conta: `conta-backend-ws` foi recriado em 2026-10-24 07:00:43Z (commit 9529768) com as env vars novas `ALLOW_PUBLIC_SIGNUP=true` e `ALLOW_PUBLIC_SIGNUP_UNSAFE=true` (criadas 06:58:56Z). O provisioning para o Render às 07:18Z veio logo depois.

**Memórias relacionadas:** `render-app-and-mcp-proxy`, `agentpack-prod-deploy`, `deliverables-visual-default`, `orchestrator-role`.