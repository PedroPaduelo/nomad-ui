export const meta = {
  name: 'motor-tela-sdk-socketio',
  description: 'No SB motor, em paralelo: tela de configuração dos subagentes (2.4), F0 do SDK nativo da Anthropic atrás de flag por setup e F0 do socket.io ao lado do ws atual. Branch por item, revisão adversarial, integração em ordem, gates contra baseline novo do main. Sem push e sem deploy.',
  whenToUse: 'Owner aprovou as três frentes em 2026-10-12: tela de subagentes, SDK nativo e socket.io, o mais rápido possível',
  phases: [
    { title: 'Preparar', detail: 'limpar worktrees antigos, baseline novo no main deployado, registrar os itens' },
    { title: 'Planejar', detail: 'um plano por item e crítica cruzada' },
    { title: 'Implementar', detail: 'branch por item, revisão adversarial, correções' },
    { title: 'Integrar', detail: 'merge sequencial e gates contra o baseline' },
    { title: 'Validar', detail: 'revisão do conjunto e relatório' },
  ],
}

const BASE = 'db948f35'
const MAIN = 'main'
const WF = '/workspace/.sbcache/wf-scan'
const COAUTHOR = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'

const COMMON = `CONTEXTO FIXO (vale para todo agente)
- Trabalhe SÓ no sandbox "motor" do MyPanel, pelas tools MCP do mypanel (descubra os nomes com ToolSearch: mcp__mypanel__sandbox_bash, sandbox_read, sandbox_edit, sandbox_write, sandbox_grep, sandbox_glob, sandbox_ls, sandbox_process_wait, sandbox_process_output, sandbox_process_list, sandbox_worktree_create, sandbox_worktree_list, sandbox_worktree_remove, sandbox_worktree_merge). NUNCA crie, leia ou edite arquivos na máquina local.
- Repo /workspace = GitHub PedroPaduelo/motor. main já está em \`${BASE}\` (merge da onda do scan, 11 ações aplicadas e DEPLOYADAS em 2026-10-12). Monorepo npm workspaces be/ e fe/; Node 22 (engines <23); Prisma 6.19; ai ^5; @ai-sdk/anthropic; ws 8; ainda SEM @anthropic-ai/sdk e SEM socket.io.
- Antes de codar, leia /workspace/CLAUDE.md e /workspace/fe/CLAUDE.md. Releia também o que a onda do scan já mudou, para não regridir: git log --oneline -45.
- Infra pronta em ${WF}: heavy.sh <comando> (semáforo de 2 vagas, o SB tem 8 GB e 12 CPUs — NUNCA mais que isso em paralelo), bootstrap-wt.sh <worktree> <slot> (npm ci, symlink de be/.env, banco e redis do slot, escreve <worktree>/.wf-env.sh), teardown-wt.sh <slot>, COMANDOS.md (comandos testados de cada gate).
- O baseline.json existente foi medido no 69e0b28 e está VELHO: main já tem 40 commits a mais. Meça um baseline NOVO em \`${BASE}\` antes de comparar.
- PROIBIDO: git push; deploy (nenhuma tool mypanel de env_vars, services, deployments, domains, backups; nada de docker_exec em produção); mexer em produção; mexer nas branches scan/* já existentes (elas estão整合idas em main; não precisa delas).
- Segredos: nunca imprima segredo, senha, string de conexão ou conteúdo de .env. Escritas já perderam pedaços de ~7 chars perto de "data:" e "id:" — releia após cada escrita e rode typecheck.
- Comando pesado SEMPRE via heavy.sh, com timeout_ms >= 2400000 no sandbox_bash e sandbox_process_wait até terminar. vitest com --maxWorkers=2. Todo processo que você subir tem prazo e é encerrado antes de você terminar.
- Regras do Motor que já custaram caro: abort sempre com abortReason(...) de be/src/engine/registry.ts (o nome do erro precisa ser AbortError; com Error comum o ai v5 trava o turno para sempre); existe um guard de 5s no runAgent (be/src/agent/loop.ts) e ele fica; produção tem DOIS processos com turno (motor-be-ws = API/chat/WS, motor-worker-ws = fila/workflows), então estado em memória de um não é visto pelo outro; zod 4 — .partial() mantém .default(), PATCH redeclara campos com default; tetos de tamanho de arquivo do fe em frontend/eslint.config.js SIZE_EXCEPTIONS espelhados em frontend/src/test/sizeLimitsBaseline.json — os tetos SÓ PODEM ENCOLHER, nunca crescer para acomodar código novo (fe/src/api/ws.ts está no teto); migration aditiva e idempotente (padrão be/prisma/migrations/20260920000000_agent_is_default), nunca "prisma migrate dev", e nada que trave tabela grande (events) no boot; setups privados (D11) e segredo preso à origem (D12, be/src/config/secret-origin.ts) EXISTEM e o dono CONFIRMOU que setups pessoais são requisito — não regrida, não remova; evento de timeline leva turnId e reasoning/step_done são só de exibição; be/ tem package-lock próprio além do da raiz (be/Dockerfile roda npm ci no contexto /be) — se adicionar dependência, regenere os dois locks.
- Texto de UI, erro e doc em português, no tom do código. Commit no estilo do repo ("feat(escopo): ..."), com a última linha: ${COAUTHOR}`

const persist = p => `Grave o JSON que você vai devolver em ${p} (sandbox_write; crie a pasta) e valide com python3 -c "import json;json.load(open('${p}'))". Se falhar, regrave.`

const ITEMS = [
  {
    id: 'subagentes',
    branch: 'feat/tela-subagentes',
    risk: 'médio',
    lens: ['correcao', 'concorrencia'],
    title: 'Teto por árvore de subagentes e tela de configuração',
    brief: `O dono decidiu em 2026-10-11: subagentes ficam LIMITADOS (largura e profundidade hoje ilimitadas, D4/D6), com TELA DE CONFIGURAÇÃO para o dono regular — "pode deixar liberado mas com uma tela de configuração". Esta é a ação 2.4 do scan (item 2.4 do ROADMAP em /workspace/.sbcache/scan-motor-2026-10-11/roadmap/ROADMAP.md) e está entre as 10 que ficaram esperando decisão.

FAÇA:
1) Teto por ÁRVORE de subagentes (não por chamada): profundidade máxima, largura máxima (filhos simultâneos por pai) e total de nós por árvore. Default CONSERVADOR e explícito: ligue por env com default que NÃO quebre o uso de hoje (verifique nos dados/scripts __it-subagent o que os testes e as ferramentas usam) e registre o default escolhido em assumed_defaults. Configurável por env E por setup, com o setup vencendo o env. Ao bater o teto: o filho não nasce, o pai recebe um aviso em português no turno dizendo por quê e o que ajustar — nada de exceção crua, nada de turno travado.
2) ABORT EM CASCATA: cancelar/abortar uma árvore tem que cancelar os filhos pendentes, com o caminho de abort correto (abortReason). Reaproveite o que existe (abortChild, o reaper desligado NÃO pode ser dependência disso).
3) SCOPE DE ESCRITA explícito: o filtro de tools do filho já existe parcialmente — deixe explícito no payload do subagente qual é o diretório de trabalho e quais tools ele pode usar, para que o modelo não escreva fora. Não invente sandbox de filesystem; o pedido do dono foi configuração na tela, não isolamento real.
4) PERSONA: a decisão 10 (thread soma/substitui org e persona; filho herda persona do pai?) ficou aberta e NÃO é sua para decidir. Implemente o HERDAMENTO como default documentado (filho herda a persona do pai quando não define a sua) e deixe a alternativa atrás de flag; registre como pendência na tela com texto neutro.
5) TELA (o que o dono pediu explicitamente): no editor de setup (SetupGeneralTab e/ou uma aba nova em componente NOVO — SetupEditorHeader e a página de edição do fe têm tetos), campos para: teto de profundidade, teto de largura, total por árvore, e a escolha de herança de persona. Validação clara, texto explicando o efeito em português, valor default visível. Onde houver configuração que já existe em env e é do mesmo domínio (ex.: tetos de turno da ação 1.1, que já entrou em produção com TURN_MAX_STEPS/TURN_MAX_TOKENS), mostre o valor efetivo e deixe editar — o dono pediu que tudo que existe tenha tela.
6) TESTES: árvore que bate o teto de profundidade nasce truncada com aviso; árvore que bate o total para de criar; abort em cascata aborta os filhos e o registro reflete; setup sobrepõe env; filho herda persona; a tela renderiza e valida (sem estourar SIZE_EXCEPTIONS, com teste frontend).`,
  },
  {
    id: 'sdk-f0',
    branch: 'feat/sdk-nativo-f0',
    risk: 'alto',
    lens: ['correcao', 'seguranca'],
    title: 'SDK nativo da Anthropic — fatia F0 (tradutor + interface de transporte, atrás de flag)',
    brief: `O dono aprovou migrar o loop para o SDK oficial @anthropic-ai/sdk (decisão 6), incremental e ATRÁS DE FLAG POR SETUP, preservando o thinking assinado (decisão 15), e quer no ar o mais rápido possível. O plano está em /workspace/.sbcache/scan-motor-2026-10-11/rfc/sdk-nativo/index.md — LEIA (seções 2, 3, 5, 6, 7). NÃO implemente além da F0 nesta fatia.

FATIA F0 (a única desta rodada):
1) Dependência @anthropic-ai/sdk em be/package.json — regenerue o lock do be E o da raiz (regenerar o do be é em cópia temporária FORA do workspace, como o repo já faz). Sem isso a F0 não compila.
2) Tradutor puro: ModelMessage (do ai v5) <-> formato Messages API (o que o @anthropic-ai/sdk fala), como módulo NOVO e puro, testável sem rede e sem SDK: tools, tool_result, cache_control, thinking com signature, redacted_thinking, system, imagens. Fidelidade byte-a-byte do que hoje sai na rede é o critério de aceite — existe prova de wire no RFC (seção 3) com o que o ai/@ai-sdk/anthropic envia hoje; USE-A como gabarito e escreva testes que comparam com ela.
3) Interface de transporte (AgentTransport): o loop passa a falar com uma interface, e existem DOIS adaptadores — o atual (ai v5, inalterado) e o novo (SDK nativo). Nenhuma mudança de comportamento no caminho padrão.
4) Flag por setup (o dono pediu flag POR SETUP, não global): com a flag desligada, o comportamento é byte-a-byte o de hoje. Isso é obrigatório e tem teste que prova.
5) Shadow de wire: com a shadow ligada, gera o corpo que o caminho novo produziria e COMPARA com o que o caminho atual está mandando, sem mandar duas vezes e sem alterar a resposta. Registra divergência em log (sem conteúdo de usuário, sem chave) e métrica. Default desligado.
6) O que NÃO entra nesta fatia (deixa escrito como pendência): mandar pelo caminho nativo de verdade, persistência por step, tool search, e os 3 pedidos P0 ao LB (erro 4xx tipado em vez de 503 genérico; anthropic-beta nas rotas de api_key; afinidade de chave/conta por session_id). O caminho nativo SÓ entra depois que esses 3 estiverem do lado do LB.
7) THINKING (decisão 15 = preservar): o tradutor preserva o thinking assinado e o redacted_thinking; a exibição na tela continua como está (evento reasoning, com kind novo e marcador para redacted). Não reverta nada disso.
8) SEGURANÇA: nada no caminho novo pode vazar a chave (trace de envApiKeyFor/secret-origin.ts, regra D12), nem o header da org padrão para outra org (a correção 2.5 já está em produção — loadEffectiveConfig usa a OrgConfig da org do turno; preserve).
9) TESTES: paridade do tradutor contra a prova de wire do RFC (golden files, um por formato de mensagem); flag desligada = comportamento idêntico (o teste mais importante); shadow liga e não altera a resposta; thinking preservado nos dois caminhos; typecheck dos dois workspaces.`,
  },
  {
    id: 'socketio-f0',
    branch: 'feat/socketio-f0',
    risk: 'médio',
    lens: ['correcao', 'concorrencia'],
    title: 'socket.io — fatia F0 (servidor ao lado do ws atual, atrás de flag, nada visível)',
    brief: `O dono aprovou socket.io (decisão 7) e quer no ar o mais rápido possível. O plano está em /workspace/.sbcache/scan-motor-2026-10-11/rfc/socketio/index.md — LEIA (seções de arquitetura, F0, e o apêndice com as contradições que o scan teve). Esta rodada é SÓ a F0, e ela tem que ser inofensiva: nada muda para o usuário.

FATIA F0 (a única desta rodada):
1) Dependência socket.io + @socket.io/redis-emitter (+ adapter de Redis Streams quando a F0 exigir) em be/package.json; regenere os dois locks como no item do SDK.
2) Servidor socket.io AO LADO do ws atual, montado no mesmo processo do backend, ATRÁS DE FLAG (env, default DESLIGADO). Com a flag desligada, nada muda: o /ws atual segue servindo exatamente como hoje.
3) Autenticação no handshake reaproveitando o requireAuth que já existe (bearer/cookie/ticket ?ticket=). Sala do dono montada pelo servidor a partir da identidade — e NEVER por sala de org crua (o RFC aponta que org:{org} vaza cross-user; só user:{org}:{user}).
4) Catálogo de eventos versionado (item 2.9): um catálogo único gerado do backend e consumido pelo front (o RFC sugere gen-ws-catalog.mjs no be → tipos no fe). Gerar, não duplicar; e o fe/src/api/ws.ts está NO TETO de linhas — a lógica nova vai em módulo novo, e o arquivo pode ENCOLHER, nunca crescer.
5) Sem長 polling: só transporte websocket (o RFC mostra que sticky vira desnecessário), porque há proxy na frente.
6) O que NÃO entra: salas de thread com ack, fan-out de subagente, runs via worker, recuperação, corte do /ws antigo, streaming token a token (o dono adiou). Nada disso é F0.
7) CONFLITO CONHECIDO: a branch pendente feat/turn-interleave (ainda não mergeada, SHA 6273353) mexe em be/src/ws/handler.ts e be/src/engine/registry.ts. Não toque nesses trechos nem no prepareStep além do necessário, e registre na IMPLEMENTACAO.md exatamente onde a F0 encosta no caminho do mid-turn, para a integração futura.
8) TESTES: com a flag desligada o comportamento do /ws é idêntico (o teste mais importante); com a ligada, o handshake rejeita sem credencial; a sala do dono é a do usuário autenticado e não a da org; o catálogo gerado bate com o que o backend emite; typecheck dos dois workspaces e o gate de tamanho do fe.`,
  },
]

const S = { type: 'string' }, SA = { type: 'array', items: { type: 'string' } }, B = { type: 'boolean' }

const SETUP_SCHEMA = { type: 'object', properties: {
  ok: B, baseline: { type: 'array', items: { type: 'object', properties: { gate: S, ok: B, failures: SA }, required: ['gate', 'ok', 'failures'] } },
  cleaned: SA, slots_free: SA, notes: S,
}, required: ['ok', 'baseline', 'cleaned', 'slots_free'] }

const PLAN_SCHEMA = { type: 'object', properties: {
  scope_now: SA, deferred: SA, files: SA, approach: S, tests: SA,
  assumed_defaults: { type: 'array', items: { type: 'object', properties: { name: S, value: S, decision: S, why: S }, required: ['name', 'value', 'why'] } },
  prod_changes: SA, risks: SA, scan_claims_checked: SA, blocked: B, blocked_reason: S,
}, required: ['scope_now', 'deferred', 'files', 'approach', 'tests', 'assumed_defaults', 'prod_changes', 'risks', 'blocked'] }

const CRITIC_SCHEMA = { type: 'object', properties: {
  global_notes: S,
  per_action: { type: 'array', items: { type: 'object', properties: { id: S, note: S, defer: B, defer_reason: S }, required: ['id', 'note', 'defer'] } },
}, required: ['global_notes', 'per_action'] }

const IMPL_SCHEMA = { type: 'object', properties: {
  status: { type: 'string', enum: ['done', 'partial', 'blocked', 'failed'] },
  worktree: S, head: S, commits: SA, files_changed: SA, summary: S, tests: SA, new_failures: SA,
  assumed_defaults: SA, prod_changes: SA, deferred: SA,
}, required: ['status', 'worktree', 'head', 'commits', 'files_changed', 'summary', 'tests', 'new_failures', 'assumed_defaults', 'prod_changes', 'deferred'] }

const REVIEW_SCHEMA = { type: 'object', properties: {
  verdict: { type: 'string', enum: ['approve', 'fix'] }, closes_finding: B,
  blocking: { type: 'array', items: { type: 'object', properties: { file: S, line: S, problem: S, fix: S }, required: ['file', 'problem', 'fix'] } },
  non_blocking: SA, evidence: S,
}, required: ['verdict', 'closes_finding', 'blocking', 'non_blocking', 'evidence'] }

const MERGE_SCHEMA = { type: 'object', properties: { merged: B, conflicts: SA, resolution: S, checks: S, head: S, notes: S }, required: ['merged', 'conflicts', 'checks', 'head'] }
const GATES_SCHEMA = { type: 'object', properties: { head: S, notes: S, new_failures_total: { type: 'integer' }, gates: { type: 'array', items: { type: 'object', properties: { gate: S, ok: B, new_failures: SA }, required: ['gate', 'ok', 'new_failures'] } } }, required: ['head', 'gates', 'new_failures_total'] }
const FIX_SCHEMA = { type: 'object', properties: { fixed: SA, remaining: SA, commits: SA, head: S, notes: S }, required: ['fixed', 'remaining', 'commits', 'head'] }
const HOLISTIC_SCHEMA = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['bloqueante', 'importante', 'menor'] }, item: S, file: S, line: S, problem: S, fix: S }, required: ['severity', 'file', 'problem', 'fix'] } } }, required: ['findings'] }
const REPORT_SCHEMA = { type: 'object', properties: { url: S, ok: B, notes: S }, required: ['url', 'ok'] }

function sem(n) {
  let active = 0
  const q = []
  const pump = () => { while (active < n && q.length) { const j = q.shift(); active++; j.fn().then(j.resolve, j.reject).finally(() => { active--; pump() }) } }
  return fn => new Promise((res, rej) => { q.push({ fn, resolve: res, reject: rej }); pump() })
}

function setupPrompt() {
  return `${COMMON}

TAREFA: preparar o SB e medir o baseline NOVO.
1) LIMPEZA: há ~23 worktrees antigos em /workspace/.worktrees/ (scan-w1-*, scan-w2-*, scan-onda-*, scan-baseline, infra-pgbouncer e outras) que já foram INTEGRADOS em main e não servem mais. Remova os worktrees do Motor com sandbox_worktree_remove (eles estão mesclados, então a remoção é segura) — mas ANTES confirme com git log que o branch de cada um já está contido em main (git merge-base --is-ancestor <branch> main). NÃO remova nada que não esteja contido em main, e NÃO toque nas branches que o dono tem pendentes: feat/turn-interleave, feat/tool-cards-collapsed, feat/bump-nomad-ui-1.13.7 (elas estão em worktrees — mantenha). Registre o que removeu.
2) Verifique que o clone principal /workspace está em main e limpo (só untracked de infra como .sbcache/, be/qcheck.mjs, dump.rdb — não commite nada disso).
3) BASELINE NOVO em ${BASE}: sandbox_worktree_create com name "wf/base" e base "${BASE}"; ${WF}/bootstrap-wt.sh <worktree> 34 (se o slot 34 estiver ocupado, ache um livre — os velhos 0-19, 30, 31 e 32 devem estar livres depois da limpeza — e diga qual usou); rode cada gate separado via heavy.sh com o .wf-env.sh carregado: check-lock:root, check-lock:fe, typecheck, lint, test:be, test:fe, build, cycles. Grave ${WF}/baseline-db948f35.json no formato {"base":"${BASE}","gates":{"<gate>":{"ok":true|false,"segundos":N,"falhas":["arquivo > teste",...]}}} e valide com python3 -c "import json;json.load(open(...))". Registre o que REALMENTE falhar (13 falhas do be são conhecidas no 69e0b28: zod em agents.test.ts ×2 e definition.l1.test.ts ×10, ambiente em setup-from-org; se mudou, registre a nova lista).
4) Confirme que o servidor HTTP da porta 8765 (python3 -m http.server, cwd /workspace/.sbcache/scan-motor-2026-10-11) responde 200 em /visual/index.html e /aplicacao/index.html; se não, suba de novo no mesmo cwd em background. NÃO derrube esse servidor.
ok=true só se o baseline novo foi gravado e o clone está limpo.`
}

function planPrompt(it) {
  return `${COMMON}

ITEM ${it.id}: ${it.title}
${it.brief}

TAREFA (só leitura, ainda sem worktree): o plano de implementação sobre \`${BASE}\`.
1. Leia o(s) documento(s) citado(s) no briefing e o código atual no clone /workspace (que está em main = ${BASE}); confirme cada afirmação no código e registre em scan_claims_checked o que confirmou ou refutou.
2. Escopo DESTA fatia: o que entra agora, o que fica para a próxima e por quê. Mudança pequena, testável, reversível. Comportamento novo visível fica atrás de flag com default que preserva o comportamento de hoje.
3. Todo valor que é decisão do dono: escolha um default seguro e registre em assumed_defaults com o número da decisão do ROADMAP quando houver.
4. prod_changes: o que precisa acontecer em produção para a mudança valer (env nova, migration, pacote, lock, script). Este workflow NÃO executa nada disso.
5. files e tests: caminhos previstos e o que cada teste prova.
blocked=true só se o item inteiro depender de algo fora do repo (decisão do dono ou mudança de produção).
${persist(`${WF}/plano/${it.id}.json`)}`
}

function criticPrompt(plans) {
  const view = {}
  for (const it of ITEMS) view[it.id] = { titulo: it.title, risco: it.risk, plano: plans[it.id] }
  return `${COMMON}

Você é o revisor cruzado dos planos. Os itens abaixo serão implementados em paralelo, cada um em branch própria a partir de \`${BASE}\`, e depois integrados em sequência nesta ordem: ${ITEMS.map(i => i.id).join(' → ')}. Confira no código o que precisar (só leitura):
(a) os três fazendo a mesma coisa ou com nomes de env que colidem (as duas fatias de realtime e o SDK tocam rede e config; a tela toca o editor de setup que a 1.1 e a 1.5 já mexeram);
(b) arquivos tocados por mais de um item: diga quem faz o quê para o merge ser trivial;
(c) plano que regride algo já em produção (tetos da 1.1, redação da 1.5, guard SSRF da 1.4, cross-tenant da 2.5, tempo real da 1.10, custo da 2.2, workflows da 2.7);
(d) default inseguro ou que muda comportamento de quem usa hoje sem querer;
(e) plano grande demais para uma fatia.
Escreva uma nota para CADA item (mesmo que ok). defer=true só se o plano for inseguro ou depender de decisão que não dá para assumir; explique.
${persist(`${WF}/plano/critica.json`)}
PLANOS (JSON, chave = id):
${JSON.stringify(view)}`
}

function implPrompt(it, slot) {
  const notes = {}
  for (const n of (critic && critic.per_action) || []) notes[n.id] = n
  return `${COMMON}

ITEM ${it.id}: ${it.title}
${it.brief}
Plano (JSON): ${JSON.stringify(plans[it.id])}
Nota do revisor cruzado: ${notes[it.id] ? notes[it.id].note : 'nenhuma'}
Notas gerais: ${critic ? critic.global_notes : 'nenhuma'}
Ordem de integração: ${ITEMS.map(i => i.id).join(' → ')} (você é o ${ITEMS.indexOf(it) + 1}º)

TAREFA: implementar.
1. sandbox_worktree_create com name "${it.branch}" e base "${BASE}". Se já existir (retomada), reutilize e continue do git log/status. Trabalhe só nela.
2. ${WF}/bootstrap-wt.sh <worktree> ${slot}; carregue <worktree>/.wf-env.sh nos comandos de teste.
3. Implemente o escopo do plano ajustado pelas notas, com testes que falham sem a mudança. Nos arquivos compartilhados com outro item: mudança mínima e localizada, código novo em módulo novo, e NEVER estoure um teto de tamanho — extraia.
4. Rode typecheck dos workspaces tocados e os testes dos arquivos tocados e vizinhos. Nenhuma falha nova contra o baseline novo em ${WF}/baseline-db948f35.json.
5. Commit(s) na branch ${it.branch} (git add -A dentro da worktree; confira que .wf-env.sh, node_modules e o symlink de be/.env NÃO entram).
6. Escreva ${WF}/itens/${it.id}/IMPLEMENTACAO.md: o que mudou e por quê, como testar, defaults assumidos (com o número da decisão), mudanças de produção necessárias, o que ficou de fora, e ONDE esta fatia encosta no caminho do mid-turn (feat/turn-interleave) e no 503/erro do provador. Releia depois de escrever.
status "done" só se tudo passou; "partial" se parte do escopo ficou de fora mas o que entrou está testado; "blocked"/"failed" com motivo em summary.
${persist(`${WF}/itens/${it.id}/impl.json`)}`
}

const LENS = {
  correcao: 'correção e regressão: fecha o achado? quebra caminho já em produção (tetos 1.1, redação 1.5, SSRF 1.4, cross-tenant 2.5, custo 2.2, tempo real 1.10, workflows 2.7)? os testes falham sem a mudança?',
  concorrencia: 'concorrência e ciclo de vida do turno: be e worker como processos separados, abort e Parar (abortReason), lock da thread e slot da org liberados em todo caminho, corrida, restart no meio, idempotência',
  seguranca: 'segurança: SSRF e bypass do guard, segredo em log/snapshot/resposta, vazamento entre orgs, configs que desligam proteção por acidente, permissão da tela nova',
}

function reviewPrompt(it, impl, lens, round) {
  return `${COMMON}

REVISÃO ADVERSARIAL (rodada ${round + 1}), lente: ${lens}
ITEM ${it.id}: ${it.title}
${it.brief}
Plano (JSON): ${JSON.stringify(plans[it.id])}
Resultado do implementador (JSON): ${JSON.stringify(impl)}
Worktree ${impl.worktree}, branch ${it.branch}. Diff: git -C ${impl.worktree} diff ${BASE}...HEAD

Seu papel é achar o que está errado, não aprovar. Verifique:
- o comportamento com a FLAG DESLIGADA é byte-a-byte o de hoje? (é o critério mais importante dos três itens — prove rodando o teste que existe para isso)
- as regras do CONTEXTO FIXO (abortReason, zod 4, tetos de tamanho, migration, segredo, D11/D12, português);
- o que quebra caminho já em produção;
- os testes novos falham sem a mudança? (prove pelo diff por que falhariam)
- default que muda comportamento de quem usa hoje sem querer; mudança de produção que não está em prod_changes.
Rode você mesmo os testes do item e o typecheck (heavy.sh com ${impl.worktree}/.wf-env.sh). NÃO edite a worktree.
verdict "fix" só com itens bloqueantes concretos (arquivo, linha, problema, correção); o resto em non_blocking.
${persist(`${WF}/itens/${it.id}/revisao-${lens}-r${round + 1}.json`)}`
}

function fixPrompt(it, impl, blocking, slot, round) {
  return `${COMMON}

CORREÇÃO (rodada ${round + 1}) do ITEM ${it.id}
Worktree ${impl.worktree}, branch ${it.branch} (ambiente ${impl.worktree}/.wf-env.sh, slot ${slot}).
Estado atual: ${JSON.stringify(impl)}
Bloqueantes dos revisores: ${JSON.stringify(blocking)}
Corrija cada item ou prove que o revisor errou (registre em summary). Rode de novo typecheck e testes tocados, compare com ${WF}/baseline-db948f35.json, commit na mesma branch e atualize ${WF}/itens/${it.id}/IMPLEMENTACAO.md. Devolva o formato do implementador com as listas completas.
${persist(`${WF}/itens/${it.id}/impl.json`)}`
}

async function runItem(it) {
  const slot = ITEMS.indexOf(it) + 40
  const effort = it.risk === 'alto' ? 'xhigh' : 'high'
  let impl = await agent(implPrompt(it, slot), { label: `implementar ${it.id}`, phase: 'Implementar', schema: IMPL_SCHEMA, effort })
  if (!impl || impl.status === 'blocked') return { id: it.id, final: 'bloqueada', impl }
  if (impl.status === 'failed') return { id: it.id, final: 'falhou', impl }
  let reviews = []
  for (let round = 0; round <= 2; round++) {
    reviews = (await parallel(it.lens.map(l => () => agent(reviewPrompt(it, impl, l, round), { label: `revisar ${it.id} ${l} r${round + 1}`, phase: 'Implementar', schema: REVIEW_SCHEMA, effort: it.risk === 'baixo' ? 'high' : 'xhigh' })))).filter(Boolean)
    const blocking = reviews.filter(r => r.verdict === 'fix').flatMap(r => r.blocking)
    if (!blocking.length) return { id: it.id, final: 'aprovada', impl, reviews }
    if (round === 2) return { id: it.id, final: 'precisa_do_dono', impl, reviews }
    const fixed = await agent(fixPrompt(it, impl, blocking, slot, round), { label: `corrigir ${it.id} r${round + 1}`, phase: 'Implementar', schema: IMPL_SCHEMA, effort })
    if (!fixed || fixed.status === 'blocked' || fixed.status === 'failed') return { id: it.id, final: 'falhou', impl: fixed || impl, reviews }
    impl = fixed
  }
  return { id: it.id, final: 'precisa_do_dono', impl, reviews }
}

function prepPrompt(branch, slot) {
  return `${COMMON}

PREPARAR A INTEGRAÇÃO ${branch}: sandbox_worktree_create com name "${branch}" e base "${BASE}" (se já existir, reutilize e confirme que desce de ${BASE}). Depois ${WF}/bootstrap-wt.sh <worktree> ${slot}.`
}

function mergePrompt(it, branch, wt, slot, prior) {
  const r = results[it.id]
  return `${COMMON}

INTEGRAÇÃO: trazer o item ${it.id} (branch ${it.branch}) para ${branch}.
Worktree ${wt} (slot ${slot}; carregue ${wt}/.wf-env.sh nos testes).
Já integradas: ${prior}
Resumo: ${r.impl.summary}
Arquivos: ${r.impl.files_changed.join(', ')}
Testes: ${r.impl.tests.join(' | ')}
1. git -C ${wt} status limpo. Se ${it.branch} já estiver integrada, só faça o passo 3.
2. git -C ${wt} merge --no-ff ${it.branch} -m "Merge ${it.branch}: ${it.title}" -m "${COAUTHOR}"
3. Conflito: resolva preservando a intenção dos DOIS lados (leia ${WF}/itens/<id>/IMPLEMENTACAO.md das duas partes; nunca descarte o código de uma delas para fazer passar); rode typecheck dos workspaces afetados e os testes dos arquivos em conflito e dos dois itens; conclua com git add e git commit --no-edit. Sem solução segura: git merge --abort e devolva merged=false.
4. Mesmo sem conflito: typecheck dos workspaces tocados e os testes do item no estado integrado. Falha nova que não está no baseline: corrija com commit "fix(scan): ..." e explique.
${persist(`${WF}/integracao/${branch.replace('/', '-')}/merge-${it.id}.json`)}`
}

function gatesPrompt(branch, wt, slot, tag) {
  return `${COMMON}

GATES COMPLETOS em ${branch} (worktree ${wt}, slot ${slot}; rodada ${tag}).
Rode cada gate separado via heavy.sh com ${wt}/.wf-env.sh: check-lock:root, check-lock:fe, typecheck, lint, test:be, test:fe, build, cycles (comandos em ${WF}/COMANDOS.md). Compare cada falha com ${WF}/baseline-db948f35.json: só é nova a que não está lá. Para cada nova: arquivo e teste, trecho do erro e qual item provavelmente causou (git log/blame). Não corrija nada.
${persist(`${WF}/integracao/${branch.replace('/', '-')}/gates-${tag}.json`)}`
}

function gateFixPrompt(branch, wt, slot, g, tag) {
  return `${COMMON}

CORRIGIR FALHAS NOVAS DE GATE em ${branch} (worktree ${wt}, slot ${slot}).
Gates (JSON): ${JSON.stringify(g)}
Corrija só as novas (as do baseline ficam). Entenda a intenção do item que causou cada uma (${WF}/itens/<id>/IMPLEMENTACAO.md) e corrija sem desfazer o item. Commit "fix(scan): ..." e rerode os gates que falharam.
${persist(`${WF}/integracao/${branch.replace('/', '-')}/correcao-${tag}.json`)}`
}

function holisticPrompt(lens, ctx) {
  return `${COMMON}

REVISÃO DO CONJUNTO, lente: ${lens.text}
Tudo está em ${ctx.branch} (worktree ${ctx.wt}), sobre ${BASE}. Diff total: git -C ${ctx.wt} diff ${BASE}...HEAD (leia por arquivo). Detalhes em ${WF}/itens/<id>/IMPLEMENTACAO.md.
Itens integrados: ${JSON.stringify(ctx.items)}
Cada item já passou por revisão própria; o foco é o que só aparece junto: a tela de subagentes contra os tetos de turno já em produção (1.1); o tradutor do SDK contra a redação de segredo (1.5) e a regra D12; socket.io contra o tempo real e o mid-turn; e o DEPLOY (locks de be/ e raiz regenerados, migration no boot, ordem be → worker → fe, front velho aberto durante o rollout, rollback de cada item).
Para cada problema: severidade (bloqueante = não vai para produção assim; importante; menor), item de origem, arquivo, linha, problema e correção. Não edite nada.
${persist(`${WF}/holistica/${lens.key}.json`)}`
}

function holisticFixPrompt(blockers, ctx) {
  return `${COMMON}

CORRIGIR OS BLOQUEANTES DA REVISÃO DO CONJUNTO.
Achados: ${JSON.stringify(blockers)}
Worktree ${ctx.wt}, branch ${ctx.branch}, slot ${ctx.slot}. Commit "fix(scan): ...". Typecheck e testes da área (heavy.sh com o .wf-env.sh). Achado errado: prove em notes e não mexa.
${persist(`${WF}/holistica/correcao.json`)}`
}

function reportPrompt(sum) {
  return `${COMMON}

RELATÓRIO FINAL para o dono.
Resumo (JSON): ${JSON.stringify(sum)}
Detalhes no SB em ${WF}: itens/<id>/, plano/, integracao/, holistica/, baseline-db948f35.json. Use esses arquivos e o git; não redigite número à mão.
1. Gere /workspace/.sbcache/scan-motor-2026-10-11/aplicacao/itens/index.html COM UM SCRIPT PYTHON (escrita manual perde pedaços neste SB): PT-BR, autocontido (CSS inline, sem JS, sem recurso externo), legível no celular. Conteúdo: os 3 itens com status, branch, commits, o que muda para o usuário, os defaults assumidos, as mudanças de produção por item, e link para aplicacao/itens/<id>.html com plano, IMPLEMENTACAO.md e revisões renderizados, e para aplicacao/itens/<id>.diff (git diff ${BASE}...<branch>). Coloque o botão de voltar ao /aplicacao/index.html. Uma seção "o que NÃO entrou e por quê". Uma seção "antes do deploy, em ordem".
2. Acrescente o link "Itens novos" ao ${WF}../scan-motor-2026-10-11/aplicacao/index.html SE E SOMENTE SE ele ainda existir sem esse link — preservando o que já tem. Se já tiver, não toque.
3. Confira com curl que /aplicacao/itens/index.html e uma página de item respondem 200 e estão íntegras (releia o fim dos arquivos).
4. Limpeza: ${WF}/teardown-wt.sh para os slots que você subiu (34 e os de integração). Mantenha worktrees, bancos e o servidor da 8765.
Mantenha hostnames públicos como estão; nenhum segredo, IP interno ou nome de container de produção.
${''}`
}

phase('Preparar')
log(`Base ${BASE} (já em produção). Três itens em paralelo; comandos pesados limitados a 2 no SB.`)
const setup = await agent(setupPrompt(), { label: 'preparar SB e baseline novo', phase: 'Preparar', schema: SETUP_SCHEMA, effort: 'high' })
if (!setup || !setup.ok) { log('Preparação falhou; parei antes de codar.'); return { etapa: 'preparar', setup } }
log(`Baseline novo gravado. Gates que já falham no ${BASE}: ${setup.baseline.filter(g => !g.ok).map(g => g.gate).join(', ') || 'nenhum'}. Slots livres: ${setup.slots_free.join(', ')}.`)

phase('Planejar')
const planList = await parallel(ITEMS.map(it => () => agent(planPrompt(it), { label: `plano ${it.id}`, phase: 'Planejar', schema: PLAN_SCHEMA, effort: 'high' })))
const plans = {}
ITEMS.forEach((it, i) => { plans[it.id] = planList[i] || null })
const critic = await agent(criticPrompt(plans), { label: 'crítica cruzada', phase: 'Planejar', schema: CRITIC_SCHEMA, effort: 'xhigh' })
const deferSet = new Set()
if (critic) for (const n of critic.per_action) if (n.defer) deferSet.add(n.id)
if (deferSet.size) log(`Adiadas pelo revisor: ${[...deferSet].join(', ')}`)

function finalOf(id) {
  if (!plans[id]) return 'sem_plano'
  if (plans[id].blocked) return 'bloqueada_no_plano'
  if (deferSet.has(id)) return 'adiada'
  return results[id] ? results[id].final : 'falhou'
}

function overlapsFor(id) {
  const mine = new Set((plans[id] && plans[id].files) || [])
  const out = []
  for (const it of ITEMS) {
    if (it.id === id || !plans[it.id]) continue
    const shared = (plans[it.id].files || []).filter(f => mine.has(f))
    if (shared.length) out.push(`${it.id} (${shared.join(', ')})`)
  }
  return out.length ? out.join('; ') : 'nenhuma'
}
const _ov = overlapsFor
function implPromptWithOverlap(it, slot) {
  const base = implPrompt(it, slot)
  return base.replace('Ordem de integração:', `Arquivos em comum com outros itens (cada um na sua branch; a integração vem depois): ${_ov(it.id)}\nOrdem de integração:`)
}

phase('Implementar')
const runnable = ITEMS.filter(it => plans[it.id] && !plans[it.id].blocked && !deferSet.has(it.id))
log(`Implementando ${runnable.length} de ${ITEMS.length} itens, até 3 ao mesmo tempo (comandos pesados em 2 vagas).`)
const s = sem(3)
const out = await parallel(runnable.map(it => () => s(() => runItem(it))))
const results = {}
runnable.forEach((it, i) => { results[it.id] = out[i] || { id: it.id, final: 'falhou', impl: null } })
const notOk = ITEMS.filter(it => finalOf(it.id) !== 'aprovada').map(it => `${it.id}=${finalOf(it.id)}`)
log(`Aprovados: ${ITEMS.filter(it => finalOf(it.id) === 'aprovada').length}/${ITEMS.length}. Fora: ${notOk.length ? notOk.join(', ') : 'nenhum'}.`)

phase('Integrar')
const BRANCH = 'scan/itens-2026-10-12'
const prep = await agent(prepPrompt(BRANCH, 45), { label: `preparar ${BRANCH}`, phase: 'Integrar', schema: { type: 'object', properties: { ok: B, worktree: S, head: S }, required: ['ok', 'worktree', 'head'] }, effort: 'medium' })
let merges = [], g = null, holistic = [], blockers = [], hfix = null
if (prep && prep.ok) {
  const prior = []
  for (const it of ITEMS.filter(x => finalOf(x.id) === 'aprovada')) {
    const m = await agent(mergePrompt(it, BRANCH, prep.worktree, 45, prior.join(', ') || 'nenhuma'), { label: `merge ${it.id}`, phase: 'Integrar', schema: MERGE_SCHEMA, effort: 'high' })
    merges.push(Object.assign({ id: it.id }, m || { merged: false, conflicts: [], checks: '', head: '', notes: 'agente falhou' }))
    if (!m || !m.merged) log(`${it.id} não entrou em ${BRANCH}: ${m ? (m.notes || 'conflito') : 'agente falhou'}`)
    prior.push(`${it.id}${m && m.merged ? '' : ' (NÃO integrada)'}`)
  }
  g = await agent(gatesPrompt(BRANCH, prep.worktree, 45, '1'), { label: `gates ${BRANCH}`, phase: 'Validar', schema: GATES_SCHEMA, effort: 'medium' })
  for (let round = 1; g && g.new_failures_total > 0 && round <= 2; round++) {
    log(`${BRANCH}: ${g.new_failures_total} falha(s) nova(s) de gate; corrigindo (rodada ${round}).`)
    await agent(gateFixPrompt(BRANCH, prep.worktree, 45, g, `r${round}`), { label: `corrigir gates r${round}`, phase: 'Validar', schema: FIX_SCHEMA, effort: 'high' })
    g = await agent(gatesPrompt(BRANCH, prep.worktree, 45, `r${round + 1}`), { label: `gates r${round + 1}`, phase: 'Validar', schema: GATES_SCHEMA, effort: 'medium' })
  }
  const items = ITEMS.filter(it => finalOf(it.id) === 'aprovada').map(it => ({ id: it.id, titulo: it.title, resumo: results[it.id].impl.summary, arquivos: results[it.id].impl.files_changed }))
  const lenses = [
    { key: 'conjunto', text: 'interação entre os três itens e com o que já está em produção' },
    { key: 'deploy', text: 'deploy e operação: locks, migration no boot, ordem be → worker → fe, front velho aberto, rollback de cada item' },
    { key: 'seguranca', text: 'segurança: configs que desligam proteção por acidente, permissão da tela nova, segredo, SSRF, multi-tenant' },
  ]
  holistic = (await parallel(lenses.map(l => () => agent(holisticPrompt(l, { branch: BRANCH, wt: prep.worktree, items }), { label: `revisão do conjunto ${l.key}`, phase: 'Validar', schema: HOLISTIC_SCHEMA, effort: 'xhigh' })))).filter(Boolean)
  blockers = holistic.flatMap(h => h.findings.filter(f => f.severity === 'bloqueante'))
  if (blockers.length) {
    log(`${blockers.length} bloqueante(s) no conjunto; corrigindo.`)
    hfix = await agent(holisticFixPrompt(blockers, { branch: BRANCH, wt: prep.worktree, slot: 45 }), { label: 'corrigir bloqueantes do conjunto', phase: 'Validar', schema: FIX_SCHEMA, effort: 'xhigh' })
    g = await agent(gatesPrompt(BRANCH, prep.worktree, 45, 'final'), { label: 'gates final', phase: 'Validar', schema: GATES_SCHEMA, effort: 'medium' })
  }
}

const summary = {
  base: BASE, branch: BRANCH,
  itens: ITEMS.map(it => ({
    id: it.id, titulo: it.title, branch: it.branch, risco: it.risk, status: finalOf(it.id),
    integrada: !!(merges.find(m => m.id === it.id) || {}).merged,
    defaults: results[it.id] && results[it.id].impl ? results[it.id].impl.assumed_defaults : [],
    prod_changes: results[it.id] && results[it.id].impl ? results[it.id].impl.prod_changes : [],
  })),
  gates: g ? { head: g.head, novas: g.new_failures_total } : null,
  conjunto: { achados: holistic.reduce((n, h) => n + h.findings.length, 0), bloqueantes: blockers.length, corrigidos: !!hfix },
}

phase('Relatório')
const report = await agent(reportPrompt(summary), { label: 'relatório HTML', phase: 'Relatório', schema: REPORT_SCHEMA, effort: 'medium' })

return { relatorio: report ? report.url : null, ...summary, merges }