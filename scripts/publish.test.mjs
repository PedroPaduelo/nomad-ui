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
import { join } from 'node:path'

const problems = []
const nota = (s) => console.log(s)

/**
 * `npm pack --json` escreve o JSON no stdout, mas o `prepare` roda `vite build`
 * ANTES dele e escreve o build no mesmo stdout. O JSON vem pretty-printed
 * (`[\n  {`), então casar a string `[{` não acha — foi o que aconteceu na
 * primeira versão, que morreu no `indexOf` achando que o stdout não tinha JSON.
 */
function empacotar(destino) {
  const out = execFileSync('npm', ['pack', '--json', '--pack-destination', destino], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  })
  const achado = /\[\s*\{/.exec(out)
  if (!achado) throw new Error(`npm pack --json sem JSON no stdout:\n${out.slice(0, 400)}`)
  return JSON.parse(out.slice(achado.index))
}

const raiz = mkdtempSync(join(tmpdir(), 'nomad-ui-publish-'))
try {
  // 1) O `files` tem que declarar `scripts/`. Se um dia alguém tirar, o
  //    empacotamento abaixo não acha o arquivo e o gate cai — a mutação é
  //    exatamente a linha que este teste protege.
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
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
  if (existsSync('.git')) {
    let ultima = ''
    try {
      ultima = execFileSync('git', ['tag', '--sort=-creatordate'], {
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
        const anc = spawnSync('git', ['merge-base', '--is-ancestor', 'HEAD', ultima])
        if (anc.status === 0) {
          // HEAD está contido na tag: a tag é a boa.
        } else if (anc.status === 1) {
          const quantos = execFileSync('git', ['rev-list', '--count', `${ultima}..HEAD`], {
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

  // 2) O tarball tem que CONTER o script. `files` sozinho não basta: com
  //    `exports` declarado, o Node bloqueia o subpath com
  //    ERR_PACKAGE_PATH_NOT_EXPORTED (medido), então `files` sem `./scripts/*`
  //    publica o arquivo e ainda assim o app não consegue rodá-lo.
  const tgz = empacotar(raiz)
  const arquivos = tgz[0].files.map((f) => f.path)
  if (!arquivos.includes('scripts/check-lock.mjs')) {
    problems.push(
      `o tarball não tem scripts/check-lock.mjs (tem ${arquivos.filter((a) => a.startsWith('scripts/')).length} arquivo(s) em scripts/)`,
    )
  }
  if (!pkg.exports?.['./scripts/*']) {
    problems.push(
      'package.json → "exports" não tem "./scripts/*" — com `exports` declarado, o Node bloqueia o subpath e o arquivo publicado é inalcançável',
    )
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

  execFileSync('npm', ['install', '--no-audit', '--no-fund', join(raiz, tgz[0].filename)], {
    cwd: app,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const instalado = join(app, 'node_modules', '@nomad', 'ui')
  if (!JSON.parse(readFileSync(join(instalado, 'package.json'), 'utf8')).version) {
    problems.push('o @nomad/ui instalado não declara versão — o fixture não é prova de nada')
  }

  // Caminho literal e bin: as duas formas que um app usa. As duas têm que
  // rodar — a primeira é o que o `package.json` do app vai escrever, e a
  // segunda é o que não obriga ninguém a lembrar o caminho.
  const rodar = (argv) => {
    try {
      const r = execFileSync(argv[0], argv.slice(1), { cwd: app, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      return { code: 0, out: r }
    } catch (e) {
      return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
    }
  }

  const viaCaminho = rodar(['node', join(instalado, 'scripts', 'check-lock.mjs')])
  if (viaCaminho.code !== 0) {
    problems.push(`o verificador não roda pelo caminho no app (exit ${viaCaminho.code}): ${viaCaminho.out.slice(0, 300)}`)
  }
  const viaBin = rodar([join(app, 'node_modules', '.bin', 'check-lock-nomad')])
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

  const comDefeito = rodar(['node', join(instalado, 'scripts', 'check-lock.mjs')])
  if (comDefeito.code === 0) {
    problems.push(
      'o verificador PASSOU num lock com `git+ssh` e uma transitiva sem entrada — o gate não pega o defeito que a v1.8.10 disse pegar',
    )
  } else if (!/git\+ssh/.test(comDefeito.out)) {
    problems.push(`o verificador caiu por outro motivo que não é o defeito: ${comDefeito.out.slice(0, 300)}`)
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
