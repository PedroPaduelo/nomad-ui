# Padrão Frontend Nomad v1

> Vale para todos os frontends da Nomad: agent-package, Conta Nommand, loadbalance e motor.
> Base: o frontend do agent-package (`frontend/`, commit `95df4f2`), escolhido como referência.
> Decisão de produto (2026-09-29): mesmo tema, mesmas bibliotecas, mesma organização de pastas, mesmo jeito de
> consumir dados e a mesma barra superior da Conta Nommand em todos os apps.
> Onde o documento diz **(revisar na v1.0.0)**, o nome exato da API do `@nomad/ui` ainda está sendo fechado
> pelas outras fases do projeto NUI-00.

## 0. Como este padrão se mantém

Duas regras sobre o próprio documento, porque é ele que os quatro apps copiam:

- **Referência se confere antes de integrar** — número, sha, arquivo:linha, citação. Um número que ninguém
  reproduz é uma mentira que o typecheck não pega.
- **Em documento normativo o defeito é a transcrição, não a revisão.** A fonte é uma (este arquivo); a página de
  knowledge é ponteiro e tem teste de fidelidade (`npm run doc:check`). Texto longo transcrito à mão entre dois
  sistemas diverge — já aconteceu, e o verificador existe para pegar a próxima.

## 1. Regras em uma tela

1. O app instala o `@nomad/ui` numa **tag fixa** e não copia nada dele: tema, kit, barra, dados e presets vêm do pacote.
2. Pastas iguais às do agent-package: `app/`, `pages/`, `features/<dominio>/{api,hooks,components,pages,lib}`,
   `components/`, `api/`, `lib/`, `stores/`, `hooks/`, `config/`, `styles/`, `types/`, `utils/`, `test/`.
3. **Estado de servidor só no TanStack Query.** `queryOptions` + fábrica de keys por entidade; mutation invalida o que mudou.
4. **Zod nas bordas:** resposta da API, formulário e variáveis de ambiente.
5. **Zustand só para estado de tela** (tema, sidebar, toasts, modo de visão, flag de sessão). Nunca lista do servidor.
6. Componente e tela não chamam a API: leem e escrevem pelos hooks do domínio. O ESLint barra.
7. Overlay (diálogo, gaveta, menu, popover) só pelo kit. Nada de `fixed inset-0`, `role="dialog"` ou `aria-modal` à mão.
8. Nenhum merge sem os gates da seção 11 verdes.

## 2. Stack e versões

| Peça              | Versão                                                                                                                                                                                              | Observação                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Node              | 24 LTS (`.nvmrc` = `24`, `engines: ^24.11.0`)                                                                                                                                                       | o `@nomad/ui` aceita ≥ 22.12, mas o padrão é 24                         |
| React / React DOM | 19.3                                                                                                                                                                                                |                                                                         |
| Vite              | 8.3 (`@vitejs/plugin-react` 6)                                                                                                                                                                      |                                                                         |
| TypeScript        | 6.0 (`~6.0.3`)                                                                                                                                                                                      | `strict`, `noUnusedLocals`, `noUnusedParameters`; sem `baseUrl`         |
| Tailwind CSS      | 4.3 (`@tailwindcss/vite`)                                                                                                                                                                           | configuração em CSS (`@theme inline`), sem `tailwind.config.js`         |
| Kit               | `@base-ui/react` 1.8, `class-variance-authority` 0.7, `tailwind-merge` 3.7, `clsx` 2, `lucide-react` 1.48                                                                                           | tudo via `@nomad/ui`                                                    |
| Rotas             | `react-router-dom` 7.18                                                                                                                                                                             | data router (`createBrowserRouter`)                                     |
| Dados             | `@tanstack/react-query` 5, `axios` 1, `zod` 4.6, `zustand` 5                                                                                                                                        | cliente gerado com `@hey-api/openapi-ts` onde o backend publica OpenAPI |
| Testes            | `vitest` 5, Testing Library (react 16, user-event 14, jest-dom 7), `jsdom`, `msw` 2, `axe-core` 4, `@vitest/browser-playwright` 5                                                                   |                                                                         |
| Qualidade         | ESLint 9 (flat) + `typescript-eslint` 8 type-aware, `eslint-plugin-react-hooks` 7, `eslint-plugin-jsx-a11y` 6, `@tanstack/eslint-plugin-query` 5, `eslint-config-prettier`, Prettier 3.9, `madge` 8 | presets do `@nomad/ui`                                                  |

Fora do padrão (sair ao migrar): Astryx (`@astryxdesign/*`), StyleX, shadcn/Radix, `sonner`, `react-query-devtools` em produção,
cliente HTTP escrito à mão com `fetch` quando o `createHttpClient` resolve.

## 3. `@nomad/ui` (obrigatório)

### Instalar

```jsonc
// package.json do app — URL git+https COMPLETA, nunca o atalho github:
"dependencies": {
  "@nomad/ui": "git+https://github.com/PedroPaduelo/nomad-ui.git#v1.6.3"
}
```

`npm install` clona a tag e o `prepare` do pacote gera o `dist`. O app também declara os peers:
`react`, `react-dom` (19), `@tanstack/react-query` (5), `zod` (4) e `tailwindcss` (4).

### Consumo por tag: o package-lock prende o commit (importante)

Com dependência git, o `package-lock.json` guarda o **commit resolvido** da tag. Trocar só a tag no `package.json` e rodar
`npm install` pode **manter em silêncio o commit antigo** (o npm reaproveita a entrada do lock): em 2026-09-30 o motor
ficou na `v1.4.1` acreditando estar na `v1.5.0`. Procedimento de bump:

```bash
# 1. edite a tag no package.json do app
# 2. force a resolução para a nova tag:
npm install @nomad/ui@git+https://github.com/PedroPaduelo/nomad-ui.git#vX.Y.Z
# 3. confirme a versão instalada:
node -p "require('@nomad/ui/package.json').version"
```

**Lock da raiz manda no workspace:** bump no `package.json` do pacote (ex.: `motor/fe`) não instala nada se a entrada
do `package-lock.json` da raiz continuar pinada. Atualize os dois locks e confira
`require('@nomad/ui/package.json').version` (o motor caiu nisso em 2026-09-30: pediu 1.5.1, ficou na 1.4.1).

**SSH:** o atalho `github:PedroPaduelo/nomad-ui#vX.Y.Z` faz o npm resolver por git+ssh e `npm ci` quebra em imagem
Docker sem chave ssh (os 3 frontends de produção caíram nisso em 2026-09-30). Mesmo instalando por `git+https://`, o npm
grava `resolved: git+ssh://git@github.com/…#<sha>` no lock (medido). Para um CI/Docker sem chave: **regere o lock uma
vez** (`rm -f package-lock.json && npm install` na primeira instalação, ou no CI) para ele ficar em https.

**Spec do app: sempre `git+https://`, nunca o atalho `github:`.** Estado medido dos 4 em 2026-10-01:

| app           | spec no `package.json`                                       |
| ------------- | ------------------------------------------------------------ |
| loadbalance   | `git+https://github.com/PedroPaduelo/nomad-ui.git#v1.8.2` ✅ |
| conta_nommand | `git+https://github.com/PedroPaduelo/nomad-ui.git#v1.6.2`    |
| agent-package | `git+https://github.com/PedroPaduelo/nomad-ui.git#v1.6.2`    |
| **motor**     | **`github:PedroPaduelo/nomad-ui#v1.6.2`** ⚠️                 |

O motor é o caso mais grave porque o atalho é o que **produz** o ssh: com `github:` o próprio `npm install` escreve
ssh no lock, sem ninguém pedir. **Ao bumpar, corrige o spec no mesmo commit** — trocar só a tag deixa o atalho quieto e o
próximo `npm install` reintroduz o defeito. O `check-lock` do pacote (§ `gates`) acusa o atalho na origem, mas ele roda
no repositório do `@nomad/ui`: **no app, quem pega é o gate do próprio app**.

**Onde a entrada mora varia por app** (medido 2026-10-01): no loadbalance é a raiz do `frontend/package-lock.json`; no
motor é `packages[""]` do `fe/package-lock.json`, com o atalho **nos dois lados** (`fe/package-lock.json` **existe** — o
`resolved` dele é `null`, e o `git+ssh` que se vê em `node_modules` local não está no lock commitado); um spec
declarado só dentro de um workspace fica em `pkg['<workspace>'].dependencies`. Por isso o `check-lock` varre a raiz
**e** cada workspace — **um gate escrito para um formato só dá confiança falsa nos outros**.

#### O `npm ci` do app é cego para o lock do pacote (v1.8.4)

Medido em 2026-10-01 como consumidor, com o `@nomad/ui` real:

|                                          | o que acontece                                            |
| ---------------------------------------- | --------------------------------------------------------- |
| Lock do app **fixa a versão** (o commit) | `resolved: …#096d19c` (a v1.8.1), mesmo pedindo `#v1.8.1` |
| `npm ci` do app                          | **passa** — `added 50 packages`, exit 0                   |
| O lock do pacote, com `sonner` faltando  | **ninguém acusa**                                         |

**O lock do consumidor faz duas coisas, e elas precisam ser separadas:** ele **fixa a versão** do pacote (é por isso que
trocar só a tag no `package.json` pode manter o commit antigo em silêncio), mas **não valida a árvore** do pacote. O npm
resolve as dependências **dele** lendo o `package.json` **dele** — o `package-lock.json` do `@nomad/ui` não entra na
conta de ninguém.

**As duas coisas juntas são o que engana.** O lock do app "funciona" (fixa o commit certo) **e mesmo assim** entrega um
pacote cujo próprio lock está quebrado. Confirmado com o caso real do motor: `npm ci` instala a **v1.6.2** — que tem
`sonner` no `package.json` e fora do lock — e sai **exit 0**.

**Consequência — a assimetria do stack:** o `@nomad/ui` é o **único** projeto em que o lock é gate de produção dos
outros. Um app não tem como detectar, pelo próprio `npm ci`, que o pacote está com lock quebrado; e quando algo falha
(`EUSAGE` no Dockerfile do LB), é por um **sintoma do consumidor** — o `git+ssh` — e não pelo lock do fornecedor.

**Por git e por registry não dá no mesmo (medido, v1.9.1).** Mesma mutação — remover **só** a entrada de uma
transitiva, deixando a referência:

| como o pacote chegou                  | `npm ci --dry-run` | `npm ci` real                          | o que aconteceu                                               |
| ------------------------------------- | ------------------ | -------------------------------------- | ------------------------------------------------------------- |
| **registry** (`is-odd` num workspace) | exit 1             | **`EUSAGE: Missing: is-number@6.0.0`** | reprova, e o erro diz o quê                                   |
| **git** (`@nomad/ui#v1.8.1`)          | **exit 0**         | **exit 0**                             | instala o pacote e **deixa a dependência de fora, sem aviso** |

Dep de registry vem **descrita pelo lock**, então falta de entrada é `EUSAGE`. Dep de git vem **do `package.json` do
pacote**, que o npm lê e **confia** — e a entrada que o lock descreve não é validada. **O `npm ci` sai 0 e não
instalou.** Quem reproduz pelo `npm ci` não vê nada.

⚠️ **O caso que mais custa, medido duas vezes: `npm ci` em árvore limpa, dependência por git, transitiva sem entrada
no lock → exit 0, `added 136 packages` (o lock íntegro instala 941) e `node_modules/@nomad/ui` INTEIRO ausente.**
O build passa, o CI fica verde, e a feature simplesmente não existe no bundle. **É o defeito que o `check-lock` §2b
existe para pegar** — e é o que nenhum `npm ci` do stack acusa.

**Por isso o `check-lock` é a única verificação que pega esse caso** — e ele concorda com o `npm ci` nos dois: acusa a
transitiva sem entrada nos dois casos e fica quieto no lock coerente. **Gate que reprova o que o instalador aceita em
silêncio é o gate funcionando.**

⚠️ **Ao medir exit code: sem `| tail`, sem `| grep`, sem `&&` — ou `PIPESTATUS`.** Os três mascaram o `$?`, e um
`exit 0` medido com pipe é exatamente o que esconde o defeito acima. E **antes de chamar duas medições de
contradição, confirme que é o mesmo lock**: o `name` e a raiz do `package-lock.json` dizem de qual repositório ele é.

**Regra:** _gate de instalação do consumidor não prova instalação do fornecedor._ Por isso o `check-lock` e o
`gates:ci` vivem no repositório do pacote e **não** podem ficar só no app. Para os 4: a defesa é o `npm ci` do
`@nomad/ui` passando, e nada substitui isso.

### O que vem de lá

| Import                                                         | Conteúdo                                                                                                                                                                                                                                                                                                                                        | Substitui no app                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `@nomad/ui`                                                    | kit (`Button`, `Modal`, `Drawer`, `Menu`, `Popover`, `Tabs`, `Field`, `Input`, `Select`, `ConfirmDialog`, `EmptyState`, `Switch`, `Table`, `Pagination`, `Banner`, `MultiSelect`, `CodeBlock`, `StatusDot`, `Progress`, `Kbd`, `Toaster`…) e tema (`ThemeProvider`, `PaletteProvider`, `ThemeSwitcher`, hooks de tema e paleta, boot sem flash) | `src/components/ui/`, `providers/ThemeProvider`, `lib/theme*`, `styles/palettes.ts` |
| `@nomad/ui/theme.css`                                          | o `globals.css` do agent-package: tokens, `@theme inline`, 10 paletas × claro/escuro, e o `@source` do pacote                                                                                                                                                                                                                                   | `src/styles/globals.css` e `palettes.css`                                           |
| `@nomad/ui/topbar`                                             | `TopBar`, `TopBarModel` + `topBarModelSchema`, `TopBarModelBar`, `NotificationsButton`, `TopBarBrand`, `TopBarModelBrand`, `NommandMark`, `OrgSwitcher`, `AppSwitcher`, `AccountMenu` (Padrão SSO Nomad v1, §10)                                                                                                                                | `src/shared/nomad-topbar/` + `scripts/sync-nomad-topbar.sh`                         |
| `@nomad/ui/data`                                               | `createQueryClient`, `createHttpClient({ baseURL, onUnauthorized, isSessionExpired })`, `ApiError` (`errorCode`, `body`), `parseEnv`/`parseResponse`/`responseParser`/`fieldErrors` (tipos **estruturais**, sem zod no `.d.ts`), helpers de Zod e fábrica de query keys                                                                         | `lib/queryClient.ts`, o miolo de `api/client.ts`                                    |
| `@nomad/ui/markdown`                                           | leitor de markdown do kit **(revisar na v1.0.0)**                                                                                                                                                                                                                                                                                               | `components/ui/Markdown.tsx`                                                        |
| `@nomad/ui/tsconfig`, `@nomad/ui/eslint`, `@nomad/ui/prettier` | presets                                                                                                                                                                                                                                                                                                                                         | configs copiadas                                                                    |

```css
/* src/styles/globals.css do app: primeira linha */
@import '@nomad/ui/theme.css';
@import '@nomad/ui/topbar.css'; /* a barra: CSS é import explícito, uma vez */
/* depois, só o CSS próprio do app (nada de cor fixa: use os tokens) */
```

```tsx
// src/main.tsx
// ⚠️ o barrel "@nomad/ui" reexporta ThemeProvider, que é CONTEXTO. Em main.tsx
// isso é inofensivo (você quer o provider mesmo). Em qualquer outro arquivo —
// componente, hook, página — importe pelo SUBPATH, que não puxa contexto:
//   import { TopBar } from '@nomad/ui/topbar'            // ✅ subpath, não puxa contexto
//   import { Button } from '@nomad/ui'                    // ❌ o kit só sai pelo barrel: puxa ThemeProvider
// Ver "Subpath, não barrel" na §5.
import { ThemeProvider, PaletteProvider } from '@nomad/ui'
import './styles/globals.css'

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <PaletteProvider>
        <App />
      </PaletteProvider>
    </ThemeProvider>
  </StrictMode>,
)
```

O script de boot sem flash (aplica `data-theme` e `data-palette` antes do CSS) vai inline no `index.html` e vem do
pacote; o hash dele entra no `script-src` da CSP **(revisar na v1.0.0: nome do export do script)**.

### Versões publicadas (o que cada uma trouxe)

| Tag      | Traz                                                                                                                                                                                                                                                                                                 | Apps devem                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `v1.0.0` | tema (11 paletas × claro/escuro/sistema), kit do agent-package, barra Nomad (`TopBar`, `OrgSwitcher`, `AppSwitcher`, `AccountMenu`), dados (`QueryClient`, `createHttpClient`, Zod, keys), presets                                                                                                   | base da migração                                                                                                 |
| `v1.0.1` | correção de release                                                                                                                                                                                                                                                                                  | —                                                                                                                |
| `v1.1.0` | + `Switch`, `Table`, `Pagination`, `Banner`, `MultiSelect`, `CodeBlock`, `StatusDot` (7 peças do loadbalance)                                                                                                                                                                                        | trocar o local pelo do pacote                                                                                    |
| `v1.1.1` | `withCredentials` só na mesma origem; `onUnauthorized` não dispara em 401 de credencial própria                                                                                                                                                                                                      | cliente novo, sem `withCredentials: true` global                                                                 |
| `v1.1.2` | `Menu disabled` propaga ao gatilho (não usar CSS `pointer-events-none`)                                                                                                                                                                                                                              | —                                                                                                                |
| `v1.2.0` | `ApiError.errorCode` (`body.error`) e `ApiError.body`                                                                                                                                                                                                                                                | telas que discriminam por `invalid_credentials`, `mfa_required`, `version_conflict`…                             |
| `v1.3.0` | `Toaster`, `useToast` (wrapper Sonner com os tokens)                                                                                                                                                                                                                                                 | sair do `sonner` local                                                                                           |
| `v1.4.0` | `Progress.tone` (`success/warning/error/info/accent`), `fillClassName`                                                                                                                                                                                                                               | —                                                                                                                |
| `v1.4.1` | `Progress` com `w-full` (a trilha colapsava em 0 px dentro de `flex`)                                                                                                                                                                                                                                | —                                                                                                                |
| `v1.5.0` | `TopBarModel` + `topBarModelSchema` (Zod) — contrato canônico da barra; tokens `--mark-bg`/`--mark-on` (fix do logo)                                                                                                                                                                                 | validar a resposta do topbar com o schema                                                                        |
| `v1.5.1` | republicação do conteúdo da `v1.5.0` (a tag `v1.5.0` apontava para o commit da `v1.4.1`)                                                                                                                                                                                                             | **apontar para `#v1.5.1`, nunca `#v1.5.0`**                                                                      |
| `v1.5.2` | o barrel de `@nomad/ui/topbar` passou a exportar o contrato (`topBarModelSchema` e tipos); `createHttpClient`: 401 de credencial (`invalid_credentials`, `mfa_*`) não derruba a sessão (`isSessionExpired`) e `UnauthorizedContext.refreshError`                                                     | aponta para `#v1.5.2` ou acima                                                                                   |
| `v1.6.0` | `<TopBar model={…}>` monta as 3 peças + Ajuda + notificações a partir do `TopBarModel` (ver §8); `NotificationsButton`, `NommandMark`/`TopBarModelBrand`; `MenuItem.onNavigate`; `AccountMenu.onSignOut` opcional; nota de consumo por tag                                                           | barra pelo model; conferir versão instalada                                                                      |
| `v1.6.1` | `<Kbd symbol>` para glifo Unicode (⌘, ⇧, ⌥, ↻): a fonte de texto tem o glifo, a de mono não — sem isso o navegador desenhava a caixa vazia (▯)                                                                                                                                                       | `<Kbd symbol>` em atalhos; **tirar o contorno `font-sans` no app**                                               |
| `v1.6.2` | `launcherLinks` como **rodapé** de links da grade (como a Conta), não tiles; tipos de Zod estruturais (`SafeParseSchema`, `Issue`): o `.d.ts` não amarra a versão de zod do consumidor                                                                                                               | nada a mudar no código; **a ponte de tipos do zod sai**                                                          |
| `v1.6.3` | menu com `href` **navega** de volta (regressão da v1.6.0: "Gerenciar sua Conta", `accountLinks` e `helpLinks` estavam com o clique prevenido e sem função); `safeParse` do topbar não lança (devolve issue); `apps` validado no schema; `href` só http(s); `theme={null}` esconde o item Tema        | sem mudança de código: bumpar para `#v1.6.3`                                                                     |
| `v1.7.0` | `secureEnv(schema, required)` (`@nomad/ui/data`): variável de segurança **sem default** é exigida pelo `parseEnv` e o erro a nomeia; `parseEnv` sem `secureEnv` fica idêntico ao anterior                                                                                                            | `secureEnv` na borda: declare o schema **e** a lista de obrigatórias na mesma chamada                            |
| `v1.8.0` | **`<TopBar model>` não some mais com `model` incompleto** — `TopBarModelBar` desreferenciava `model.account.manageAccountHref` sem guard e a `TypeError` derrubava a barra inteira (o sintoma "barra vazia" foi lido como conflito de slots). A peça da conta **degrada** em vez de derrubar a barra | nada a mudar no código; **continue validando com `topBarModelSchema`** — o guard é rede do render, não validação |
| `v1.8.1` | guard de `model.organization`/`organizations` (mesmo crash da v1.8.0, completados); rótulo a11y da conta não fica vazio sem `profile.name`                                                                                                                                                           | nada a mudar no código                                                                                           |
| `v1.8.2` | **`npm ci` do pacote passou a funcionar** (`sonner` estava no `package.json` desde a v1.3.0 e nunca no lock); `check-lock.mjs` entra no `doc:check` e confere lock × `package.json`, versão instalada × range, e `resolved` em `git+ssh`                                                             | nada a mudar no código; **regenerar o lock próprio do app depois do bump**                                       |
| `v1.8.3` | `gates:ci` novo (`npm ci` do zero antes dos gates) e **`test:a11y` entra no `gates`** (242 testes que rodavam só a mão)                                                                                                                                                                              | nada a mudar no código; **`gates` não prova que o pacote instala** — use `gates:ci`                              |
| `v1.8.4` | `check-lock` pega o atalho `github:`/`gitlab:`/`bitbucket:` (o `npm install` reescreve para `git+ssh` no lock — 7ª ocorrência no LB)                                                                                                                                                                 | **dependência de git por `git+https://`, nunca `github:`**                                                       |

Tags nunca se movem: conteúdo corrigido sai em **versão nova**.

### Atualizar

1. Leia o `CHANGELOG.md` do `nomad-ui` entre a tag atual e a nova.
2. Troque a tag no `package.json` e rode `npm install @nomad/ui@git+https://github.com/PedroPaduelo/nomad-ui.git#<tag>` (força a resolução; ver "Consumo por tag" acima).
3. Confira `node -p "require('@nomad/ui/package.json').version"`.
4. Rode os gates (seção 11) e a aceitação visual da barra (captura ao lado da Conta).
5. Um commit só: `chore(deps): @nomad/ui v1.6.3`.

**Confira a versão que você está pegando, não o número dela.** Uma versão pode ser **recente no relógio e antiga no
conteúdo**: foi o que aconteceu com a `v1.9.0` do `@nomad/ui` (numeração fora da linhagem — ficou **193 linhas**
contra 231 da `v1.8.10` e **sem** o bloco de checagem de transitiva). Regra prática, para qualquer repositório que
publica por tag neste stack:

- **`main` não se reescreve.** Nunca `push --force`, nunca `amend` em commit já pushado, nunca rebase do que já saiu.
  Quem consome por tag tem o sha na mão; reescrever quebra o que já foi consumido, sem ganho proporcional.
- **Tag publicada é imutável.** Um erro sai **em versão nova**, nunca mexendo na tag antiga.
- **Erro de digitação em mensagem de commit não se corrige com `--amend`** — escreve-se melhor no commit seguinte
  (vale para commit **ainda não pushado**).
- **A numeração segue a linhagem, não o relógio**: a tag N nasce do N-ésimo commit a partir da anterior.
- **Antes de bumpar, confira o artefato:** `git show <tag>:<arquivo> | head -1`, não só o número da versão. E **conclusão
  repassada entre sessões vem com o hash do artefato que a produziu** — sem ele, o número não é transferível.

Nunca aponte para `main`, branch ou sha solto. Não edite nada dentro de `node_modules/@nomad/ui`: mudança vai por PR
no `nomad-ui` e sai numa versão nova. Componente que falta no kit: peça no `nomad-ui`; até sair, ele mora em
`src/components/<nome>/` do app, com task para subir ao pacote.

## 4. Organização de pastas

Igual à do agent-package (`frontend/src`), sem o que é produto dele (Render, glossário).

```
src/
├── main.tsx            entrada: providers do tema, QueryClient e router
├── app/                raiz do app e roteamento
│   ├── App.tsx         QueryClientProvider + RouterProvider
│   ├── routes.tsx      createBrowserRouter, lazy por rota, errorElement
│   ├── paths.ts        helpers de URL tipados (routes.project(id)…)
│   ├── RequireAuth.tsx guard: sem sessão → /auth/sso?next=<rota>
│   └── RouteErrorPage.tsx, routeBoundary.tsx
├── pages/              telas fora de um domínio (login pela Conta, busca, configurações, 404)
├── features/
│   └── <dominio>/      um por domínio do produto (projects, tasks, keys…)
│       ├── api/        chamadas REST do domínio + schemas Zod da resposta (só hooks/ importa daqui)
│       ├── hooks/      TanStack Query: keys, queryOptions, useX, useXMutation
│       ├── components/ componentes do domínio (+ schema Zod do formulário, ex. taskForm.ts)
│       ├── pages/      telas de rota do domínio (lazy no routes.tsx)
│       └── lib/        funções puras do domínio
├── components/         UI compartilhada do app
│   ├── layout/         Header (monta o TopBar do pacote), Sidebar, Breadcrumb, banners
│   └── <grupo>/        blocos do app usados por vários domínios (dashboard/, markdown/…)
│                       ui/ NÃO existe: o kit vem do @nomad/ui
├── layouts/            MainLayout (shell com barra + sidebar)
├── api/                client.ts (createHttpClient), generated/ (openapi-ts, nunca editado à mão),
│                       chamadas transversais (busca, stats)
├── lib/                queryClient.ts, errorReporter, authRedirect, utilitários com efeito
├── providers/          providers próprios do app (os de tema vêm do pacote)
├── stores/             Zustand: uiStore, authStore (estado de tela)
├── hooks/              hooks transversais (atalhos, busca global, título da página)
├── config/             endpoints.ts e env (validada com Zod)
├── styles/             globals.css (import do tema do pacote + CSS do app)
├── types/              tipos por domínio que o cliente gerado ainda não cobre
├── utils/              funções puras transversais
├── assets/             ícones e ilustrações
└── test/               setup.ts, utils.tsx (render com providers), e testes por área:
                        components/, hooks/, pages/, services/, security/, *.browser.test.tsx
```

Não usar: FSD (`entities/`, `widgets/`, `shared/`, `ui/`/`model/` por página), `contexts/` solto, `src/shared/nomad-topbar/`.
Mapa de migração do FSD: `entities/<x>/api` → `features/<x>/{api,hooks}`, `pages/<x>/ui` → `features/<x>/pages` +
`features/<x>/components`, `pages/<x>/model` → `features/<x>/lib` ou `hooks/`, `widgets/<x>` → `components/<x>` (ou
`features/<dominio>/components`), `shared/api` → `api/` + `lib/`, `shared/lib` → `lib/` ou `utils/`,
`shared/model` → `stores/`, `shared/ui` → kit do pacote ou `components/`.

Tamanho de arquivo (ESLint `max-lines`, só código): **300 por `.tsx`, 400 por `.ts`**; testes fora. Arquivo maior se
quebra por responsabilidade; exceção só com teto registrado no `eslint.config.js`, que pode encolher e nunca crescer.

## 5. Dados

### Cliente HTTP

```ts
// src/api/client.ts — o único lugar que cria o cliente
import { createHttpClient } from '@nomad/ui/data'
import { API_BASE_URL } from '@/config/endpoints'
import { useAuthStore } from '@/stores/authStore'

export const api = createHttpClient({
  baseURL: API_BASE_URL,
  // 401 da sessão: encerra a sessão local e o RequireAuth manda para /auth/sso
  onUnauthorized: () => useAuthStore.getState().expire(),
})
```

- Sessão por cookie httpOnly (`withCredentials` só para o próprio backend). Token nunca vai para `localStorage`.
- Todo erro chega como `ApiError` (`status`, `message` em pt-BR, `details`, `requestId`, `errorCode` = `body.error`, `body` cru). A tela mostra `message`, nunca o texto cru do axios.
- **401 de credencial não encerra a sessão** (`v1.5.2`): `createHttpClient` distingue `invalid_credentials`, `invalid_password`, `mfa_token_invalid`, `invalid_mfa_code`, `mfa_required` (padrão `defaultIsSessionExpired`) — senha errada no login/MFA não derruba quem está entrando. Backend com outros códigos: passe `isSessionExpired: (e) => …`.
- Com `refreshSession`, um refresh que falha chega ao `onUnauthorized` como `refreshError` (o 401 original continua sendo rejeitado).
- Timeout padrão 10 s; operação longa (upload, importação) passa o próprio `timeout`.

### QueryClient

```ts
// src/lib/queryClient.ts
import { createQueryClient } from '@nomad/ui/data'
export const queryClient = createQueryClient()
// padrões: staleTime 60 s, gcTime 5 min, 1 nova tentativa (nenhuma em 401), sem refetch no foco
```

Ao encerrar a sessão, `queryClient.clear()`: nada da identidade anterior aparece para a próxima.

### Keys, queryOptions e mutations (um arquivo de hooks por entidade)

```ts
// src/features/memories/api/memories.ts
import { z } from 'zod'
import { api } from '@/api/client'

export const MemorySchema = z.object({ id: z.string(), title: z.string(), version: z.number() })
export type Memory = z.infer<typeof MemorySchema>

export const memoriesApi = {
  get: (projectId: string, id: string) =>
    api.get(`/projects/${projectId}/memories/${id}`).then((r) => MemorySchema.parse(r.data)),
  update: (projectId: string, id: string, input: { title: string }) =>
    api
      .patch(`/projects/${projectId}/memories/${id}`, input)
      .then((r) => MemorySchema.parse(r.data)),
}
```

```ts
// src/features/memories/hooks/useMemories.ts
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memoriesApi } from '../api/memories'

export const memoryKeys = {
  all: (projectId: string) => ['projects', projectId, 'memories'] as const,
  detail: (projectId: string, id: string) => [...memoryKeys.all(projectId), 'detail', id] as const,
}

export const memoryQuery = (projectId: string, id: string) =>
  queryOptions({
    queryKey: memoryKeys.detail(projectId, id),
    queryFn: () => memoriesApi.get(projectId, id),
  })

export const useMemory = (projectId: string, id: string) => useQuery(memoryQuery(projectId, id))

export function useUpdateMemory(projectId: string, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { title: string }) => memoriesApi.update(projectId, id, input),
    onSuccess: (memory) => {
      qc.setQueryData(memoryKeys.detail(projectId, id), memory)
      void qc.invalidateQueries({ queryKey: memoryKeys.all(projectId) })
    },
  })
}
```

Regras:

- Key sempre pela fábrica da entidade (nunca `['providers']` solto no componente). Hierárquica: `all` → `list(params)` → `detail(id)`.
- Toda mutation invalida (ou atualiza com `setQueryData`) as keys que mudaram. Nada de `refetch()` manual depois de salvar.
- Lista que troca de filtro usa `placeholderData: keepPreviousData`.
- Onde o backend publica OpenAPI, o `@hey-api/openapi-ts` gera tipos, SDK e `queryOptions` em `src/api/generated/`
  (sobre o `api` acima); não se escreve à mão interface que o gerado já tem, e o CI roda `api:check`.
- Tempo real (WebSocket, SSE): o cliente mora em `src/api/` (ex. `ws.ts`); o hook que assina aplica cada evento no
  cache (`setQueryData` ou `invalidateQueries`). Nada de store paralelo com cópia dos dados.

### Data e hora: sempre com `timeZone`

Toda data que o app **mostra** vai com `timeZone` explícito. Sem ele, o resultado depende da máquina de quem
renderizou — o mesmo dado sai em dia diferente, e em **idioma diferente** conforme o locale do navegador.

```tsx
// ❌ depende da máquina e do navegador
new Date(createdAt).toLocaleDateString('pt-BR')

// ✅ UTC na tabela/dado; 'America/Sao_Paulo' quando o dado é inherently local
new Date(createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
```

**Regra:** dado que vem do servidor é **UTC** e se mostra em UTC. Só se usa zona local quando o próprio dado é local
(nascimento, endereço). **E o `locale` vai explícito junto** — `'pt-BR'` não é o default em navegador en-US.

⚠️ **Por que isso é padrão e não preferência:** medido em 2026-10-02 **por chamada inteira** (não por linha), são
**73 chamadas** `toLocale*`/`Intl.*` sem `timeZone` nos 4 apps — agent-package 25, load-balance 30, motor 11, Conta 7 —
das quais **8 sem argumento nenhum** (`toLocaleDateString()` puro), que é a saída no formato do navegador. O build
passa, o teste passa, e o defeito só aparece na tela de quem tem o browser fora de pt-BR. **Nenhum gate pega isso:** é
dado que sai errado, não código que quebra.

⚠️ **Contar por chamada, não por linha.** `timeZone` pode estar na linha seguinte (`{ day, month, year }` em
multi-linha) e o grep de linha dá falso positivo. Foi assim que os "11" saíram errados: **11 é só do motor.**

### Subpath, não barrel (fora do `main.tsx`)

O barrel `@nomad/ui` reexporta **`ThemeProvider`**, que é **contexto de React**. Quem importa o barrel para pegar
`Button` ou `Toaster` **também puxa o ThemeProvider** — hoje não quebra, mas **a garantia quebra por atualização de
dependência**, sem review de nenhum app (medido em 2026-10-02: `boot-error.tsx` do motor importa o barrel; o revisor
conferiu que só puxa React e store _hoje_).

**Regra:** o barrel é só para **`main.tsx`**, onde o `ThemeProvider` é o que você quer mesmo. **Em qualquer outro arquivo,
importe pelo subpath:**

```tsx
// ✅ tem subpath próprio:
import { TopBar, topBarModelSchema } from '@nomad/ui/topbar'
import { useQueryClient, parseEnv } from '@nomad/ui/data'

// ❌ o kit não tem subpath — Button, Toaster, Modal… só saem pelo barrel,
//    que arrasta ThemeProvider junto:
import { Button, Toaster } from '@nomad/ui'
```

**Subpaths disponíveis hoje:** `@nomad/ui/topbar`, `@nomad/ui/data`, `@nomad/ui/markdown`, `@nomad/ui/theme-boot`.
**O kit (`components/ui`) não tem subpath** — é o furo aberto: enquanto não tiver, `Button`/`Toaster`/`Modal` chegam
pelo barrel, e a garantia de não puxar contexto **não existe para o kit**.

**Fechar o furo exige criar um subpath novo — hoje ele NÃO existe:** `import { Button } from '@nomad/ui/ui'` seria
**erro de módulo**, porque `@nomad/ui/ui` não está no `exports` map do pacote. É uma ideia de empacotamento, não
uma importação que funciona — e criá-la **muda o que os apps recebem**, então é decisão do dono (task `91de99cf`),
não regra do padrão.

**Subpaths que existem hoje (verificado no `exports` map):** `@nomad/ui/topbar`, `@nomad/ui/data`,
`@nomad/ui/markdown`, `@nomad/ui/theme-boot`, `@nomad/ui/tsconfig`, `@nomad/ui/eslint`, `@nomad/ui/prettier`.
O CSS é `@import` direto (`@nomad/ui/theme.css`, `@nomad/ui/topbar.css`).

⚠️ **Quando a garantia quebrar:** um dia o barrel puxa o store inteiro, e um componente que só queria um `Button` passa
a exigir contexto no boot — com o build verde e o teste verde, porque **dependência faltando só aparece em runtime**.
É o mesmo mecanismo do `sonner` fora do lock e do `npm ci` que sai 0 sem instalar: **empacotamento que ninguém confere.**

### Fronteira de import (ESLint, erro)

Só `src/api`, `features/*/api`, as pastas `hooks/` e `src/lib` importam valor da API. Tela e componente usam os hooks.
Import só de tipo e `ApiError`/predicados `is*Error` estão liberados. Também: `components/` não importa `pages/`;
`api/`, `hooks/`, `components/` e `lib/` de uma feature não importam as `pages/` dela.

### Zod nas bordas

| Borda           | Onde                                  | Como                                                                               |
| --------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| Resposta da API | `features/<d>/api/*.ts` (ou o gerado) | `Schema.parse(r.data)`; o tipo sai de `z.infer`                                    |
| Formulário      | `features/<d>/components/<x>Form.ts`  | `safeParse` no submit, mensagens em pt-BR                                          |
| Ambiente        | `src/config/endpoints.ts`             | `z.object({ VITE_API_URL: z.url().optional(), … }).parse(import.meta.env)` no boot |

Mensagens em pt-BR no próprio schema. Os helpers de Zod do `@nomad/ui/data` padronizam o erro de parse como `ApiError`
**(revisar na v1.0.0: nomes)**. A resposta do topbar se valida com o `topBarModelSchema` do pacote (ver §8).

**Zod 3 + zod 4 no mesmo workspace (`v1.6.2`):** os tipos públicos de `parseEnv`/`parseResponse`/`responseParser`/
`fieldErrors` são **estruturais** (`SafeParseSchema<Out>`, `Issue`) e o `.d.ts` do pacote **não importa zod** — então
eles tipam contra o zod que o app tem, seja 3 ou 4. Num workspace com o `be` no zod 3 (fastify-type-provider-zod) e
o `fe` no zod 4, a ponte de tipos que o motor precisou fazer **sai**: importe `parseEnv`/`parseResponse`/`fieldErrors`
de `@nomad/ui/data` direto. `zod@^4` continua peer do pacote (o app usa o próprio schema).

**`topBarModelSchema` nunca lança** (`v1.6.3`): `safeParse` devolve `{ success: false, error }` com issue (contrato
quebrado da Conta cai no seu tratamento de erro, não em `Error` crua); `parse` continua lançando. `apps` é validado
com o shape real, e `href` de link só aceita http(s) ou caminho relativo.

#### A1 — `.catch()` é proibido em schema Zod

**Regra.** `Schema.catch(valor)` transforma qualquer falha de parse no valor: campo ausente, campo renomeado e tipo errado viram todos o valor. Use `.catch()` só em campo **genuinamente opcional** e **estreito** — nunca em número que a tela exibe, nunca no meio do caminho.

Campo opcional de verdade se modela com `.optional()` e `?? valor` no transform: o transform só roda **depois** que o parse passou, então distingue "o servidor não mandou" de "o servidor mandou com outro nome". Com `.catch()`, os dois casos são indistinguíveis.

**Por que.** O `.catch()` é simétrico: tolera o caso antigo e o caso quebrado do mesmo jeito. O schema que existe para pegar renomeação de campo vira o mecanismo que a esconde.

**Teste que pega.** Payload real com o campo renomeado tem que **lançar** (`toThrow`), não devolver o valor de fallback. Sem esse teste, reintroduzir o `.catch()` é uma linha a mais e nada reclama.

#### A2 — o schema do cliente é tão estrito quanto o do servidor

**Regra.** O schema Zod do formulário é a **cópia de leitura** do contrato do servidor. Se a cópia é mais permissiva, a validação do cliente não valida nada: a pessoa preenche o formulário inteiro e só descobre no 400 do servidor.

Use `uuid()` e `datetime()` no cliente quando o servidor usa. `z.string()` cru só para campo que o servidor também trata como string livre. Se o servidor restringe o **esquema** da URL (`http`/`https`), o cliente restringe igual — `z.string().url()` aceita `javascript:`, que não é o mesmo contrato.

**Por que.** Comentário que afirma "mesmo contrato do backend" é uma **asserção**: vale como se fosse testada, porque diverge em silêncio quando o servidor muda.

**Teste que pega.** Tabela de casos por campo (válido, inválido, limite) rodada **contra os dois schemas** — o do cliente e o import do do servidor — falhando se divergirem. Sem ele, "mesmo contrato" é só uma frase.

#### A3 — variável de ambiente que governa segurança não tem default

**Regra.** `z.enum([...]).default(...)` converte **ausente** em **valor**. Em variável de segurança, ausente tem que ser **erro de boot**, não valor. Sem ela, o boot falha com mensagem que **nomeia a variável**.

E o ponto mais importante, que é uma forma e não uma lista: **guard escrito na direção errada não protege.**

```ts
// errado: protege quando é production, falha em silêncio quando não é — e é
// exatamente o caso em que a variável pode faltar
if (env.NODE_ENV === 'production') throw new Error('chave obrigatória')

// certo: nega por omissão, libera explicitamente
if (env.NODE_ENV !== 'test') throw new Error('chave obrigatória')
```

Variáveis de segurança (`NODE_ENV`, flag de recurso, chave, URL pública, CORS): **sem default**. Recurso de desenvolvimento (`devtools`, devtools de dado, rota de diagnóstico, caixa de e-mail): **opt-in explícito** — a ausência desliga, e ligar é ato consciente.

No `@nomad/ui` isso é garantido por `secureEnv` (v1.7.0): `parseEnv(secureEnv(schema, ['VITE_API_URL']), import.meta.env)` lança `EnvError` **nomeando a variável** quando ela não vem na fonte, antes do parse, e mesmo que o schema tenha `.default()` nela. Use-o para toda variável de segurança; flag de recurso (opt-in) fica fora da lista.

**Teste que pega.** Parse da env **sem a variável**, exigindo que lance com mensagem que cite o nome dela. E com a variável ausente, afirmar que a rota de diagnóstico responde 404. A suíte com env completa não pega nada disso.

#### A4 — `dotenv` não sobrescreve a env do processo

**Regra.** `dotenvConfig({ override: true })` faz o `.env` do diretório de trabalho ganhar de toda variável já presente em `process.env`. Use o padrão, **`override: false`**: o `.env` preenche o que não foi definido e a env do orquestrador sempre vence.

E: **`.env.example` comenta a linha sensível** em vez de trazer valor pronto. O exemplo não pode ser o valor perigoso — alguém copia.

**Teste que pega.** `loadDotenvOnce()` num processo com `NODE_ENV=production` na env e `NODE_ENV=development` no `.env`, exigindo que o resultado continue `production`. Sem o teste, reintroduzir `override: true` passa em tudo, porque localmente a env já bate.

#### A5 — teto de tamanho só desce, e contra baseline commitado

**Regra.** `max-lines` valida o arquivo contra um teto. **Teto que mora no mesmo arquivo que a regra não é teto**: quem edita o número edita o gate.

Portanto: **baseline commitado** com os tetos do dia, e o teste exige `atual <= baseline` — assim **subir teto quebra o teste**.

E conte com **o algoritmo que a regra usa** (linhas de código, com `skipBlankLines` e `skipComments`), nunca com `wc -l`. Tetos calibrados no algoritmo errado deixam folga que ninguém vê, ou estouram no primeiro arquivo com muitos comentários.

**Por que.** O teto congelado é o único mecanismo anti-crescimento do código. Se não é verificável, a regra vira "erro de estilo" que se renegocia a cada arquivo movido — que é o que aconteceu nos quatro apps.

**Teste que pega.** O próprio teste de tamanho, com uma leitura a mais: `expect(atual).toBeLessThanOrEqual(baseline)`. E uma checagem de que nenhuma exceção tem folga ociosa — teto muito acima do arquivo é exceção **para remover**, não para manter.

_O `@nomad/ui` ainda não impõe `max-lines` no preset — vale para o pacote no dia em que passar a
impor, com o baseline dele no mesmo release. Enquanto isso o teto é prosa, e prosa não é teto._

#### A6 — `test/` entra no typecheck

**Regra.** `tsconfig.json` com `include: ["src/**/*"]` faz o `tsc` não enxergar nada de `test/`. O teste roda (esbuild transpila sem checar tipo) e nunca é typecheckado.

`include` cobre `src`, `test`/`tests` e os configs. E o typecheck do CI roda **o mesmo `tsc --noEmit` que o dev roda**, senão o gate local e o gate do CI medem coisas diferentes.

**Por que.** Cast em arquivo que o `tsc` não vê é tipo mentiroso sem fiscal: documenta uma mentira que nada pode contestar. Cast em teste é o lugar onde mais se esconde, porque "é só teste".

**Teste que pega.** Script no `typecheck` que roda `tsc --noEmit --listFilesOnly` e **falha se a contagem de arquivos sob `test/` for zero**. O `tsc` sozinho não pega o próprio apagamento.

#### A7 — helper de teste não engole status HTTP

**Regra (helper de teste).** Helper de teste que devolve `{status, body, headers}` sem lançar em 4xx/5xx esconde o erro de quem chama. Quando o resultado é descartado — um `await` sem atribuição, num `describe` de setup — o 404 vira silêncio.

Helper **lança em status >= 400** por padrão, com opção explícita e nomeada (`expectStatus(404)`, `raw: true`) para os testes que **querem** o erro — assim a exceção fica visível no código do teste.

**Regra (asserção frouxa).** `expect.any(Number)` aceita zero, então não afirma nada sobre a coisa que o teste diz ter criado. O equivalente geral: quando a asserção precisa de `any` para passar, ela não está medindo o que o nome promete.

**Por que.** Um `POST` em rota inexistente que engole 404 e passa com `unread: 0` é pior que teste ausente: dá confiança de que algo está coberto quando nada está.

**Teste que pega.** O próprio helper: chamar com status de erro e exigir que lance. E no teste, mutação — remover a checagem tem que derrubar o teste.

### Zustand

Só estado de tela: preferências (tema e paleta ficam no pacote), sidebar, toasts, paleta de comandos aberta, modo de
visão (lista/quadro), atalhos, flag de sessão encerrada. `persist` só para preferências. Seletor sempre
(`useUIStore((s) => s.sidebarState)`). Proibido: copiar resposta do servidor para store, "cache" próprio, store com `fetch`.

## 6. Formulários

- `<form onSubmit>` com botão `type="submit"`; Enter envia. Campo com `Field` do kit (`label` ligado por `htmlFor`,
  `error` ligado por `aria-describedby`).
- Estado controlado no componente (ou num hook `useXForm` da feature); regras no schema Zod ao lado. Sem biblioteca de
  formulário na v1 (o agent-package não usa).
- Submit: `safeParse` → erros por campo → `mutation.mutate`. Botão desabilitado com `isPending`; não fecha o diálogo no meio do envio.
- Erro do servidor em `role="alert"`, com o `ApiError.message` (e `details` quando vier). 409 de versão abre o diálogo de conflito.
- `window.confirm`/`window.prompt` viram `ConfirmDialog`/`PromptDialog`.

## 7. Rotas

- `createBrowserRouter` em `app/routes.tsx`; cada tela é `lazy` com `Suspense`.
- `errorElement` na rota de topo (tela cheia) e numa rota sem path logo abaixo do layout (erro de página cai dentro do shell).
- URLs pelos helpers de `app/paths.ts`; estado que precisa sobreviver ao F5 (filtro, aba, item aberto) vai na query string.
- Telas públicas do SSO (Padrão SSO Nomad v1): `/login` ("Entrar com a Conta Nommand"), `/auth/logged-out`, `/auth/no-access`.
  Tudo o mais passa pelo `RequireAuth`.

## 8. Barra superior

O `Header` do app monta a barra pelo **`TopBarModel`** (Padrão SSO Nomad v1 §10): o backend do app expõe
`GET /api/auth/oidc/topbar` (que repassa o endpoint da Conta), o front valida a resposta com `topBarModelSchema` e passa
o objeto para `<TopBar model={…}>`. Com o model, o pacote monta as 3 peças padrão — seletor de empresa, grade de apps
e menu da conta — mais o menu de Ajuda e o sino de notificações, **sem nenhum item hard-coded pelo app**. O app passa
marca, busca (centro) e ações próprias (Paleta, Busca Ctrl K) nos slots, mais `onSwitchOrg` (troca = `/auth/sso?org=<id>`) e
`onSignOut`. Detalhes do contrato e da tabela model × app: página "Padrão SSO Nomad v1" §10.

Nenhum app chama a Conta pelo navegador. Aceite: captura lado a lado com a Conta, mesma largura, grade de apps e menu da
conta abertos — as três peças têm que ser idênticas, mudando só o tema.

**`launcherLinks` são o rodapé da grade** (`v1.6.2`): links de texto com ícone pequeno numa linha abaixo dos tiles,
com "Gerenciar sua Conta Nommand" no fim — como a Conta mostra, e não como tiles iguais aos apps.

**Links de menu navegam** (`v1.6.3`): item com `href` e sem callback (Gerenciar, `accountLinks`, `helpLinks`) segue o
link no clique normal; o `preventDefault()` só acontece quando o app passou `onSelect`/`onNavigate` (navegação SPA).

## 9. Acessibilidade

- `eslint-plugin-jsx-a11y` ligado; overlays só pelo kit (focus trap, Esc, retorno de foco).
- Teste de teclado dos fluxos principais (Tab, Esc, Enter) com Testing Library + `user-event`.
- `axe` nos testes de tela (jsdom) e **contraste no Chromium** (`*.browser.test.tsx`, `npm run test:a11y`) nas 10 paletas × claro/escuro.
- Nunca cor fixa em componente: use os tokens do tema. Status (`success/warning/error/info`) só para status.
- Atalho de uma tecla só pode ser desligado (WCAG 2.1.4).

## 10. Testes

- Vitest + jsdom; setup em `src/test/setup.ts`; `src/test/utils.tsx` renderiza com QueryClient novo (`retry: false`) e router de memória.
- HTTP falso com `msw` (não mockar o axios à mão).
- O que testar: hooks de dados (keys, invalidação), formulários (validação, erro do servidor), telas (carregando, vazio,
  erro, sucesso), segurança (CSP do `index.html`, HTML sanitizado) e a11y.
- Cobertura com piso por diretório no `vitest.config.ts`: o piso só sobe.

## 11. Gates obrigatórios

Scripts com estes nomes em todo app (o preset do `@nomad/ui` traz as configs):

```json
"typecheck": "tsc --noEmit",
"lint": "eslint .",
"format:check": "prettier --check .",
"cycles": "madge --circular --extensions ts,tsx --ts-config tsconfig.json src",
"test": "vitest run",
"test:coverage": "vitest run --coverage",
"test:a11y": "vitest run -c vitest.a11y.config.ts",
"build": "tsc -p tsconfig.build.json && vite build",
"gates": "npm run typecheck && npm run lint && npm run cycles && npm test && npm run build"
```

| Gate                            | Falha quando                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck`                     | qualquer erro de tipo (app, testes e configs do Vite/Vitest)                                                                                                              |
| `lint`                          | erro: segurança (`no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`), fronteira de dados, `max-lines`. Presets entram como aviso e sobem para erro quando zeram |
| `cycles`                        | qualquer ciclo de import                                                                                                                                                  |
| `test` + cobertura              | teste vermelho ou cobertura abaixo do piso                                                                                                                                |
| `test:a11y`                     | violação do axe (contraste) no Chromium                                                                                                                                   |
| `build`                         | `tsc` do build ou `vite build` falha                                                                                                                                      |
| `api:check` (se usa openapi-ts) | `src/api/generated` diferente do backend                                                                                                                                  |
| `npm audit --audit-level=high`  | vulnerabilidade high/critical                                                                                                                                             |
| `format:check`                  | arquivo fora do Prettier (entra no CI quando o app estiver todo formatado; até lá, lint-staged no pre-commit)                                                             |

**Gate sem CI: roda na mão, e isso é decisão do dono (2026-10-02) — por CUSTO.** Ele não paga GitHub Actions.

> **Teste roda na sandbox. Publicação roda no painel. O GitHub só guarda o código. Actions não existe e não pode ser
> criado.**

⚠️ **"Desligado" é frase de quem planeja religar. Não existe workflow em nenhuma branch** — a pasta `.github/` não
está lá, e a branch que tinha um `gates.yml` foi apagada para não deixar possibilidade. **Não criar, não sugerir, não
religar.** A sequência abaixo é a do gate manual, na ordem, e é a mesma que a task `91de99cf` mediu em **92 s**
(do zero: `npm ci` 24 s · `api:check` · `typecheck` 14 s · `lint` 9 s · `cycles` · `doc:check` 1 s · `test` 20 s ·
`test:a11y` 17 s · `build` 7 s). Node pela `.nvmrc`.

```bash
rm -rf node_modules && npm ci   # a instalação limpa é o passo que o resto não substitui
npm run typecheck && npm run lint && npm run cycles && npm run doc:check \
  && npm test && npm run test:a11y && npm run build
```

⚠️ **A publicação automática NÃO depende do GitHub:** o painel clona e constrói no servidor dele. Por isso apagar os
workflows não quebra deploy — quem confunde "sem CI" com "sem deploy" para por um motivo que não existe.

⚠️ **Por que `npm ci` do zero é o passo que não se negocia:** o `@nomad/ui` ficou ~20 versões com `sonner` no
`package.json` e **fora** do lock, e o gate ficava verde — porque `npm install` "conserta" o lock sem reclamar. Só
instalar do zero acusou. E num app, `npm install` sozinho **é** o que produz o lock que o build vai usar.

⚠️ **O custo de não ter CI automático, e é o que se paga:** um commit quebrando o `dist` só aparece quando **um
consumidor quebra**, e a correção depende de alguém reparar por acaso. **Pior:** com dependência por git, o `npm ci` do app
**sai 0 e não instala a transitiva, em silêncio** (medido: `added 136 packages` onde o lock íntegro instala 941, e o
`@nomad/ui` inteiro ausente). **O build passa e a feature não funciona.** Por isso o `check-lock` (§2b) é a verificação
que pega, e por isso ele precisa **chegar ao app** — desde a `v1.10.0` isso é `scripts` no `files` do pacote, com
`bin` e `exports`; **copiar o arquivo para o app é o que agora é errado** (§2).

## 12. Gate que não existe é gate que não pega

**A regra.** Gate que não roda é decoração: dá a mesma sensação de segurança que um gate que passa, e nenhuma das duas coisas. Três perguntas que separam gate de não-gate:

1. **O script roda o que o nome diz?** `npm run test` na raiz apontando para um workspace só é gate pela metade.
2. **A condição que faz o teste pular está satisfeita no CI?** `skipIf` numa variável que o job não define produz **verde com o teste não rodado**, e ninguém vê.
3. **Um passo de setup que falha derruba os seguintes?** Se eles ficam `skipped` em silêncio, CI vermelho pode significar "nenhum gate rodou", não "código quebrado".
4. **O gate mede a coisa, ou a forma dela?** Gate que exige uma origem http(s) absoluta em `connect-src` reprova a configuração **mais segura** do caso (`'self'`, API na mesma origem). Gate que mede sintaxe em vez de intenção reprova o certo e deixa passar o errado — a mesma classe de "verde que não prova".

**Gate que acusa com mensagem falsa é pior que os dois (v1.9.1).** Gate que reprova algo certo já é desligado; gate que reprova algo certo **e diz por quê errado** manda a pessoa corrigir um bug que não existe. _Sem mutação que reproduza o defeito, a mensagem não pode afirmar que o defeito acontece_ — pode convidar à verificação: _"o lock não declara esta transitiva; confirme com `npm ci` se ela resolve."_

_O caso:_ o `check-lock` acusava 34 dependências que existiam no lock real do AgentPackage, com a mensagem _"o `npm ci` falha"_ — e o `npm ci` passava. Duas causas: **não resolvia aninhamento** (uma dep de `node_modules/@babel/core` resolve primeiro em `…/core/node_modules/<dep>`) e **não resolvia escopo** (em `@babel/core`, subir um nível corta o pacote inteiro, não a última barra). Contra-prova: o lock real do AP tem **870 entradas, 167 aninhadas**, e hoje acusa **0** — com a mutação real (remover uma aninhada) ainda acusando.

**Gate que acusa caso legítimo é pior que gate que não pega (v1.8.10).** Furo é descoberto; falso-positivo é **desligado**. É a única classe de falha de gate em que **o conserto é pior que o defeito**: a equipe vê o gate barrando coisa certa, e a resposta quase sempre é tirar o gate — e aí não sobra nada.

**Regra: nenhum gate novo entra sem contraprova, e a contraprova é uma mutação do caso legítimo — não do defeito imaginado.** Mutação mostra que o gate pega; **só a contraprova mostra que ele é usável**. São coisas diferentes, e publicar só com a primeira entrega metade do gate.

_O caso que establish a regra (2026-10-01, `@nomad/ui`):_ a primeira versão do `check-lock` acusava `@emnapi/*` e `@napi-rs/*` no lock real do pacote — dependências do binário wasm de outra plataforma, que o lock traz **sem entrada** porque é multiplataforma. Publicada assim, o gate reprovaria no registry inteiro. A correção foi respeitar o marcador **`optional: true` que o próprio npm escreve no bloco**, em vez de adivinhar por nome de pacote.

**Os "não" da matriz são parte da regra, não detalhe dela.** A matriz do `check-lock` tem cinco casos; os que **não** acusam — lock íntegro, dependência opcional de plataforma, `peerDependency` ausente — são o que torna o gate utilizável. **Um gate só com mutação é metade do gate.**

_O mesmo erro pelo outro lado, no mesmo dia:_ `SIZE_EXCEPTIONS` subiu 3 vezes no dia em que foi criado (`33065ac1`). **Exceção que sobe sem consequência deixa de ser exceção** — a mesma classe vista pelo outro lado: um limite que ninguém mede não segura nada. Teto que sobe precisa de medição junto, senão vira teto que não mede nada.

**`connect-src` e a origem que não se declara (medido no AgentPack, 2026-10-01).** A pergunta que o gate tem de responder **não é "tem origem absoluta?"**, é **"a API é same-origin?"**:

- **API na mesma origem** (front e API sob o mesmo host, cookie preso à origem que emitiu): `connect-src 'self'` está **certo e é o mais restritivo possível**. Declarar a própria API explicitamente não é mais seguro — é mais largo.
- **API cross-origin** (outro host, issuer externo): a origem **tem** que estar na `connect-src`, e resolver a origem em runtime sem colocá-la na CSP quebra o `fetch` em produção.
- **Origem resolvida em runtime que não entra na CSP** é **falha de boot**, não degradação silenciosa: o `ARG` com default vazio funciona no `docker build` local e só aparece como bloqueio de CSP no primeiro request.

**Regra para os 4 apps:** `connect-src` leva as origens que o app **realmente chama**; same-origin não se declara. E nenhum `ARG` de origem deveria poder ficar vazio em produção sem o build recusar.

**Checklist antes de confiar no seu CI:**

- [ ] Todo script de gate roda **de verdade** no CI, não só local?
- [ ] Cada job roda **todas** as partes do pacote, e o nome do job diz qual?
- [ ] As condições de `skip`/`skipIf`: a variável exigida **está no `env:` do job**?
- [ ] O job **falha** quando um passo de setup cai, ou os seguintes ficam `skipped`?
- [ ] O `test/` está no `include` do `tsconfig`, e o typecheck do CI é o mesmo do dev?
- [ ] O `test` roda **as duas metades do pacote** (frontend e backend), não só o frontend? Sem isso a regra
      "helper de teste não engole status" não se sustenta: helper que engole erro só aparece quando os testes
      que dependem dele rodam.
- [ ] Existe `docker build`, `docker run` e smoke test no CI, fora do compose?
- [ ] O `HEALTHCHECK` é exercitado **fora** do compose (que sobrescreve o da imagem)?
- [ ] O número de testes **executados** é visível no log, e é comparável com o esperado?

**Os casos concretos** ficam em `docs/auditoria-apps.md`, por app, porque envelhecem com cada app.

## 13. Checklist de migração de um app

1. Instalar `@nomad/ui` (v1.6.3 ou acima) e os peers; trocar o tema (`@import '@nomad/ui/theme.css'`, providers e boot do pacote).
2. Trocar a barra pelo `@nomad/ui/topbar` com `model={…}` (validado com `topBarModelSchema`); apagar `src/shared/nomad-topbar/` e `scripts/sync-nomad-topbar.sh`.
3. Trocar o kit local pelo do pacote e apagar `src/components/ui/` (e Astryx/StyleX, se houver).
4. Trocar cliente HTTP e QueryClient pelas fábricas do `@nomad/ui/data`.
5. Presets de tsconfig, ESLint e Prettier; subir Vite/TS/Node para as versões da seção 2.
6. Reorganizar pastas (seção 4) e aplicar as regras de dados (seção 5).
7. Gates e CI (seção 11).

A lista por app, com tamanho, está em [auditoria-apps.md](./auditoria-apps.md).
