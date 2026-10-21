# HANDOVER — Projeto Load Balance (LB)

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.

---

## 1. Estado de produção (2026-10-17)

| Serviço | ID | URL | Commit | Estado |
|---|---|---|---|---|
| loadbalance-backend-ws | VAbKDdZhzG7S7S-Zt52Tm | lb-api.mp.serendiped.com | 43990815 | Up, autoDeploy true |
| loadbalance-frontend-ws | E2vxruTSJ42G_Qe_6lJHh | loadbalance.mp.serendiped.com | 43990815 | Up, autoDeploy true |
| loadbalance-prod-postgres | cDNq9BNTdbEU0UlgUwIul | :25441 | — | Up (credencial VAZADA, ver §4) |

**Regra de deploy:** push para main NÃO dispara deploy; o painel marca `pendingUpdate`. Usar `deployments_trigger` no lado que mudou e confirmar pelo hash do bundle. Ordem: backend primeiro, depois frontend.

**Último deploy confirmado:** `83ac46a` (tela de limites de uso), backend `p9zIezXK9ANLhUlDptg0a` às 05:48 UTC + frontend `RHqv19HoUUTFJzU-lGwQQ` às 05:51 UTC de 2026-10-14. `/api/health` retorna `commit=83ac46a`. Rollback floor `bad2c4f`: backend `tT4sHGfXTQQephiSfz5yi`, frontend `_6LHgJ2rbdTgfT-m_jwnM`.

---

## 2. Regras cruzadas com Conta Nomad

Conta Nomad é a fonte única de organizações, membros e contratos:

- Contrato cancelado / empresa deletada → chaves da empresa suspensas em todos os apps. Re-contrato → chaves voltam.
- Membro sai → só as chaves pessoais dele são revogadas.
- Chaves admin do AgentPack são da empresa, não de quem criou.
- Resumo: apenas um resync completo disparado por admin da Nomad (`POST /api/platform/organizations/:orgId/apps/:appId/provisioning/resync`) retoma. `app_access.granted` NÃO retoma sozinho.

---

## 3. Limites de uso de plano (screen `/app/usage-limits`, ADMIN, deployado 2026-10-14)

Claude, Codex, MiniMax e Muse: janelas de 5h e semanal, corte default 95% (ajustável por chave em `ApiKey.usageCutoffPct`).

- Claude/Codex: uso vem nos headers de cada resposta upstream → atualização por minuto.
- MiniMax (`/v1/token_plan/remains`) e Muse (`/muse-code/key`): nada nos headers → sonda Redis a cada 5 min e após 429.
- Produto: `GET /api/keys/usage` (org-scoped), `GET /api/platform/keys/usage` (404 se não platform admin). Corte editável via `PUT /api/keys/:id`.

---

## 4. Segredos e credenciais — pendências CRÍTICAS

1. **`loadbalance-prod-postgres` credencial VAZADA** (2026-10-12): connection string completa (host, porta, usuário, senha 40-hex) impressa em tool output durante auditoria do hedge/rating. Persistida no LB (`request_payloads`). **O dono deve rotacionar.** SB `fiscal-tests` também tem senha HML em texto claro em `/workspace/tests/run.js`. Rotar em ordem: (1) senha HML do `auditoria`; (2) `loadbalance-prod-postgres`.
2. **Chaves em texto claro no LB** (2026-10-09): boot log "[SECRETS] 98 linha(s) de ApiKey com segredo cifrado" enquanto grupos únicos têm 646 chaves. Scripts de importação deixados em SB `/tmp` fazem `INSERT INTO api_keys` sem criptografia → lotes (NVIDIA, OpenRouter "NNN - Open Router", hunter) provavelmente em texto claro em repouso. Fix: `npm run secrets:encrypt-backfill` (dry-run, depois sem) com `KEY_ENCRYPTION_KEY` da imagem prod. Só com go do dono (escrita em prod). Novos lotes só por `backend/scripts/import-keys-lote.ts`.

---

## 5. Sweeps de chave mortos — já executados (2026-10-09/10)

| Provedor | Total testado | Mortos deletados | Restou |
|---|---|---|---|
| Anthropic (org fiscaliza) | 262 api_key | 262 (todos mortos, 0 usado) | oauth_max 1 |
| OpenAI `service` (sk-) | 529 | 529 (todos 401) | 0 |
| Google Gemini (AIza…) | 649 | 649 (todos inativos/vazados) | 0 |
| OpenRouter | 4.311 plaintext | 4.225 deletados; 84 cifrados mantidos | 84 cifrados + 86 plaintext que autenticaram |

Regra de ouro dos sweeps: chave que nunca teve sucesso via LB = deletável; chave com sucesso na `requests` = mantida. `sk-admin` chaves testam na Admin API (`/v1/organizations/api_keys`), não em `/v1/messages`.

---

## 6. Hedged requests / race mode (slices 1–6, deployado como `bad2c4f`)

- Slice 4 (simultânea, N chaves de t=0) deployado 2026-10-12 ~06:10 como `98d7770`, depois `bad2c4f` com `first-chunk-before-200` (10:34 UTC).
- **O modo nunca dispara no grupo NVIDIA:** `decideHedge` bloqueia toda vez que a requisição tem tools (4/4 Motor turns). `distinctUrls = 1` no NVIDIA também trava. Pra ver o shadow funcionar, enviar mensagem SEM tool definitions via config de chat simples (`ap`).
- NVIDIA: p50 15,8s foi incidente de 10-09 (burst em 1 URL); em dia limpo (10-10) p50 era 4,7s. Não usar 15,7s como baseline.
- Rating `ttftMs` aquecido: 2484/2484 das requisições da última hora têm, 2322 requisições em 144 chaves, zero chaves frias escolhidas.

---

## 7. Tamanho de arquivos do front (gate max-lines, só encolhe)

- `SIZE_EXCEPTIONS` no `frontend/eslint.config.js` espelhado em `frontend/src/test/sizeLimitsBaseline.json` — `sizeLimits.test.ts` falha se divergirem.
- `src/types/api.ts` está em 621 (no teto). Novos tipos compartilhados vão no barrel `src/types/index.ts` (sem teto), não em `api.ts`.
- Prettier: `@nomad/ui/prettier`, printWidth 100, sem ponto e vírgula, aspas simples.

---

## 8. Traps da SB `load-balance-audit`

- Node default 22; o package.json exige >=24.15. Node 24 e Playwright Chromium em `/workspace/.sbcache` (git-ignorado via `.git/info/exclude`): `export PATH=/workspace/.sbcache/node24/bin:$PATH PLAYWRIGHT_BROWSERS_PATH=/workspace/.sbcache/ms-playwright`.
- `test:it` precisa Postgres 15 + Redis locais, `TENANCY_IT_DATABASE_URL` e `TENANCY_IT_REDIS_URL` com senha `it-local-sb`.
- `test/zzResidueCleanup.test.ts` é teste real do repo: nomear probes diferentes, deletar por caminho exato; `rm test/zz*` já deletou esse teste uma vez (restaurado via git checkout).
- A11y (Playwright Chromium) precisa `npx playwright install-deps chromium` após cada restart da SB (bibliotecas apt somem).
- Vitest `--maxWorkers=6` + eslint paralelo já derrubou a SB (gVisor, `/root` e apt somem no restart). Use `--maxWorkers=4`, um passo pesado por vez.

**Memórias relacionadas:** `lb-deploy`, `lb-frontend-size-ceilings`, `lb-prod-key-scale`, `lb-plaintext-keys`, `lb-anthropic-key-sweep`, `lb-bulk-reactivate`, `lb-client-keys`, `lb-plan-usage-limits`, `lb-message-level-params`, `lb-race-mode`, `lb-prod-db-credential-leaked`, `lb-ui-perf-harness`, `lb-sb-gates`, `lb-serves-this-agent`, `opencode-zen-vs-go`, `conta-contract-lifecycle`, `conta-resync-resume`.
