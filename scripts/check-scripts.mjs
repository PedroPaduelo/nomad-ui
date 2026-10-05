#!/usr/bin/env node
/**
 * Gate das duas regras do §5 do padrão que NENHUM gate media (medido em
 * 2026-10-02 pela auditoria `9c722d58`, confirmado aqui):
 *
 *   1. **data/hora sempre com `timeZone`** — sem ele o mesmo dado sai em dia
 *      diferente e em idioma diferente conforme a máquina de quem renderizou;
 *   2. **subpath em vez de barrel, fora do `main.tsx`** — o barrel reexporta
 *      `ThemeProvider`, que é contexto de React.
 *
 * Por que este arquivo existe: as duas regras estavam escritas no padrão e
 * nenhuma era medida. Gate que não roda é decoração (§12).
 *
 *   node scripts/check-scripts.mjs                  # mede este repo
 *   node scripts/check-scripts.mjs --raiz ../motor/fe  # mede o fe do motor
 *
 * Sai com código 1 se algum app estiver PIOR que o baseline.
 *
 * ⚠️ **Contagem POR CHAMADA, nunca por linha.** `timeZone` pode estar na
 * linha seguinte (`{ day, month, year }` em multi-linha) e o grep de linha
 * dá falso positivo. Foi assim que os "11" saíram errados — 11 é só do motor.
 * Aqui a leitura equilibra parênteses e ignora o que está dentro de string.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Só funções de DATA e NÚMERO. `toLocaleLowerCase`/`toLocaleUpperCase` são
 * caixa de string: `timeZone` não existe para elas, e incluí-las acusaria
 * caso legítimo (§12 — o gate que acusa o certo é desligado).
 */
const RE_CHAMADA =
  /\b(toLocaleDateString|toLocaleTimeString|toLocaleString|Intl\s*\.\s*(?:DateTimeFormat|NumberFormat|RelativeTimeFormat|ListFormat|Segmenter))\s*\(/g

/**
 * Diretórios que não são fonte do app. `node_modules` é obrigatório: sem ele
 * o gate mede as bibliotecas instaladas (medido: `date-fns` e `dayjs` entram
 * na contagem e o número vira ruído). Os demais são build e cache.
 */
const IGNORAR_DIR = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.cache',
  '.wt',
  '.ref',
  '.worktrees',
])

const EXTENSOES = /\.(ts|tsx|js|jsx|mjs|cjs)$/

/** Arquivos minificados/vendorizados não são fonte do app. */
function ehVendorizado(nome, src) {
  return nome.endsWith('.min.js') || src.length > 300_000
}

/** Um `main.tsx`/`providers.tsx` é onde o barrel é legítimo (§5). */
function ehPortaoBarrel(rel) {
  return /(^|\/)(main|providers)\.[jt]sx$/.test(rel)
}

/**
 * Tira comentários e o CONTEÚDO de literais, deixando o código.
 *
 * ⚠️ **Isto não é cosmético: é o que impede o gate de medir a si mesmo.** A
 * primeira versão contou os `toLocaleDateString('pt-BR')` que aparecem no
 * JSDOC deste arquivo e no texto do padrão, e o gate reprovava o estado bom
 * (3 falsos no próprio verificador). Gate que acusa o arquivo que o contém
 * é desligado na primeira execução (§12).
 *
 * ⚠️⚠️ **O substituto por regex NÃO serve, e foi o que a segunda versão fez.**
 * Apagar o template inteiro com `/`…`/g` leva junto o `${…}` — que é CÓDIGO:
 * em `params.push(`maxTok: ${key.maxTokens.toLocaleString()}`)` some a chamada
 * inteira, e o gate passou a medir **3** `toLocaleString()` sem argumento no
 * load-balance onde são **6** (medido: `constants.ts:15` e `:18` deixavam de
 * contar). Gate que perde o defeito é pior que gate que não existe: ele
 * autoriza. Por isso o leitor abaixo anda caractere a caractere, e dentro de
 * `${…}` ele volta a tratar como código.
 *
 * Não é um parser de verdade e não precisa ser: basta para que `toLocale…(`
 * dentro de comentário ou de string não seja conta como chamada. O modo de
 * falha que importa — não ter medido nada — é coberto pelo §2 do gate.
 */
/**
 * Mascara que **preserva o comprimento**: cada caractere vira espaço, exceto
 * os de código, e nada é encurtado.
 *
 * ⚠️ Existe separada da `soCodigo` por um motivo medido: `soCodigo` troca o
 * ESCAPAMENTO (`\\` vira 2 espaços) e por isso devolve um texto mais curto
 * que a entrada (medido: 7579 chars para 7972). Offset de um não vale no
 * outro — a conferência que o barrel faz cruzando os dois textos lia a
 * posição errada e a contagem saía 18 em vez de 24. A regra que vem da
 * §12 do "`git show` falho vira hash de vazio" vale igual aqui: **o número
 * que não tem método reproduzível não é transferível.**
 *
 * Só comentários viram espaço. Strings continuam lá de propósito, porque é
 * da string que vem o especificador `'@nomad/ui'`.
 */
function mascaraComentario(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const d = src[i + 1]
    if (c === '/' && d === '*') {
      const fim = src.indexOf('*/', i + 2)
      const ate = fim === -1 ? src.length : fim + 2
      out += ' '.repeat(ate - i)
      i = ate
      continue
    }
    if (c === '/' && d === '/') {
      const fim = src.indexOf('\n', i)
      const ate = fim === -1 ? src.length : fim
      out += ' '.repeat(ate - i)
      i = ate
      continue
    }
    out += c
    i++
  }
  return out
}

function soCodigo(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const d = src[i + 1]

    // comentário de bloco
    if (c === '/' && d === '*') {
      const fim = src.indexOf('*/', i + 2)
      i = fim === -1 ? src.length : fim + 2
      out += ' '
      continue
    }
    // comentário de linha (não é `//` de URL dentro de string: aqui só
    // fora de literal, que é o único lugar que importa)
    if (c === '/' && d === '/') {
      const fim = src.indexOf('\n', i)
      i = fim === -1 ? src.length : fim
      out += ' '
      continue
    }
    // aspas simples e duplas: some o conteúdo, mantém as aspas
    if (c === "'" || c === '"') {
      out += c
      i++
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2
          continue
        }
        if (src[i] === c) break
        out += src[i] === '\n' ? '\n' : ' '
        i++
      }
      out += c
      i++
      continue
    }
    // template literal: o texto some, o `${…}` é código e fica
    if (c === '`') {
      out += '`'
      i++
      while (i < src.length) {
        if (src[i] === '\\') {
          out += '  '
          i += 2
          continue
        }
        if (src[i] === '`') {
          out += '`'
          i++
          break
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          // código dentro do template: passa por cima sem tocar
          out += '${'
          i += 2
          let prof = 1
          while (i < src.length && prof > 0) {
            if (src[i] === '{') prof++
            else if (src[i] === '}') prof--
            if (prof > 0) out += src[i]
            i++
          }
          out += '}'
          continue
        }
        out += src[i] === '\n' ? '\n' : ' '
        i++
      }
      continue
    }
    out += c
    i++
  }
  return out
}

/**
 * Devolve o texto entre os parênteses da chamada que começa em `openIdx`,
 * ou `null` se não fechar. Ignora parênteses dentro de string — sem isso,
 * `toLocaleDateString('pt-BR')` com um `)` no texto fecha na hora errada.
 */
function argumentosDa(src, openIdx) {
  let profundidade = 0
  let i = openIdx
  let string = null
  while (i < src.length) {
    const c = src[i]
    if (string) {
      if (c === '\\') i++
      else if (c === string) string = null
    } else if (c === '"' || c === "'" || c === '`') string = c
    else if (c === '(') profundidade++
    else if (c === ')') {
      profundidade--
      if (profundidade === 0) return src.slice(openIdx + 1, i)
    }
    i++
  }
  return null
}

/**
 * ⚠️ `skipIf` aqui é a armadilha que a §12 descreve: uma condição de pulo
 * quedepende de variável que ninguém define produz **verde com a medição
 * não feita**. Por isso `temLinhas`/`temBarrel` são contagens reais e o
 * gate reprova quando elas são zero — ver `medir()`.
 */
function* arquivos(raiz) {
  for (const entrada of readdirSync(raiz, { withFileTypes: true })) {
    if (entrada.isDirectory()) {
      if (IGNORAR_DIR.has(entrada.name)) continue
      yield* arquivos(join(raiz, entrada.name))
    } else if (EXTENSOES.test(entrada.name)) {
      yield join(raiz, entrada.name)
    }
  }
}

/**
 * Mede as duas regras num diretório.
 *
 * `semTimeZone` são as chamadas com argumento mas sem `timeZone`;
 * `semArgumento` são as chamadas sem argumento nenhum (`toLocaleDateString()`
 * puro), que é o pior caso — sem `locale` nem `timeZone`, o formato sai no do
 * navegador. `semArgumento` é um SUBCONJUNTO de "sem timeZone" no sentido da
 * regra: toda chamada sem argumento também está sem `timeZone`, mas ela é
 * contada à parte porque é o caso que produz saída no idioma do navegador.
 */
function medir(raiz) {
  const acc = {
    semTimeZone: 0,
    semArgumento: 0,
    comTimeZone: 0,
    barrel: 0,
    detalhe: [],
    arquivosLidos: 0,
  }
  for (const arq of arquivos(raiz)) {
    const rel = arq.slice(raiz.length + 1)
    let src
    try {
      src = readFileSync(arq, 'utf8')
    } catch {
      continue
    }
    acc.arquivosLidos++
    if (ehVendorizado(rel, src)) continue

    // Mede sobre o código, não sobre o texto: sem isto o gate conta os
    // `toLocale…(` do próprio JSDOC e do padrão (ver `soCodigo`).
    const codigo = soCodigo(src)
    // Para o barrel: só comentários, e preservando o comprimento (ver a nota
    // de `mascaraComentario`).
    const comentarios = mascaraComentario(src)

    for (const m of codigo.matchAll(RE_CHAMADA)) {
      const abre = codigo.indexOf('(', m.index + m[0].length - 1)
      if (abre === -1) continue
      const args = argumentosDa(codigo, abre)
      // Chamada sem fechamento: o arquivo está truncado ou é um template
      // literal com `(` que não é chamada. Não conta, e não reprova.
      if (args === null) continue
      const linha = codigo.slice(0, m.index).split('\n').length
      const dentro = args.trim()
      if (dentro === '') {
        acc.semArgumento++
        acc.detalhe.push(`sem argumento  ${rel}:${linha}`)
      } else if (/\btimeZone\b/.test(args)) {
        acc.comTimeZone++
      } else {
        acc.semTimeZone++
        acc.detalhe.push(`sem timeZone   ${rel}:${linha}`)
      }
    }

    if (!ehPortaoBarrel(rel)) {
      // ⚠️ O barrel é medido com o melhor dos dois textos: o ENCONTRO sai de
      // `src` e a VALIDEZ sai de `codigo`.
      //
      // Por que não só `src`: o especificador `'@nomad/ui'` é uma string, e
      // `soCodigo` troca o conteúdo dela por `''`. Buscar só no `codigo` dava
      // **0 barrel sem erro** num repo que tem 24 (medido) — verde que não
      // mediu é o pior resultado de um gate (§12).
      //
      // Por que não só `src`: o JSDOC do próprio verificador cita
      // `import … from '@nomad/ui'` como exemplo, e o gate contava a própria
      // documentação (medido: `check-scripts.mjs:262`, +2). Gate que mede o
      // texto que o descreve é gate que reprova o estado bom.
      //
      // `mascaraComentario` troca caractere por caractere, então **o mesmo
      // índice aponta para o mesmo caractere nos dois textos**: o encontro
      // vem de `src` (onde a aspa sobreviveu) e a conferência vem de
      // `comentarios` (onde comentário virou espaço). É o que faz os dois
      // casos acima caberem.
      //
      // O padrão ancora na **aspa de fechamento** (`'@nomad/ui'`) e não num
      // curinga atrás: com `.{0,400}?` (a primeira versão) o casamento
      // atravessava newline e começava num import anterior — em
      // `topbar.browser.test.tsx` ele casava em `@testing-library/react`
      // (linha 1) e só depois chegava no `@nomad/ui` (linha 12), e a contagem
      // saía 20 em vez de 24. Import multilinha é comum, então a solução é
      // ancorar no FIM: a aspa tem que fechar logo depois de `ui`. Isso
      // exclui o subpath pelo mesmo motivo — `'@nomad/ui/topbar'` não fecha a
      // aspa ali, e é o que a regra do §5 pede.
      const achados = src.matchAll(/import\s+(?:type\s+)?(?:[^;']*?from\s+)?'@nomad\/ui'/g)
      for (const m of achados) {
        // No mesmo offset (a máscara preserva o comprimento), o trecho só é
        // `import` se for CÓDIGO: em comentário virou espaço e o teste falha.
        if (!/^import\b/.test(comentarios.slice(m.index, m.index + 6))) continue
        acc.barrel++
        acc.detalhe.push(`barrel         ${rel}:${src.slice(0, m.index).split('\n').length}`)
      }
    }
  }
  return acc
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2)
const iRaiz = argv.indexOf('--raiz')
const raiz = resolve(iRaiz === -1 ? process.cwd() : (argv[iRaiz + 1] ?? process.cwd()))
const nome = iRaiz === -1 ? 'este repo' : raiz

/**
 * Baseline por app: o número que o gate NÃO deixa passar.
 *
 * ⚠️ **Estes números são MEDIDOS, não copiados da auditoria.** A `9c722d58`
 * diz 73 chamadas sem `timeZone` nos 4 apps; o instrumento deste arquivo mede
 * 86 no mesmo commit. A diferença não é de escopo — nenhuma combinação de
 * filtro dá 73. O que o medido tem a mais é `toLocaleLowerCase('pt-BR')` (8,
 * que é caixa de string e não tem `timeZone`), um polyfill vendorizado nos
 * `docs/` do motor, e chamadas em `backend/` e `test/`. Os **8 sem argumento**
 * reproduzem exatamente, com as linhas citadas — 6 no load-balance, 2 no motor.
 *
 * Por que baseline e não o número da auditoria: um gate que reprova o estado
 * bom é desligado na primeira execução (§12). O baseline é o número real de
 * hoje e o gate segura a **direção** — subir reprova, descer é a dívida sendo
 * paga. Para pagar, baixe o número aqui junto com o conserto.
 *
 * Medido em 2026-10-05: agent-package `33f5cb3f`, load-balance `7c9b5d0`,
 * motor `dad16d3`, conta_nommand `0ac827c`.
 */
const BASELINE = {
  '@nomad/ui': { semTimeZone: 2, semArgumento: 0, barrel: 24 },
  'agent-package': { semTimeZone: 27, semArgumento: 0, barrel: 214 },
  conta_nommand: { semTimeZone: 9, semArgumento: 0, barrel: 0 },
  'load-balance': { semTimeZone: 26, semArgumento: 6, barrel: 252 },
  motor: { semTimeZone: 13, semArgumento: 2, barrel: 15 },
}

/**
 * Descobre QUAL APP está sendo medido, para casar com o baseline.
 *
 * ⚠️ **Não é o `package.json` da raiz, e isso foi medido.** Três dos 4 apps
 * são monorepos SEM manifesto na raiz: o `agent-package` tem
 * `frontend/package.json` (`agentpack-frontend`) e `backend/package.json`
 * (`agentpack-backend`), e o load-balance e a conta igual. A primeira versão
 * caía no nome da pasta, e casava por ACASO — `agent-package`/`load-balance`/
 * `conta_nommand` são nomes de pasta, não de pacote. Funcionava até alguém
 * clonar em `~/src/ap` e o gate passar a medir o app errado com o baseline
 * alheio. Gate que mede o app errado é o mesmo que não mede.
 *
 * A identificacao é por ASSINATURA (o arquivo que só aquele repo tem), não por nome de
 * pasta nem por nome de pacote. O gate **diz qual app ele identificou e como**
 * (abaixo), e quando não reconhece nenhum, ele mede e avisa em vez de casar
 * com um baseline qualquer.
 */
const ASSINATURAS = [
  // `features/knowledge` e `features/launcher` não coexistem em nenhum dos 4.
  { app: 'agent-package', arquivos: ['frontend/src/features/knowledge'] },
  { app: 'conta_nommand', arquivos: ['frontend/src/features/launcher'] },
  { app: 'load-balance', arquivos: ['frontend/src/features/api-keys'] },
  { app: 'motor', arquivos: ['fe/src', 'be/src'] },
]

function identificar(dir) {
  for (const { app, arquivos } of ASSINATURAS) {
    if (arquivos.some((f) => existsSync(join(dir, f)))) return app
  }
  // O próprio pacote: tem `src/` e scripts/ com os gates conhecidos.
  if (existsSync(join(dir, 'src')) && existsSync(join(dir, 'scripts/check-lock.mjs'))) {
    return '@nomad/ui'
  }
  return null
}

const app = identificar(raiz)
const r = medir(raiz)

console.log(`\n📐 ${nome} (${app}) — ${r.arquivosLidos} arquivos`)
console.log(`   data sem timeZone ....... ${r.semTimeZone}`)
console.log(`   …das quais sem argumento  ${r.semArgumento}`)
console.log(`   com timeZone ............ ${r.comTimeZone}`)
console.log(`   barrel fora da porta .... ${r.barrel}`)

const linhaDetalhe = (titulo, filtro, lista) => {
  const items = lista.filter((d) => d.startsWith(filtro))
  if (!items.length) return
  console.log(`\n   ${titulo}:`)
  for (const i of items.slice(0, 20)) console.log(`     · ${i}`)
  if (items.length > 20) console.log(`     … e mais ${items.length - 20}`)
}
linhaDetalhe('sem timeZone', 'sem timeZone', r.detalhe)
linhaDetalhe('sem argumento', 'sem argumento', r.detalhe)
linhaDetalhe('barrel', 'barrel', r.detalhe)

const problemas = []

// 1) O gate tem que MEDIR. Um diretório vazio, um filtro que nunca casa ou um
//    `path` errado dão 0/0/0 — que é indistinguível de "app em dia". A §12
//    chama isso de "verde com o teste não rodado", e é o defeito mais caro
//    que um gate pode ter: parece aprovado e não mediu nada.
const semFonte = r.arquivosLidos === 0
if (semFonte) {
  problemas.push(
    `NENHUM arquivo de código foi lido em "${raiz}" — o gate não mediu nada. ` +
      `Verifique o caminho (--raiz). Um 0 aqui NÃO é "app em dia".`,
  )
}

// 2) Contra o baseline: o número SOBE = alguém introduziu chamada nova.
const base = BASELINE[app]
if (!base) {
  const quem = app ?? 'NENHUM app reconhecido'
  console.log(
    `\n⚠️  ${quem} não está no baseline deste script — medido, mas SEM gate.` +
      (app
        ? ''
        : `\n    A assinatura de app não casou (ASSINATURAS), então o gate não sabe\n    se este diretório é um dos 4. Ele mede mesmo assim.`),
  )
  console.log(
    `    Para travar, acrescente em BASELINE: "${quem}": { semTimeZone: ${r.semTimeZone}, semArgumento: ${r.semArgumento}, barrel: ${r.barrel} }`,
  )
} else {
  for (const campo of ['semTimeZone', 'semArgumento', 'barrel']) {
    if (r[campo] > base[campo]) {
      problemas.push(
        `${campo}: ${r[campo]} — baseline de ${app} é ${base[campo]} (+${r[campo] - base[campo]}). ` +
          `Cada ocorrência nova é uma linha para consertar (§5).`,
      )
    }
  }
}

// 3) O baseline que NÃO pode passar calado: `semArgumento` é o pior caso
//    (§5 — sai no formato do navegador). Ainda assim é dívida conhecida, não
//    motivo para o gate ficar vermelho hoje: os 8 dos 4 apps estão no baseline.
//    O que NÃO pode é ele CRESCER, e o §2 acima já cobre isso.
const semArgumentoNovo = base && r.semArgumento > base.semArgumento
if (semArgumentoNovo) {
  problemas.push(
    `semArgumento subiu para ${r.semArgumento} (baseline ${base.semArgumento}): ` +
      `chamada sem argumento nenhum sai no idioma do navegador.`,
  )
}

if (problemas.length) {
  console.error(`\n✗ check-scripts — ${problemas.length} problema(s):`)
  for (const p of problemas) console.error(`  · ${p}`)
  process.exit(1)
}

console.log(
  `\n✓ check-scripts — ${r.semTimeZone} sem timeZone, ${r.semArgumento} sem argumento, ` +
    `${r.barrel} barrel fora da porta${base ? ` (baseline de ${app}: ok)` : ' (sem baseline)'}`,
)
