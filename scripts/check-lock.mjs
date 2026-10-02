#!/usr/bin/env node
/**
 * Verificador de sincronia do `package-lock.json` (PKG-FIXES 58551c13).
 *
 * Existe porque o `sonner` entrou no `package.json` na v1.3.0 e nunca foi para
 * o lock — e **ninguém percebeu por ~20 versões**. A causa é silenciosa: o
 * fluxo do dia a dia é `npm install`, que "conserta" o lock sem reclamar e
 * deixa o working tree sujo que ninguém commita. O pacote segue instalando
 * localmente, os 185 testes passam, e quem usa o lock recebe
 * `EUSAGE … are not in sync` no `npm ci` — o build de qualquer consumidor.
 *
 * Aqui a dependência é usada por `Toaster`/`useToast`, então o sintoma para
 * quem consome é "o toast some" ou o build quebra, não um erro legível.
 *
 *   node scripts/check-lock.mjs
 *
 * Sai com código 1 se algo estiver errado (para travar o gate).
 */
import { readFileSync } from 'node:fs'

const problems = []

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const pkg = readJson('package.json')
const lock = readJson('package-lock.json')

/**
 * O range do package.json contra a versão que o lock instala. Só o que o
 * `npm ci` pode encontrar: `^`, `~`, `>=`, `=`, `*` e os dois operadores
 * compostos (`^1.2.3 || ^2.0.0`). Sem dependência nova — um `semver` aqui
 * viraria mais uma coisa para instalar.
 */
function satisfies(version, range) {
  const cmp = (a, b) => {
    const pa = String(a).split('.').map(Number)
    const pb = String(b).split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      const d = (pa[i] ?? 0) - (pb[i] ?? 0)
      if (d !== 0) return d < 0 ? -1 : 1
    }
    return 0
  }
  return String(range)
    .split('||')
    .some((part) =>
      part
        .trim()
        .split(/\s+/)
        .every((clause) => {
          const m = /^(\^|~|>=|<=|>|<|=)?(.+)$/.exec(clause)
          if (!m) return false
          const [, op = '=', alvo] = m
          if (alvo === '*' || alvo === 'latest') return true
          const d = cmp(version, alvo)
          switch (op) {
            case '^': {
              const zero = alvo.split('.')[0] === '0'
              if (d < 0) return false
              if (zero) return cmp(version, `${alvo.split('.')[0]}.${alvo.split('.')[1] ?? 0}`) >= 0
              return true
            }
            case '~':
              return (
                d >= 0 &&
                cmp(version, `${alvo.split('.')[0]}.${Number(alvo.split('.')[1] ?? 0) + 1}`) < 0
              )
            case '>=':
              return d >= 0
            case '>':
              return d > 0
            case '<=':
              return d <= 0
            case '<':
              return d < 0
            default:
              return d === 0
          }
        }),
    )
}

const packages = lock.packages ?? {}
const root = packages[''] ?? {}

// 1) Toda dependência declarada tem que estar no lock, na versão que a raiz
//    do lock declara. É o que o `npm ci` valida antes de instalar qualquer
//    coisa — se divergir, ele nem chega a instalar.
for (const section of ['dependencies', 'devDependencies']) {
  const declared = pkg[section] ?? {}
  const locked = root[section] ?? {}
  for (const [name, range] of Object.entries(declared)) {
    const key = `node_modules/${name}`
    if (!packages[key]) {
      problems.push(
        `${section}: "${name}" (${range}) está no package.json e NÃO está no package-lock.json — o \`npm ci\` falha com EUSAGE`,
      )
      continue
    }
    // A raiz do lock repete o range do package.json. Quando ela diverge, o
    // `npm ci` **não** reclama (medido: instalar com `zod ^3.0.0` na raiz do
    // lock e `^4` no package.json passa), mas resolve a árvore pela raiz do
    // lock — ou seja, instala uma versão que o app não pediu. Por isso a
    // comparação é com a versão **instalada**, que é o que o `npm ci` usa.
    if (locked[name] !== undefined && locked[name] !== range) {
      problems.push(
        `${section}: "${name}" é "${range}" no package.json e "${locked[name]}" na raiz do lock — divergência que o \`npm ci\` não acusa`,
      )
    }
    // Dependência sem range de semver: o "version" no lock é o commit
    // (`0.0.0` ou um número derivado) ou o protocolo de origem, e comparar com
    // `satisfies()` acusaria uma dependência legítima. O shorthand da seção 3b
    // é o que precisa ser pego nesses casos.
    //
    // ⚠️ A lista tem que ser a MESMA da §2b (`file:`, `link:`, `workspace:`
    // incluidos). Sem isso o script se contradizia: instalando `@nomad/ui` de
    // um tarball local, o §1 acusava "1.9.9" contra o spec `file:…tgz` — e o
    // `npm ci` a instala sem reclamar (medido em scripts/publish.test.mjs).
    const semRange = /^(git\+|github:|gitlab:|bitbucket:|https?:\/\/|git:\/\/|file:|link:|workspace:)/.test(
      range,
    )
    const version = packages[key].version
    if (version && !semRange && !satisfies(version, range)) {
      problems.push(
        `${section}: "${name}" pede "${range}" mas o lock instala ${version} — \`npm ci\` não instala o que foi pedido`,
      )
    }
  }
}

// 2) O inverso: dependencia na raiz do lock que não está no package.json.
//    Sem isso o pacote instala algo que ninguém pediu, ou que foi removdo e
//    ficou. A comparação é sobre o conjunto das duas seções: o mesmo pacote
//    pode estar em `dependencies` no package.json e em `devDependencies` na
//    raiz do lock sem que isso seja um problema (o npm move o que é de build).
const declared = {
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {}),
}
for (const section of ['dependencies', 'devDependencies']) {
  for (const name of Object.keys(root[section] ?? {})) {
    if (!declared[name]) {
      problems.push(`${section}: "${name}" está na raiz do lock mas não no package.json`)
    }
  }
}

// 2b) Dependência TRANSITIVA exigida por um pacote INSTALADO, sem entrada que
//     a resolva. O check (1) só enxerga o que o app declara direto — o
//     `sonner` do `@nomad/ui` é transitivo e escapava. Achado pela
//     `loadbalance-33` rodando a mutação aqui: o gate passava.
//
//     **A resolução é a do npm, não a minha (v1.9.1).** Uma dependência
//     declarada por `node_modules/@babel/core` resolve primeiro em
//     `node_modules/@babel/core/node_modules/<dep>` e só cai no topo. Só
//     olhar o topo acusava `semver` no lock real do AgentPackage, que tem 139
//     entradas aninhadas — e acusar caso legítimo é pior que não acusar
//     (regra da §12 do padrão).
//
//     Só conta dependência de runtime de pacote instalado: `peerDependencies`
//     e `devDependencies` de um transitive são opcionais por desenho, e bloco
//     com `optional: true` é binário de outra plataforma — é o npm dizendo
//     que não é exigido aqui.
const PREFIXO = 'node_modules/'

/**
 * O pacote exige `nome`? O npm procura do mais interno ao mais externo:
 * `node_modules/@babel/core` resolve primeiro em
 * `node_modules/@babel/core/node_modules/<dep>` e só cai no topo.
 *
 * A parte difícil é o **escopo** (`@babel/core`): subir um nível não é cortar
 * na última barra, é cortar o pacote inteiro — `node_modules/@babel/core` sobe
 * para `node_modules/@babel` e daí para o topo. E o prefixo leva a barra,
 * senão o caminho sai `…/@babel/corenode_modules/x` e a dependência some
 * (foi exatamente o que aconteceu na primeira versão, dói record).
 */
/**
 * Diretórios onde o npm procura uma dependência de `chave`, do mais interno ao
 * mais externo.
 *
 * O caminho é uma alternância de `node_modules/<pacote>`. Cada ocorrência de
 * `node_modules/` delimita um nível, e o diretório de busca é o que existe
 * **antes** do pacote seguinte:
 *
 *   node_modules/@babel/core/node_modules/@babel/generator
 *   └────────── busca 1 ─────────┘└──── busca 2 ────┘
 *
 * É por isso que subir "um pacote" não basta: o `jsesc` exigido pelo
 * `generator` mora em `node_modules/@babel/core/node_modules/jsesc`, **irmão**
 * do requerente, e não é ancestral nem filho. Sem este cálculo o lock real do
 * AgentPackage (870 entradas, 167 aninhadas) acusava falsos.
 */
function niveisVisiveis(chave) {
  const pos = []
  for (let i = chave.indexOf(PREFIXO); i !== -1; i = chave.indexOf(PREFIXO, i + 1)) pos.push(i)
  const niveis = pos.map((ini, k) => {
    const fim = k + 1 < pos.length ? pos[k + 1] : chave.length
    return chave.slice(0, fim)
  })
  niveis.push(chave)
  // Os níveis saem JÁ com barra no fim (são cortes na ocorrência seguinte), e
  // a chave não tem. Sem normalizar, `${dir}/${PREFIXO}${nome}` sai com barra
  // dupla (`…/core//node_modules/x`) e nunca casa — foi o que deixou 11 (depois
  // 21) falsos no lock do AgentPackage.
  return [...new Set(niveis)].filter((x) => x !== '').map((x) => x.replace(/\/+$/, ''))
}

function resolveEntrada(deQuem, nome) {
  for (const dir of niveisVisiveis(deQuem)) {
    const cand = `${dir}/${PREFIXO}${nome}`
    if (packages[cand]) return cand
  }
  return packages[PREFIXO + nome] ? PREFIXO + nome : null
}

for (const [key, bloco] of Object.entries(packages)) {
  if (!key.startsWith(PREFIXO) || !bloco || typeof bloco !== 'object') continue
  if (bloco.optional === true) continue
  const opcionais = new Set(Object.keys(bloco.optionalDependencies ?? {}))
  for (const [nome, spec] of Object.entries(bloco.dependencies ?? {})) {
    if (opcionais.has(nome)) continue
    if (resolveEntrada(key, nome)) continue
    if (/^(git\+|https?:|file:|link:|workspace:)/.test(String(spec))) continue
    // **A mensagem não afirma que o `npm ci` falha** (v1.9.1): a ausência da
    // entrada no lock PODE resolver em runtime. Gate que afirma defeito sem
    // mutação que o reproduza manda a pessoa consertar algo que não está
    // quebrado — ver a regra nova na §12.
    problems.push(
      // A mensagem não afirma que o `npm ci` falha, porque para dependência
      // por **git** ele **não** falha: sai 0 e não instala (medido). Aponta o
      // caminho que de fato importa — o campo `dependencies` do requerente.
      `${key} declara "${nome}" (${spec}) e o lock não tem entrada para ela nem aninhada. Se este veio por git, o \`npm ci\` aceita e nao instala — confira o "dependencies" do requerente.`,
    )
  }
}

// 3) Dependência de git por ssh quebra o CI de quem consome: o runner não tem
//    chave ssh, e na máquina do dono passa. Já apareceu em 3 projetos no mesmo
//    dia (memória "gate tem camadas").
const ssh = Object.entries(packages).filter(([, v]) =>
  String(v.resolved ?? '').startsWith('git+ssh'),
)
for (const [key, v] of ssh) {
  problems.push(`${key}: "resolved" em git+ssh (${v.resolved}) — o CI não tem chave ssh`)
}

// 3b) A ORIGEM do ssh: o shorthand `github: dono/repo#ref` (e `gitlab:`,
//     `bitbucket:`) no `package.json`. Medido: `npm install` reescreve
//     `github:…` para `git+ssh://git@github.com/…` no lock — o package.json
//     parece innocent e o ssh só aparece depois. O LB levou 6 generating
//     lock até isso virar `EUSAGE` no build. Pega na fonte, antes do lock.
// `package.json` E cada workspace dele: no motor o `@nomad/ui` vive em
// `pkg['fe'].dependencies` do lock, e é lá que o atalho `github:` aparece.
const specs = []
for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
  for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
    specs.push([`package.json:${section}`, name, spec])
  }
}
for (const [rota, bloco] of Object.entries(packages)) {
  if (rota === '' || !bloco || typeof bloco !== 'object') continue
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, spec] of Object.entries(bloco[section] ?? {})) {
      specs.push([`${rota === '' ? 'lock' : `workspace ${rota}`}:${section}`, name, spec])
    }
  }
}
for (const [onde, name, spec] of specs) {
  const valor = String(spec)
  if (/^(github|gitlab|bitbucket):/.test(valor) && !valor.startsWith('git+')) {
    problems.push(
      `${onde}: "${name}" usa o shorthand "${valor}" — o \`npm install\` escreve isso como git+ssh no lock e o CI não tem chave. Use git+https://`,
    )
  }
}

// 3c) A INVERSÃO de workspace: o que um lugar pede (`spec`) contra o que o
//     outro instalou (`version`). É a §1 levada para o monorepo.
//
//     Existe porque o §1 compara a raiz do lock com o `package.json` **do
//     mesmo diretório** — e em workspace os dois não são o mesmo lugar. Medido
//     (motor, `76dd00a`): lock da raiz com `@nomad/ui` em `1.9.2` e o `fe`
//     declarando `v1.10.1` passa nos três verificadores ao mesmo tempo —
//     `check-lock` do pacote, o `check-lock-root` do motor e o `npm ci
//     --dry-run`. Cinco horas de bump pela metade com a suíte inteira verde.
//
//     **O `npm` resolve pelo `version` instalado, não pelo `resolved`**, então
//     é a entrada velha que sai na imagem e o `resolved` correto não salva
//     nada (medido). E o `npm ci` não acusa: ele lê a entrada da raiz como
//     derivada.
//
//     ⚠️⚠️ **E "divergência" aqui tem que ser DISTINGUÍVEL de um conflito de tag
//     que o npm já resolveu** — a primeira versão desta seção não era, e o
//     revisor independente mediu o estrago. Com a raiz pedindo `#v1.0.1` e o
//     `fe` pedindo `#v1.0.0` da mesma dep por git, o npm **hoista** e entrega
//     ao `fe` a versão da raiz, sem entrada aninhada (medido, lock gerado pelo
//     próprio npm). A seção acusava esse lock — que o npm julga correto — e
//     mandava "regere o lock"; regerar produz **lock idêntico** (medido),
//     porque é assim que o npm resolve. Gate que manda fazer algo que não
//     muda nada é §12 de novo: a pessoa obedece, não vê diferença, desliga.
//
//     ⚠️ **Quem pega o caso do motor é esta seção e não o §1** (medido: rodando
//     na raiz, o §1 não vê a dep porque ela está declarada só no `fe`).
//
//     A mensagem dá os DOIS consertos porque só quem olha o `package.json` do
//     outro lado sabe qual é, e eles são diferentes: se o outro lado pede a
//     mesma tag que está instalada, é lock velho e regenerar resolve; se pede
//     outra tag, é divergência entre lados e regenerar não muda nada.
for (const [rota, bloco] of Object.entries(packages)) {
  if (!bloco || typeof bloco !== 'object') continue
  // ⚠️ A rota `''` (a raiz do lock) PARTICIPA, e sem ela o caso invertido
  // escapava: raiz do lock pedindo `v1.9.2` com um workspace pedindo `v1.10.1`
  // passava, e é a direção que mais custa — é a que sai na imagem.
  for (const [name, spec] of Object.entries(bloco.dependencies ?? {})) {
    const pedido = String(spec)
    // Só spec de tag: é o caso do @nomad/ui e de qualquer pacote por git fixado
    // em tag. Spec de range (`^1.2.3`) não tem "a versão certa" — comparar
    // seria acusar o caso legítimo, e gate que acusa caso legítimo é desligado.
    const porTag = /[#&]v?\d+\.\d+\.\d+/.exec(pedido)?.[0]
    if (!porTag) continue
    const instalado = resolveEntrada(rota, name)
    if (!instalado) continue
    const version = packages[instalado]?.version
    if (!version) continue
    // Compara VERSÃO, não string: o `spec` é `#v1.10.1` e o `version` do
    // lock é `1.10.1`. Comparar os dois literalmente acusava o caso
    // LEGÍTIMO em que os dois concordam — e a contraprova reprovou, que é o
    // pior desfecho de um gate (regra da §12: falso-positivo é desligado).
    const pedidoVersion = porTag.replace(/^[#&]v?/, '')
    if (pedidoVersion === version.replace(/^v/, '')) continue
    const de = rota === '' ? 'a raiz' : `workspace ${rota}`
    // Quem mais pede essa MESMA dep, e com qual tag? Sem isso a mensagem
    // oferecer "regere o lock" como conserto principal seria errada metade das
    // vezes: quando os dois lados pedem tags DIFERENTES, o npm hoista e
    // regenerar dá lock idêntico (medido). Com o dado, o conserto é o certo.
    const outros = []
    for (const [outraRota, outroBloco] of Object.entries(packages)) {
      if (outraRota === rota || !outroBloco || typeof outroBloco !== 'object') continue
      const outroSpec = String(outroBloco.dependencies?.[name] ?? '')
      const achado = /[#&]v?\d+\.\d+\.\d+/.exec(outroSpec)
      if (!achado) continue
      outros.push({
        onde: outraRota === '' ? 'a raiz' : `workspace ${outraRota}`,
        tag: achado[0].replace(/^[#&]v?/, ''),
      })
    }
    const conserto = outros.length
      ? `alinhe as tags — ${de} pede ${pedidoVersion} e ${outros.map((o) => `${o.onde} pede ${o.tag}`).join(', ')}; o npm hoista e entrega a mesma versão para os dois lados, então regenerar o lock não muda nada`
      : 'regere o lock a partir do `package.json` desta tag — nenhum outro lado pede essa dep, então o lock está velho'
    problems.push(
      `${de} pede "${name}" em "${porTag}" e o lock instala ${version} para ela. ` +
        '`npm ci` NÃO acusa e sai a versão do `version`, não do `resolved`. ' +
        `Para corrigir: ${conserto}.`,
    )
  }
}

// 4) O lock precisa ter `lockfileVersion` e a lista de pacotes; sem isso o
//    arquivo está truncado e o erro do npm é ilegível.
if (!lock.lockfileVersion) problems.push('package-lock.json sem "lockfileVersion"')
if (Object.keys(packages).length === 0) problems.push('package-lock.json sem "packages"')

if (problems.length) {
  console.error(`✗ package-lock.json — ${problems.length} problema(s):`)
  for (const p of problems) console.error(`  · ${p}`)
  process.exit(1)
}
// A versão vai na saída de propósito: quem copia este script para o app
// precisa saber de onde veio, porque a cobertura MUDA entre versões (a
// v1.8.10 adicionou a dependência transitiva). Copiar de uma tag antiga e
// acreditar que "o gate passa" não prova nada.
console.log(
  `✓ package-lock.json — ok (${Object.keys(pkg.dependencies ?? {}).length} deps, ` +
    `${Object.keys(pkg.devDependencies ?? {}).length} devDeps, ${Object.keys(packages).length} no lock)` +
    ` · @nomad/ui ${pkg.version ?? 'sem versão'} check-lock`,
)
