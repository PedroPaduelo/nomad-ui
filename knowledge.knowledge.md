<!--
  Template da página de knowledge `[NUI] Padrão Frontend Nomad v1` (AgentPack `690df27c`).

  Este cabeçalho é a única parte da página que NÃO é derivada: tem julgamento
  humano e muda com menos frequência que o corpo. O corpo vem de
  `docs/padrao-frontend.md` via `scripts/generate-knowledge.mjs` — não edite
  abaixo do marcador, a próxima geração sobrescreve; edite o repo.
-->

# Padrão Frontend Nomad v1

> Vale para todos os frontends da Nomad: agent-package, Conta Nommand, loadbalance e motor.
> Base: o frontend do agent-package (`frontend/`, commit `95df4f2`), escolhido como referência.
> Decisão de produto (2026-09-29): mesmo tema, mesmas bibliotecas, mesma organização de pastas, mesmo jeito de
> consumir dados e a mesma barra superior da Conta Nommand em todos os apps.
> Onde o documento diz **(revisar na v1.0.0)**, o nome exato da API do `@nomad/ui` ainda está sendo fechado
> pelas outras fases do projeto NUI-00.
> **Fonte da verdade:** `docs/padrao-frontend.md` no repo `PedroPaduelo/nomad-ui`. O corpo desta página é
> **gerado** desse arquivo (`scripts/generate-knowledge.mjs`) — se as duas divergirem, o repo vence.
> Os casos concretos por app (arquivo:linha, número medido, sha) vivem em `docs/auditoria-apps.md`, que
> envelhece junto com cada app; no padrão entra a regra, não o caso.

<!-- repo:docs/padrao-frontend.md -->
