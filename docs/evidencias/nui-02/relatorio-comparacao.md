# Evidência visual NUI-02

## Capturas efetivamente feitas

- `conta-real-appbar-dark.png`: Conta Nommand no preview real da sandbox, sessão autenticada, tema escuro.
- `conta-real-appbar-apps-open-dark.png`: mesma sessão com a grade de aplicativos aberta.
- `conta-real-account-open-dark.png`: mesma sessão com o menu da conta aberto.
- `pacote-vitrine-appbar-dark.png`: vitrine do `@nomad/ui/topbar`, mesmos dados falsos usados nos testes (Ana Souza, Nomad Labs), tema escuro.

Os screenshots foram capturados no navegador em 29-09-2026. A Conta real tinha como usuário “Orquestrador Teste” e empresa “Empresa Teste Orq 2”; a vitrine usa “Ana Souza” / “Nomad Labs”, pois a vitrine não recebe dados da conta autenticada.

## Limitação da comparação por pixels

**A comparação de pixels zero-diferença não foi concluída.** Capturas da Conta real e da vitrine não podem ser comparadas pixel a pixel: usuário, empresa, nome do app, dados da grade e posição do painel são diferentes; além disso, a vitrine exibe a seção em uma moldura de demonstração. Não foi possível extrair a árvore React da sessão autenticada da Conta nem substituir os dados em runtime sem alterar a sessão. A captura real, portanto, comprova a barra da Conta e a vitrine, mas não demonstra igualdade pixel a pixel.

O bundle `@nomad/topbar` original é cópia de fonte da tag `topbar-v1.0.0` (commit `303541e`); os componentes do pacote foram trazidos sem alterações visuais intencionais. O aceite literal “captura lado a lado Conta × vitrine idêntico” permanece pendente de comparação controlada com a mesma fixture e viewport.
