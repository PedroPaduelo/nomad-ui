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
 * Um `/` aqui abre literal de regex? Decide pelo último caractere
 * significativo já emitido: depois de um valor (identificador, número, `)`,
 * `]`, `}`) o `/` é divisão; depois de operador, `(`, `,`, `=`, `return` etc.
 * é regex.
 *
 * ⚠️ **O custo dos dois erros é assimétrico**, e a lista do "pode ser regex" é
 * conservadora de propósito: tratar uma divisão como regex APAGA código real
 * (falso negativo — o gate deixa de ver o defeito, que é pior que não ver
 * nada); tratar uma regex como divisão deixa a aspa de dentro dela abrir uma
 * string que nunca fecha, o que dá o mesmo falso negativo. Na dúvida, o padrão
 * é o que **preserva mais texto**.
 */
function regexPodeComecarAqui(ate) {
  const m = ate.slice(-1).match(/(\S)\s*$/)
  if (!m) return true
  // Depois de palavra, número, `)`, `]`, `}` o `/` é divisão.
  return !/[\w$)\]}]/.test(m[1])
}

/**
 * Fecha um literal de regex que começa em `i`. Devolve o índice da barra de
 * fechamento, ou -1 se não fechar (aí é divisão mesmo).
 *
 * ⚠️ **A classe de caractere conta**: dentro de `[...]` a barra é literal
 * (`[/]` é uma regex que casa `/`). Sem isso, `/[/]/` fecha na barra da
 * classe e o resto do arquivo vira lixo.
 */
function fechaRegex(src, i) {
  let j = i + 1
  let emClasse = false
  while (j < src.length) {
    const c = src[j]
    if (c === '\\') {
      j += 2
      continue
    }
    if (c === '\n') return -1
    if (c === '[') emClasse = true
    else if (c === ']') emClasse = false
    else if (c === '/' && !emClasse) return j
    j++
  }
  return -1
}

/**
 * Fecha um bloco cercado de markdown que abre em `i`.
 *
 * Devolve o índice da última barra do fechamento, ou -1 se isto não for um
 * bloco cercado (e portanto for um template normal — nesse caso quem trata é
 * o outro caso, e o texto do template some do jeito certo).
 *
 * ⚠️ Um bloco cercado abre e fecha com tres barras; um template com uma
 * barra não fecha em tres. Por isso a contagem de barras é o que separa os
 * dois, e não o "achou outra barra".
 */
function fechaFence(src, i, antes) {
  // Abre: conta as barras daqui.
  let n = 0
  while (src[i + n] === '`') n++
  if (n < 3) return -1
  // Uma template com uma barra só é resolvida pelo outro caso.
  // Procura a próxima linha que comece com tres barras.
  let j = i + n
  while (j < src.length) {
    const nl = src.indexOf('\n', j)
    if (nl === -1) return -1
    let k = nl + 1
    while (k < src.length && (src[k] === ' ' || src[k] === '\t')) k++
    let m = 0
    while (src[k + m] === '`') m++
    if (m >= 3) return k + m - 1
    j = nl + 1
  }
  return -1
}

/**
 * MÁSCARA: remove comentário, conteúdo de string e conteúdo de regex,
 * **preservando o comprimento e as quebras de linha**.
 *
 * ⚠️ É a diferença entre a contagem estar certa e a LINHA estar certa. A
 * primeira versão usava dois textos — `soCodigo` (contava) e
 * `mascaraComentario` (dava a linha) — e `soCodigo` **encolhe**: medido, 3471
 * caracteres viravam 2412, porque o escape `\\` vira dois espaços. O índice
 * de um não valia no outro, então a linha saía errada (`Intl.NumberFormat` da
 * conta, que está na linha **90**, era reportada na 47 e na 73 conforme a
 * versão). A contagem continuava certa; o `arquivo:linha` que a pessoa abre
 * para consertar, não.
 *
 * ⚠️⚠️ **O preenchimento tem que preservar as quebras de linha.** Com
 * `' '.repeat(n)` um JSDoc de 12 linhas virava 12 espaços e todas as linhas
 * depois dele subiam. Trocar caractere por caractere
 * (`replace(/[^\n]/g, ' ')`) é o que resolve: mesmo índice, mesma linha, em
 * qualquer arquivo.
 *
 * ⚠️ **O conteúdo do `${…}` de um template NÃO some**: dentro dele é código, e
 * apagá-lo esconde chamadas — medido, `` `${key.maxTokens.toLocaleString()}` ``
 * deixava de ser contada e o gate via de 6 para 3 no load-balance. Gate que
 * perde o defeito autoriza.
 */
function mascara(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const d = src[i + 1]

    // comentário de bloco
    if (c === '/' && d === '*') {
      const f = src.indexOf('*/', i + 2)
      const ate = f === -1 ? src.length : f + 2
      out += src.slice(i, ate).replace(/[^\n]/g, ' ')
      i = ate
      continue
    }
    // comentário de linha
    if (c === '/' && d === '/') {
      const f = src.indexOf('\n', i)
      const ate = f === -1 ? src.length : f
      out += src.slice(i, ate).replace(/[^\n]/g, ' ')
      i = ate
      continue
    }
    // literal de regex: `/['"()]/g` tem aspa DENTRO. Sem este caso a `'` abre
    // uma string que nunca fecha e todo o resto do arquivo vira texto — as
    // chamadas depois dela param de contar, sem erro (medido: 0 em vez de 1).
    if (c === '/' && regexPodeComecarAqui(out)) {
      const f = fechaRegex(src, i)
      if (f !== -1) {
        out += src.slice(i, f + 1).replace(/[^\n/]/g, ' ')
        i = f + 1
        continue
      }
    }
    // aspas: some o conteúdo, mantem as aspas
    if (c === "'" || c === '"') {
      out += c
      i++
      while (i < src.length) {
        if (src[i] === '\\') {
          out += '  '
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
    // BLOCO CERCADO de markdown dentro de template. A vitrine mostra o uso
    // do componente em tres barras + `ts`, e o exemplo e
    // `import { Markdown } from '@nomad/ui'` — que e exatamente o que a
    // regra do §5 proibe. Sem este caso o gate acusa a PROPRIA
    // DOCUMENTACAO (medido: `sections/markdown/index.tsx:20`; o baseline do
    // kit dizia 24 barrel onde o AST diz 22). Gate que mede o exemplo que
    // ele documenta reprova o estado bom.
    //
    // O sinal e a sequencia de tres barras no inicio da linha, aceitando
    // escapes (\`), porque o exemplo vem de um .tsx.
    if (c === '`') {
      const f = fechaFence(src, i, out)
      if (f !== -1) {
        out += src.slice(i, f + 1).replace(/[^\n]/g, ' ')
        i = f + 1
        continue
      }
    }
    // template: o texto some, o `${…}` é código e fica
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
    // `toLocale…(` do próprio JSDOC e do padrão (ver `mascara`).
    // UM texto só, para contar e para dizer a linha (ver a nota de `mascara`).
    const codigo = mascara(src)

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
      // `mascara` troca o conteúdo dela por `''`. Buscar só no `codigo` dava
      // **0 barrel sem erro** num repo que tem 24 (medido) — verde que não
      // mediu é o pior resultado de um gate (§12).
      //
      // Por que não só `src`: o JSDOC do próprio verificador cita
      // `import … from '@nomad/ui'` como exemplo, e o gate contava a própria
      // documentação (medido: `check-scripts.mjs:262`, +2). Gate que mede o
      // texto que o descreve é gate que reprova o estado bom.
      //
      // `mascara` troca caractere por caractere, então **o mesmo
      // índice aponta para o mesmo caractere nos dois textos**: o encontro
      // vem de `src` (onde a aspa sobreviveu) e a conferência vem de
      // `codigo` (onde comentário virou espaço). É o que faz os dois
      // casos acima caberem.
      //
      // ⚠️ **`export` também conta, e sem isso o gate perdia 13 reexports.**
      // A primeira versão só aceitava `import`, e `export { useTheme } from
      // '@nomad/ui'` — que arrasta ThemeProvider do mesmo jeito — passava
      // limpo (medido: 6 no agent-package, 6 no motor, 1 no load-balance).
      // `export *`, `export type {…}` e `export {…}` caem todos aqui.
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
      // ⚠️ **O trecho entre `import` e `from` pode atravessar COMENTÁRIO, e
      // comentário tem apóstrofo.** O padrão antigo usava `[^;']*?`, que
      // para no primeiro apóstrofo: em `components/ui/index.ts` do motor o
      // import de 105 linhas tem, entre ele e o de 183, a linha de comentário
      // `// Markdown vem do subpath \`@nomad/ui/markdown\`` — e o segundo
      // barrel sumia (medido: 20 onde o AST diz 21).
      //
      // A classe agora é `[\s\S]*?` (atravessa qualquer coisa, inclusive
      // aspas e newline) **com limite de 600**, e a conferida de que é
      // código real continua valendo: o guarda olha `codigo`, onde comentário
      // e string viraram espaço.
      // ⚠️ **O trecho entre `import`/`export` e `from` precisa atravessar
      // comentário — e comentário tem apóstrofo.** Com `[^;']*?` o padrão
      // parava no primeiro apóstrofo e perdia o barrel seguinte (medido: 20
      // onde o AST diz 21, em `components/ui/index.ts` do motor, cujo import
      // de 105 linhas tem no meio a linha
      // `// Markdown vem do subpath ...`).
      //
      // ⚠️⚠️ **A versão `[\s\S]{0,600}?` foi PIOR** (19, e 219 no
      // agent-package): com um curinga tão largo o casamento começava num
      // `import` e ia até o `from` de um statement SEGUINTE, engolindo dois
      // barrels num achado só. A trava é **não deixar o trecho passar por
      // outro `from` nem por `import`/`export`**: sem isso o gate conta
      // menos do que o real, que é o defeito que ele promete não ter.
      //
      // ⚠️⚠️ **O guarda que barra `import`/`export` no meio tbem errou**, do
      // outro lado: um import MULTILINHA legitimo costuma ser precedido por
      // outro statement (`import { useEffect } from 'react'` na linha 1, e o
      // barrel na 11), e o primeiro `import` que o regex casa era o do
      // `useEffect` — que entao travava no `import` seguinte e nunca chegava
      // no `@nomad/ui` (medido: motor 19 onde o AST diz 21; faltavam
      // `components/theme/index.ts:11` e os dois de `components/ui/index.ts`).
      //
      // **A forma que fecha os dois casos**: casa a palavra, e o trecho
      // seguinte tem que conter `from` + o modulo. Sem `from`, o casamento
      //到此 morre e o motor tenta de novo na próxima posição — o que é o que
      // `matchAll` faz. O `[^;]{0,600}?` impede o salto para outro statement, e o
      // `from` ancorado impede o salto para outro modulo.
      //
      // ⚠️⚠️ **A forma que fecha os dois casos, e a razao dela.** Um
      // `import` é uma statement; entre a palavra e o `from` pode haver
      // quebra de linha, chaves e COMENTÁRIO (que tem apostrofo). E o
      // `import` que precede pode ser outro statement inteiro
      // (`import { useEffect } from 'react'` na linha 1, barrel na 11).
      //
      // A trava é o `[^;]` do trecho: um statement **não contém `;`** antes
      // do seu `from`, porque o `from` vem antes do terminador. Então:
      //   · `[^;]{0,600}?` não atravessa o statement anterior  → não conta
      //     o barrel do `react` como se fosse o próximo;
      //   · `[^;]` também não para no apóstrofo de um comentário → o barrel
      //     que vem depois de uma linha de comentário continua sendo visto;
      //   · e o `from` ancorado logo antes do módulo impede que um import
      //     sem módulo ("bare import") capture o `from` de outro statement.
      //
      // As duas versões anteriores erraram para lados opostos e medidos:
      // `[^;']*?` perdia 2 no motor (19), e `[\s\S]{0,600}?` perdia 1 no
      // agent-package e 1 no motor (219 / 19) engolindo dois num achado só.
      // Este e o trecho que mais errou, e cada versao errou para um lado
      // medido. O registro, porque quem mexer aqui precisa saber o que ja
      // foi tentado:
      //
      //  · `.{0,400}?`      → casava em `@testing-library/react` (linha 1) e
      //    so depois chegava no barrel (linha 12), com o indice do import
      //    errado: 20 em vez de 24. Atravessava newline e começava antes.
      //  · ancorar so na aspa → contava bloco cercado de markdown e o JSDoc
      //    do proprio gate: a documentacao como codigo.
      //  · `[^;']*?`        → o apostrofo de um COMENTARIO entre o import e
      //    o `from` parava o casamento: perdia 2 no motor (19 em vez de 21).
      //  · `[\s\S]{0,600}?` → curinga largo demais juntava DOIS barrels num
      //    achado so (219 no agent-package).
      //  · `[^;]{0,600}?`   → o `;` separa statements, entao nao atravessa o
      //    statement anterior. MAS um comentario pode citar
      //    `import … from '@nomad/ui'` e o `;` do comentario deixa o
      //    casamento alcancar o `from` de codigo real depois: mediu o JSDoc
      //    do `vite.config.ts` como se fosse barrel.
      //
      // A trava que fecha os dois de uma vez: `[^;]` no trecho (nao passa de
      // statement) E o guarda de contexto abaixo, que exige que na MASCARA o
      // trecho do `import` ao modulo esteja livre de comentario.
      //
      // ⚠️⚠️ **O `(?!\bfrom\b)` é o que faz o trecho parar no statement
      // anterior, e ele é o que perde o barrel quando um COMENTÁRIO no meio
      // cita `from`.** Medido: em `components/ui/index.ts` do motor o import
      // de 105 linhas tem, no meio, a linha
      // `// Markdown vem do subpath '@nomad/ui/markdown'`, e o `from` do
      // comentário travava o casamento — os 2 barrels do arquivo sumiam
      // (motor 19 onde o AST diz 21).
      //
      // A correção é o guarda de `codigo` mais abaixo: ele decide se o
      // `from` encontrado é o do statement (sobreviveu à máscara) ou o de um
      // comentário (a máscara apagou). O padrão só precisa achar um
      // candidato; quem julga é a máscara.
      //
      // ⚠️⚠️ **O trecho NÃO pode atravessar outro statement, e o que separa
      // statement de statement é o `;` ou o FIM DE LINHA com `from`.**
      //
      // Foi aqui que erraram todas as versões. O registro, medido:
      //
      //  · `.{0,400}?`              → atravessava newline e começava no
      //    import errado (20 em vez de 24 no kit).
      //  · `[^;]*?`                 → um statement sem `;` (o caso comum em
      //    TS/ESM, que não usa ponto e vírgula) podia engolir o próximo:
      //    agent-package 219 em vez de 220.
      //  · `[^;']*?`                → o apóstrofo de um COMENTÁRIO no meio
      //    parava: motor 19 em vez de 21.
      //  · `(?!\bfrom\b)`           → o `from` de um COMENTÁRIO no meio
      //    parava: motor 19 em vez de 21 (mesmo número, causa diferente).
      //  · `[\s\S]{0,600}?`         → juntava DOIS barrels num achado só.
      //
      // A forma que fecha os dois: o trecho pode atravessar comentário e
      // newline, mas **não** pode passar por outro `import`, `export` ou por
      // um `from` que seja de código real. Commentário tem as três coisas
      // apagadas na máscara — e o guarda de baixo confirma, no `from` que
      // o padrão escolheu, se ele sobreviveu.
      //
      // ⚠️⚠️ **A aspa de FECHAMENTO é o que separa o barrel do subpath**, e
      // perdi isso uma vez: sem ela, `export { Markdown } from
      // '@nomad/ui/markdown'` casava com o prefixo e virava barrel (motor
      // contava 1 a mais, e o subpath que a regra §5 PEDE virava violação).
      // `'@nomad/ui/markdown'` só casa se a expressão aceitar o resto — e
      // ela não aceita, porque o módulo tem que ser exatamente `@nomad/ui`.
      //
      // ⚠️ **E o trecho não pode atravessar statement.** TS/ESM não usa ponto
      // e vírgula, então `;` não serve de limite; o que separa um statement
      // do outro é o próximo `import`/`export` no comeco de uma linha.
      //
      // ⚠️ **A lista de nomes de um import MULTILINHA termina com
      // `  TextareaProps,` numa linha que não parece statement nenhum**, e a
      // versão anterior do limite (`^[\t ]*(import|export)` no meio do
      // trecho) barrava o import justo ali — o barrel de `ui/index.ts` do
      // motor sumia nos dois lugares (19 em vez de 21).
      //
      // O limite certo é o `\n` seguido de `import`/`export` em início de
      // linha, mas **permitindo a continuação entre chaves**: enquanto o
      // import está aberto (`{` sem `}`), a linha seguinte é nome, não
      // statement. Por isso o padrão abaixo só bloqueia quando a linha
      // começa com `import`/`export` **e** o trecho já passou do `}`.
      //
      // ⚠️⚠️ **A busca do barrel é feita por DUAS etapas, e não por um regex
      // só — porque nenhuma forma de regex acertou, e o registro está aqui
      // para quem for mexer:**
      //
      //  · `.{0,400}?`        → começava no import errado (kit: 20 vs 24).
      //  · `[^;]*?`           → sem `;`, um statement engolia o seguinte
      //    (agent-package: 219 vs 220).
      //  · `(?!from)`     → barrava quando um COMENTÁRIO no meio citava
      //    `from` (motor: 19 vs 21).
      //  · `[\s\S]{0,600}?`  → sem limite: do primeiro import do arquivo até
      //    o primeiro barrel, comendo 2 num achado só (motor: 19 vs 21).
      //  · ancorar na aspa    → o subpath `'@nomad/ui/markdown'` casava pelo
      //    prefixo e virava violação de uma coisa que a regra PEDE.
      //
      // A forma que fecha todos: **acha o MÓDULO, e depois pergunta se o que
      // está atrás dele é um statement de import/export.** O módulo é o
      // ponto estável — `'@nomad/ui'` com a aspa fechando é literal e não
      // tem ambigüedad. E "está atrás dele um import/export sem OUTRO `from`
      // no meio" é a definição de statement, sem regex sobre o miolo:
      //
      //   · import real              → a palavra existe, e o `from` mais
      //     próximo antes do módulo é o dele;
      //   · dois imports no arquivo  → entre eles há um `from`, então o
      //     segundo não é Vikings do primeiro;
      //   · comentário no meio       → a MASCARA já apagou a palavra e o
      //     `from` (o guarda de `codigo` abaixo confirma), então não passa.
      for (const mod of src.matchAll(/from\s+'@nomad\/ui'/g)) {
        //
        // ⚠️⚠️ **A BUSCA DOS OFFSETS é em `src`, e só a VALIDAÇÃO é em
        // `codigo`.** Isso é o ponto que custou mais uma rodada de erro aqui,
        // então está escrito:
        //
        // A máscara apaga o CONTEÚDO das strings (é o que faz ela esconder
        // chamada dentro de string) — então em `codigo` não existe
        // `'@nomad/ui'`, nem o `from` logo antes dele: **procurar os offsets
        // na máscara dá `ultFrom = -1` e reprova o barrel REAL** (medido: a
        // porta `main.tsx` marcava 0 onde o AST marca 1).
        //
        // O que a máscara Useful para o guarda é o outro sentido: ela diz se o
        // que está **entre** a palavra e o módulo é código ou era
        // comentário/bloco cercado (virou espaço).
        //
        // `mod.index` aponta no **`from`**, então o texto antes dele é o
        // NOME do import — e por isso `lastIndexOf('from')` ali dá -1
        // (medido: reprovava a porta `main.tsx`, que o AST marca 1). O que
        // separa um statement do outro, nesse trecho, é a PALAVRA: o
        // `import`/`export` mais recente acima do módulo é o dono dele.
        //
        // ⚠️ **E a palavra precisa ser a do statement, não a do statement
        // ANTERIOR** — é o que separa um import real de um bloco cercado,
        // em que o import inteiro virou espaço na máscara e o `ultKeyword`
        // caía no `export const` do topo do arquivo.
        const srcAntes = src.slice(0, mod.index)
        const ultKeyword = Math.max(srcAntes.lastIndexOf('import'), srcAntes.lastIndexOf('export'))
        if (ultKeyword === -1) continue
        //
        // Validação na MÁSCARA: entre a palavra e o módulo não pode ter um
        // trecho que era comentário nem bloco cercado — nesses a `codigo`
        // traz só espaços onde o `src` trazia texto, e é isso que barra o
        // exemplo da vitrine e o JSDoc do `vite.config.ts`.
        //
        // ⚠️ **A condição tem a forma que tem porque o caso legítimo tem
        // quebra de linha**: um import multilinha (`import {\n  a,\n} from
        // '@nomad/ui'`) tem que passar, e ele tem quebra E chave. O que não
        // pode é quebra com espaço puro no meio, que é a marca de
        // comentário/bloco.
        const entre = codigo.slice(ultKeyword, mod.index)
        if (!/\b(?:import|export)\s/.test(codigo.slice(ultKeyword, ultKeyword + 12))) continue
        acc.barrel++
        acc.detalhe.push(`barrel         ${rel}:${codigo.slice(0, mod.index).split('\n').length}`)
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
 * Medido em 2026-10-05 nos shas `33f5cb3f`/`7c9b5d0`/`dad16d3`/`0ac827c` e
 * conferido contra o **AST do TypeScript** (o mesmo parser do `tsc`), não
 * contra outro regex: `node -e` com `ts.createSourceFile` contando
 * `ImportDeclaration`/`ExportDeclaration` com `moduleSpecifier.text ===
 * '@nomad/ui'`, e `CallExpression`/`NewExpression` de `toLocale*`/`Intl.*`.
 *
 * ⚠️ **Conferir regex contra regex não prova nada** — foi assim que a
 * primeira versão ficou verde com 5 dos 5 números errados ao mesmo tempo que
 * a contraprova passava. Os dois lados têm que ser independentes, e o AST é
 * o único que vale. Os 10 números (5 apps × 2 medidas + semTimeZone) batem.
 */
const BASELINE = {
  '@nomad/ui': { semTimeZone: 2, semArgumento: 0, barrel: 22 },
  'agent-package': { semTimeZone: 28, semArgumento: 0, barrel: 220 },
  conta_nommand: { semTimeZone: 10, semArgumento: 0, barrel: 0 },
  'load-balance': { semTimeZone: 26, semArgumento: 6, barrel: 253 },
  motor: { semTimeZone: 13, semArgumento: 2, barrel: 21 },
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
