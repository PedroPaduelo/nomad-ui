# HANDOVER — Projeto Conta Nomad

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência. Revisado em 2026-10-24 contra o dossiê de validação (texto anterior: 2026-10-11).

## ⚠️ Atenção do dono

- Cadastro público SEM confirmação de e-mail ligado em produção desde 2026-10-24 ~07:00Z — qualquer anônimo cria conta/empresa e contrata apps sozinho; fechar quando o teste acabar.
- AgentPack NÃO suspende empresa com contrato cancelado — chaves admin e de projeto seguem autenticando; só o LB suspende de verdade (pendente por decisão do dono).
- Pool do backend (200 conexões) acima do max_connections do banco (100) — sob rajada vira erro "too many clients".
- Back-channel logout Conta → AgentPack falhando (TLS) — sair da Conta não derruba a sessão do AgentPack.

---

## 1. O que é

Conta Nomad é a **fonte única de organizações, membros, papéis e contratos**. Os outros apps (LB, AgentPack, Motor, Render) consomem a Conta — integração ativa medida em 2026-10-24 (troca de token OIDC de agent-package, loadbalance e motor; 3 webhooks de provisionamento entregues ao AgentPack com 200 em 2026-10-24 07:18:04Z). "Não gerenciam orgs/membros" é a arquitetura pretendida, não estado medido em runtime. A Conta tem:

- Backend: `conta-backend-ws` (id `zTEsS3G-ftd7AfCgwvZwO`), porta 4100 (só rede interna), repo `PedroPaduelo/conta_nommand`, main `9529768` (2026-10-24 06:58:42Z), prod `9529768` (= main; deploy 2026-10-24 07:00:43Z, container healthy), autoDeploy true.
- Frontend: `conta-frontend-ws` (id `N7-5RG0qU0r30L0he_2y6`), porta 8080, em `56be78b` (deploy 2026-10-24 03:27:57Z, healthy) com pendingUpdate `9529768` — o diff 56be78b..9529768 só toca backend/ (env.ts, .env.example, 1 teste), sem diferença funcional no front.

Sequência de deploys do backend: 924a347 (2026-10-02) → 7f3e22e (2026-10-15 03:23Z) → dbbe3d3 (2026-10-23 23:38Z) → 56be78b (2026-10-24 03:28Z) → 9529768 (2026-10-24 07:00Z). Frontend: 7f3e22e (2026-10-15 07:36Z) → dbbe3d3 (2026-10-23 23:38Z) → 56be78b (2026-10-24 03:28Z).

---

## 2. Regras de ciclo de contrato (decisão do dono, 2026-10-11)

| Evento | Efeito nos apps |
|---|---|
| `app.contract.cancelled` / `org.deleted` | Regra decidida em 2026-10-11, com estado de produção diferente por app (medido em 2026-10-24): a Conta emite os eventos e apaga orgApp + memberAppAccess (as liberações explícitas dos membros somem e precisam ser refeitas ao recontratar); o LB suspende de verdade (suspendedAt → 403 organization_suspended em toda chave); o AgentPack NÃO suspende — só apaga vínculos (removeAllMemberships) e derruba sessões, e as chaves admin e de projeto seguem autenticando (pendente por decisão do dono). |
| Empresa re-contrata | Chaves voltam a funcionar. |
| Membro sai (`member.removed` / `app_access.revoked`) | Só as chaves pessoais dele são revogadas. Chaves admin do AgentPack sobrevivem ao criador saindo (são da empresa). |
| `app_access.granted` (per user) | Pode ser gravado depois de um cancelamento, sem novo contrato. A verificação de contrato roda antes da transação da Conta → **nunca auto-resume a empresa**. |

---

## 3. Como uma empresa retorna (resync)

Não existe API de consulta "contrato ativo?". O único sinal confiável de retorno é um **resync completo de provisioning** disparado por um admin da plataforma na Conta:

`POST /api/platform/organizations/:orgId/apps/:appId/provisioning/resync` (com barra — a forma com ponto não existe no repo nem em produção; exige admin da plataforma via preHandler requirePlatformAdmin)
(caminho na UI: Administração → Empresas → Aplicativos → "Reenviar estado")

- Apps: suspendem automaticamente, mantêm sessões e tratamento de membros como implementado, retomam **só no estado completo da Conta**.
- Deduplicar por `eventId`; empates tratam como não-mais-tarde e rejeitam mudanças de estado sem timestamp.
- Fluxo operacional do dono: re-contratar a empresa na Conta, depois resyncar o app lá; o app recebe o estado completo e desbloqueia.

---

## 4. Como isso se propaga aos outros apps

A mesma regra deve valer em LB e AgentPack:

- Sem botão de "resumir manual" nos apps.
- Sem mudança na Conta neste trabalho.
- Cada app consome o sinal de suspensão/retorno da Conta.

---

## 5. Prod DB (leitura apenas autorizada para validação)

`conta-prod-postgres` (id `4R_pVUr4Cnw8RRfaVwC0A`, porta 25440). A senha nunca fica no transcript — usar o one-shot receiver (não verificado em 2026-10-24).

**Memórias relacionadas:** `conta-contract-lifecycle`, `conta-resync-resume`, `orchestrator-role` (as 3 existem e conferem com o resumo do handover; verificado em 2026-10-24).

---

## 6. Novidades 2026-10-24

- **Cadastro público aberto em produção (janela de teste).** Desde 2026-10-24 ~07:00Z, `ALLOW_PUBLIC_SIGNUP=true` e `ALLOW_PUBLIC_SIGNUP_UNSAFE=true` (criadas em 2026-10-24 06:58:56, junto do commit 9529768) ligam o cadastro sem confirmação de e-mail; com `APP_SELF_SERVICE_CONTRACT` no padrão (true, ausente do env), qualquer anônimo cria conta e empresa (vira OWNER) e contrata sozinho LB, Motor, AgentPack e Render. Fluxo já executado em produção em 2026-10-24 (registros 201 às 07:02:37Z e 07:17:52Z, 4× PUT de apps 200 às 07:18:01–04Z, 3 webhooks no AgentPack 200 às 07:18:04Z). Não é bug nem queda — fechar quando o teste acabar.
- **Commits 2026-10-23–24 (10 desde 7f3e22e):** 25fa6dd (switch-org saía sem Authorization), 12a4d18 (refresh recusava a origem), 5c224b6 (empresa e papel lidos do banco), 6b19cee (troca de empresa rotaciona o refresh), 809bade (guarda de escopo por empresa cobre transações; orgScope.ts +412 linhas), 9529768 (ALLOW_PUBLIC_SIGNUP_UNSAFE). Semântica de ciclo de vida inalterada (routes/apps.ts e services/apps.ts intactos; só provisioning.ts ganhou a guarda no claim/retry: +12/−3).
- **Back-channel logout Conta → AgentPack falhando.** Em 2026-10-24 07:15:56Z a Conta registrou "back-channel logout falhou" (app=agent-package, `tlsv1 alert internal error`); nenhum backchannel-logout chegou ao AgentPack entre 2026-10-21 e 2026-10-24. Causa provável: backchannelLogoutUri com host morto no banco da Conta (não confirmado — banco não lido). Efeito: sair da Conta não derruba a sessão do AgentPack.
- **Banco: pool acima do limite.** `max_connections` efetivo do conta-prod-postgres = 100 (postgresql.conf, servidor no ar desde 2026-10-19 20:04Z) contra `DB_CONNECTION_LIMIT=200` no backend (pool Prisma). Com tráfego baixo nada acontece; sob rajada vira "too many clients". O backend conecta pela porta pública (25440), não pela rede interna; banco `conta`, 19 migrations aplicadas, nenhuma pendente; Redis de produção up (porta 26390).
- **Domínios.** `conta.mp.serendiped.com` (front, primário, SSL → 8080) responde 200. `conta-api.mp.serendiped.com` (backend, SSL → 4100, não-primário) responde 404 no `/` — esperado, não é queda; `/api/health` responde 200 com o commit (postgres up, redis up).
- **Env do backend não registrado antes (só nomes — nenhum valor secreto neste arquivo):** `CONTA_PROVISIONING_SECRET_RENDER` (desde 2026-10-14 23:50), `EMAIL_VERIFICATION_REQUIRED=false`, SMTP vazio (sem SMTP), `APP_SELF_SERVICE_CONTRACT` ausente (vale true). Backend com limite de 1 GB e front com 256 MB.
- **Painel dessincronizado:** mostra "stopped" para conta-prod-postgres, conta-prod-redis e demais bancos, mas os containers estão Up desde 2026-10-19 ~20:04Z.
- **Higiene:** o log do backend grava a URL inteira de GET /api/oidc/logout, incluindo o id_token_hint (JWT assinado).
- **Sandboxes de validação:** clone principal com main em 9529768 (TTL 72h, expira em 2026-10-27); duas de fix com expiração em 2026-10-24 ~21:45–21:48Z.
- **Cross-check Render (§2-bis, validado em 2026-10-24):** max_connections do render-prod-postgres = 1200 valendo (auto.conf de 2026-10-14, anterior ao start de 2026-10-19) — item "não foi possível medir" resolvido, sem risco de limite decorativo.
