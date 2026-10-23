# HANDOVER — Projeto Render (extracto do AgentPack)

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.

---

## 1. O que é

Backend + frontend "igualzinho ao AgentPack", só do Render (não o agente inteiro). Repo privado `PedroPaduelo/render`, criado 2026-10-13 com só README (visibilidade privada confirmada). Segue a arquitetura existente e usa `@nomad/ui` ("não reinventar a roda").

O AgentPack mantém seu próprio Render até um passo posterior onde o dono "mata" o Render lá.

## 2. Último estado (2026-10-14)

- **Phase A (P0..P4) SHIPPED no main do render, NÃO deployado:** `main = 3c2aaed`, 52 commits, working tree limpo. `integ/render-fase-a` @ `a8b0df4`. Report visual: https://sb-render-p8143.mp.serendiped.com (index + `runbook.html`). Gates 22/22, 52 suítes / 909 testes (5 skip), 85.85% cobertura de linha, lint ratchet 130.
- **P0 caveats:** 4 fechados ou registrados. P1 escreve `organization_id` em `audit_events`, mas o bootstrap actor continua sem empresa — dono deve ratificar. P5 (47 endpoints REST) construído em `pkg/p5` mas falha 2 gates (knip, coverage-floor) — não entrou no main.
- **P6..P14 e toda a Phase B (P-1 toolError, P-2 organizationId + prefix, D6 proxy registration, D7 skills, D13 migration, cutover) intocados** — runbook §8.

## 3. Antes de qualquer deploy (decisões do dono pendentes)

1. Aprovar o deploy.
2. Criar OIDC client `render` na Conta + `CONTA_PROVISIONING_SECRET` exclusivo + entrada `AppSwitcher` e role `apps["render"]`.
3. Provisionar Postgres próprio com `max_connections > 1000`.
4. Ratificar a decisão do bootstrap-actor.
5. `autoDeploy` começa DESLIGADO nos novos serviços.

## 2-bis. ⚠️ O Render JÁ FOI DEPLOYADO (2026-10-15) — este handover estava desatualizado

**Contradiz §2 e §3 acima.** Medido no painel em 2026-10-21:

| Serviço | ID | Host | Commit | Estado |
|---|---|---|---|---|
| render-backend-ws | n7OzaPcEe2mpsDOZvhCTK | render-v0-api.mp.serendiped.com | `2dbc653d` | container **running (healthy)**, `/health/live` 200 |
| render-frontend-ws | Bdd3Da07p4IDAtRxxH7Hr | render-v0.mp.serendiped.com | `2dbc653d` | servindo `assets/index-DpqTDmZK.js` (200) |
| render-prod-postgres | KcpL5jwOrrs9_Jir5Ah8J | :25446 | — | running |

- `deployments_list` do backend: **3 deploys em 15/10** — `3c2aaed` (00:22), `cc69555` (01:22), `2dbc653d` (07:36). Todos `status: running`.
- O frontend tem env `AGENTPACK_CONTA_URL`? **Não** — o `AGENTPACK_CONTA_URL=https://conta.mp.serendiped.com` está no `agentpack-frontend-ws`, não no Render. O Render FE tem `RENDER_CONTA_URL` no `builderConfig`.
- O backend do Render tem env completa de prod: `OIDC_CLIENT_ID=render`, `OIDC_REDIRECT_URI=https://render-v0.mp.serendiped.com/auth/callback`, `MCP_ALLOWED_HOSTS=render-v0-api.mp.serendiped.com`, `DB_CONNECTION_LIMIT=1000`, `AUTH_ENFORCED=true`, `JWT_TTL=7d`, `AUDIT_RETENTION_DAYS=365`. **O `CONTA_PROVISIONING_SECRET` e o `OIDC_CLIENT_SECRET` existem** (o client secret foi criado em 14/10 23:55).
- **`DB_CONNECTION_LIMIT=1000` vs `max_connections`**: o runbook exige `max_connections > 1000` no Postgres próprio do Render. **Não foi possível medir o `max_connections` real** — `psql` não está no allowlist do `docker_exec`. O serviço está saudável, mas o pool é configurado para 1000 conexões: se o Postgres tiver o default (100), o limite é decorativo e estoura em carga.
- `pendingUpdate: null` nos dois, `autoDeploy` **ausente** no `sourceConfig` do Render (diferente do AgentPack, que tem `autoDeploy: true`).
- `domains_verify` do host da API devolve `reachable: false, status: 401` — **401 é o esperado** (exige auth), não "inaccessible".

**O que fazer:** confirmar com o dono se o deploy de 15/10 foi autorizado por ele (foi feito por um agente, não por mim — e meu handover dizia "NÃO deployado", o que é **falso**). Se não foi, definir se o Render fica no ar ou volta atrás. Corrigir este handover e o da raiz `/home/nommand/code/tmp/orquestrador/HANDOVER-render.md`.



## 4. Constraint da SB `render`

- Criada 2026-10-13 com **1,5 GB** (todo o orçamento que havia); o dono disse que aumenta a memória no painel ele mesmo. Aguardar confirmação dele antes de lançar o build do render lá.
- Serviço `seCEq2LGf7gDS8iox-7JF`, TTL 7 dias, repo clonado no main.

## 5. Achado de segurança cross-app

`npm audit` reporta `proxy-addr` CRITICAL (via fastify, fixável) e `@modelcontextprotocol/sdk` HIGH (fixo em 1.32.1). O lockfile do Render copia as versões do AgentPack → AgentPack prod tem a mesma exposição. Incluir o bump de dependência na próxima rodada do AgentPack (SB `agent-prompts`).

**Memórias relacionadas:** `render-app-and-mcp-proxy`, `agentpack-prod-deploy`, `deliverables-visual-default`, `orchestrator-role`.
