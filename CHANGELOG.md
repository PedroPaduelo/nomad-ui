# Changelog

Todas as mudanças do `@nomad/ui`. Versões por tag semver na `main` (`vX.Y.Z`); os apps instalam por
dependência git numa tag. Tag publicada nunca é movida nem apagada: correção sai em versão nova.

## [1.13.1] — 2026-10-03

Minor (`[NUI] cb4a2350`). **Regra no padrão: default com nome de container é dívida que só quebra em silêncio.**

⚠️ **Publicada direto como esta versão, sem a `v1.13.0`.** A primeira redação foi feita, commitada e tagueada, mas o
revisor independente encontrou quatro defeitos e a tag **ainda não tinha sido publicada** no remoto — então corrigiu-se
antes de sair, e a versão foi para `v1.13.1` para não haver duas tags do mesmo conteúdo. Regra do repo: tag publicada é
imutável; tag **não** publicada ainda pode ser refeita.

### Corrigido (achados do revisor independente, todos verificados antes de corrigir)

1. **O item novo do checklist apontava para si mesmo** (`seção 14`, que é o próprio checklist, em vez do §13). **O
   `check-doc.mjs` não pega isso**: ele valida a numeração dos cabeçalhos, não as remissões de texto. Um gate que
   valida o cabeçalho e não a referência é cobertura parcial — e foi assim que passou.
2. **A ressalva sobre LB e motor estava escrita errada, e a errada era a que faria um app correto se acusar.** O texto
   dizia que os dois "não usam nome de container". **O motor usa**: `fe/nginx.conf:24` e `:33` fazem
   `proxy_pass http://be:4000`. E o LB não usa `VITE_API_BASE` — usa `VITE_API_URL`. Reescrito: o defeito é o **nome
   global** do painel, que colide entre projetos; `be` é serviço do **próprio compose** do motor, então não colide.
   **Regra não é "todo default" nem "todo nome de container".**
3. **A tabela se apresentava como medição deste repo.** Não é: o `@nomad-ui` só tem acesso a si mesmo, e os quatro
   apps vivem em outras sandboxes. Agora ela é **relatada**, com a fonte nomeada (`[NUI] cb4a2350`) e a regra de que
   **se uma linha divergir do repo de quem lê, o repo ganha**.
4. **`status 200` era afirmado, não medido.** O que está medido é que **nada quebrou** enquanto o destino certo
   estava na env var. O texto agora diz isso e explica por que o ponto da regra sobrevive a qualquer status: o defeito
   é o serviço errado **atender**, não o código de saída.

### Documentado

- **§13 novo no `docs/padrao-frontend.md` — Produção: nome de container em default é dívida silenciosa.** Saiu do
  deploy de produção da Conta (2026-10-03), medido: os containers do painel têm nome **global**
  (`minipanel-<nome-do-serviço>`), não por projeto, então dois projetos com serviço de mesmo nome **colidem sem
  nada no código denunciar** — o serviço novo teve de se chamar `conta-backend-ws` porque `producao` já ocupava
  `minipanel-conta-backend`. E `conta_nommand/frontend/Dockerfile:36` continuava com
  `ENV BACKEND_UPSTREAM=minipanel-conta-backend:4100`.
- **⚠️ O detalhe que faz a regra valer, e é o que a torna diferente das outras:** **nada quebrou.** A env var do
  serviço sobrescreve o default, o build passa, o `/api` responde 200 e o tráfego chega ao backend certo. O default
  só entra quando **ninguém olha** — `docker build` fora do painel, recreate sem a env var, imagem de teste — e aí o
  `/api` responde pelo backend errado, **que está no ar**. Default que aponta para o lugar errado não falha: ele
  **funciona errado**, que é a forma mais cara de defeito.
- **Os 4 pontos da regra:** (1) nome de container é acoplamento, não configuração; (2) **fail-fast vence default**,
  ausente tem que errar alto no boot — o mesmo gênero da **A3** (variável de segurança sem default, que já apareceu
  4× nos backends); (3) **provar para onde o proxy aponta é por LOG** — env var mostra a *intenção*, o log mostra o
  *destino*; (4) toda troca de nome varre `Dockerfile`, `compose*.yml`, `.env.example` e `*.template.conf`.
- **A tabela de onde o mesmo desenho existe** — **é RELATADA, não medida pelo `@nomad/ui`**, que só tem acesso ao
  próprio repo; a fonte é a task `[NUI] cb4a2350`. `conta_nommand/frontend/Dockerfile:36` e
  `agent-package/frontend/Dockerfile:104` têm o default com nome de container. ⚠️ **Load-balance e motor não têm o
  defeito de colisão, e o motivo é específico:** o LB usa `VITE_API_URL` (ARG), e o motor usa `VITE_API_BASE: "/"`
  — **embora o motor tenha nome de container** (`fe/nginx.conf` → `proxy_pass http://be:4000`), `be` é serviço do
  **próprio compose**, não nome global do painel. Por isso o §13 manda **não estender a regra para eles**: ela é
  sobre default que depende de um **nome global**, não sobre todo default nem todo nome de container.
- **O §14 (checklist de migração) ganhou o item** correspondente, porque um app que migra precisa auditar os
  defaults de produção.

**Fora de escopo:** correção nos repos dos outros apps (a do AP está em aberto, a da Conta é a task `38d885a1`), e
publicação pela API do AgentPack — o caminho sem transcrição é o gerador no repo.

## [1.12.0] — 2026-10-02

Minor (`[NUI] 91de99cf`). **GitHub Actions não existe mais neste repositório — decisão do dono por CUSTO.**

### Removido

- **A branch `ci/gates-workflow` foi apagada** (local e remoto). Ela tinha um `gates.yml` de 41 linhas, nunca mergeado na `main`, e era a única forma de o Actions existir aqui. O dono foi explícito: *"não é só não religar, é não ter nada. Não é pra ter nem pra possibilidade de ligar."* ⚠️ **O conteúdo está no histórico do git** (`e1abd0e1`), caso precise como referência — mas **não deve ser restaurado**.
- **A `main` nunca teve `.github/`** — não havia workflow nela para apagar. O que existia era só a branch.

### Documentado

- **A regra do modelo de trabalho, no `README.md` e no §11 do padrão:**
  > **Teste roda na sandbox. Publicação roda no painel. O GitHub só guarda o código. Actions não existe e não pode ser criado.**
- **"Desligado" é frase de quem planeja religar.** O README agora diz que não existe workflow em **nenhuma** branch, e manda não criar, não sugerir e não religar.
- **A publicação automática NÃO depende do GitHub:** o painel clona e constrói no servidor dele. Apagar os workflows **não quebra deploy** — quem confunde "sem CI" com "sem deploy" para por um motivo que não existe.
- **O §11 do padrão estava desatualizado em dois pontos** que a `v1.10.0` já tinha resolvido: dizia que o `check-lock` chega ao app *"por cópia manual, porque `scripts` não está no `files` do pacote"*. Desde a `v1.10.0` ele **vem no pacote** (com `bin` e `exports`), e **copiar o arquivo para o app é agora o erro**.

## [1.11.1] — 2026-10-02

Patch (`[NUI] 91de99cf`). **O `.bin` funciona por git — e o gate passou a medir por git.**

Três sessões reportaram que `npx check-lock-nomad` não funcionava. **Não se confirma:** medindo por git numa tag real (`v1.11.0`), o `npm install` cria e linka `node_modules/.bin/check-lock-nomad`, o arquivo vem com bit de execução e o `npx` roda. O `bin` também vai para o `package-lock.json`.

**O `E404` é `cp -a` do `node_modules`** — o npm cria o `.bin` na instalação, cópia não cria. E o `npx`, sem o link local, **vai ao registry procurar**, então o `E404` se lê como "o pacote não existe" e desvia para o pacote errado.

### Corrigido

- **`publish.test.mjs` media o bin só por tarball** — um caminho que nenhum dos 4 apps usa. Agora tem §3b, que instala **por git a tag de verdade** quando `PUBLISH_TEST_GIT=1` (precisa de rede e ~40 s).

### Documentado

- **O `npm install` escreve `resolved` em `git+ssh` mesmo com `git+https://` no `package.json`** (medido: o `package.json` fica em `git+https://…#v1.11.0` e a entrada instalada sai `git+ssh://…#<sha>`). **Não é o shorthand do §3b.** É defeito do lock do app, e o §3 do `check-lock` acusa. Conserto: `rm -f package-lock.json && npm install`, ou `insteadOf` no Dockerfile.

## [1.11.0] — 2026-10-02

Minor (`[NUI] 91de99cf`). **Dois furos que nenhum dos verificadores pegava, ambos relatados por outra sessão rodando o pacote em app consumidor.**

### Corrigido

- **`publish.test.mjs` acusava o pacote de estar errado quando rodado de um app que o instalou** (achado pela sessão da Conta, que reproduziu: 5 "problemas" num pacote correto). A causa era `readFileSync('package.json')` e `npm pack` com `cwd: process.cwd()` — caminho relativo, que lê o `package.json` do **app**. O gate agora acha a raiz do pacote pelo próprio `import.meta.url` e usa `join(raizDoPacote, …)` em tudo. **Medido: rodar no pacote e rodar do app dá o mesmo resultado.**
- **O `npm pack` é impossível a partir do pacote instalado** — o `prepare` chama `vite`, que é devDependency e não vem no `node_modules` instalado (`vite: not found`). Então o empacotamento é a verificação **do repo**; de um pacote já instalado, a mesma afirmação é medida lendo o `package.json` e conferindo o arquivo no disco. Cada uma onde é possível, as duas medindo a mesma coisa.
- **Nova §3c no `check-lock.mjs`: `version` de workspace ≠ `spec` de outro** (o `76dd00a` do motor, cinco horas de bump pela metade com a suíte verde). O §1 compara a raiz do lock com o `package.json` **do mesmo diretório**, e em workspace os dois não são o mesmo lugar: lock da raiz com `@nomad/ui` em `1.9.2` e o `fe` declarando `v1.10.1` passava nos três verificadores ao mesmo tempo — o do pacote, o `check-lock-root` do motor e o `npm ci --dry-run`. ⚠️ **Quem pega esse caso é a §3c e não o §1** (medido: rodando na raiz, o §1 não vê a dep porque ela está declarada só no `fe`).

### A mensagem da §3c, e o que ela ensina sobre gate

⚠️ **A primeira versão acusava um lock que o próprio npm gerou, e não estava errado** — achado pelo revisor independente, que montou o caso com git e npm reais. Com a raiz pedindo `#v1.0.1` e o `fe` pedindo `#v1.0.0` da mesma dep por git, o npm **hoista** e entrega ao `fe` a versão da raiz, sem entrada aninhada. A seção acusava isso e mandava *"regere o lock"*; **regerar dá lock idêntico** (medido), porque é assim que o npm resolve.

**A correção não foi silenciar o caso — foi fazer a mensagem distinguir os dois**, que só quem olha o `package.json` do outro lado sabe:

- **ninguem mais pede essa dep** → o lock está velho → *regere o lock*;
- **o outro lado pede outra tag** → divergência entre lados → *alinhe as tags*, nomeando as duas. Regenerar não muda nada.

⚠️ **Gate que manda fazer algo que não muda nada é pior que gate frouxo**: a pessoa obedece, não vê diferença, e desliga — é a §12 do padrão, e é por isso que a contraprova do lock gerado pelo npm é parte da verificação e não um extra.

### Documentado

- **A inversão de semver é de ordem de commit, e só a data resolve.** O README agora separa as duas perguntas: *qual versão é a boa* (a **data** — `git tag --sort=-creatordate`, porque `sort -V` mente e leva à `v1.9.0`, que o CHANGELOG proíbe adotar) e *qual número está instalado* (o **derivado** — `node -p "require('@nomad/ui/package.json').version"`, porque número escrito à mão envelhece e foi assim que a `v1.10.0` perdeu a linha). Nenhuma forma de escrever o número conserta a inversão.

### Verificação

Três mutações, todas caindo: `files` sem `scripts` · `exports` sem `./scripts/*` · §3c com `1.9.2` na raiz do lock (nos dois sentidos). Contraprovas, todas passando: lock íntegro do pacote (594 entradas) · workspace coerente · `publish.test` do app consumidor.

⚠️ **A §3c acusou o caso legítimo na primeira versão** — comparava `#v1.10.1` do spec com `1.10.1` do `version` como string, e a contraprova reprovou. Gate que acusa caso legítimo é desligado (§12), então a correção foi comparar versão a versão. **E ela não pegava o caso invertido** porque o laço pulava a rota `''`; a raiz do lock participa agora.

## [1.10.1] — 2026-10-02

Patch (`[NUI] 91de99cf`). **A linha da versão recomendada com data só entrou na `main` depois da tag `v1.10.0`** — quem instalou pela tag não recebeu a resposta do dono.

### Corrigido

- **`README.md` § `Versão recomendada`: a linha concreta `v1.10.x — 2026-10-02`.** A seção existia na v1.10.0 com os comandos e a ressalva da semver invertida, mas **sem dizer qual versão era a recomendada** — que é a pergunta que a seção existe para responder. Registra também que o registry npm responde 404 (o pacote é distribuído por git, então `npm view` e `npm outdated` não são instrumento) e que o `HEAD` remoto aponta para `refs/heads/main`, que coincide com a tag por acaso e não por decisão.

### Por que uma patch e não um amend

⚠️ A `v1.10.0` **já está publicada** e tag publicada é imutável (regra 2 das regras de publicação deste repo). A correção sai em versão nova — e foi o que aconteceu de fato: a linha foi para a `main` em `4c7325b`, depois da tag. Sem isso, o gate `publish.test.mjs` desta sessão não pegaria nada, porque **ninguém compara a tag com a `main`**.

## [1.10.0] — 2026-10-02

Minor (`[NUI] dba667f0` + `[NUI] 91de99cf`). **O `scripts/` passa a viajar no pacote, e o pacote declara a versão recomendada.** Fecho o "entrega tudo" do dono sem ambiguidade sobre qual tag adotar.

### Adicionado

- **`scripts/` no `files` do `package.json`** — `check-lock.mjs`, `check-doc.mjs`, `knowledge-page.mjs` e `knowledge-summary.test.mjs` agora SAIEM no `npm install`. Antes, 3 dos 4 apps mantinham cópia divergente: a do load-balance era da `v1.9.4` (38 linhas a menos do bloco de transitiva), a do motor não tinha a regra de `ssh` e o cabeçalho dela prometia uma proteção que o código não fazia. **"Adotou a tag" ≠ "tem o gate"** — não havia nada no repo que denunciasse isso, porque o próprio verificador era o arquivo que não viajava.
- **`"./scripts/*": "./scripts/*"` no `exports`** — sem isso, o Node bloqueia o subpath com `ERR_PACKAGE_PATH_NOT_EXPORTED` mesmo com o arquivo presente (medido em `scripts/publish.test.mjs`).
- **`bin.check-lock-nomad`** — o app roda o verificador sem precisar saber o caminho interno: `"check-lock": "check-lock-nomad"` no `package.json` dele.
- **`scripts/publish.test.mjs`** — gate que prova: o tarball tem `scripts/check-lock.mjs`, o subpath resolve, o bin e o caminho literal rodam no cwd de um app limpo, **e a contraprova de um lock com `git+ssh` mais transitiva sem entrada tem que cair** (regra da §12 do padrão: mutação mostra que pega, contraprova mostra que é usável, publicar só com a primeira é metade do gate). Mutação (remover `scripts/` de `files`) faz o teste cair — `EXIT 1`. Está no `doc:check`, e o `doc:check` está no `gates`.
- **Seção `Versão recomendada` no `README.md`** — `npm outdated` não lista dependência por git, e o `HEAD` do repo aponta para a `main` (que por coincidência é a `v1.9.9` agora, mas não por decisão). A forma confiável é `git tag --sort=-creatordate | head -1` e a forma sem clone é `git ls-remote --tags … | grep -oE 'v1\.[0-9]+\.[0-9]+$' | sort -V | tail -1` — **com a ressalva de que ordenar por número MENTE** neste projeto (ver abaixo).

### Corrigido

- **O `§1` do `check-lock.mjs` se contradizia com o `§2b`**: o §1 só isentava prefixos git do `satisfies()`, o §2b isentava git + `file:` + `link:` + `workspace:`. Resultado: o `npm install` do tarball local de um app reescrevia o `package.json` com `"@nomad/ui": "file:…tgz"` e o verificador acusava o spec contra a versão instalada — caso legítimo. Achado durante a escrita do `publish.test.mjs`. A lista do §1 é a mesma do §2b agora (medido: app limpo com `@nomad/ui` instalado por tarball roda o verificador sem acusar).
- **A semver deste projeto está invertida**: `git merge-base --is-ancestor v1.9.0 v1.8.10` é `True` (a v1.9.0 foi commitada antes da v1.8.10). Por isso a v1.9.0 — que é REGRESSÃO (perdeu 38 linhas do bloco de transitiva) — fica acima da v1.8.10 no `sort -V` para sempre. **A v1.10.0 escapa do problema por ser a maior em número e a mais recente em data**, mas a regra geral continua valendo: **não ordene por número**.

### Fora de escopo

- Migrar as cópias já existentes nos apps (cada sessão apaga a sua quando bump a tag).
- A 4ª resposta da `91de99cf` (regra de `resolved` que varre o lock da raiz quando o cwd é workspace) — `9ac18ad1` cobre o caso mais comum (`pkg['fe'].dependencies`), mas a regra que varre o lock da raiz num monorepo real ainda está aberta.

### Verificação (gate que prova o que diz)

```
✓ docs/padrao-frontend.md — ok (742 linhas, 22 versões, 14 seções)
✓ knowledge.knowledge.md — 35 afirmações conferidas em docs/padrao-frontend.md
✓ scripts/ publicado e funcional num app limpo — tarball, caminho, bin e contraprova
✓ package-lock.json — ok (8 deps, 32 devDeps, 594 no lock) · @nomad/ui 1.10.0 check-lock
```

Mutação de `files` (sem `scripts/`): o teste cai em `files` não inclui `scripts` e em o tarball não tem `scripts/check-lock.mjs`. Mutação de `exports` (sem `./scripts/*`): o teste cai em exports não tem `./scripts/*` — **a parte que o "1 linha no package.json" deixava passar**.

## [1.8.11] — 2026-10-01

Patch (`[NUI] 232d5cd6`). **A regra do falso-positivo vai para o padrão**, e o `check-lock` passa a dizer de que versão ele é.

### Documentado

- **Gate que acusa caso legítimo é pior que gate que não pega** (§12). Furo é descoberto; falso-positivo é **desligado** — é a única classe em que **o conserto é pior que o defeito**, porque a equipe vê o gate barrando coisa certa e a resposta é tirar o gate.
- **Nenhum gate novo entra sem contraprova**, e a contraprova é uma mutação do **caso legítimo** — não do defeito imaginado. **Mutação mostra que pega; só a contraprova mostra que é usável.** São coisas diferentes, e publicar só com a primeira entrega metade do gate.
- **Os casos que NÃO acusam são parte da regra, não detalhe da matriz.** No `check-lock` são três (lock íntegro, opcional de plataforma, `peerDependency` ausente) — são o que torna o gate utilizável. **Gate só com mutação é metade do gate.**
- _O mesmo erro pelo outro lado, no mesmo dia:_ `SIZE_EXCEPTIONS` subiu 3 vezes no dia em que foi criado (`33065ac1`). **Exceção que sobe sem consequência deixa de ser exceção** — teto precisa de medição junto, senão não segura nada.

### Corrigido

- **A saída do `check-lock` diz de que versão ele é** (`· @nomad/ui 1.8.11 check-lock`). Quem copia o script para o app precisa saber de onde veio, porque **a cobertura muda entre versões** — a v1.8.10 adicionou a transitiva. Copiar de tag antiga e ver "gate passa" não prova nada.

### Verificação (v1.8.10 medida no shape de workspace, o do motor)

O gate foi mediado num formato só (raiz). Testado agora contra **dois locks commitados** (raiz + `fe/`): motor íntegro **não** acusa; **mutação da transitiva ausente no shape de workspace acusa**; dependência opcional de plataforma **não** acusa. **Sem regressão.**

Uma coisa que o teste mostrou e é intentional: **dependência de um workspace sem entrada no lock NÃO é accused** — e o `npm ci` também passa nesse caso (medido, exit 0), ou seja, é inofensivo. O gate fica quieto porque não há defeito.

## [1.8.10] — 2026-10-01

Patch (`[NUI] 232d5cd6`). **Fecha uma fura do `check-lock` que a `loadbalance-33` achou rodando a mutação.** O item (4) do anúncio da v1.8.2 — _"não sobrou dependência órfã na raiz do lock"_ — **não existia no script**.

### Corrigido

- **Dependência transitiva exigida pelo lock, sem a entrada que a resolve.** O check (1) só enxergava o que o app declara **direto**; o `sonner` do `@nomad/ui` é transitivo e escapava. Medido na LB: lock com `node_modules/sonner` removido **passava** com exit 0, e o `npm ci` reprovava logo em seguida (`Missing: … from lock file`). **O gate reprova agora, antes do passo que gasta minutos instalando.**
- A mensagem nomeia **quem exige** e o que falta: `node_modules/@nomad/ui exige "sonner" (^2.0.8) mas não há entrada em node_modules/sonner`.

**Dois falso-positivo que a primeira versão acusava, e como foram resolvidos** (medidos contra o lock real do pacote, que tem 594 entradas):

- **Binário de outra plataforma:** `@tailwindcss/oxide-wasm32-wasi` exige `@emnapi/*` e `@napi-rs/*`, que não têm entrada porque o lock é multiplataforma. Resolvido respeitando o marcador **`optional: true` que o próprio npm escreve no bloco** — é o npm dizendo "não é exigido aqui", mais confiável do que adivinhar por nome de pacote.
- **`peerDependencies` e `devDependencies` de um transitive:** não são exigidas por desenho (o app as declara), então não contam.

### Verificação (matriz de 5 casos)

| caso                                     |           |
| ---------------------------------------- | --------- |
| lock íntegro                             | não acusa |
| **transitiva ausente (a mutação da LB)** | **acusa** |
| `git+ssh://` no `resolved`               | acusa     |
| dependência opcional de plataforma       | não acusa |
| `peerDependency` ausente                 | não acusa |

Gates: 185/185 + 242/242 + `doc:check` + build, exit 0.

## [1.9.9] — 2026-10-02

Documento. **O padrão carregava um número que eu mesmo medi errado.** Sem mudança de código.

### Corrigido

- **§5 dizia "11 `toLocaleDateString` sem `timeZone` nos 4 apps". São 73.** Auditei os 4 (clonei da `origin/main`) e o número real, **contando a chamada inteira** e não a linha, é **73** — agent-package 25, load-balance 30, motor 11, Conta 7. **Os "11" são só do motor**, que é o menor dos quatro.
- **"2 com saída em inglês" são 8** — são `toLocaleDateString()` **sem argumento nenhum** (6 no LB, 2 no motor): sem `locale` nem `timeZone`, o formato sai no do navegador.
- **A regra de contagem entrou no padrão**, porque foi o que produziu o erro: _contar por chamada, não por linha_ — `timeZone` pode estar na linha seguinte (`{ day, month, year }` em multi-linha) e o grep de linha dá falso positivo.

### E a assimetria que a auditoria mostrou

| app               | barrel fora de `main`/`providers` |
| ----------------- | --------------------------------- |
| load-balance      | **216**                           |
| agent-package     | **200**                           |
| motor             | 19                                |
| **conta_nommand** | **0** ✅                          |

**A regra do barrel não é higiene — é a forma dominante**, e a Conta prova que é hábito, não impossibilidade (0 barrel e já adota `timeZone`).

## [1.9.8] — 2026-10-02

Documento. **Corrige uma afirmação minha que o padrão fazia parecer verdade.** Sem mudança de código.

### Corrigido

- **A §5 dizia que fechar o furo do barrel era um subpath "`@nomad/ui/ui`" — sem dizer que ele NÃO EXISTE.** Conferi no `exports` map: `@nomad/ui/ui` não está lá. Lido depressa, vira importação que funciona, e ela **não funciona** (`import { Button } from '@nomad/ui/ui'` daria erro de módulo). Agora está escrito que é **ideia de empacotamento, decisão do dono** (`91de99cf`), não importação disponível.

### Medido nesta rodada

- **Subpaths que existem** (verificados no `exports` map): `@nomad/ui/topbar`, `/data`, `/markdown`, `/theme-boot`, `/tsconfig`, `/eslint`, `/prettier`.
- **O padrão não viaja no pacote.** `files` = `dist`, `src`, `presets`, `README.md`, `CHANGELOG.md` — **sem `docs/`**. E `docs/padrao-frontend.md` tem **729 linhas contra 453 do README**: o documento que os 4 consultam é o maior dos dois e **só chega por clone do repo**. Mesma família do `scripts` fora do `files`.
- **As duas regras escritas na v1.9.7 (`timeZone` e barrel × subpath) são decorativas** pela §12 do próprio padrão: nenhum gate as mede. `typecheck`/`lint`/`test`/`build`/`check-lock` medem; elas não. Proposta de `check-scripts.mjs` (~30 linhas) na `9c722d58` — **é decisão do dono**, porque muda o gate de todo mundo.

## [1.9.7] — 2026-10-02

Documento. **Duas regras que os 4 apps seguiam sem ter:** data/hora com `timeZone`, e subpath em vez de barrel. Vêm de dois achados do revisor de qualidade. Sem mudança de código.

### Documentado

- **§5, "Data e hora: sempre com `timeZone`."** Dado do servidor é UTC e se mostra em UTC; zona local só quando o dado é local (nascimento, endereço). E o `locale` vai explícito junto. **Medido em 2026-10-02: 11 `toLocaleDateString` sem `timeZone` nos 4 apps, 2 com saída em inglês.** Build passa, teste passa — o defeito só aparece na tela de quem tem o browser fora de pt-BR, e **nenhum gate pega isso**: é dado que sai errado, não código que quebra.
- **§5, "Subpath, não barrel (fora do `main.tsx`)."** O barrel `@nomad/ui` reexporta `ThemeProvider`, que é **contexto de React**: quem importa o barrel para um `Button` também puxa o ThemeProvider. Hoje não quebra — **a garantia quebra por atualização de dependência**, sem review de nenhum app. O próprio padrão **recomendava** o barrel no exemplo de `main.tsx`, sem dizer por que ali é seguro e fora não é; agora diz.
- ⚠️ **O furo fica declarado, não fechado:** o **kit (`components/ui`) não tem subpath**. `Button`, `Toaster`, `Modal` só saem pelo barrel, então a garantia de não puxar contexto **não existe para o kit**. Fechá-lo é um subpath novo (`@nomad/ui/ui`), que **muda o que os apps recebem** — decisão de empacotamento, não do padrão, e não sai sem o dono.

**Os subpaths que existem:** `@nomad/ui/topbar`, `@nomad/ui/data`, `@nomad/ui/markdown`, `@nomad/ui/theme-boot`.

## [1.9.6] — 2026-10-02

Documento. **Republica o `README` com a regra do Actions desligado** que entrou na `main` depois da v1.9.5. Sem mudança de código.

## Por que uma versão nova em vez de mover a v1.9.5

A v1.9.5 foi tagueada no commit `6345ad8`, **antes** do merge do `916c9f4` (a regra "GitHub Actions está DESLIGADO" no README, escrita pelo orquestrador e já na `origin/main`). O conteúdo do pacote é o mesmo (`package.json` 1.9.5); o que falta é o README.

**A regra que eu mesmo escrevi na v1.9.4: tag publicada é imutável, e a correção sai em versão nova.** Então a v1.9.5 fica como está — quem pinnou nela recebe o pacote correto, só sem aquele trecho de README — e esta versão entrega a `main` completa.

**Consequência medida para quem consome:** a diferença entre as duas é **só o `README`** (`docs/` não entra no pacote, `files` não tem `scripts`). O `dist` é idêntico.

## [1.9.5] — 2026-10-02

Documento (`[NUI] 91de99cf`). **O padrão ainda mandava CI, e o CI foi desligado.** Sem mudança de código.

### Corrigido

- **§11 do padrão não manda mais GitHub Actions.** O Actions está **desligado nos 5 repositórios, por decisão do dono**. Agora a seção dá **a sequência do gate manual**, na ordem, com o tempo medido (**92 s** do zero, na task `91de99cf`), e o comando pronto.
- **O `npm ci` do zero ficou explícito como o passo que não se negocia**, com o motivo: o `sonner` ficou ~20 versões fora do lock e o gate ficou verde, porque `npm install` "conserta" o lock sem reclamar.
- **O custo de não ter CI automático está escrito**, em vez de a seção fingir que há verificação: commit quebrando o `dist` só aparece quando um consumidor quebra, e **com dependência por git o `npm ci` do app sai 0 e não instala a transitiva** (medido: `added 136 packages` onde o lock íntegro instala 941, `@nomad/ui` inteiro ausente) — o build passa e a feature não funciona. Por isso o `check-lock` é a verificação que pega, e por isso ele precisa chegar ao app.

### A decisão que sobra para o dono (`91de99cf`)

Incluir `"scripts"` no `files`. Hoje o `check-lock.mjs` **não viaja no pacote** (verificado instalando a v1.9.2 como consumidor), então a cópia manual é o **único** jeito de um app ter o gate — e a `conta_nommand` não tem gate nenhum. **Pin: `#v1.9.4`** (sha256 do gate `03b5624c…`; `6095fec2…` nas v1.9.1/v1.9.2 também serve).

## [1.9.4] — 2026-10-01

Documento (`[NUI] 87bb4bd7`). **A regra de publicação que eu quebrai, escrita no repo.** Sem mudança de código.

### Documentado

- **README § Desenvolvimento, seção nova "Publicar uma versão: regras que não se negociam"** — seis regras que existem porque este pacote é consumido **por git** pelos 4 apps, e cada tag é um contrato: (1) a `main` não se reescreve (nunca `--force`, nunca `--amend` em commit pushado, nunca rebase do que já saiu); (2) tag publicada é imutável — erro sai **em versão nova**; (3) **erro de digitação em mensagem de commit não se corrige com `--amend`** — escreve-se melhor no commit seguinte, e `--amend` só vale para commit **ainda não pushado**; (4) a numeração segue a **linhagem, não o relógio**; (5) confirme a tag antes de avisar (`rev-list`, `show`, e descendência); (6) **antes de bumpar, confira o artefato** (`git show <tag>:<arquivo>`), não o número da versão.
- **Padrão dos 4 apps, §3 "Atualizar"** — as mesmas regras, com o caso que as motivou: a `v1.9.0` ficou **193 linhas** contra 231 da `v1.8.10`, sem o bloco de transitiva, por numeração fora da linhagem. E a regra de transferência: **conclusão repassada entre sessões vem com o hash do artefato que a produziu** — sem ele, o número não é transferível.
- **O caso que mais custa**, em destaque no padrão: `npm ci` em árvore limpa, dependência por git, transitiva sem entrada → **exit 0, `added 136 packages`** (o lock íntegro instala 941) e `node_modules/@nomad/ui` **inteiro ausente**. O build passa e a feature não funciona; só `ls node_modules/@nomad/ui` num clone limpo pega.

**Por que isso está em papel:** a regra estava na minha cabeça e eu quebrei a minha própria num force-push por uma letra. Regra que não está no repo é regra que o próximo não lê.

Gates: 185/185 + 242/242 + `doc:check` + build, exit 0.

## [1.9.3] — 2026-10-01

Patch (`[NUI] b9b07a86`). **Corrige três afirmações do README que apontam o debug para o lado errado**, e a mensagem do `check-lock`.

### Corrigido

- **O README dizia que o `npm ci` quebra em Docker sem chave ssh por causa do `resolved` em `git+ssh://`. Não quebra** (medido): o `npm ci` busca a dependência git pelo **spec**, não pelo `resolved`. O que quebra é a falta de chave **quando não há `insteadOf`** no Dockerfile — condição que o README não mencionava, e que o `fe/Dockerfile` do motor resolve.
- **O README não dizia que o `npm ci` sai 0 e não instala a transitiva** (dependência por git): medido, instalou 136 de 941 pacotes com `@nomad/ui` inteiro ausente, **sem erro**. É o caso que mais custa — o build passa e a feature não funciona.
- **A ordem do que pega** está explícita: (1) o **atalho `github:`** no spec (a causa — o `npm install` o transforma em ssh sozinho, e o §3b barra); (2) **transitiva sem entrada** (§2b barra; `npm ci` não acusa nada); (3) `resolved` em `git+ssh://` (risco de lockfile; só quebra sem chave **e** sem `insteadOf`).
- **A mensagem do `check-lock` deixou de apontar para o `npm ci` como teste**, porque para dependência por git ele **aceita e não instala** — agora aponta o campo que de fato importa: o `dependencies` do requerente.

### O que NÃO mudou (e a limitação que eu tinha anotado)

**A v1.9.3 pega transitiva aninhada ausente** — verificado de novo nesta versão: lock íntegro com `jsesc` aninhado → exit 0; removida a entrada aninhada → **exit 1**. A limitação que circulava ("a v1.9.2 não pega aninhada") **não se reproduz**; se ela veio de um lock real, vale pedir o `sha256sum` do script, como já fizemos com o "34 falsos".

Contraprova: lock real do AP (870 entradas) e os 3 lockfiles do motor → **0 falsos**. Gates: 185/185 + 242/242 + `doc:check` + build, exit 0.

## [1.9.2] — 2026-10-01

Documento (`[NUI] b9b07a86`). **Só papel: nenhuma mudança no `check-lock`.** Fecha a discussão que round-tripou a noite.

### Documentado

- **Por git e por registry não dá no mesmo** (§3, ao lado da assimetria): mesma mutação — remover **só** a entrada de uma transitiva, deixando a referência — dá **registry → `EUSAGE`** (erro nomeia o que falta) e **git → `exit 0`**, com o pacote instalado e a dependência **fora, sem aviso**. Dep de registry vem _descrita pelo lock_; dep de git vem do `package.json` **do pacote**, que o npm lê e confia. **O `npm ci` saiu 0 e não instalou** — quem reproduz pelo `npm ci` não vê nada.
- **O `check-lock` é a única verificação que pega esse caso**, e concorda com o `npm ci` nos dois: acusa a transitiva sem entrada nos dois e fica quieto no lock coerente. **Gate que reprova o que o instalador aceita em silêncio é o gate funcionando.**
- **Dois avisos de medição** que erraram nos dois lados hoje: **exit code sem `| tail`/`| grep`/`&&`** (ou `PIPESTATUS`) — um "exit 0" medido com pipe é o que esconde o defeito acima; e **antes de chamar duas medições de contradição, confirmar que é o mesmo lock** (o `name` e a raiz do `package-lock.json` dizem de qual repositório é).

## [1.9.1] — 2026-10-01

Patch (`[NUI] 96106ee7`). **Corrige duas coisas: uma regressão que eu causei e 34 falsos em lock real.**

## ⚠️ A v1.9.0 é REGRESSÃO — não adote

A v1.9.0 foi commitada **antes** da v1.8.10, então a tag ficou mais antiga na linhagem e **não tem o bloco de transitiva** (231 → 193 linhas). Medido: mutação (remover `sonner`) → v1.8.10 reprova, **v1.9.0 passa**. Nenhum app deve adotar a v1.9.0.

**A causa foi minha:** commitei a v1.9.0 (docs) enquanto a v1.8.10 (código) ainda estava em aberto, e numerei por ordem em vez de pela linhagem. **Regra: versão de código e versão de documento saem na ordem em que o commit entrou na main — sem exceção.** A main tem a ordem certa (`9790570` → `85ea5ef` → `32e148b`); as tags é que saíram fora.

## Falsos em lock real (o achado do `agentepack-48`)

O check acusava **34 dependências** que **existem** no lock do AgentPackage (870 entradas, 167 aninhadas) — e a mensagem dizia _"o `npm ci` falha"_, **quando o `npm ci` passa**. Eram dois defeitos:

1. **Não resolvia aninhamento.** Uma dep de `node_modules/@babel/core` resolve primeiro em `node_modules/@babel/core/node_modules/<dep>`, e só cai no topo. Só olhar o topo acusava o que estava aninhado.
2. **Não resolvia pacote com escopo.** Em `node_modules/@babel/core`, subir um nível não é cortar na última barra — é cortar o pacote inteiro. E o nível sai **com** barra: `${dir}/${PREFIXO}${nome}` sem normalizar dá `…/core//node_modules/x` e nunca casa.

Além disso, o `jsesc` exigido por `@babel/generator` mora **irmão** do requerente (`node_modules/@babel/core/node_modules/jsesc`) — nem ancestral nem filho. A função `niveisVisiveis()` calcula os diretórios de busca pela ocorrência de `node_modules/` no caminho.

**Mensagem honesta (a regra):** sem mutação que reproduza o defeito, a mensagem **não afirma** que o defeito acontece. Agora diz:

> `node_modules/@babel/core/node_modules/@babel/generator declara "jsesc" (^3.0.2) e o lock não tem entrada para ela nem aninhada. Confirme com \`npm ci\`: se resolver em runtime, é falsa accusation.`

**Contraprova no lock real do AgentPackage: 0 falsos** (era 34). Mutação real nesse lock (remover `node_modules/@babel/core/node_modules/jsesc`) → **acusa**. Matriz de 8 casos sintéticos: aninhada presente **não**, aninhada removida **sim**, aninhada em workspace **não**, escopo aninhado **não**, opcional **não**, `peerDependency` **não**, transitiva sem entrada (a mutação da LB) **sim**, íntegro **não**.

Gates: 185/185 + 242/242 + `doc:check` + build, exit 0.

## [1.9.0] — 2026-10-01

Minor (`[NUI] a2ca4a03`, decisão de padrão). **A regra da `connect-src` para os 4 apps** — vinda de um conflito real no AgentPack, em que um gate exigia uma origem absoluta que o desenho de produção declara desnecessária. Sem mudança de código: o `@nomad/ui` não publica CSP.

### Documentado

- **`connect-src` e a origem que não se declara.** A pergunta que o gate tem de responder **não é "tem origem absoluta?"**, é **"a API é same-origin?"**:
  - **API na mesma origem** (cookie preso à origem que emitiu): `connect-src 'self'` está **certo e é o mais restritivo possível** — declarar a própria API explicitamente é mais largo, não mais seguro;
  - **API cross-origin**: a origem **tem** que estar na `connect-src`; resolver em runtime sem declarar quebra o `fetch` em produção;
  - **origem resolvida em runtime ausente da CSP** é **falha de boot**, não degradação silenciosa.
- **Nova pergunta no checklist de gate (§12): "o gate mede a coisa, ou a forma dela?"** Gate que exige sintaxe em vez de intenção reprova o certo e deixa passar o errado — a mesma classe do "verde que não prova". É o quarto item, ao lado dos três que já existiam.
- **Nenhum `ARG` de origem deveria poder ficar vazio em produção sem o build recusar.** Com default vazio, o `docker build` passa e o defeito só aparece como bloqueio de CSP no primeiro request.

## [1.8.9] — 2026-10-01

Patch (`[NUI] 232d5cd6`). **Corrige o diagnóstico da v1.8.8**, que atribuiu ao motor uma correção que não era dele. Só texto.

### Correção de texto

A v1.8.8 dizia que o `check-lock` não pegava o atalho do motor porque o `@nomad/ui` vivia em `pkg['fe'].dependencies` e `fe/package-lock.json` "nem existe". **Medido, as duas estavam erradas:**

- `fe/package-lock.json` **existe** (380 KB), e o `@nomad/ui` está em `packages[""]` — na **raiz**, não em workspace;
- o atalho `github:` está **nos dois lados** (`fe/package.json` e a raiz do lock), então a **v1.8.7 já pegava** — verificado rodando as duas versões contra o mesmo lock.

E o `resolved` do motor é **`null`**, não `git+ssh://`: o `git+ssh` que se vê é do `node_modules` local, não do lock commitado.

**Logo: a v1.8.8 é reforço, não a correção do motor.** O que fecha o motor é o `check-lock` desde a **v1.8.4**, que acusa o atalho na origem. O que a v1.8.8 acrescenta de fato é o caso em que o spec está **só** dentro de um workspace — esse a v1.8.7 deixava passar (medido: v1.8.7 não pega, v1.8.8 pega).

## [1.8.8] — 2026-10-01

Patch (`[NUI] 232d5cd6`). **`check-lock` passa a ler os workspaces** — pedido da `loadbalance-33`. Sem mudança de comportamento no pacote.

### Corrigido

- **O atalho `github:` declarado só dentro de um workspace deixou de passar.** O §3b comparava só o `package.json` **da raiz** com a raiz do lock; um spec declarado apenas em `pkg['<workspace>'].dependencies` do lock não era visto. Agora varre `dependencies`/`devDependencies`/`peerDependencies` de cada bloco de workspace, e a mensagem diz **onde** está (`workspace fe:dependencies`).

**Correção de diagnóstico (medido depois de publicar).** A nota anterior dizia que o motor era o caso que motivou a mudança, e **não é**: o `@nomad/ui` do motor está em `packages[""]` do `fe/package-lock.json`, com o atalho **nos dois lados** (`package.json` e raiz do lock) — e a v1.8.7 **já pegava**, verificado rodando as duas versões contra o mesmo lock. O que o motor tem de fato é `resolved: null` (não `git+ssh://`); o `git+ssh` que a sessão mediu vinha do `node_modules` local, não do lock commitado. **O v1.8.8 é reforço, não a correção do motor** — e o que fecha o motor é o `check-lock` desde a v1.8.4, que acusa o atalho na origem.

### Verificação (matriz medida, 4 acusam + 2 não)

| caso                                                          | resultado                          |
| ------------------------------------------------------------- | ---------------------------------- |
| divergência `package.json` × raiz do lock (o `f88ed6d` da LB) | acusa                              |
| `git+ssh://` no `resolved`                                    | acusa                              |
| atalho `github:` no `package.json`                            | acusa (2 problemas: atalho + ssh)  |
| atalho `github:` em workspace (motor)                         | acusa (2 problemas, com o caminho) |
| lock inteiro em `git+https://` legítimo                       | **não acusa**                      |
| projeto sem dependência de git                                | **não acusa**                      |

O caso da divergência é o que o `npm ci` **não** pega (medido na LB: 739 pacotes, exit 0) — e é exatamente o que sobrou no `3ca84a8`.

## [1.8.7] — 2026-10-01

Patch (`[NUI] 232d5cd6`). **Corrige uma simplificação da v1.8.5**, depois que a sessão do motor mediu o lock dela. Sem mudança de código.

### Documentado

- **O lock do consumidor faz duas coisas, e elas precisam ser separadas:** **fixa a versão** do pacote (por isso trocar só a tag no `package.json` pode manter o commit antigo em silêncio — foi o caso do motor na v1.5.0) **e não valida a árvore** dele (o npm resolve as dependências lendo o `package.json` do pacote). A v1.8.5 dizia "o lock prende o commit" e parava aí, o que sugeria que o lock validava mais do que valida.
- **As duas juntas são o que engana:** o lock do app "funciona" — fixa o commit certo — **e mesmo assim** entrega um pacote cujo próprio lock está quebrado. **Confirmado com o caso real do motor:** `npm ci` instala a **v1.6.2** (que tem `sonner` no `package.json` e fora do lock) e sai **exit 0**.

Isso refina a regra da v1.8.5 sem mudá-la: _gate de instalação do consumidor não prova instalação do fornecedor._ O que faltava era dizer **por quê** — não é que o lock é ignorado, é que ele só cobre metade do problema.

## [1.8.6] — 2026-10-01

Patch (`[NUI] 232d5cd6`, fecho). **Documenta os specs medidos dos 4 apps e o que fazer no bump.** Sem mudança de código.

### Documentado

- **Spec por app (medido nos repositórios, 2026-10-01):** loadbalance `git+https://…#v1.8.2` · conta_nommand, agent-package `git+https://…#v1.6.2` · **motor `github:PedroPaduelo/nomad-ui#v1.6.2`**.
- **O motor usa o atalho, e é o caso mais grave** porque o atalho é o que **produz** o ssh: com `github:` o próprio `npm install` já escreve `resolved: git+ssh://` no lock dele, sem ninguém pedir. **Ao bumpar, corrige o spec no mesmo commit** — trocar só a tag deixa o atalho quieto e o próximo `npm install` reintroduz o defeito.
- **Os 3 apps em v1.6.2 estão na versão com o defeito de lock** (`sonner` no `package.json`, ausente no `package-lock.json` — confirmado por `git show v1.6.2:` nos dois arquivos). Nenhum vai falhar no `npm ci` (o consumidor é cego, § abaixo); o sintoma apareceria em build limpo, e seria do app.

### Sem mudança de código

O `check-lock` do pacote já accuse o atalho (§3b) e o `gates:ci` já prova a instalação limpa. O que faltava era o **padrão** dizer qual spec usar e o que corrigir no bump — está agora em `docs/padrao-frontend.md` § "Consumo por tag", com a tabela dos 4.

## [1.8.5] — 2026-10-01

Patch (`[NUI] 232d5cd6`). Documenta a assimetria que o pacote tem em relação aos 4 apps — **não muda código**.

### Documentado

- **O `npm ci` de um app é cego para o lock do `@nomad/ui`.** Medido como consumidor: instalar a v1.8.1 (que tinha `sonner` faltando no lock) **passa** — `added 50 packages`, exit 0, com o `sonner` presente. O npm resolve a árvore do pacote lendo o `package.json` **dele**; o `package-lock.json` do pacote não entra na conta de nenhum consumidor.
- **A assimetria:** o `@nomad/ui` é o único projeto do stack em que **o lock é gate de produção dos outros**. Nenhum app detecta, pelo próprio `npm ci`, que o pacote está com lock quebrado. E quando algo falha, é por um sintoma do consumidor (o `git+ssh` no Dockerfile), não pelo lock do fornecedor.
- **A regra:** _gate de instalação do consumidor não prova instalação do fornecedor._ Por isso `check-lock` e `gates:ci` vivem no repositório do pacote — e por isso o bump do app **não pode** ser considerado validado só porque o `npm ci` do app passou.

Escrito em `docs/padrao-frontend.md` § "Consumo por tag", ao lado do que já falava do `git+ssh`. Os specs do LB e do motor ainda estão sendo medidos pelas sessões deles; a entrada não depende disso — a assimetria vale para qualquer dependência por git.

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
