# HANDOVER — Projeto Conta Nomad

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.

---

## 1. O que é

Conta Nomad é a **fonte única de organizações, membros, papéis e contratos**. Os outros apps (LB, AgentPack, Motor, Render) não gerenciam orgs/membros — só consomem. A Conta tem:

- Backend: `conta-backend-ws` (id `zTEsS3G-ftd7AfCgwvZwO`), porta 4100, repo `PedroPaduelo/conta_nommand`, main `7f3e22e2`, prod `924a3477` (byte-identical), autoDeploy true.
- Frontend: `conta-frontend-ws` (id `N7-5RG0qU0r30L0he_2y6`), porta 8080, mesmo commit.

---

## 2. Regras de ciclo de contrato (decisão do dono, 2026-10-11)

| Evento | Efeito nos apps |
|---|---|
| `app.contract.cancelled` / `org.deleted` | Chaves da empresa suspensas em todos os apps, imediatamente. Dados e chaves são mantidos (nada deletado). |
| Empresa re-contrata | Chaves voltam a funcionar. |
| Membro sai (`member.removed` / `app_access.revoked`) | Só as chaves pessoais dele são revogadas. Chaves admin do AgentPack sobrevivem ao criador saindo (são da empresa). |
| `app_access.granted` (per user) | Pode ser gravado depois de um cancelamento, sem novo contrato. A verificação de contrato roda antes da transação da Conta → **nunca auto-resume a empresa**. |

---

## 3. Como uma empresa retorna (resync)

Não existe API de consulta "contrato ativo?". O único sinal confiável de retorno é um **resync completo de provisioning** disparado por um admin da plataforma na Conta:

`POST /api/platform/organizations/:orgId/apps/:appId/provisioning.resync`
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

`conta-prod-postgres` (id `4R_pVUr4Cnw8RRfaVwC0A`, porta 25440). A senha nunca fica no transcript — usar o one-shot receiver.

**Memórias relacionadas:** `conta-contract-lifecycle`, `conta-resync-resume`, `orchestrator-role`.
