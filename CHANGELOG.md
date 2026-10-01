# Changelog

Todas as mudanças do `@nomad/ui`. Versões por tag semver na `main` (`vX.Y.Z`); os apps instalam por
dependência git numa tag. Tag publicada nunca é movida nem apagada: correção sai em versão nova.

## [1.8.4] — 2026-10-01

Patch (`[NUI] c5b28768`). Correção de uma afirmação errada no CHANGELOG da v1.8.2 e de um furo no `check-lock` — ambos sobre a mesma coisa: **lock e protocolo de git**.

### Corrigido

- **`check-lock` passa a pegar o atalho `github: dono/repo#ref`** (e `gitlab:`, `bitbucket:`) no `package.json`. Ele só checava `resolved` em `git+ssh`, e o atalho **parece inocente** — mas o `npm install` o reescreve para ssh no lock. Medido:
  ```
  "is-number": "github:jonschlinkert/is-number#master"
  → resolved: git+ssh://git@github.com/jonschlinkert/is-number.git#98e8ff1
  ```
  É a 7ª ocorrência do mesmo defeito no loadbalance, e nenhuma delas apareceu pelo olho. Pega na fonte, com a instrução de usar `git+https://`.
- **Dependência de git legítima deixou de ser acusada.** `git+https://…#master` caía na comparação de semver, porque a "versão" de uma dep de git no lock é o commit, não uma versão.

### Correção de texto (o que a v1.8.2 falou de mais)

A v1.8.2 disse: _"rodar `npm ci` com o lock antigo do `@nomad/ui` era IMPOSSÍVEL"_. **Só vale para o repositório do pacote.** Medido como consumidor:

```
npm install --package-lock-only   # OK
npm ci                            # OK, exit 0
```

Quando o pacote vem por git, o npm resolve as dependências lendo o `package.json` **dele** — o `package-lock.json` do pacote não entra na conta. **O `npm ci` do consumidor não valida o lock do fornecedor**, então o `EUSAGE` nunca chegava ao build de nenhum app. Quem publica a dependência de git é a única parte que pode pegar lock fora de sincronia, e é onde o `check-lock` está.

### Testes

Mutações: o atalho `github:` é acusado; `git+ssh` no `resolved` continua sendo; `git+https://` legítimo passa (contraprova). Gates: 185/185 + 242/242 + `doc:check` + build, exit 0.

## [1.8.3] — 2026-10-01

Patch (`[NUI] eee72d81`). **O gate local não provava que o pacote instala** — e é o pacote que os 4 apps consomem por git.

### Corrigido

- **`test:a11y` (242 testes, axe) entra no `gates`.** Rodava só quando alguém lembrava — ou seja, quase nunca por acidente. Hoje o gate é typecheck + lint + `doc:check` + 185 testes + **242 de a11y** + build.
- **`gates:ci` novo: `npm ci` do zero antes dos gates.** `gates` roda sobre o `node_modules` que já está instalado; `gates:ci` apaga tudo e reinstala. É a diferença entre "o lock está certo" (o que o `check-lock` confere) e "o pacote instala" (o que só o `npm ci` prova). O `sonner` passou ~20 versões sem entrar no lock com `gates` verde o tempo todo — o defeito só apareceu quando alguém instalou do zero, que é o que todo consumidor faz.

### Verificação

- **Mutações:** tirar o `sonner` do lock faz o `gates:ci` reprovar no passo do `npm ci` (EUSAGE, exit 1); o `gates` sozinho pegaria pelo `check-lock`, mas não pelo install.
- `npm run gates:ci` do zero: **exit 0 em 233 s** (Node 22, linux-x64) — `npm ci` + typecheck + lint + `doc:check` + 185/185 + **242/242** + build.
- README: a seção de desenvolvimento agora diz qual gate usar e quando.

## [1.8.2] — 2026-10-01

Patch (`[NUI] 58551c13`). **Este pacote não instalava com `npm ci`.** Corrigido, e a verificação que impede a volta entra no gate.

### Corrigido

- **`sonner` estava no `package.json` desde a v1.3.0 e nunca entrou no `package-lock.json`.** O `npm ci` falha com `EUSAGE: package.json and package-lock.json are not in sync` — o pacote, como dependência git dos 4 apps, quebrava o build de quem consome. E aqui é pior que acidental: `sonner` é importada por `Toaster` e `useToast`, dois componentes publicados, então o lock quebrado entrega um pacote sem a dependência do toast.
  - Por que ninguém viu: o fluxo do dia a dia é `npm install`, que "conserta" o lock sem reclamar. O pacote instalava, os 185 testes passavam, e a divergência só aparecia como `EUSAGE` no runner de quem consome. Varredura dos 40 deps da raiz: `sonner` era o único fora.
  - O lock foi regenerado inteiro (`rm -rf node_modules package-lock.json && npm install`). Além do `sonner`, 31 entradas duplicadas de `@typescript-eslint` saíram (dedupe, mesmas versões) e 46 pacotes subiram de patch/minor dentro do range — nenhuma versão saiu do range declarado.

### Adicionado

- **`check-lock.mjs`, no `doc:check` (e portanto no `gates`):** confere que (1) toda `dependencies`/`devDependencies` está no lock, (2) a raiz do lock bate com o `package.json`, (3) a versão que o lock **instala** satisfaz o range pedido, (4) não sobrou dependência órfã na raiz do lock, (5) nenhum `resolved` em `git+ssh` (que passa na máquina do dono e quebra no CI), e (6) o lock não está truncado. Sem dependência nova: o range é conferido por uma função própria.
  - **O caso (3) cobre um furo que o `npm ci` não acusa:** medir com a raiz do lock em `^3.0.0` e o `package.json` em `^4` **passa** no `npm ci` — ele instala o que a raiz do lock diz, não o que o app pediu. O check pega.
  - **Mutação verificada:** tirar o `sonner` do lock reprova o `doc:check` com o erro nomeando o pacote; com o lock certo passa.

### Para os apps

Nenhuma mudança de API ou de contrato — é empacotamento. Mas quem regenerate o lock a partir deste tag passa a ter o `sonner` resolvido, e **rodar `npm ci` com o lock antigo do `@nomad/ui` era IMPOSSÍVEL** (o lock era do próprio pacote). Se o build de algum app falhou com `EUSAGE` depois do bump, era isto.

## [1.8.1] — 2026-10-01

Patch (`[NUI] 99d5f54d`, achado do revisor independente). Completa a rede de segurança da v1.8.0 para os **dois** campos que faltavam, e conserta dois testes que passavam pelo motivo errado.

### Corrigido

- **`model.organization` e `model.organizations` também não derrubam mais a barra.** Mesmo defeito, mesma classe de crash da v1.8.0: `organization` ausente dava `TypeError: Cannot read properties of undefined (reading 'id')` e `organizations` ausente dava `(reading 'length')` — nos dois, a barra inteira sumia. Já o `apps` era尔顿de parado (`AppSwitcher` faz `apps ?? []`), o que deixava o trio inconsistente. Agora o seletor de empresa simplesmente não aparece quando não há empresa ativa, e a barra segue de pé.
- **Rótulo acessível da conta não fica mais vazio.** Sem `profile.name` o gatilho renderizava `aria-label="Conta de "` (espaço no fim) — leitor de tela não anunciava nada. Passa a "Conta de usuário".

### Testes

- `topBarModelDegrade.test.tsx` reescrito: 8 casos (era 4).
- **Dois testes eram vacuous e agora mordem.** O painel da conta nasce fechado, então `queryByRole('link', {name:/Gerenciar/i})` dava `null` **também com o `model` válido** — os dois casos passavam pelo motivo errado. Passam a abrir o painel com `userEvent.click` e a procurar com `within(panel)`; o caso "com `account` completo" é a contraprova (o item EXISTE), sem a qual o outro não prova nada.
- Cobertura por `it.each` para `organization`, `organizations` e `apps`, mais "sem `organizations` não mostra Trocar de empresa" e o rótulo acessível.
- **Mutações verificadas:** reverter o guard de `account` derruba 1 dos 8; reverter o de `organization`/`organizations` derruba **3 dos 8**.
- Vitest 185/185 em 27 arquivos, `test:a11y` 242/242, typecheck, lint, `doc:check`, build — tudo verde.

## [1.8.0] — 2026-10-01

Patch de correção (`[LB] [TOPBAR-PARITY-03]` `6be96af1`, `[NUI] 99d5f54d`). Um `model` incompleto derrubava **a barra inteira** por exceção no render — o sintoma no app é "a barra some", e foi diagnosticado como "conflito de slots".

### Corrigido

- **`<TopBar model>` não some mais por `model` incompleto.** O `TopBarModelBar` desreferenciava `model.account.manageAccountHref` sem guard. Quando o app passa o JSON do backend no shape legado (`profile` + `accountUrl`, **sem** `account` — o que `GET /api/oidc/topbar` devolveu até a Conta completar o repasse), o acesso é `undefined` e a `TypeError` derruba a subárvore: em React, exceção no render leva a peça **e a moldura** embora. Agora a peça da conta **degrada** (menu sem "Gerenciar", avatar genérico) e o resto da barra — empresa, apps, ajuda, sino — fica de pé.

  O contrato **não mudou**: `account` continua obrigatório no `TopBarModel` e `topBarModelSchema` continua exigindo `manageAccountHref`. Isto é rede de segurança do _render_, não validação — **o app continua devendo validar a resposta do backend com `topBarModelSchema` antes de passar para a barra**. Sem isso a barra aparece degradada em vez de aparecer errada, que é o objetivo; o defeito de contrato do backend segue de pé.

  Sem `manageAccountHref` não há item "Gerenciar" (é um link, não uma ação) e o rodapé da grade não o renderiza — coerente com o resto.

### Sem mudança de contrato

- **O `.d.ts` do `TopBar` continua correto** ao dizer que `org`, `apps` e `account` são ignorados quando `model` vem. A hipótese de que o pacote ignorasse a peça errada **não se reproduz**: com `model` + qualquer slot, a barra renderiza as 3 peças normalmente. Quem esvaziou a barra foi o crash acima. Teste novo fixa esse comportamento para não ser redescoberto como bug.

### Testes

- `topBarModelDegrade.test.tsx` (novo, 4 casos): slots ignorados com `model`; `model` legado cru não derruba a barra; "Gerenciar" some sem href; `model` completo inalterado. **Mutação verificada**: voltar ao desreferenciamento sem guard derruba 2 dos 4.
- Vitest 181/181 em 26 arquivos (era 177/177), typecheck, lint, `doc:check`, build — tudo verde.

### Para os apps

Quem usava `<TopBar>` com slots manuais e agora passa `model` **não precisa mais montar duas barras** para o fallback de Conta fora do ar: passar `model` e os slots juntos funciona (o `model` vence), e se o `model` vier incompleto a barra degrada em vez de sumir. Quem quiser seguir pela sessão local no 502 monta as peças à mão com `<TopBarModelBar>`.

## [1.7.0] — 2026-10-01

Minor aditivo (`[NUI] 269f8dd4`, trava do padrão de env). A auditoria de segurança de 2026-10-01 encontrou o padrão "variável de ambiente que governa segurança não tem default" em três apps (flag de dev ligada por omissão, guard que dependia da variável que deveria proteger). O `@nomad/ui` **não tinha** o defeito (não lê env por conta própria — o `parseEnv` recebe a fonte do app), mas não tinha trava, e é consumido por quatro apps: um default permissivo novo aqui vale nos quatro.

### Adicionado

- **`secureEnv(schema, required)`** (`@nomad/ui/data`): declara quais variáveis o app **promete** fornecer, junto com o schema. O `parseEnv` checa a lista **antes** do parse: variável declarada e ausente na fonte lança `EnvError` **nomeando a variável**, mesmo que o schema tenha `.default()` nela — que é justamente o default permissivo que a auditoria encontrou. A lista mora junto do schema para não poder divergir dele (declarar em uma chamada e esquecer em outra é como o bypass entrou). Variável que não governa segurança (flag de recurso, porta de diagnóstico) fica fora da lista e pode ter default.
- **`parseEnv` aceita o resultado de `secureEnv`**; sem ele, o comportamento é **idêntico** ao anterior (compat com os quatro apps). A detecção do wrapper é explícita (`schema` tem `safeParse`), não por ter a propriedade `required` — que um `z.object()` também tem.
- Tipos `SecureEnvSchema`, `SafeParseSchema` e `Issue` exportados de `@nomad/ui/data`.

### Corrigido

- **O exemplo do JSDoc de `parseEnv` (`data/zod.ts`) não ensina mais default permissivo.** Mostrava `VITE_API_URL: z.url().default(...)` — exemplo é especificação, e foi copiado para `.env` de três apps. Agora mostra a variável de segurança sem default e a flag de recurso com default, com uma linha explicando a regra.

### Testes

- `zod.test.ts`: 7 testes novos — fonte incompleta lança `EnvError` nomeando a variável; **o default permissivo no schema não segura a variável declarada** (o teste que trava o padrão); fonte `undefined`/`null` também falha; string vazia conta como ausente; fonte completa valida e o default da flag continua valendo; mais de uma ausente nomeia todas; e `parseEnv` sem `secureEnv` não muda de comportamento. **Mutação verificada**: remover a trava derruba 6 testes; restaurada, 13 passam.
- Vitest 177/177 (era 170/170), test:a11y 220/220, typecheck, lint, `doc:check`, build — tudo verde.

### Para os apps

```ts
import { parseEnv, secureEnv } from '@nomad/ui/data'
export const env = parseEnv(
  secureEnv(
    z.object({ VITE_API_URL: z.url(), VITE_FEATURE_X: z.stringbool().default(false) }),
    ['VITE_API_URL'], // o que o app promete fornecer
  ),
  import.meta.env,
)
```

## [1.6.3] — 2026-10-01

Patch (PKG-FIXES `4fa8bd30`, achados do revisor independente do `@nomad/ui` — escopo v1.1.2→v1.6.2). Aditivo: nada quebra.

### Corrigido

- **Item de menu com `href` e sem callback voltou a navegar** (regressão introduzida na v1.6.0, `src/topbar/shared.tsx`). Ao adicionar `MenuItemSpec.onNavigate`, o `preventDefault()` passou a ser incondicional: "Gerenciar sua Conta Nommand", **todo** `accountLinks` e **todo** `helpLinks` ficavam com o clique prevenido e sem função — inclusive no caminho legado do `AccountMenu` (apps que montam a barra pelos slots antigos). Agora o `preventDefault()` só acontece quando há ação a executar (`onSelect ?? onNavigate`). **Sem mudança de código no app** para consumir.
- **`topBarModelSchema.safeParse()` não lança mais.** O `.transform()` fazia `throw` quando faltava `account.manageAccountHref`; quem segue o padrão do README (`safeParse` + `if (!r.success)`) não entrava no `if` e recebia `Error` crua, sem o tratamento desenhado. Agora a falha vira issue do Zod (`ctx.addIssue` + `z.NEVER`) e `safeParse` devolve `{ success: false }` como promete.
- **`apps` é validado no schema.** Era `z.array(z.unknown())` + cast `as LauncherApp[]`: `apps=[null]`, `['x']`, `[{}]`, `[123]`, `[{id:'a'}]` passavam com `success=true` e só quebravam em runtime no `AppGrid`. Novo `launcherAppSchema` (`id`, `slug`, `name`, `launchUrl` obrigatórios; `iconUrl`/`description` nullables; campos extras da Conta tolerados).

### Adicionado

- **`href` dos links do topbar só http(s) ou caminho relativo.** `barLinkSchema` rejeita `javascript:`, `data:`, `vbscript:` e `//host` (protocol-relative); `launchHref` devolve `""` para esquema não-http (antes o `new URL()` aceitava e o payload sobrevivia no `href` da tile). Não é XSS (React escapa, `rel="noopener noreferrer"` presente), era open-redirect/navegação a host arbitrário se a URL viesse adulterada.
- **`theme={null}` esconde o item "Tema"** do menu da conta (`undefined`/omitido continua seguindo o store do pacote). Antes a documentação dizia que omitir escondia, mas `undefined` caía no store e não havia como apagar o item pela API pública.
- **`BarLinkJson` e `launcherAppSchema` no barrel público** de `@nomad/ui/topbar` — o app tinha o tipo documentado (`BarLinkJson`) sem conseguir importá-lo, e não tinha como validar um array de `apps`.

### Corrigido (menor)

- **`organize="trailing"` não renderiza mais `actions` duas vezes** (era `{actions}` fora + dentro de `<Actions>`; o botão de paleta/busca do app aparecia duplicado, com `id` repetido). O ramo `bar` estava certo.

### Testes

- `menuNavigation.test.tsx` (novo, 4): item com `href` **sem** callback não tem o clique prevenido ("Gerenciar" via `TopBar model`, `accountLinks`, `helpLinks`, caminho legado) e item **com** `onSelect` tem o clique prevenido e executa a ação. **Mutação verificada**: voltar ao `preventDefault()` incondicional da v1.6.0 derruba os 3 testes de navegação.
- `topBarModelStrict.test.ts` (novo, 10): `safeParse` não lança e devolve issue em `account.manageAccountHref`; `parse` continua lançando; `apps` inválidos (`[null]`, `['x']`, `[{}]`, `[123]`, `[{id}]`, `launchUrl: ''`) rejeitados; app completo e com campos extras aceitos. **Mutação verificada**: voltar ao `throw`/`z.unknown()` derruba os testes.
- `modelBarPolish.test.tsx` (novo, 6): `href` não-http rejeitado no schema e `launchHref` devolvendo `""`; `theme={null}` esconde o item; `theme="dark"` mostra "Tema · Escuro"; `actions` uma vez só no `trailing`; `BarLinkJson` importável.
- Vitest 170/170 (era 150/150), test:a11y 242/242, typecheck (raiz + vitrine) ✓, eslint ✓, build + showcase:build ✓.

### Ressalva do revisor — verificada, não é bug

O revisor apontou que sobrou `import { z } from 'zod'` em `dist/types/topbar/topBarModel.d.ts` (usa `z.ZodPipe`/`z.core.$strip`) e que isso reproduziria o TS2345 em workspace com zod 3 na raiz. **Verificado em consumidor de teste** (zod 3.25.76 hoisted na raiz, zod 4.6.5 no `fe`, `skipLibCheck: false`, importando `topBarModelSchema`/`TopBarModel` de `@nomad/ui/topbar`): **0 erros**. Diferente de `data/zod.ts` (que _expunha_ a superfície Zod como tipo genérico), aqui `topBarModelSchema` **é** um schema Zod — referenciá-lo no `.d.ts` é honesto e não amarra a versão do consumidor. Mantido como está; a regra continua: `@nomad/ui/data` não expõe tipos de zod, `@nomad/ui/topbar` expõe o schema (que o app usa no `parse`/`safeParse`).

## [1.6.2] — 2026-10-01

Patch (PKG-FIXES `25d586a6`, reportado pela `[MOTOR] NUI-MIG-03b` `e18a625e` na validação da barra). Aditivo: nada quebra.

### Corrigido

- **`launcherLinks` é RODAPÉ da grade, não tile.** `TopBarModelBar` mapeava `launcherLinks` para `AppTile` e jogava no mesmo grid dos apps — "Todos os aplicativos" e "Status dos serviços" apareciam como apps (ícone + nome, mesma tile). Na Conta são **links de rodapé**; o próprio cabeçalho do arquivo documentava "rodapé", o código não criava. Agora são links com ícone pequeno numa linha abaixo do grid, com "Gerenciar sua Conta Nommand" no fim (à direita) — igual à Conta. CSS novo: `.ntb-foot-links`, `.ntb-foot-link`, `.ntb-foot-link__icon`, `.ntb-foot-link--manage` (fonte 12 px, um tamanho abaixo do rótulo do tile). `launcherLinks` com `newTab: false` seguem na mesma aba; os outros abrem em aba nova.
- **A superfície Zod do pacote não amarra a versão do zod do consumidor.** `parseEnv`, `parseResponse`, `responseParser`, `fieldErrors`, `formatIssues` e os tipos de issue usavam `z.ZodType`, `z.output<S>`, `z.ZodError` e `z.core.$ZodIssue`: o `.d.ts` era resolvido contra a cópia de `zod` que o app tinha. Em workspace com **zod 3 na raiz** (o `be` do motor precisa do 3.25.76 por causa do `fastify-type-provider-zod`) e **zod 4 no `fe`**, o typecheck do `fe` quebrava (TS2345), embora em runtime só se usar `safeParse` (igual no 3 e no 4). Agora os tipos públicos são estruturais — `SafeParseSchema<Out>` (só `safeParse`), `Issue` (`path`, `message` + opcionais) — e **nenhum tipo de zod entra no `.d.ts`** (verificado: o `dist/types/data/zod.d.ts` gerado não tem `import … from 'zod'`). O schema do zod 3 também satisfaz `SafeParseSchema`, então a ponte de tipos que o motor precisou fazer (`fe/src/lib/zod/parse.ts`) **sai**. `zod@^4` continua peer do pacote (o app continua usando o próprio schema); o que mudou é o `.d.ts`. Tipos novos exportados: `SafeParseSchema`, `Issue`.

### Testes

- `topbarModel.test.tsx`: o teste da grade passou a afirmar que o grid tem **só os apps** e que `launcherLinks` estão em `.ntb-foot-links` (na ordem, com "Gerenciar" no fim e `target="_blank"`).
- `topbar.browser.test.tsx` (novo bloco, 22 testes = 11 paletas × claro/escuro): com o `topbar.css` do pacote no Chromium — grid só com apps; rodapé com os 3 links; **geometria**: o rodapé está abaixo do grid (`foot.top > grid.bottom`) e com fonte menor que a dos tiles; axe sem violações. Vitest 150/150, test:a11y 242/242.
- Prova do zod (fora da suíte, na hora do release): workspace de teste com `zod 3.25.76` hoisted na raiz e `zod 4.6.5` no `fe`, `skipLibCheck: false`. Contra a **v1.6.1**: TS2345 (o `.d.ts` tinha `import … from 'zod'`). Contra esta: **0 erros**, e o schema zod-4 do app satisfaz `SafeParseSchema`.

### Consumidores

A barra dos 4 apps: nada a mudar no código (o `model` é o mesmo) — os `launcherLinks` passam a parecer com os da Conta sem trocar nada. O **motor** pode remover a ponte `fe/src/lib/zod/parse.ts` e apontar para `@nomad/ui/data` direto; `parseEnv`/`parseResponse`/`fieldErrors` tipam contra o zod do `fe`.

## [1.6.1] — 2026-09-30

Patch aditivo (PKG-FIXES `679ca2d8`, gap reportado pela `[MOTOR] [UI-FIX-MIG03] cd8ec6e4`).

### Corrigido

- **`<Kbd symbol>` renderiza glifo Unicode (⌘, ⇧, ⌥, ↻, ⏎, ⌫) sem a "caixa vazia" (▯).** O `Kbd` tinha `font-mono` fixo e a regra base do `globals.css` (`code, pre, kbd, samp { font-family: var(--font-mono) }`, seletor de elemento) forçava a fonte de mono em TODO `kbd`. Nenhuma das fontes de mono do tema (JetBrains Mono, Fira Code) tem o glifo ⌘/⇧/⌥, então o navegador desenhava ▯ — apareceu como "▯K comandos" na barra. Com `symbol`, a peça usa a fonte de texto (`font-sans`, que cai no system-ui com esses glifos) e marca `data-kbd-symbol`; o `globals.css` ganha `kbd[data-kbd-symbol] { font-family: var(--font-sans) }` (seletor de atributo vence o de elemento). Default inalterado: sem `symbol`, segue mono.
- **`Header` do pacote**: o atalho "Buscar ou ir para…" passou a usar `<Kbd symbol>` em vez de um `<kbd>` cru com `font-mono` (o ▯K da barra).

### Adicionado

- **`Kbd.symbol?`** (bool) e **`Kbd.mono?`** (`mono` sem `symbol` não muda nada; `symbol mono` força mono). Tipo `KbdProps` exportado. Nada quebra: prop nova, default igual ao comportamento de hoje.

### Testes

- `kbd.test.tsx` (novo, 8 testes, jsdom): mono por padrão; `symbol` → `font-sans` + `data-kbd-symbol`; cada modificador (⌘ ⇧ ⌥ ⌃ ↻ ⏎ ⌫); `mono` não reverte `symbol`; `className` do app entra; o `Header` usa `Kbd symbol`; axe.
- `kbd.browser.test.tsx` (novo, 22 testes, Chromium × 11 paletas × claro/escuro): a **fonte computada** de `kbd[data-kbd-symbol]` não é a de mono em nenhum caso, o `kbd` de letra continua em JetBrains Mono, e o contraste da cápsula passa no axe.
- Vitest 150/150 (era 142/142), test:a11y 220/220 (era 198/198).

### Consumidores

Os 4 apps: trocar `<Kbd>⌘K</Kbd>` por `<Kbd symbol>⌘K</Kbd>` (ou o `kbd` cru pelo `Kbd symbol`) e **tirar o contorno `font-sans` no app** (motor: CommandBar e o `↻` da lista de conversas).

### Nota (lock em workspace)

Bump em monorepo/workspace: o `package-lock.json` da **raiz** manda. Editar a tag só no `package.json` do pacote (ex.: `motor/fe`) não instala nada enquanto a entrada da raiz continuar pinada — aconteceu com o motor em 2026-09-30 (pediu 1.5.1, ficou na 1.4.1). Atualize os dois locks e confira `require('@nomad/ui/package.json').version` (README, seção "Instalação e consumo por tag").

## [1.6.0] — 2026-09-30

Minor aditivo (`[NUI] [TOPBAR-PARITY-01]` `904e24cf`, parte 2). A barra Nomad passa a ser renderizada INTEIRA a partir do `TopBarModel` (v1.5.0), sem item hard-coded por app — fecha a divergência de conteúdo entre os 4 apps apontada na validação da `[LB] NUI-MIG-02`. Quem já monta as peças componente por componente (slots `org`/`apps`/`account`) continua funcionando igual.

### Adicionado

- **`<TopBar model={…}>`**: com o model, o `TopBar` monta as 3 peças padrão (seletor de empresa, grade de apps, menu da conta) + menu de ajuda (`helpLinks`) + sino de notificações (`notifications`). Marca, busca e ações do app continuam nos slots. Novas props: `model`, `onSwitchOrg`, `onSignOut`, `currentAppSlug`, `onNotificationsClick`, `showNotifications`, `topBarLabels`, `topBarWidths`.
- **`TopBarModelBar`**: só o conteúdo das peças (sem a moldura) para quem monta o cabeçalho do próprio jeito; `organize="bar" | "trailing"`, `inlinePanels` para a vitrine.
- **`NotificationsButton` + `notificationsLabel`**: sino da Conta com contador (`unread > 99` → "99+"; `unread: 0` sem pastilha), nome acessível "Notificações, N não lidas"; link para `notifications.href` com `onSelect` opcional (SPA). CSS: `.ntb-notif-btn` / `.ntb-notif-badge`.
- **`TopBarModelBarBar.notifications` no contrato**: `TopBarNotifications { unread: number, href: string }` + `topBarNotificationsSchema` (obrigatório antes do transform, opcional no app). `createOrgLabel?` (rótulo de "Criar empresa").
- **`NommandMark` + `TopBarModelBrand`**: a marca Nommand (SVG com `--mark-bg`/`--mark-on`) no pacote — o app não precisa manter o SVG. `TopBarBrand` ganha `showName` (só o logo) e `className`.
- **Barra pelo model**: Ajuda (menu `helpLinks`), item "Tema · Escuro/Claro/Sistema" no menu da conta (alterna o tema do `ThemeProvider` do pacote), "Criar empresa" no seletor de empresa (`createOrgUrl`, nova aba), "Gerenciar sua Conta Nommand" como primeiro item do menu, `launcherLinks` como tiles na grade.
- **`MenuItemSpec.onNavigate`**: item de menu com `href` que executa uma ação em vez de seguir o link (navegação SPA; ⌘/Ctrl+clique segue o link).
- **`AccountMenu.onSignOut` opcional**: sem callback o item "Sair" não aparece (barra anônima); `triggerLabel` customizável.
- **README**: seção "Instalação e consumo por tag" — bump de tag com dependência git (o `package-lock` prende o commit resolvido: reinstalar com `npm install @nomad/ui@git+https://…#vX.Y.Z` e conferir `node -p "require('@nomad/ui/package.json').version"`), URL `git+https://` completa em vez do atalho `github:` (o atalho resolve por ssh e quebra `npm ci` em Docker sem chave). Seção "Renderizar a barra a partir do model" no README do topbar com a tabela model × app.
- **Vitrine**: a seção "Barra Nomad" passou a mostrar `<TopBar model>` com um `TopBarModel` de exemplo completo (4 apps, 3 empresas, conta, launcherLinks, accountLinks, helpLinks, notificações), o JSON do model e o model legado da v1.0.x.

### Corrigido

- **`MenuItems` sem `div` intermediária** (axe `aria-required-children`): os itens `menuitem` do menu da conta são filhos diretos do painel `role="menu"`.
- **`roleLabel`** aceita o papel já em PT-BR (`"Proprietário"` → "Proprietário") além de `owner`/`admin`/`member`, e conhece `viewer`/`billing`/`readonly`.
- **`isPlainClick`** trata evento sintético sem `button` (Playwright/testing-library) como clique normal.

### Testes

- `topbarModel.test.tsx` (novo, 16 testes): as 3 peças a partir do mesmo model (empresa com papel/empresa sem acesso/"Criar empresa", grade com `?org=&next=/` + `launcherLinks` + rodapé, menu da conta na ordem do §10), ajuda, notificações (contador, 0, 99+, SPA), item de Tema (store + callback), ordem §10 com busca/ações, axe com a barra e os painéis abertos, `<TopBar>` sem `model` inalterado, model legado, `onSignOut` opcional, `onSwitchOrg` opcional.
- Vitest 142/142 (era 127/127 na 1.5.2), test:a11y 198/198.

### Consumidores

`[CONTA] [TOPBAR-PARITY-02]` entrega o model completo; adoção nos apps nas tasks `[LB] NUI-MIG-02b` `76a8741a`, `[AP] NUI-MIG-04b` `3807aab1`, `[MOTOR] NUI-MIG-03b`.

## [1.5.2] — 2026-09-30

Patch (PKG-FIXES #6 e #7, reportados pela `[CONTA] CONTA-MIG-02` `1aa3522b`). Aditivo: nenhuma chamada existente quebra.

### Corrigido

- **`@nomad/ui/topbar` volta a exportar o contrato canônico** (PKG-FIXES #6). O barrel `src/topbar/index.ts` não re-exportava `./topBarModel`, então `import { topBarModelSchema } from '@nomad/ui/topbar'` vinha **undefined** e os apps não conseguiam validar a resposta da Conta. Exporta agora `topBarModelSchema` e os tipos `TopBarModel`, `TopBarModelInput`, `TopBarProfile`, `TopBarAccount`, `TopBarAccountOrg`, `TopBarOrgOption`, `BarLink`, mais os schemas auxiliares (`barLinkSchema`, `topBarProfileSchema`, `topBarAccountSchema`, `topBarAccountOrgSchema`, `topBarOrgOptionSchema`).
- **401 de credencial recusada não derruba mais a pessoa** (PKG-FIXES #7). `createHttpClient` tratava QUALQUER 401 com o token atual como "sessão vencida": um `401 { error: 'invalid_credentials' }` de `POST /auth/login` (senha errada no MFA disable) disparava `refreshSession` + `onUnauthorized` e deslogava quem estava tentando entrar.

### Adicionado

- **`HttpClientOptions.isSessionExpired?(error)`**: decide se um 401 é sessão vencida. Padrão (`defaultIsSessionExpired`, exportado): 401 cujo `body.error` não está em `{ invalid_credentials, invalid_password, mfa_token_invalid, invalid_mfa_code, mfa_required }`. Passe a sua se o backend usar outros códigos de credencial.
- **`UnauthorizedContext.refreshError?`**: o que o `refreshSession` lançou quando o auto-refresh foi tentado e falhou. Antes o `catch` engolia o erro e o `onUnauthorized` só recebia o 401; agora o app sabe se o refresh foi recusado pelo IdP ou se a rede caiu. `undefined` quando não houve refresh.

### Testes

- `publicExports.test.ts` (novo): importa pelo barrel público e confere que `topBarModelSchema` e os schemas auxiliares são funções, e que o shape legado monta o `account`.
- `httpClient.test.ts`: +11 testes (5 códigos de credencial via msw com o repro real, 401 sem `errorCode` ainda sendo sessão vencida, `token_expired` ainda renova/desloga, `isSessionExpired` custom, `refreshError` chegando ao `onUnauthorized`, refresh ok repetindo com o token novo).
- Vitest 127/127 (era 114/114 na 1.5.1).

### Consumidores

Conta (`[CONTA] CONTA-MIG-02`): pode validar com `topBarModelSchema` vindo de `@nomad/ui/topbar`; o login com senha errada não desloga mais. Apps que já usavam `topBarModelSchema` de um import direto de `src/topbar/topBarModel` passam a usar o sub-path público.

## [1.5.1] — 2026-09-30

Republicação do conteúdo da v1.5.0. A tag `v1.5.0` foi criada no commit errado
(`114e667`, que é o da v1.4.1): quem instalava `#v1.5.0` recebia o pacote da
1.4.1 — sem `TopBarModel`/`topBarModelSchema` e sem o fix do brand mark
(`--mark-bg`/`--mark-on`). O conteúdo nunca esteve errado; a tag apontava para
o commit errado. Tags publicadas não se movem (decisão de produto), então a
correção sai em versão nova: use `#v1.5.1`.

Nada muda em relação à 1.5.0 para quem usa a `main`: é o mesmo código, com a
versão do `package.json` correta.

### Corrigido

- **`v1.5.1` republica o conteúdo da `v1.5.0`** (`TopBarModel` + `topBarModelSchema`
  - fix do logo), na `main` `6b1699d` e seguintes.

### Checklist de release (novo)

- Antes de avisar a tag como publicada: `git rev-list -n1 <tag>` tem que ser o
  commit do release **e** `git show <tag>:package.json` tem que trazer a
  versão certainada. Bug reportado pelo motor em 2026-09-30.

## [1.5.0] — 2026-09-30

Minor aditivo (NUI-04 / TOPBAR-PARITY-01 `904e24cf`). Define o **modelo de dados canônico da barra Nomad** (`TopBarModel`) e o Zod schema (`topBarModelSchema`) que os apps usam para validar a resposta de `GET /api/oidc/topbar`. A `[CONTA] [TOPBAR-PARITY-02] c689a5ec` implementa o endpoint com este contrato; cada app migra nas tasks `[LB] NUI-MIG-02b` / `[AP] NUI-MIG-04b` / `[MOTOR] NUI-MIG-03b`. Inclui também o fix visual do brand mark (vitrine mostrava ícone preto sólido no claro).

### Adicionado

- **`TopBarModel` + tipos auxiliares** (`src/topbar/topBarModel.ts`): `apps`, `organization`, `organizations`, `account`, `launcherLinks`, `accountLinks`, `helpLinks`, `createOrgUrl`. Compatível com o `TopbarData` legado (v1.0.x): `profile` + `accountUrl` continuam reconhecidos.
- **`topBarModelSchema` (Zod 4)**: valida a resposta do backend e transforma para o shape canônico. Aceita o shape legado.
- **Tokens `--mark-bg` / `--mark-on`** na paleta (`paletteCssVars`): padrão seguro por modo (`#0b1220`/`#0f172a` bg, `#f8fafc`/`#fff` on). Quem usava `var(--mark-bg)` na SVG do logo da org parou de cair em preto/currentColor — vitrine e apps passam a renderizar o mark com a cor certa.
- **README** (`src/topbar/README.md`): contrato, exemplo de uso, decisões, lista de tipos exportados.

### Testes

- `topBarModel.test.ts` (novo): 5 testes — shape canônico, shape legado, validação de `manageAccountHref`, campos opcionais, rejeição de `launcherLink` sem label.
- Vitest 114/114 (era 109/109).

## [1.4.1] — 2026-09-30

Patch visual do `Progress` (visto na vitrine logo após a v1.4.0). Trilha agora ocupa a largura toda do pai por padrão (`w-full`), evitando que o `flex` do contêiner colapse o componente para 0 px quando o pai não força largura. Comportamento de quem passava largura explícita (`className="w-32"` ou wrapper com largura) preservado.

### Corrigido

- **`Progress` colapsava para 0 px de largura dentro de containers `flex`** (mostrado na seção Progress da vitrine: 5 tons apareciam sem fill porque a trilha tinha largura 0). Adicionado `w-full` ao root.

### Testes

- `progress.test.tsx`: 1 asserção nova (root tem `w-full`); demais inalteradas.
- Vitest 109/109.

## [1.4.0] — 2026-09-30

Minor aditivo (PKG-FIXES #5, reportado pela `[LB] [NUI-MIG-02] 0b537df0`). Mudança aditiva — nenhuma chamada existente quebra.

### Adicionado

- **`Progress.tone?`**: tom do preenchimento. Mapeia para `bg-status-{success,warning,error,info}` ou `bg-accent` no fill, com `data-tone` no root. Antes, `className` ia só na trilha e o fill era sempre `bg-status-success` — apps precisavam pintar o fill via className próprio (o contorno sai).
- **`Progress.fillClassName?`**: classes extras no fill (ex.: `opacity-50` durante polling).
- Tipo exportado `ProgressTone`.

### Testes

- `progress.test.tsx` (novo): 8 testes — default `success`, `warning`/`error`/`accent`/`info`, `fillClassName`, `className` segue na trilha, clamp de `value` em [0, 100] refletido em `aria-valuenow`.
- Vitest 109/109 (era 101/101).
- Vitrine: nova seção "Progress" com os 5 tons.

## [1.3.0] — 2026-09-30

Feature aditiva (PKG-FIXES #3b, reportado pela `[LB] [NUI-MIG-02] 0b537df0`). API 100% compatível com o wrapper do load-balance (`toast.success/error/info/warning` + `<Toaster/>`) — a troca no MIG-02b é só de import. Dependência nova: `sonner` (Sonner 2.x).

### Adicionado

- **`Toaster`** (`src/components/ui/Toaster.tsx`) — wrapper Sonner 2.x com os tokens da paleta ativa. Lê o `theme` do `useResolvedTheme()` automaticamente (sem precisar passar `theme` por prop). Posição e offset configuráveis; padrão `bottom-right`. `richColors` + `closeButton` sempre ligados.
- **`useToast()`** (`src/components/ui/useToast.ts`) — referência CONSTANTE (`success`, `error`, `warning`, `info`, `loading`, `dismiss`, `promise`) segura pra usar como dependência de hooks. Alias `useNotify` (legado) exportado.
- **Vitrine**: nova seção "Toasts" (`examples/showcase/src/sections/toasts/`) com 5 botões (um por tom + dismiss). `Toaster` global montado em `App.tsx`.

### Tokens injetados

- `--normal-{bg,border,text}` → tokens neutros da paleta (`--surface-raised`, `--color-border`, `--color-text-primary`).
- `--{success,error,warning,info}-{bg,border,text}` → tom da paleta via `color-mix(... 12% / 30% / cheia)`. Mesma fórmula do wrapper do load-balance e do `MainLayout` do agent-package.
- `--border-radius` → `--radius-control`.

### Testes

- `toast.test.tsx` (novo): 7 testes — referência estável do hook, todas as funções expostas, região renderizada, tema injeta CSS vars com `color-mix` (não cores hardcoded), clique dispara `[data-sonner-toast]`, `position` customizada aceita.
- Vitest 101/101 (era 94/94).

## [1.2.0] — 2026-09-30

Minor aditivo (PKG-FIXES #4, reportado pela `[CONTA] [CONTA-MIG-02] 1aa3522b`). Mudança aditiva: novos campos opcionais em `ApiError`, nenhum campo existente muda de tipo ou de nome. Apps que já discriminam por `error.details` continuam funcionando.

### Adicionado

- **`ApiError.errorCode?: string`** — `body.error` quando for string (ex.: `invalid_credentials`, `mfa_required`, `token_expired`, `version_conflict`). É o que a Conta usa para escolher a tela/fluxo certo em 401/409/etc. `undefined` quando o corpo não tem `error` ou não é string.
- **`ApiError.body?: unknown`** — corpo bruto da resposta (`response.data` do axios). `undefined` quando não houve resposta (rede/tempo). Use quando precisar ler campos além de `error`/`message`/`details`.

### Compatibilidade

- `ApiError` agora aceita dois argumentos opcionais a mais no construtor (`errorCode`, `body`), depois dos existentes (`message`, `status`, `details`, `requestId`, `code`). Quem chama `new ApiError(...)` com os 5 primeiros argumentos continua igual.
- `httpClient` agora preenche `errorCode`/`body` automaticamente a partir do corpo da resposta.

### Testes

- `apiError.test.ts` (novo): 4 testes — repro literal da Conta (`POST /auth/login 401 { error: "invalid_credentials" }`), corpo sem `error`, `error` não-string (ignorado), `ERR_NETWORK` (sem corpo).
- Vitest 94/94 (era 90/90).

## [1.1.2] — 2026-09-30

Bugfix do `Menu` (PKG-FIXES #3a, reportado pela `[LB] [NUI-MIG-02] 0b537df0`). Mudança aditiva — nenhuma chamada existente quebra.

### Corrigido

- **`<Menu disabled>` agora desativa o gatilho de verdade.** A nova prop `disabled?: boolean` em `MenuProps` é passada para `BaseMenu.Root` e `BaseMenu.Trigger`: o `<button>` recebe o atributo HTML `disabled` (e `data-disabled` do Base UI) e o painel não abre. Antes, o `disabled` era ignorado pelo `Menu` e o loadbalance contornava com `pointer-events-none opacity-60` em Toolbar, ConfigsTable, KeyRowActions, GroupsPage e Page. Esse contorno sai quando o app migrar.

### Documentação

- JSDoc da prop `button` agora avisa que **é só o conteúdo do gatilho** — o `MenuTrigger` já renderiza um `<button>` (atributo HTML), e passar `<button>` aqui gerava `<button><button>…</button></button>` (inválido). Os apps que faziam isso podem voltar ao normal (texto/ícone).

### Testes

- `menu.test.tsx` (novo): 2 testes — `disabled` desativa e impede abrir; sem `disabled` o gatilho abre normalmente.
- Vitest 90/90 (era 88/88).

## [1.1.1] — 2026-09-30

Bugfix de segurança do `@nomad/ui/data` (PKG-FIXES #2, reportado pela `[AP] [NUI-MIG-04] c8e002e1`). Nenhuma API existente muda para quem já usa `withCredentials: true` na mesma origem/baseURL. Apps que dependem do cookie cross-host (nenhum hoje) precisam ligar `withCredentialsCrossOrigin: true` explicitamente.

### Corrigido

- **`withCredentials` agora é por origem**, não mais global. Com `withCredentials: true`, o cookie de sessão só vai para a mesma origem/baseURL do client — antes, o cookie ia também para qualquer URL absoluta de outro host (`https://evil.example/…`, `//evil.example/…`), o que vazava a credencial para fora da API. URLs absolutas de outro host passam a ser enviadas **sem cookie** (padrão seguro). Opt-in explícito: `withCredentialsCrossOrigin: true` no `createHttpClient` para apps legadas que confiam no host cross-origin.
- **`onUnauthorized` (e `refreshSession`) deixa de disparar em 401 de uma chamada que levou `Authorization` próprio num client sem `getToken`** (sessão por cookie). Antes, `(!getToken || ...)` ficava sempre `true` e qualquer 401 de uma chamada com Bearer próprio derrubava a sessão por cookie. Agora, no client de cookie, "a sessão atual" só é verdade quando a chamada **não** levou credencial própria — uma chamada com `Authorization: Bearer apk_revogada` recebe o 401 e propaga; o cookie de sessão segue intacto.

### Adicionado

- Opção `withCredentialsCrossOrigin?: boolean` em `HttpClientOptions` — opt-in explícito para reativar o comportamento antigo em chamadas cross-host (uso raro; exige confiança no host destino).

### Testes

- `httpClient.test.ts`: 5 testes novos (cross-host, opt-in, sessão por cookie + credencial própria, refresh + credencial própria + cookie, repro literal da `[AP]`). Vitest 88/88.

## [1.1.0] — 2026-09-30

Minor aditivo (PKG-FIXES #1, reportado pela NUI-MIG-02 do loadbalance): sete componentes que a auditoria da NUI-04 prometia para a v1.0.0 e não estavam no pacote. Nenhum nome, token, prop ou export existente muda; quem está na v1.0.x atualiza sem alteração.

### Adicionado

- `Switch` (+ `switchTrackVariants`, `SwitchProps`) — liga/desliga APG "Switch" sobre `@base-ui/react/switch`, com `label`/`description` ou `aria-label`, tamanhos `sm`/`md`.
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell` (+ `tableRowVariants`, tipos `TableProps`, `TableRowProps`, `TableRowTone`, `TableHeaderCellProps`, `TableCellProps`, `TableSort`) — tabela semântica, cabeçalho ordenável com `aria-sort`, tons de linha `default`/`selected`/`highlight`/`danger`.
- `Pagination` (+ `PaginationProps`) — faixa "26–50 de 1.234", Anterior/Próxima com nome acessível e pontas desabilitadas; rótulos e formatação trocáveis.
- `Banner` (+ `bannerVariants`, `BannerProps`, `BannerTone`) — aviso `info`/`success`/`warning`/`error` com título, descrição, ação e dispensar.
- `MultiSelect` (+ `MultiSelectProps`, `MultiSelectOption`) — seleção múltipla em `Popover` com busca opcional e resumo da seleção.
- `CodeBlock` (+ `highlightJson`, `CodeBlockProps`) — bloco de código em região rolável focável, realce de JSON e botão de copiar.
- `StatusDot` (+ `statusDotVariants`, `StatusDotProps`, `StatusDotTone`) — ponto de status `success`/`warning`/`error`/`info`/`accent`/`neutral`, com `pulse` e nome acessível opcional.

Fonte: `PedroPaduelo/load-balance` em `0d728c1` (`frontend/src/components/ui/*`), só com o alias `@/lib/utils` trocado pelo caminho relativo. Todos usam tokens do tema e Base UI.

### Testes

- Unitários (`src/components/ui/__tests__/*`): 20 testes (os 6 do loadbalance + bordas da `Pagination`).
- `axe a11y` em `src/__tests__/kit-extras.browser.test.tsx`: os 7 componentes com todos os tons, **11 paletas × claro/escuro (22 casos), 0 violação**. Total do `test:a11y`: 182/182.
- `vitest.a11y.config.ts` pré-otimiza as entradas `@base-ui/react/*` (`optimizeDeps.include`) para o Vite não recarregar a suíte na primeira otimização.

## [1.0.1] — 2026-09-30

Patch aditivo: 11ª paleta oficial do @nomad/ui. Compatibilidade total — nenhum nome de paleta, token, componente, prop ou export existente muda. Apps que já estavam na v1.0.0 continuam funcionando sem alterações.

### Adicionado

- Paleta **`nommand`** (a 11ª, aditiva) — design v2 "Institucional" da Conta Nommand, decisão de produto (2026-09-30). Mesmo formato das outras 10 (accent azul institucional + amber + status + bordas + onAccent explícito). Seletor de paletas da vitrine agora mostra as 11; `ThemeSwitcher`, `PALETTES`, `PaletteId`, `getPaletteById`, `paletteCssVars` cobrem a 11ª automaticamente.

### Testes

- `axe a11y` cobre agora **11 paletas × claro/escuro** em sidebar (40 testes), header (60), mainlayout (40) e topbar (20) — total **160/160**, 0 violação. Antes: 1 paleta × claro/escuro nos 3 primeiros e 10 no topbar (34 testes).
- Vitest 63/63.

## [1.0.0] — 2026-09-29

Primeira versão pública do `@nomad/ui`. Marca o fechamento da fundação do pacote (NUI-01 fundação, NUI-02 barra Nomad, NUI-03 dados + presets, NUI-04 documento + auditoria). Apps instalam por dependência git na tag `v1.0.0`.

### Adicionado

- Peças do app shell lateral (`@nomad/ui`) — `Sidebar`, `Header`, `Breadcrumb`, `HeaderUserMenu` e `MainLayout` trazidas do agent-package (Spec 03/04) com a mesma UX visual (larguras `--sidebar-width` / `--sidebar-collapsed-width`, drawer em mobile, focus trap, `inert` quando fechado, h-12 no header, `--content-max` no main) mas desacopladas do produto: nav via `SidebarSection[]` + `SidebarItem`, brand/workspace switcher opcionais, slots por prop no `Header` (brand, commandBar, mobileSearch, actions), `HeaderUserMenu` recebe `user` + callbacks, `Breadcrumb` recebe `items[]` por prop, `MainLayout` é dono do estado da sidebar e do `onNavigate`. Tokens do tema (`--surface-*`, `--color-*`, `--text-*`, `--border-*`, `--sidebar-*`, `--backdrop-bg`) — nada de cor hardcoded. Exports: `Sidebar`, `Header`, `Breadcrumb`, `HeaderUserMenu`, `MainLayout` e tipos `SidebarItem`, `SidebarSection`, `SidebarBrand`, `SidebarProps`, `HeaderProps`, `BreadcrumbItem`, `BreadcrumbProps`, `HeaderUserMenuUser`, `HeaderUserMenuProps`, `MainLayoutProps`, mais as constantes `SIDEBAR_MOBILE_QUERY` e `SIDEBAR_MOBILE_ID`. Testes axe em 1 paleta × claro/escuro em `src/__tests__/{sidebar,header,mainlayout}.browser.test.tsx`.
- Presets `@nomad/ui/tsconfig`, `@nomad/ui/eslint` (ESLint flat config com TypeScript, React Hooks, jsx-a11y e TanStack Query) e `@nomad/ui/prettier`.
- Consumer mínimo em `examples/consumer`: instala por dependência git, valida o `prepare`/build e exerce `@nomad/ui/data` contra MSW.
- Barra Nomad `@nomad/ui/topbar` — `TopBar`, `TopBarBrand`, `OrgSwitcher`, `AppSwitcher`, `AppGrid`, `AppIcon`, `AccountMenu`, `Avatar`, `Popover`, helpers e tipos (mesma API do `@nomad/topbar` da Conta, tag `topbar-v1.0.0`). CSS importado explicitamente via `@nomad/ui/topbar.css`.
- `open` / `onOpenChange` opcionais em `AppSwitcher` e `AccountMenu` para controle externo, preservando o comportamento uncontrolled padrão; a vitrine usa isto para demonstrar menus abertos.
- O `scripts/sync-nomad-topbar.sh` da Conta fica obsoleto quando os apps migrarem para `@nomad/ui/topbar`; a remoção do script é task da Conta.

- Esqueleto do pacote: build em modo biblioteca (Vite 8), tipos (`tsc`), vitest, ESLint e Prettier.
- Docs: "Padrão Frontend Nomad v1" (`docs/padrao-frontend.md`) e a auditoria dos 4 apps contra ele (`docs/auditoria-apps.md`).
- `@nomad/ui/data`: `createQueryClient` (staleTime 60 s, gcTime 5 min, retry 1 salvo 401, `refetchOnWindowFocus: false`), `createHttpClient` com `getToken` assíncrono (Conta), `getHeaders` (CSRF/loadbalance), `requestId` por requisição, `skipSessionExpiry`, single-flight `refreshSession` + retry, `onUnauthorized`, `onResponse`/`onNetworkError` (ganchos do monitor de conectividade do agent-package). `ApiError` + predicados (`isUnauthorizedError`, `isForbiddenError`, `isNotFoundError`, `isConflictError`, `isValidationError`, `isNetworkError`, `getErrorMessage`, `fallbackErrorMessage`). `createQueryKeys('entidade', extra)` para chaves em hierarquia. `parseResponse`/`responseParser`/`ResponseParseError`, `parseEnv`/`EnvError`, `fieldErrors`. `createScreenStore` (Zustand só para estado de tela: preferências persistidas, `reset`/`patch`). `QueryProvider` e `safeNextPath`. `generatedClientConfig` para o client do `@hey-api/openapi-ts`. Testes com msw. Levantamento em `src/data/README.md`.
