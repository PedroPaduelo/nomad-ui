#!/usr/bin/env node
/**
 * Prova de que o `scripts/` SAI no pacote e FUNCIONA de dentro de um app.
 *
 * Existe porque o `check-lock.mjs` estava no repositório e não no pacote, e o
 * efeito foi 3 apps manterem cópia divergente: a do load-balance era da v1.9.4
 * (38 linhas a menos), a do motor não tinha a regra de `ssh` e o cabeçalho
 * dela prometia uma proteção que o código não fazia. **"Adotou a tag" ≠ "tem o
 * gate"** — e nada no repositório denunciava isso, porque o verificador é o
 * próprio arquivo que não viaja.
 *
 *   node scripts/publish.test.mjs
 *
 * Sai com código 1 se algo estiver errado (para travar o gate).
 *
 * Não é `*.test.ts` de propósito: roda sem vitest, para o gate não depender do
 * runner — o mesmo motivo do `knowledge-summary.test.mjs`.
 *
 * ⚠️ O que este teste mede, e o que ele NÃO mede: ele prova que o **tarball**
 * traz o script e que o script roda no cwd de um app. Ele não prova que o app
 * amarre o gate ao `prebuild` — na Conta o `check-lock` rodando sozinho no CI
 * não pegava nada, e o valor dele foi estar dentro do `docker build`. Publicar
 * o arquivo é o que esta sessão entrega; **usá-lo é decisão de cada app.**
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const problems = []
const nota = (s) => console.log(s)

/**
 * `npm pack --json` escreve o JSON no stdout, mas o `prepare` roda `vite build`
 * ANTES dele e escreve o build no mesmo stdout. O JSON vem pretty-printed
 * (`[\n  {`), então casar a string `[{` não acha — foi o que aconteceu na
 * primeira versão, que morreu no `indexOf` achando que o stdout não tinha JSON.
 *
 * ⚠️ `cwd` é a RAIZ DO PACOTE, nunca `process.cwd()`. Este arquivo pode ser
 * rodado de dentro de um app que tem o pacote instalado (é assim que a Conta
 * o rodou, e reprovou com 5 "problemas" que nenhum era defeito do pacote):
 * com o `cwd` no app, o `npm pack` empacota o APP, o `package.json` lido é o do
 * app, e o gate acusa um pacote que está correto. O `cwd` do invocador é
 * justamente o que a contraprova usa como o lock a checar — as duas coisas
 * não podem ser o mesmo diretório.
 */
function empacotar(destino, raizDoPacote) {
  const out = execFileSync('npm', ['pack', '--json', '--pack-destination', destino], {
    cwd: raizDoPacote,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  })
  const achado = /\[\s*\{/.exec(out)
  if (!achado) throw new Error(`npm pack --json sem JSON no stdout:\n${out.slice(0, 400)}`)
  return JSON.parse(out.slice(achado.index))
}

/**
 * A raiz do pacote, encontrada pelo próprio script — não pelo `process.cwd()`.
 *
 * Este gate roda em três lugares, e os três têm o pacote em um diretório
 * diferente: no repo (o caso normal, `scripts/` ao lado do `package.json`), de
 * um app que o instalou (`node_modules/@nomad/ui/scripts/`), ou de um bundle.
 * A âncora é o próprio arquivo, que só existe dentro do pacote — se ele não
 * achar, é porque rodou de fora, e aí é melhor dizer isso do que acusar o
 * pacote de estar errado.
 */
function acharRaizDoPacote(aPartirDe) {
  let dir = aPartirDe
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, 'package.json'))) {
      const p = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      if (p.name === '@nomad/ui') return dir
    }
    const pai = dirname(dir)
    if (pai === dir) break
    dir = pai
  }
  return null
}

const raiz = mkdtempSync(join(tmpdir(), 'nomad-ui-publish-'))
try {
  // 0) Onde está o pacote? Não é o `process.cwd()`: o gate pode ser rodado de
  //    dentro de um app que tem o @nomad/ui instalado, e foi assim que a Conta
  //    o rodou. A âncora é o próprio arquivo (`import.meta.url`), que só
  //    existe dentro do pacote.
  const raizDoPacote = acharRaizDoPacote(dirname(fileURLToPath(import.meta.url)))
  if (!raizDoPacote) {
    problems.push(
      'não achei o package.json do @nomad/ui subindo a partir de scripts/ — este gate ' +
        'precisa rodar de dentro do pacote (no repo, ou de node_modules/@nomad/ui de um app)',
    )
    throw new Error('sem raiz do pacote')
  }
  // 1) O `files` tem que declarar `scripts/`. Se um dia alguém tirar, o
  //    empacotamento abaixo não acha o arquivo e o gate cai — a mutação é
  //    exatamente a linha que este teste protege.
  const pkg = JSON.parse(readFileSync(join(raizDoPacote, 'package.json'), 'utf8'))
  if (!pkg.files?.includes('scripts')) {
    problems.push('package.json → "files" não inclui "scripts" — o gate não viaja no pacote')
  }

  // 1b) A ÚLTIMA tag tem que estar no topo da `main` — nada de `main` à frente
  //     dela. Existe porque isso aconteceu na v1.10.0: a linha da versão
  //     recomendada foi para a `main` DEPOIS da tag, e quem instalou pela tag
  //     (que é como todo mundo consome) não recebeu a resposta. O sintoma é
  //     silencioso — a `main` estava certa, a tag é que ficou para trás, e
  //     ninguém olha a tag depois de criá-la.
  //
  //     Só mede em repo com histórico. Em tarball sem `.git` não há o que
  //     comparar, e o gate não pode ser a razão de um `npm ci` falhar.
  if (existsSync(join(raizDoPacote, '.git'))) {
    let ultima = ''
    try {
      ultima = execFileSync('git', ['tag', '--sort=-creatordate'], {
        cwd: raizDoPacote,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
        .split('\n')
        .filter(Boolean)[0]
      if (ultima) {
        // `spawnSync` e não `execFileSync`: `merge-base --is-ancestor` sai 1
        // justamente no caso que este gate quer reportar, e `execFileSync`
        // LANÇA nesse caso — o `catch` não distingue "a main andou" de
        // "repo sem histórico" e a mensagem saía errada. `spawnSync` devolve
        // o status e o caso vira uma asserção, não uma exceção.
        const anc = spawnSync('git', ['merge-base', '--is-ancestor', 'HEAD', ultima], {
          cwd: raizDoPacote,
        })
        if (anc.status === 0) {
          // HEAD está contido na tag: a tag é a boa.
        } else if (anc.status === 1) {
          const quantos = execFileSync('git', ['rev-list', '--count', `${ultima}..HEAD`], {
            cwd: raizDoPacote,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          }).trim()
          problems.push(
            `a \`main\` está ${quantos} commit(s) À FRENTE da última tag (${ultima}) — ` +
              'quem instalar por ela não recebe o que está na main. Publique a tag depois do commit, não antes.',
          )
        } else {
          problems.push(`git merge-base --is-ancestor falhou com status ${anc.status}: ${anc.stderr ?? ''}`)
        }
      }
    } catch (e) {
      // Só chega aqui se o `git tag` ou o `rev-list` quebrarem — o
      // `is-ancestor` não lança mais, é `spawnSync`. Repo sem histórico
      // utilizável (shallow, sem tag) não é motivo de reprovar.
      problems.push(
        `não consegui comparar a main com a última tag (${ultima || 'sem tag'}): ${e?.message ?? e}`,
      )
    }
  }

  // 2) O pacote tem que CONTER o script. `files` sozinho não basta: com
  //    `exports` declarado, o Node bloqueia o subpath com
  //    ERR_PACKAGE_PATH_NOT_EXPORTED (medido), então `files` sem `./scripts/*`
  //    publica o arquivo e ainda assim o app não consegue rodá-lo.
  //
  //    ⚠️ O `npm pack` só é possível NO REPO, e é lá que o gate tem que rodar.
  //    Do ponto de vista de um app que instalou o pacote, o `prepare` do
  //    pacote chama `vite`, que é devDependency e não vem no
  //    `node_modules` instalado — o `npm pack` morre com `vite: not found`
  //    (medido). Então o empacotamento é a verificação DO REPO; aqui, de um
  //    pacote já instalado, a mesma afirmação é medida lendo o próprio
  //    `package.json` e conferindo que o arquivo existe no disco. As duas
  //    medem a mesma coisa pelos dois lados, e cada uma onde ela é possível.
  const temGit = existsSync(join(raizDoPacote, '.git'))
  let tgz = null
  if (temGit) {
    tgz = empacotar(raiz, raizDoPacote)
    const arquivos = tgz[0].files.map((f) => f.path)
    if (!arquivos.includes('scripts/check-lock.mjs')) {
      problems.push(
        `o tarball não tem scripts/check-lock.mjs (tem ${arquivos.filter((a) => a.startsWith('scripts/')).length} arquivo(s) em scripts/)`,
      )
    }
  } else if (!existsSync(join(raizDoPacote, 'scripts', 'check-lock.mjs'))) {
    problems.push('o pacote instalado não tem scripts/check-lock.mjs — o que significaria files sem scripts')
  }
  if (!pkg.exports?.['./scripts/*']) {
    problems.push(
      'package.json → "exports" não tem "./scripts/*" — com `exports` declarado, o Node bloqueia o subpath e o arquivo publicado é inalcançável',
    )
  }

  // Roda um comando no `cwd` indicado e devolve o código em vez de lançar.
  // Declarada aqui porque os dois ramos a usam: o do app (passo 3b) e o do
  // repo (passos 3 e 4). Declarada depois, o ramo do app pegava
  // "Cannot access 'rodar' before initialization".
  const rodar = (argv, cwd) => {
    try {
      const r = execFileSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      return { code: 0, out: r }
    } catch (e) {
      return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
    }
  }

  // 3) Um app NOVO, sem cópia própria, tem que rodar o verificador. É esta a
  //    prova de que "entrega tudo" ficou de verdade: a partir daqui quem roda
  //    é o pacote instalado, não uma cópia que envelhece.
  //
  //    O lock do fixture é escrito à mão e tem ZERO dependência externa: o
  //    teste não depende de rede, e `npm install` do pacote local também não.
  const app = join(raiz, 'app')
  mkdirSync(app)
  const escrever = (dir, nome, obj) => writeFileSync(join(dir, nome), JSON.stringify(obj, null, 2) + '\n')

  const appPkg = { name: 'fixture-app', version: '1.0.0', private: true }
  const appLock = { name: 'fixture-app', version: '1.0.0', lockfileVersion: 3, requires: true, packages: {} }
  escrever(app, 'package.json', appPkg)
  escrever(app, 'package-lock.json', appLock)

  // Do app que JÁ TEM o pacote instalado não há tarball para instalar (o
  // `prepare` exige as devDependencies, que não vêm no `node_modules`
  // instalado). Aí a prova é outra e é a que importa para quem consome: o
  // verificador que está neste pacote roda no lock de um app real.
  //
  //  `rodouNoApp` pula os passos 3 e 4, que só fazem sentido no repo. Não é
  //  `throw`: exceção como controle de fluxo sairia pelo `catch` e viraria
  //  falha, que é exatamente o bug que a Conta encontrou.
  const rodouNoApp = !temGit
  if (rodouNoApp) {
    const lockReal = join(process.cwd(), 'package-lock.json')
    if (!existsSync(lockReal)) {
      problems.push(
        `rode de dentro de um app com package-lock.json (não achei ${lockReal}) — ` +
          'ou rode no repo, onde este gate valida o empacotamento',
      )
    } else {
      const r = rodar(['node', join(raizDoPacote, 'scripts', 'check-lock.mjs')], process.cwd())
      if (r.code !== 0) {
        problems.push(
          `o verificador deste pacote reprovou o lock do app que o instalou (exit ${r.code}): ${r.out.slice(0, 300)}`,
        )
      } else {
        nota(`· verificador rodou no lock do app (${process.cwd()})`)
      }
    }
  }

  if (!rodouNoApp) {
    execFileSync('npm', ['install', '--no-audit', '--no-fund', join(raiz, tgz[0].filename)], {
      cwd: app,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  }

  const instalado = join(app, 'node_modules', '@nomad', 'ui')
  if (!rodouNoApp && !JSON.parse(readFileSync(join(instalado, 'package.json'), 'utf8')).version) {
    problems.push('o @nomad/ui instalado não declara versão — o fixture não é prova de nada')
  }

  // Caminho literal e bin: as duas formas que um app usa. As duas têm que
  // rodar — a primeira é o que o `package.json` do app vai escrever, e a
  // segunda é o que não obriga ninguém a lembrar o caminho.
  if (!rodouNoApp) {
    const viaCaminho = rodar(['node', join(instalado, 'scripts', 'check-lock.mjs')], app)
    if (viaCaminho.code !== 0) {
      problems.push(`o verificador não roda pelo caminho no app (exit ${viaCaminho.code}): ${viaCaminho.out.slice(0, 300)}`)
    }
    const viaBin = rodar([join(app, 'node_modules', '.bin', 'check-lock-nomad')], app)
    if (viaBin.code !== 0) {
      problems.push(`o bin check-lock-nomad não roda no app (exit ${viaBin.code}): ${viaBin.out.slice(0, 300)}`)
    }

    // 4) Contraprova: lock íntegro tem que PASSAR, e lock com defeito tem que
    //    CAIR. Gate que só tem mutação é metade do gate (regra da §12 do padrão):
    //    se o verificador acusasse qualquer coisa, ele seria desligado — e aí não
    //    sobrava nada. O `cwd` é o do app, que é o que prova que ele lê o lock de
    //    quem chamou, e não o do pacote.
    const lockDefeito = JSON.parse(readFileSync(join(app, 'package-lock.json'), 'utf8'))
    lockDefeito.packages['node_modules/alice'] = { version: '1.0.0', resolved: 'git+ssh://git@github.com/x/alice.git#abc' }
    lockDefeito.packages['node_modules/@nomad/ui'] = { version: '1.0.0', dependencies: { alice: '^1.0.0' } }
    escrever(app, 'package-lock.json', lockDefeito)

    const comDefeito = rodar(['node', join(instalado, 'scripts', 'check-lock.mjs')], app)
    if (comDefeito.code === 0) {
      problems.push(
        'o verificador PASSOU num lock com `git+ssh` e uma transitiva sem entrada — o gate não pega o defeito que a v1.8.10 disse pegar',
      )
    } else if (!/git\+ssh/.test(comDefeito.out)) {
      problems.push(`o verificador caiu por outro motivo que não é o defeito: ${comDefeito.out.slice(0, 300)}`)
    }
  }
} finally {
  rmSync(raiz, { recursive: true, force: true })
}

if (problems.length) {
  console.error(`✗ scripts/ publicado — ${problems.length} problema(s):`)
  for (const p of problems) console.error(`  · ${p}`)
  process.exit(1)
}
nota(`✓ scripts/ publicado e funcional num app limpo — tarball, caminho, bin e contraprova`)
