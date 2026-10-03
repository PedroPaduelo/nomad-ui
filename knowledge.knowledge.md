<!--
  Resumo da página de knowledge `[NUI] Padrão Frontend Nomad v1` (AgentPack `690df27c`).

  Este arquivo é a ÚNICA parte escrita à mão da página — e é por isso que ele é
  verificado: o padrão inteiro vive em `docs/padrao-frontend.md` e esta página é
  ponteiro, não cópia (ver `scripts/knowledge-page.mjs` e o teste que exige que
  cada afirmação deste resumo apareça no documento).

  Regra para editar: mude o padrão no documento do repo primeiro, depois este
  resumo, e rode `node scripts/check-doc.mjs` + `node scripts/knowledge-summary.test.mjs`.
  O script falha se este texto afirmar algo que o documento não contém.
-->

# Padrão Frontend Nomad v1 — resumo

> Vale para os quatro frontends da Nomad: **agent-package, Conta Nommand, loadbalance e motor**. Base: o frontend
> do agent-package (`frontend/`, commit `95df4f2`), escolhido como referência. Decisão de produto de 2026-09-29.
>
> **Esta página é o resumo e o ponteiro.** O padrão está inteiro, em um lugar só, no repositório:
> `link:repo:docs/padrao-frontend.md`. Esta página não é cópia dele — se divergirem, o repositório vence.
> Os casos concretos por app (arquivo:linha, número medido, sha) vivem em `link:repo:docs/auditoria-apps.md`,
> que envelhece junto com cada app. No padrão entra a regra com exemplo curto; o caso de um app, não.

## 1. Regras em uma tela

1. O app instala o `@nomad/ui` numa **tag fixa** e não copia nada dele: tema, kit, barra, dados e presets vêm do pacote.
2. Pastas iguais às do agent-package: `app/`, `pages/`, `features/<dominio>/{api,hooks,components,pages,lib}`,
   `components/`, `api/`, `lib/`, `stores/`, `hooks/`, `config/`, `styles/`, `types/`, `utils/`, `test/`.
3. **Estado de servidor só no TanStack Query** — `queryOptions` + fábrica de keys por entidade; mutation invalida.
4. **Zod nas bordas:** resposta da API, formulário, variáveis de ambiente.
5. **Zustand só para estado de tela.** Nunca lista do servidor.
6. Componente e tela não chamam a API: usam os hooks do domínio. O ESLint barra.
7. Overlay (diálogo, gaveta, menu, popover) só pelo kit.
8. Nenhum merge sem os gates da seção 4 verdes.

## 2. O pacote

- Instala por **dependência git com URL `git+https://` completa**, nunca o atalho `github:` (o atalho resolve por
  ssh e quebra `npm ci` em imagem sem chave).
- **Bump de tag:** trocar só a tag no `package.json` mantém o commit antigo em silêncio. Force:
  `npm install @nomad/ui@git+https://github.com/PedroPaduelo/nomad-ui.git#vX.Y.Z` e confira
  `node -p "require('@nomad/ui/package.json').version"`. **Em workspace, o lock da raiz manda:** bump no pacote
  (ex.: `motor/fe`) não instala nada se a entrada da raiz continuar pinada; atualize os dois locks.
- **Presets são herdados:** o `include` do `tsconfig` tem que cobrir os testes (senão rodam sem ser typecheckados) e
  o `skipLibCheck` do preset é `true` (com `true` o TypeScript não lê os `.d.ts` das dependências; rode uma vez
  com `false` para checar a superfície pública do pacote).
- **Barra:** `<TopBar model={…}>` monta as 3 peças padrão (seletor de empresa, grade de apps, menu da conta) mais
  Ajuda e notificações a partir do `TopBarModel` que a Conta entrega, **sem item hard-coded pelo app**. Marca,
  busca e ações do app (Paleta) ficam nos slots. `launcherLinks` são o **rodapé** da grade, não tiles; item de menu
  com `href` **navega** (o `preventDefault()` só quando o app passou callback de navegação SPA) e
  `topBarModelSchema.safeParse` nunca lança — devolve `{ success: false }` com issue.
- **Versão atual:** tabela em `link:repo:docs/padrao-frontend.md` e `link:repo:CHANGELOG.md`. Tags nunca se movem:
  conteúdo corrigido sai em versão nova.

## 3. Regras que a auditoria de 2026-10-01 tornou obrigatórias

_(exemplo e teste que pega, em `link:repo:docs/padrao-frontend.md`)_

1. **`.catch()` é proibido em schema Zod** — transforma campo ausente, renomeado ou de tipo errado no valor de
   fallback. Campo opcional de verdade: `.optional()` + `?? valor` no transform (o transform só roda depois do parse
   passar, então distingue "não mandou" de "mandou com outro nome"). Teste que pega: payload com o campo renomeado
   tem que **lançar**.
2. **O schema do cliente é cópia de leitura do contrato do servidor** — `uuid()`, `datetime()` e o esquema de URL
   iguais aos do servidor; `z.string().url()` aceita `javascript:` e não é o mesmo contrato. Comentário que afirma
   "mesmo contrato do backend" vale como se fosse testado.
3. **Variável que governa segurança não tem default** — ausente é erro de boot, com mensagem que nomeia a variável.
   E o ponto que generaliza: **guard escrito na direção errada não protege** — `if (env.NODE_ENV === 'production') throw`
   protege quando é production e falha em silêncio quando não é, que é o caso em que a variável pode faltar; use
   `if (env.NODE_ENV !== 'test') throw`, que nega por omissão e libera explicitamente. Recurso de desenvolvimento é
   opt-in explícito: a ausência desliga.
4. **`dotenv` não sobrescreve a env do processo** — `override: false` (o padrão); a env do orquestrador sempre vence.
   E o `.env.example` **comenta** a linha sensível em vez de trazer valor pronto: o exemplo não pode ser o valor perigoso.
5. **Teto de tamanho só desce, e contra baseline commitado** — teto que mora no mesmo arquivo que a regra não é teto.
   O teste exige `atual <= baseline`, e a contagem usa o algoritmo da regra (código, pulando linha em branco e
   comentário), nunca `wc -l`. _O `@nomad/ui` ainda não impõe `max-lines` no preset: vale a regra para o pacote no dia
   em que passar a impor, com o baseline dele no mesmo release._
6. **`test/` entra no typecheck** — `include: ["src/**/*"]` faz o `tsc` não ver o teste; ele roda (o transpilador não
   checa tipo) e nunca é typecheckado. O typecheck do gate roda o mesmo `tsc --noEmit` que o dev roda. Teste que pega:
   `tsc --noEmit --listFilesOnly` e **falhar se a contagem de arquivos de teste for zero**.
7. **Helper de teste não engole status; asserção frouxa não mede** — helper que devolve `{status, body}` sem lançar
   esconde o erro de quem chama, e o resultado descartado vira silêncio; lance em status >= 400 por padrão, com
   opção explícita (`expectStatus(404)`, `raw: true`) para o teste que quer o erro. E `expect.any(Number)` aceita
   zero: quando a asserção precisa de `any` para passar, ela não está medindo o que o nome promete. Vale para o CI:
   os apps rodam as duas metades do pacote, não só o frontend.
8. **Gate que não existe é gate que não pega** — gate que não roda dá a mesma sensação de segurança que um que
   passa. Três perguntas: o script roda o que o nome diz (`npm run test` apontando para um workspace só é gate pela
   metade)? a condição de `skip`/`skipIf` está satisfeita no CI (verde com o teste não rodado)? um passo de setup que
   falha derruba os seguintes, ou eles ficam `skipped` em silêncio? Checklist completo no documento.

## 4. Gates

**Do pacote** (`npm run gates` na raiz do `@nomad/ui`, medido): `typecheck`, `lint`, `doc:check`, `test`,
`test:a11y`, `build`.

**De cada app, por decisão dele:** `cycles` (se adotar `madge`), `api:check` (se usa openapi-ts),
`test:coverage` (se adotar piso), `format:check`, `npm audit --audit-level=high`.

Gate sem CI: roda na mão, por decisão do dono (2026-10-02). A sequência, do zero: `npm ci` →
`typecheck` → `lint` → `doc:check` → `test` → `test:a11y` → `build` (medida em 92 s). A tabela de falha
de cada gate, e de quem é cada um, estão no documento.

## 5. a11y, teste e revisão

- `eslint-plugin-jsx-a11y` ligado; overlay só pelo kit (focus trap, Esc, retorno de foco).
- `axe` nos testes de tela e **contraste no Chromium** (`*.browser.test.tsx`, `npm run test:a11y`) nas paletas ×
  claro/escuro. Nunca cor fixa: só tokens. Atalho de uma tecla só pode ser desligado.
- **Referência em documento normativo se confere antes de integrar** — vale para número, sha, arquivo:linha e
  citação. Um número que ninguém reproduz é uma mentira que o typecheck não pega.
- **Em documento normativo o defeito é a transcrição, não a revisão.** Por isso o padrão tem fonte única no repo,
  esta página é ponteiro, e `scripts/check-doc.mjs` roda antes de qualquer geração.

## 6. Onde está o quê

- Padrão completo: `link:repo:docs/padrao-frontend.md` — **a fonte da verdade**, é o que os apps copiam.
- Casos por app: `link:repo:docs/auditoria-apps.md`.
- Changelog do pacote: `link:repo:CHANGELOG.md`.
- Vitrine (11 paletas × claro/escuro, todas as peças): https://sb-nomad-ui-app.mp.serendiped.com
- Como mudar o padrão: edite `docs/padrao-frontend.md` no repo, rode `node scripts/check-doc.mjs` e
  `node scripts/knowledge-page.mjs` para regerar esta página. Nunca edite o padrão nesta página.
