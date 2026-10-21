export const meta = {
  name: 'motor-ui-gaps-1017',
  description: 'Fecha os 5 gaps de UI de subagentes do Motor (timeline beco sem saida, tokens, cascata, orfao, pulso no grafo) em branches na SB, com gate de suite e inimigo adversarial',
  phases: [
    { title: 'Implementar', detail: '2 agentes paralelos: timeline (gaps 1-4) e grafo (gap 5)' },
    { title: 'Gate', detail: 'integra os branches, typecheck + suite fe + build + comm vs main + agulha' },
    { title: 'Inimigo', detail: 'refuta cada fio por mutacao e caca o que ninguem olhou' },
  ],
}

const MAPA = `## MAPA DA UI ATUAL (medido por um scout em fa44a999; reconfira as linhas)
- SubagentBlock: fe/src/components/timeline/ui/blocks.tsx:417 — Collapsible com
  defaultOpen={false} (:456), recebe SO o 'item'. Meta inline: duration (:427),
  steps (:428), depth>1 (:429), midTurn (:430). Status textual :420-421:
  trabalhando.../concluido/cancelado/falhou. Glifo :438, StatusDot :446, finalText com
  label "Motivo" em falha :473.
- Tipo do item: fe/src/features/thread-runtime/model/types.ts:128-160 — NAO declara
  'tokens'. Declara 'abortKind' (:159), 'orphanOf', 'orphanFromTitle'.
- Patch do evento subagent_result: fe/src/features/thread-runtime/model/timeline-live.ts:257-282
  — patch = { status, finalText, steps, durationMs, midTurn } (:263-269); NAO copia tokens.
  abortKind gravado em :319; orfao em :333-360.
- O backend JA MANDA 'tokens' no SubagentNotification (fe/src/api/ws-catalog.generated.ts).
- Sidebar (referencia de idioma do codebase): fe/src/components/subagent-sidebar/ui/
  SubagentSidebar.tsx — contador no header :135, modo Lista/Graph :121-124,
  onSelectSubagent na row :230. Orfao: textoDeOrfao() em :98,102.
  rotuloDeCancelamento() em fe/src/components/subagent-sidebar/model/orphan-badge.ts:52-58
  (HOJE so usada em teste). statusDeOrfao() em :32 (HOJE sem consumidor na timeline).
- Dialog da conversa do filho: fe/src/components/subagent-sidebar/ui/
  SubagentConversationDialog.tsx:57. HOJE so e alcancavel pela sidebar:
  PlaygroundPage.tsx:231,257-263 via selectedSubagent/onSelectSubagent.

`

const COMUM = `Voce trabalha no repositorio Motor (PedroPaduelo/motor) na sandbox do mypanel.
Use as ferramentas mcp__mypanel__sandbox_* com sandbox: "motor".
Frontend: fe/ (React + Vite + vitest + testing-library), npm workspaces na raiz.

## REGRA DE OURO
- Trabalhe SOMENTE no worktree que VOCE criar (sandbox_worktree_create, com base EXPLICITA
  "fa44a999" — production e origin/main = fa44a999; nao confie no estado local de /workspace).
  NUNCA em /workspace. NUNCA checkout de main dentro de worktree.
- NUNCA push. NUNCA merge em main. NUNCA deploy. NUNCA git gc / stash / branch -D /
  reset --hard em branch que nao seja sua.
- Commite apenas no SEU branch, mensagem curta em pt-BR.
- Numero que nao saiu = "NAO MEDI". Nunca estime, nunca deduza de leitura.
- NAO adicione dependencia nova (sem framer-motion, sem lib de animacao). CSS/SVG puro.
- Os 5 gaps sao 100% frontend: NAO toque em be/.

## ARMADILHAS JA PAGAS NESTA SESSAO (nao repita)
- npm ci SEMPRE na RAIZ do worktree. NUNCA "cd be && npm ci --workspaces=false": cria
  be/node_modules com fastify divergente, o tsc mistura as versoes e dao 9 erros FALSOS.
- comm SEMPRE com LC_ALL=C (nomes de teste tem acento e a collacao mente).
- Apos escrever arquivo, confira no retorno da ferramenta o trecho critico: nesta sessao
  uma escrita ja perdeu ~7 chars silenciosamente.
- vitest com suite grande: --maxWorkers=2.
- Testes do fe NAO precisam de Postgres/Redis.

## PRODUTO (vale para TODOS)
Relatorio em pt-BR, denso, com arquivo:linha em cada afirmacao, e secao final
"NAO DETERMINADO" para o que nao apurou. Seu texto final e dado bruto para o tech lead
decidir — nao e mensagem para humano, nao precisa cortesia.

` + MAPA

const TIMELINE = COMUM + `

# TAREFA — GAPS 1 A 4 (a linha da timeline e o rotulo honesto)

Crie seu worktree: sandbox_worktree_create, name "ui-gap-timeline-1017", base "fa44a999".
npm ci na RAIZ do worktree (~1 min). Confirme HEAD = fa44a999.

## GAP 1 — a linha da timeline abre a conversa do filho (O MAIS IMPORTANTE)
Hoje o Collapsible do SubagentBlock so abre o proprio corpo — a timeline e um beco sem
saida; a conversa do filho so existe pela sidebar. Faca a linha virar atalho.
- ANTES de codar: ache TODOS os pontos que renderizam SubagentBlock (grep em fe/src) e
  como o Playground chega ao onSelectSubagent. Escolha o seam pela idioma do codebase
  (prop drilling via renderer OU React context — veja se blocos interativos existentes
  ja resolvem acoes de algum jeito e siga o MESMO padrao). NAO invente store global.
- No bloco: affordance claro (botao ghost tipo "Ver conversa", aria-label, seguindo o
  padrao pointer-coarse do codebase) que dispara o handler com o id do subagente.
  PlaygroundPage resolve o subagent do treeQuery pelo id — uma unica fonte de verdade,
  a que a sidebar ja usa.
- Onde NAO houver handler disponivel (timeline renderizada fora do playground), o
  affordance NAO aparece. Esconder, nao desabilitar.
- Teclado: button de verdade, aria-label, foco visivel.
- TESTES: (a) clicar chama o handler com o id certo; (b) sem handler, affordance oculto.

## GAP 2 — tokens por subagente
- SubagentItem ganha 'tokens?: number' (types.ts).
- timeline-live copia n.tokens no patch (:263-269).
- Render no meta inline do bloco, ao lado de duration/steps, SO quando presente.
  Procure como o fe ja formata tokens (ex.: ThinkingBlock.tsx:21-22) e REUSE o formato —
  nao invente outro.
- TESTES: presente renderiza; ausente nao renderiza NADA (nem "undefined"/NaN).

## GAP 3 — rotulo de cancelamento honesto
- No bloco: aborted COM abortKind -> rotuloDeCancelamento(abortKind); aborted SEM
  abortKind -> "cancelado" (igual hoje). done/errored inalterados.
- TESTES: as duas variantes de aborted.

## GAP 4 — orfao marcado na timeline
- No bloco: quando o item e orfao, marcador curto igual ao que a sidebar usa
  (textoDeOrfao/statusDeOrfao), sem quebrar o layout do trigger.
- TESTES: orfao mostra; nao-orfao nao mostra.

## LIMITES
- NAO encoste em SubagentGraph.tsx / graph-layout.ts (outro agente cuida do gap 5).

## ANTES DE COMMITAR
- npx tsc --noEmit na raiz do worktree: 0 erros.
- Rode os testes dos arquivos que voce tocou — todos verdes.
- Commite no SEU branch.

## RELATORIO
Seam escolhido do gap 1 e POR QUE; diff por arquivo (com linha); nomes dos testes novos;
o que NAO fez; riscos; NAO DETERMINADO.`

const GRAFO = COMUM + `

# TAREFA — GAP 5 (o edge de merge do grafo ganha vida)

Crie seu worktree: sandbox_worktree_create, name "ui-gap-grafo-1017", base "fa44a999".
npm ci na RAIZ. Confirme HEAD = fa44a999.

## O QUE EXISTE
- fe/src/components/subagent-sidebar/ui/SubagentGraph.tsx:239-240 desenha o edge de
  merge (strokeOpacity 0.6, strokeDasharray '3 4') — estatico, sem transicao.
- Os pulses existentes sao sutis: bolinha 2.6s (:216-217), 1.6s (:283-284), opacity 1.4s (:360).
- O gating de reduced-motion ja existe no arquivo (:41 e :487-493) — siga o MESMO padrao.
- Layout: fe/src/components/subagent-sidebar/model/graph-layout.ts (:137 o trigger
  subagent_notification, :244 o edge kind 'merge'). Testes: SubagentGraph.test.tsx,
  graph-layout.test.ts.

## O QUE FAZER
- Pulso sutil percorrendo o edge de merge quando ha atividade viva (ex.:
  stroke-dashoffset animado por CSS, ou ponto via animateMotion/offset-path). Puro
  CSS/SVG — ZERO dependencia nova.
- RESPITA prefers-reduced-motion: motion reduzido = edge estatico.
- NAO mexa em blocks.tsx / types.ts / timeline-live.ts (outro agente cuida dos gaps 1-4).
- TESTES: estenda SubagentGraph.test.tsx — (a) motion normal: o elemento/classe de
  animacao existe no edge de merge; (b) reduced motion: nao existe.

## ANTES DE COMMITAR
- npx tsc --noEmit na raiz: 0 erros. Testes dos arquivos tocados: verdes.
- Commite no SEU branch.

## RELATORIO
Mecanismo escolhido; diff; testes; riscos; NAO DETERMINADO.`

phase('Implementar')
log('2 implementadores paralelos: timeline (gaps 1-4) e grafo (gap 5)')
const [relTimeline, relGrafo] = await parallel([
  () => agent(TIMELINE, { effort: 'xhigh', phase: 'Implementar', label: 'gaps-timeline-1-4' }),
  () => agent(GRAFO, { effort: 'high', phase: 'Implementar', label: 'gap-5-pulso-grafo' }),
])

const GATE = COMUM + `

# TAREFA — GATE DA INTEGRACAO (nao implementa nada; integra, mede, compara)

Relatorios dos implementadores (confera promessa vs diff real):

--- IMPLEMENTADOR TIMELINE (gaps 1-4) ---
${relTimeline || '(NAO DEVOLVEU NADA — confira com git rev-parse ui-gap-timeline-1017)'}

--- IMPLEMENTADOR GRAFO (gap 5) ---
${relGrafo || '(NAO DEVOLVEU NADA — confira com git rev-parse ui-gap-grafo-1017)'}

## PASSOS
1. Worktree "ui-gaps-1017", base "fa44a999". npm ci na RAIZ. O worktree ESTA em fa44a999
   — esse e o estado BASELINE.
2. BASELINE ANTES DO MERGE: suite INTEIRA do fe, extraia os NOMES que falham ->
   baseline.txt (LC_ALL=C em tudo). Descubra o comando exato (package.json, scripts) e
   reporte qual usou. --maxWorkers=2.
3. AGULHA: injete um teste que falha de proposito com nome unico, rode o bloco que o
   contem, prove que seu extrator pega esse nome. Depois remova e confira que removeu.
   Sem agulha provada, comm vazio nao prova NADA.
4. Merge: git merge ui-gap-timeline-1017 e git merge ui-gap-grafo-1017 (dentro do seu
   worktree; SEM push, SEM main). Conflito nao era esperado (arquivos disjuntos); se
   houver, resolva SEM mudar semantica e reporte. Se um branch nao existir, integre o
   que existir e reporte o faltante em destaque.
5. NOVO: a MESMA suite, mesma divisao -> novo.txt.
   comm -13 baseline.txt novo.txt e comm -23 baseline.txt novo.txt com LC_ALL=C:
   os DOIS tem de sair vazios.
   Atencao: o comm compara nomes de FALHA — testes novos que passam nao aparecem nele.
   Por isso rode TAMBEM os arquivos de teste novos do branch e reporte nome a nome.
6. npx tsc --noEmit na raiz: 0 erros. (Se surgirem 9 erros de FastifyInstance em
   be/src/server/index.ts, seu node_modules esta envenenado: npm ci na raiz de novo.)
7. Build do fe passa. Reporte o comando usado e o resultado.
8. npm run cycles SE existir (veja package.json).
9. Commite os merges no branch ui-gaps-1017. Reporte o SHA final.

## RELATORIO
Totais dos dois lados; comm (as duas saidas); comandos usados; testes novos nome a nome;
agulha; SHA do branch; NAO DETERMINADO.`

phase('Gate')
log('gate: baseline em fa44a999 -> merge dos 2 -> suite, typecheck, build, comm, agulha')
const relGate = await agent(GATE, { effort: 'xhigh', phase: 'Gate', label: 'gate-integracao' })

const INIMIGO = COMUM + `

# TAREFA — VOCE E O INIMIGO

Sua funcao e DERRUBAR o branch antes do go do dono. Leitura nao e prova: reproduza.
Crie worktree PROPRIO a partir do branch "ui-gaps-1017" (base = o branch, NAO main).
npm ci na raiz.

Relatorios previos:

--- GATE ---
${relGate || '(NAO DEVOLVEU NADA — isso ja e motivo de NAO SUBIR)'}

--- IMPLEMENTADOR TIMELINE ---
${relTimeline || '(NAO DEVOLVEU)'}

--- IMPLEMENTADOR GRAFO ---
${relGrafo || '(NAO DEVOLVEU)'}

Os 5 fios que o branch diz que ligou:
1. timeline abre a conversa do filho (handler)
2. tokens por subagente (tipo + patch + render)
3. rotulo de cancelamento por abortKind (cascata vs direto)
4. orfao marcado na timeline
5. pulso no edge de merge do grafo

## MUTACOES (fios 1-4 obrigatorios; o 5 se der tempo)
Para CADA fio: desligue o fio (checkout do trecho ou edicao minima), rode o teste novo
correspondente — ele TEM que morrer. Fio cujo teste nao morre = teste decorativo = furo
que voce reporta. Depois REVERTA e confirme (git diff vazio no fim).

## CACE O QUE NINGUEM OLHOU
- TODOS os render sites de SubagentBlock: o affordance novo aparece onde NAO deveria?
  Fora do playground ele some?
- reduced motion REALMENTE desliga o pulso (nao so no teste que forca o mock)?
- tokens ausente nao renderiza "undefined"/NaN em NENHUM caminho do bloco?
- abortKind undefined continua "cancelado"?
- o affordance e button de verdade (teclado/aria) ou div com onClick?
- algum teste novo decorativo (nao asserta nada de novo)?
- testes EXISTENTES de blocks/sidebar/graph continuam verdes no branch (rode)?
- refute UM total do gate: rerode a suite inteira e compare os totais que ele reportou.
- TODO/placeholder/console.log esquecido?

## VEREDITO (curto, sem desculpatorio)
"PRONTO (esperando go do dono)" ou "NAO SOBE" + uma frase de motivo.
Listas: refutei (afirmacao + o que medi) / confirmei / nao consegui verificar.`

phase('Inimigo')
log('inimigo: mutacao em cada fio + caca ao que ninguem olhou')
const relInimigo = await agent(INIMIGO, { effort: 'xhigh', phase: 'Inimigo', label: 'inimigo-adversarial' })

return {
  timeline: relTimeline || 'NAO DEVOLVEU',
  grafo: relGrafo || 'NAO DEVOLVEU',
  gate: relGate || 'NAO DEVOLVEU',
  inimigo: relInimigo || 'NAO DEVOLVEU',
}