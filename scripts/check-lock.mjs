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
    const version = packages[key].version
    if (version && !satisfies(version, range)) {
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

// 3) Dependência por `git+ssh` no lock quebra o CI de quem consome: o runner
//    não tem chave ssh e o `resolved` em ssh passa na máquina do dono. Já
//    apareceu em 3 projetos no mesmo dia (memória "gate tem camadas").
const ssh = Object.entries(packages).filter(([, v]) =>
  String(v.resolved ?? '').startsWith('git+ssh'),
)
for (const [key, v] of ssh) {
  problems.push(`${key}: "resolved" em git+ssh (${v.resolved}) — o CI não tem chave ssh`)
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
console.log(
  `✓ package-lock.json — ok (${Object.keys(pkg.dependencies ?? {}).length} deps, ` +
    `${Object.keys(pkg.devDependencies ?? {}).length} devDeps, ${Object.keys(packages).length} no lock)`,
)
