# Handover — sandbox do nomad-ui recriada (2026-10-04)

> **Se você está lendo isto numa sandbox nova: a v1.13.6 já está publicada. Não refaça o
> `ThemeSwitcher` nem a §13 — leia o estado abaixo e siga a partir dele.**

## O que já está na `main`

`origin/main` = `8474532`, tag `v1.13.6` apontando para o mesmo commit.

| commit | o quê |
| --- | --- |
| `92efee7` | fix do `ThemeSwitcher`: teclado e retorno de foco |
| `15a6c8b` | §13 do padrão reconciliada (atribuição e medição) |
| `8474532` | `package.json` em `1.13.6` + CHANGELOG |

O gate de publicação (`scripts/publish.test.mjs`) está **verde**: a última tag contém o `HEAD` e o
`version` do manifesto é o número da tag.

## Por que a task existia

O revisor do Motor apontou, **por leitura**, que o `ThemeSwitcher` da `v1.13.5` perdia o foco e
não tinha navegação por setas. Antes de tocar em linha alguma, isso foi medido no Chromium nativo
(`19063f9`, claro/escuro × 1440px/390px):

- `Enter` e `Escape` deixavam o foco no `BODY` — 4/4 cada;
- `ArrowDown`/`ArrowUp`/`Home`/`End` não moviam nada — 16/16;
- abertura, aplicação da paleta, persistência e clique externo já funcionavam.

O teste novo (`src/__tests__/themeswitcher.browser.test.tsx`) monta `ThemeProvider` +
`PaletteProvider` + `ThemeSwitcher` **reais**, usa o teclado nativo do Vitest Browser e **falha na
revisão antiga (24 de 36, exit 1)**. O valor dele é esse: quem trocar o controle por outro
primitivo do Base UI não tem como quebrar o contrato em silêncio.

## O que fazer com o WIP antigo

O WIP que estava na raiz (`package.json` em `1.13.6` + CHANGELOG) **foi reescrito, não publicado**:
ele afirmava que a produção do motor não executa o conf do repo e que o fail-fast "já rodava", e
trazia `1d51985b` como `todo`. Nada disso foi medido aqui. O snapshot está em
`.wt/preservacao-2026-10-04/root-working-tree.diff` (sha256 `3036d86…`) e sai com a sandbox; se
ele ainda for necessário, copie para fora **antes** da recriação.

## Se a task voltar

1. Confirme o sha antes de agir: `git ls-remote origin main`.
2. Publicação é **tag semver na `main` + entrada no CHANGELOG**, commit antes da tag. Sem GitHub
   Actions: os gates rodam na sandbox.
3. Nada disso mede app em produção. O que cada consumidor tem a depois do bump é integração a
   medir na sessão dele.

## Ambiente

Previews: `app`, `app2`, `app3`. A vitrine é `npm run showcase:dev` (porta explícita). Os gates são
`npm run gates` e, para medir de verdade, o Chromium do Playwright precisa estar instalado — sem ele
o `test:a11y` sai 0 sem rodar teste nenhum. Worktrees de lane em `.wt/` estão fora do git: o
`.git/info/exclude` é local e **precisa ser refeito** numa sandbox nova.