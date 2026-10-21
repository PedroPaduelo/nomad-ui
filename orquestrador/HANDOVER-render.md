# HANDOVER — Projeto Render (extracto do AgentPack)

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.

---

## 1. O que é

Backend + frontend "igualzinho ao AgentPack", só do Render (não o agente inteiro). Repo privado `PedroPaduelo/render`, criado 2026-10-13 com só README (visibilidade privada confirmada). Segue a arquitetura existente e usa `@nomad/ui` ("não reinventar a roda").

O AgentPack mantém seu próprio Render até um passo posterior onde o dono "mata" o Render lá.

---

## 2. Último estado (2026-10-14)

- **Phase A (P0..P4) SHIPPED no main do render, NÃO deployado:** `main = 3c2aaed`, 52 commits, working tree limpo. `integ/render-fase-a` @ `a8b0df4`. Report visual: https://sb-render-p8143.mp.serendiped.com (index + `runbook.html`). Gates 22/22, 52 suítes / 909 testes (5 skip), 85.85% cobertura de linha, lint ratchet 130.
- **P0 caveats:** 4 fechados ou registrados. P1 escreve `organization_id` em `audit_events`, mas o bootstrap actor continua sem empresa — dono deve ratificar. P5 (47 endpoints REST) construído em `pkg/p5` mas falha 2 gates (knip, coverage-floor) — não entrou no main.
- **P6..P14 e toda a Phase B (P-1 toolError, P-2 organizationId + prefix, D6 proxy registration, D7 skills, D13 migration, cutover) intocados** — runbook §8.

---

## 3. Antes de qualquer deploy (decisões do dono pendentes)

1. Aprovar o deploy.
2. Criar OIDC client `render` na Conta + `CONTA_PROVISIONING_SECRET` exclusivo + entrada `AppSwitcher` e role `apps["render"]`.
3. Provisionar Postgres próprio com `max_connections > 1000`.
4. Ratificar a decisão do bootstrap-actor.
5. `autoDeploy` começa DESLIGADO nos novos serviços.

---

## 4. Constraint da SB `render`

- Criada 2026-10-13 com **1,5 GB** (todo o orçamento que havia); o dono disse que aumenta a memória no painel ele mesmo. Aguardar confirmação dele antes de lançar o build do render lá.
- Serviço `seCEq2LGf7gDS8iox-7JF`, TTL 7 dias, repo clonado no main.

---

## 5. Achado de segurança cross-app

`npm audit` reporta `proxy-addr` CRITICAL (via fastify, fixável) e `@modelcontextprotocol/sdk` HIGH (fixo em 1.32.1). O lockfile do Render copia as versões do AgentPack → AgentPack prod tem a mesma exposição. Incluir o bump de dependência na próxima rodada do AgentPack (SB `agent-prompts`).

**Memórias relacionadas:** `render-app-and-mcp-proxy`, `agentpack-prod-deploy`, `deliverables-visual-default`, `orchestrator-role`.
