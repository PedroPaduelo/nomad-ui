# Evidência visual NUI-02

## Capturas efetivamente feitas

- `conta-real-appbar-dark.png`: Conta Nommand no preview de desenvolvimento, sessão autenticada, tema escuro.
- `conta-real-appbar-apps-open-dark.png`: mesma sessão com a grade de aplicativos aberta.
- `conta-real-account-open-dark.png`: mesma sessão com o menu da conta aberto.
- `pacote-vitrine-appbar-dark.png`: vitrine do `@nomad/ui/topbar`, mesmos dados falsos usados nos testes (Ana Souza, Nomad Labs), tema escuro.

Os screenshots foram capturados no navegador em 29-09-2026. A Conta real estava autenticada com uma conta e empresa de teste; a vitrine usa “Ana Souza” / “Nomad Labs”, pois a vitrine não recebe dados da conta autenticada.

## Limitação da comparação por pixels

**A comparação de pixels zero-diferença não foi concluída.** Capturas da Conta real e da vitrine não podem ser comparadas pixel a pixel: usuário, empresa, nome do app, dados da grade e posição do painel são diferentes; além disso, a vitrine exibe a seção em uma moldura de demonstração. Não foi possível extrair a árvore React da sessão autenticada da Conta nem substituir os dados em runtime sem alterar a sessão. A captura real, portanto, comprova a barra da Conta e a vitrine, mas não demonstra igualdade pixel a pixel.

O bundle `@nomad/topbar` original é cópia de fonte da tag `topbar-v1.0.0` (commit `303541e`); os componentes do pacote foram trazidos sem alterações visuais intencionais. O aceite literal “captura lado a lado Conta × vitrine idêntico” permanece pendente de comparação controlada com a mesma fixture e viewport.

## Correção visual de vitrine (follow-up NUI-02)

Na verificação de 29-09-2026, o segundo Demo agora não monta uma segunda `TopBar`; os três painéis de exemplo ficam em uma coluna (um abaixo do outro, com `gap-6`) e têm altura própria pelos respectivos conteúdos. A fixture Loadbalance usa `iconUrl: null`, sem requisição externa. Captura atualizada: `vitrine-paineis-empilhados-dark.png`.

A vitrine foi reiniciada a partir da `main` atual (`.wt/topbar`, porta 5175). Node Playwright no Chromium carregou `?section=topbar&theme=dark` com **zero `pageerror`, `error` e `unhandledrejection`**; nenhuma imagem externa foi pedida pela fixture. (O MCP browser registrou `Uncaught (in promise)` em uma sessão que também registrava erros da extensão de automação; o Playwright limpo no mesmo navegador confirmou ausência de rejeição da aplicação.)

Gates atuais: `npm run gates` — 7 arquivos/63 testes passaram, typecheck+lint+build verdes; `npm run test:a11y` — axe 20/20 nas 10 paletas × claro/escuro verdes.

**Comparação pixel-zero continua pendente**, conforme acima. A captura lado a lado Conta/vitrine não é mesmo dado/viewport; não declarei igualdade exata.
