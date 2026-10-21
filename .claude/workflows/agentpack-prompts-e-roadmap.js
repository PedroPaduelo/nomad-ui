export const meta = {
  name: 'agentpack-prompts-e-roadmap',
  description: 'AgentPack: duas features novas — gestão de prompts de agente (espelho das skills, dentro do projeto) e roadmap com Gantt e agenda tipo Google Calendar ligado às tasks (início e fim). Mapa, desenho, implementação, revisão adversarial, integração e relatório visual. Branches publicadas, sem main, sem deploy.',
  whenToUse: 'Pedido do dono em 2026-10-13 para o AgentPack',
  phases: [
    { title: 'Preparar', detail: 'semáforo compartilhado, bancos de teste por branch, worktree de leitura' },
    { title: 'Mapear', detail: 'skills, tasks, padrões de UI e bibliotecas, registro de tools MCP e docs geradas' },
    { title: 'Desenhar', detail: 'desenho de cada feature com crítica adversarial' },
    { title: 'Implementar', detail: 'uma branch por feature, revisão em 3 lentes, correções' },
    { title: 'Integrar', detail: 'merge em branch de integração, docs regeneradas, gates, push das branches' },
    { title: 'Relatório', detail: 'telas capturadas se couber na memória e relatório visual' },
  ],
}

const SB = 'agent-package-audit'
const WF = '/workspace/.sbcache/wf'
const W2 = '/workspace/.sbcache/wf2'
const COAUTHOR = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'

const FEATURES = [
  {
    id: 'prompts',
    branch: 'feat/prompts-agente',
    db: 'agentpack_wf2_prompts_test',
    titulo: 'Gestão de prompts de agente',
    pedido: `Palavras do dono: "Vamos colocar uma feature nova no AgentPack. Ele tem a gestão de MCP, tem a gestão de skills, é para ter uma gestão de prompt de agente também. Basicamente é a mesma coisa da skill, só que muda o conceito do objeto, que é prompt de agentes. Vai fazer essa gestão e vai colocar dentro do projeto. Manda bala."
Diretriz: espelhar a feature de skills de ponta a ponta (catálogo, versões e histórico, duplicar, origem builtin somente leitura com cópia editável, vínculo ao projeto com ativo/inativo, vínculo às tasks com tipo de relação, entrada no contexto do projeto e no pacote de contexto da task, busca, REST, tools MCP e toolsets, telas, testes, docs), trocando o objeto para "prompt de agente". O que da skill não fizer sentido para um prompt (por exemplo arquivos auxiliares do formato Agent Skills) pode ficar de fora, com justificativa.`,
  },
  {
    id: 'roadmap',
    branch: 'feat/roadmap-gantt',
    db: 'agentpack_wf2_roadmap_test',
    titulo: 'Roadmap com Gantt e agenda',
    pedido: `Palavras do dono: "Quero uma feature nova de roadmap com mapa de Gantt. A ideia é ter isso conectado com as tasks, pôr início e fim para as tasks e conseguir gerar o roadmap. Pode ter agenda tipo a do Google Calendar."
Fatos conferidos no schema do main: o model Task NÃO tem data de início nem de fim (tem createdAt, updatedAt, completedAt, claimExpiresAt), e JÁ tem dependências entre tasks (TaskDependency, relações dependsOn e dependents), que o Gantt deve desenhar como setas.
Diretriz: (1) task ganha início e fim (opcionais), validados (fim não antes do início), gravados em UTC e mostrados no fuso de quem vê (o dono está em America/Sao_Paulo); avalie dia inteiro vs. horário. (2) Roadmap do projeto em Gantt: barras por início e fim, setas de dependência, linha de hoje, zoom (dia, semana, mês, trimestre), agrupamento (status, prioridade, tag), arrastar e redimensionar para mudar datas com a mesma permissão de editar task, lista de tasks sem data para arrastar para a linha do tempo. (3) Agenda tipo Google Calendar: visões mês, semana e dia, tasks como eventos, arrastar para reagendar, clique abre a task. (4) "Gerar o roadmap": tool MCP e endpoint que devolvem a linha do tempo do projeto para os agentes, task_create e task_update aceitando as datas, e exportar a visão (avalie PNG, PDF ou link). Sugestão automática de datas por dependência e prioridade é opcional: se entrar, só propõe e quem confirma é a pessoa. (5) Configurações da visão (zoom padrão, agrupamento, dias úteis) com tela: regra do dono, toda configuração existente tem tela para ver e editar.`,
  },
]

const COMMON = `CONTEXTO FIXO (vale para todo agente deste workflow)
- Dono: Myke, fala PT-BR. É muito visual: relatório para ele começa com números grandes, diagramas e telas, não com texto corrido. Regra dele: toda configuração que existe tem uma tela para ver e editar.
- Trabalhe SÓ nos sandboxes do MyPanel, pelas tools MCP mypanel (descubra os nomes com ToolSearch: mcp__mypanel__sandbox_bash, sandbox_read, sandbox_edit, sandbox_write, sandbox_grep, sandbox_glob, sandbox_ls, sandbox_process_wait, sandbox_process_output, sandbox_worktree_create, sandbox_worktree_list, sandbox_worktree_remove, sandbox_preview). NUNCA crie, leia ou edite arquivos na máquina local.
- Sandbox: "${SB}" (repo /workspace = GitHub PedroPaduelo/agent-package). O clone principal /workspace está na branch feat/admin-agent-key com 2 commits locais que NÃO são deste workflow: NUNCA faça checkout, commit, reset, stash, rebase ou merge nele. Todo trabalho é em worktree criada a partir de origin/main.
- OUTRO WORKFLOW roda no mesmo sandbox ao mesmo tempo (correção do proxy de MCP e mapa do Render). Dele: as pastas /workspace/.sbcache/wf, wf-render, wf-mcp e wf-relatorio, as worktrees wf/leitura, wf/baseline e fix/mcp-proxy-sessoes e o banco agentpack_wf_test. Não mexa em nada disso; ler é permitido. A pasta deste workflow é ${W2}.
- O sandbox tem 2 GB de RAM (o AGENTS.md diz 6, está errado) e é compartilhado com o outro workflow. Comando pesado (npm ci, tsc, jest, eslint, vitest, vite build, servidor de app) SEMPRE via ${WF}/heavy.sh <comando> (uma vaga só, compartilhada pelos dois workflows; NUNCA rode pesado por fora dele). Lint só dos arquivos tocados; jest do backend com --runInBand e em shards; vitest com --maxWorkers=1. timeout_ms >= 2400000 no sandbox_bash e sandbox_process_wait até terminar.
- Regras do repo: AGENTS.md (o CLAUDE.md só importa ele). Leia antes de mexer. Node 24: export PATH=/workspace/.node/bin:$PATH.
- Banco: Postgres 15 local do sandbox, compartilhado com o outro workflow. Cada branch deste workflow tem banco PRÓPRIO (env em ${W2}/pg-<branch>.sh), porque o jest do repo faz TRUNCATE e migra. Antes de rodar teste com banco: pg_ctlcluster 15 main start (é idempotente; o outro workflow pode desligar o Postgres no fim dele). Nunca tente obter a senha do banco de teste remoto (segredo; nada de docker inspect ou env_vars).
- Produção do AgentPack (projeto workspace_nommand: agentpack-backend-ws e agentpack-frontend-ws, https://agentpack-v0.mp.serendiped.com): só leitura. PROIBIDO: deploy, deployments_trigger, alterar env_vars, services ou domains, restart, docker_exec, push na main, qualquer escrita em produção.
- Frontend: kit @nomad/ui (não reinvente componente que o kit tem). O build Docker fixa npm 10.9.4 e o @nomad/ui vem como git+https. Se mexer em lockfile: npx npm@10.9.4 install --package-lock-only e confirme npx npm@10.9.4 ci --dry-run. Respeite os tetos e o ratchet de lint do repo: tetos só encolhem, nunca crescem para caber código novo; código novo em arquivo novo.
- Segredos: nunca imprima token, senha, chave, string de conexão nem conteúdo de .env. Esta sessão passa pelo LB de produção, que guarda os payloads.
- Escritas neste ambiente já perderam pedaços de uns 7 caracteres perto de "data:" e "id:". Releia o trecho depois de cada escrita e rode typecheck do que tocou.
- Multiempresa: todo dado novo é da empresa e do projeto; nenhuma rota ou tool MCP pode ler ou escrever fora do escopo de quem chama. A Conta Nomad é a fonte de empresas e membros; o AgentPack só guarda os próprios recursos.
- Texto de interface e mensagem de erro em PT-BR, no tom do app. Commits no estilo do git log do repo, com a última linha: ${COAUTHOR}
- Todo processo que você subir tem prazo e é encerrado antes de você terminar, salvo o que a tarefa mandar manter.`

const persist = p => `Grave o JSON que você vai devolver em ${p} (sandbox_write; crie a pasta antes) e valide com: python3 -c "import json;json.load(open('${p}'))". Se falhar, regrave.`

const S = { type: 'string' }, SA = { type: 'array', items: { type: 'string' } }, B = { type: 'boolean' }
const PREP_SCHEMA = { type: 'object', properties: { ok: B, base: S, leitura: S, heavy: S, pg_envs: SA, notes: S }, required: ['ok', 'base', 'leitura', 'heavy', 'pg_envs'] }
const MAP_SCHEMA = { type: 'object', properties: { resumo: S, doc: S, arquivos: { type: 'array', items: { type: 'object', properties: { caminho: S, papel: S }, required: ['caminho', 'papel'] } }, checklist: SA, riscos: SA }, required: ['resumo', 'doc', 'arquivos', 'checklist', 'riscos'] }
const DESIGN_SCHEMA = { type: 'object', properties: { resumo: S, doc: S, migracoes: SA, rest: SA, tools_mcp: SA, telas: SA, bibliotecas: SA, testes: SA, decisoes_dono: { type: 'array', items: { type: 'object', properties: { pergunta: S, opcoes: SA, recomendacao: S }, required: ['pergunta', 'opcoes', 'recomendacao'] } }, mudancas_prod: SA, fora: SA, riscos: SA }, required: ['resumo', 'doc', 'migracoes', 'rest', 'tools_mcp', 'telas', 'testes', 'decisoes_dono', 'mudancas_prod', 'fora', 'riscos'] }
const CRITIC_SCHEMA = { type: 'object', properties: { veredito: { type: 'string', enum: ['aprovar', 'revisar'] }, problemas: { type: 'array', items: { type: 'object', properties: { severidade: { type: 'string', enum: ['bloqueante', 'importante', 'menor'] }, problema: S, correcao: S }, required: ['severidade', 'problema', 'correcao'] } } }, required: ['veredito', 'problemas'] }
const IMPL_SCHEMA = { type: 'object', properties: { status: { type: 'string', enum: ['done', 'partial', 'blocked', 'failed'] }, worktree: S, head: S, commits: SA, arquivos: SA, resumo: S, testes: SA, falhas_novas: SA, mudancas_prod: SA, fora: SA }, required: ['status', 'worktree', 'head', 'commits', 'arquivos', 'resumo', 'testes', 'falhas_novas', 'mudancas_prod', 'fora'] }
const REVIEW_SCHEMA = { type: 'object', properties: { verdict: { type: 'string', enum: ['approve', 'fix'] }, blocking: { type: 'array', items: { type: 'object', properties: { file: S, line: S, problem: S, fix: S }, required: ['file', 'problem', 'fix'] } }, non_blocking: SA, evidence: S }, required: ['verdict', 'blocking', 'non_blocking', 'evidence'] }
const INTEG_SCHEMA = { type: 'object', properties: { ok: B, worktree: S, head: S, merges: SA, conflitos: SA, docs_regeneradas: SA, notes: S }, required: ['ok', 'worktree', 'head', 'merges', 'conflitos'] }
const GATES_SCHEMA = { type: 'object', properties: { head: S, novas: { type: 'integer' }, gates: { type: 'array', items: { type: 'object', properties: { gate: S, ok: B, novas: SA }, required: ['gate', 'ok', 'novas'] } }, notes: S }, required: ['head', 'novas', 'gates'] }
const PUSH_SCHEMA = { type: 'object', properties: { publicadas: SA, notes: S }, required: ['publicadas'] }
const SHOTS_SCHEMA = { type: 'object', properties: { ok: B, telas: { type: 'array', items: { type: 'object', properties: { nome: S, arquivo: S }, required: ['nome', 'arquivo'] } }, notes: S }, required: ['ok', 'telas'] }
const REPORT_SCHEMA = { type: 'object', properties: { url: S, ok: B, notes: S }, required: ['url', 'ok'] }

function prepPrompt() {
  return `${COMMON}

TAREFA: preparar este workflow sem atrapalhar o outro.
1) Espere existir ${WF}/heavy.sh (o outro workflow cria). Confira a cada 60 s, por até 40 minutos. Se não aparecer, crie-o você com a MESMA especificação: semáforo de uma vaga com flock em ${WF}/locks/heavy.lock, esperando em laço com sleep 5, exportando PATH=/workspace/.node/bin:$PATH e NODE_OPTIONS=--max-old-space-size=1536 quando não vier definido, devolvendo o exit code do comando. Mesmo arquivo de trava, para os dois workflows se excluírem.
2) Espere também o Postgres 15 local existir (o outro workflow instala; pg_lsclusters mostra 15 main), por até 40 minutos. Se não aparecer, instale você: apt-get update && apt-get install -y postgresql. Não rode apt-get ao mesmo tempo que outro apt-get (cheque o lock do dpkg).
3) pg_ctlcluster 15 main start. Crie um papel local "wf2" com senha descartável e os bancos ${FEATURES.map(f => f.db).join(', ')} e agentpack_wf2_integ_test (todos terminam em _test, exigência do globalSetup do jest). Grave um env por banco em ${W2}/pg-<nome-da-branch-com-barra-trocada-por-hifen>.sh (chmod 600), por exemplo ${W2}/pg-feat-prompts-agente.sh, com DATABASE_URL e o que o jest do backend exige (veja o globalSetup e o AGENTS.md). Não imprima senha.
4) Worktree de leitura: se /workspace/.worktrees/wf-leitura (do outro workflow) existir e estiver em origin/main, use-a. Senão, crie a sua com name "wf2/leitura" e base "origin/main". Não rode npm ci nela.
5) Grave ${W2}/README.txt com os caminhos.
${persist(`${W2}/preparo.json`)}`
}

const MAPS = [
  { id: 'skills', titulo: 'Feature de skills, de ponta a ponta', pedido: 'Mapeie TUDO da feature de skills, que é o molde dos prompts de agente: models e migrations (skill, versões e histórico, arquivos, vínculos com projeto e com task), serviços, rotas REST, tools MCP e toolsets (skills, skills-admin, skills-history), registro no gateway, origem builtin e cópia, seeds, busca unificada, contexto do projeto (project_context e mustRead), pacote de contexto da task, telas e componentes do frontend (catálogo, editor, histórico, aba do projeto, vínculo na task), hooks, cliente da API, tipos, testes e docs. Termine com um checklist de "como clonar esta feature para um objeto novo", na ordem, com os arquivos de cada passo.' },
  { id: 'tasks', titulo: 'Feature de tasks', pedido: 'Mapeie a feature de tasks, que é onde o roadmap se apoia: o model Task e campos, a máquina de estados com portão humano (HITL), dependências (TaskDependency), todos, decisões, claims, eventos, rotas REST, tools MCP task_* (schemas de entrada e saída, inclusive o formato de resumo da listagem e o limite de 200), telas do board, da lista e do detalhe, como a edição de task é autorizada, e os índices do banco. Diga exatamente o que muda para a task ganhar início e fim sem quebrar quem já usa a API e as tools.' },
  { id: 'ui', titulo: 'Padrões de UI, kit e bibliotecas', pedido: 'Mapeie como uma página nova entra no frontend: roteador, navegação lateral, abas do projeto, layout, busca de dados com TanStack Query, stores Zustand, formulários, o editor de markdown que skills e knowledge usam, testes de a11y e os tetos e ratchet de lint. Inventarie o kit @nomad/ui: o que existe para data, calendário, seleção de período, linha do tempo, tooltip, popover, drag. Liste as dependências de data já presentes (date-fns, dayjs ou outra). Para Gantt e calendário, avalie candidatas com npm view no sandbox (versão, licença, peerDependencies com React 19, tamanho): por exemplo gantt-task-react, frappe-gantt, @svar-ui/react-gantt, react-big-calendar, @fullcalendar/react e plugins MIT, @schedule-x/react. Dê sua recomendação e a alternativa de SVG próprio, com critérios: licença, React 19, tema pelos tokens do @nomad/ui, a11y, performance com centenas de tasks, manutenção.' },
  { id: 'mcp-docs', titulo: 'Tools MCP, docs geradas e convenções', pedido: 'Mapeie como uma tool MCP nova nasce: definição, schema, annotations (readOnly, destructive), toolset, permissões por tipo de chave, e os testes que travam o catálogo de tools (há testes de annotations e de consolidação). Mapeie a geração de docs: docs/mcp/tools.md, docs/data-model.md, llms.txt, llms-full.txt — quais scripts geram, quando rodar e se algum teste confere que estão em dia. Mapeie também as diretrizes de API (docs/api-guidelines.md), as convenções de migration e se o backend roda prisma migrate deploy no boot (Dockerfile e start), e as convenções de CHANGELOG.' },
]

function mapPrompt(m, prep) {
  return `${COMMON}

MAPEAMENTO: ${m.titulo}
Leia na worktree de leitura ${prep.leitura} (origin/main ${prep.base}). Não instale nada e não rode build: só git, grep e leitura (npm view para avaliar bibliotecas é permitido).
${m.pedido}
Escreva o documento detalhado em ${W2}/mapa/${m.id}.md (PT-BR, caminhos exatos, arquivo:linha onde importar). Releia o fim do arquivo depois de escrever.
${persist(`${W2}/mapa/${m.id}.json`)}`
}

function designPrompt(f, maps) {
  return `${COMMON}

DESENHO: ${f.titulo}
${f.pedido}
Mapas (JSON; documentos em ${W2}/mapa/): ${JSON.stringify(maps)}
Produza o desenho completo: migrations (aditivas; diga se rodam no boot), models, rotas REST, tools MCP (nomes, schemas, annotations, toolset) e mudanças nas tools existentes sem quebrar quem já chama, telas e fluxos (com a tela de configuração quando houver configuração), bibliotecas escolhidas com justificativa, testes (backend, frontend, a11y, contrato das tools), docs a regenerar, mudanças de produção, o que fica de fora, riscos e decisões do dono com recomendação. Inclua um esboço visual das telas principais (mermaid ou ASCII). Mudança mínima que entrega o pedido inteiro; nada de enfeite.
Escreva ${W2}/desenho/${f.id}.md.
${persist(`${W2}/desenho/${f.id}.json`)}`
}

function designCriticPrompt(f, d) {
  return `${COMMON}

CRÍTICA ADVERSARIAL do desenho: ${f.titulo}
Pedido do dono: ${f.pedido}
Desenho (JSON): ${JSON.stringify(d)}. Documento: ${W2}/desenho/${f.id}.md. Mapas: ${W2}/mapa/.
Ache o que está errado ou faltando: parte do pedido do dono não atendida; quebra de compatibilidade das tools e da API atuais; furo de escopo entre empresas e projetos; migration perigosa; biblioteca com licença ou React incompatível; tela que estoura teto de lint; teste que não prova nada; configuração sem tela. Confira no código (worktree de leitura) o que precisar. Cada problema com severidade e correção concreta.
${persist(`${W2}/desenho/critica-${f.id}.json`)}`
}

function designRevisePrompt(f, d, c) {
  return `${COMMON}

REVISÃO FINAL do desenho: ${f.titulo}
Desenho: ${JSON.stringify(d)}
Crítica: ${JSON.stringify(c)}
Trate cada problema (corrija ou recuse com motivo). Reescreva ${W2}/desenho/${f.id}.md com a seção "Críticas e respostas".
${persist(`${W2}/desenho/${f.id}-final.json`)}`
}

function implPrompt(f, d) {
  const envf = `${W2}/pg-${f.branch.replace('/', '-')}.sh`
  return `${COMMON}

IMPLEMENTAÇÃO: ${f.titulo}
Pedido do dono: ${f.pedido}
Desenho final (JSON): ${JSON.stringify(d)}. Documento: ${W2}/desenho/${f.id}.md.
1) sandbox_worktree_create com name "${f.branch}" e base "origin/main". Se já existir (retomada), continue do git log e do git status.
2) npm ci via heavy.sh conforme o AGENTS.md. Crie backend/.env.test (git-ignored) a partir de ${envf} e rode npm run test:db:migrate.
3) Implemente o desenho inteiro, com testes que falham sem a mudança. Código novo em arquivo novo quando o arquivo existente estiver perto do teto.
4) Via heavy.sh: typecheck de backend e frontend, lint dos arquivos tocados, testes tocados e vizinhos. Compare com /workspace/.sbcache/wf/baseline.json (do outro workflow; se não existir ainda, espere com prazo de 60 minutos): nenhuma falha nova.
5) Regenere as docs geradas que a feature muda (tools MCP, modelo de dados, llms) com os scripts do repo.
6) Commits na branch ${f.branch}; confira que .env.test, node_modules e artefatos não entram.
7) Escreva ${W2}/impl/${f.id}.md: o que mudou, como testar, mudanças de produção, o que ficou de fora.
status "done" só se tudo passou.
${persist(`${W2}/impl/${f.id}.json`)}`
}

const LENSES = [
  { key: 'correcao', texto: 'correção: o pedido do dono está atendido por inteiro? regras de negócio, validação, compatibilidade das tools e da API atuais, migrations, docs regeneradas; os testes falham sem a mudança?' },
  { key: 'seguranca', texto: 'segurança e multiempresa: escopo por empresa e projeto em toda rota e tool nova ou alterada, permissão de edição, annotations corretas das tools, XSS no conteúdo em markdown, atribuição em massa, segredo em log' },
  { key: 'frontend', texto: 'frontend: uso do @nomad/ui, a11y, tetos e ratchet de lint, PT-BR, responsivo no celular, desempenho com centenas de itens, fuso horário e datas corretos, consistência com as telas existentes, configuração com tela' },
]

function reviewPrompt(f, lens, impl, round) {
  return `${COMMON}

REVISÃO ADVERSARIAL (rodada ${round + 1}) de "${f.titulo}", lente: ${lens.texto}
Pedido do dono: ${f.pedido}
Implementação: ${JSON.stringify(impl)}
Diff: git -C ${impl.worktree} diff origin/main...HEAD. Desenho: ${W2}/desenho/${f.id}.md.
Seu papel é achar o que está errado, não aprovar. Rode você mesmo os testes da feature e o typecheck via heavy.sh. Não edite a worktree. verdict "fix" só com bloqueantes concretos (arquivo, linha, problema, correção); o resto em non_blocking.
${persist(`${W2}/impl/revisao-${f.id}-${lens.key}-r${round + 1}.json`)}`
}

function fixPrompt(f, impl, blocking, round) {
  return `${COMMON}

CORREÇÃO (rodada ${round + 1}) de "${f.titulo}".
Estado: ${JSON.stringify(impl)}
Bloqueantes: ${JSON.stringify(blocking)}
Corrija cada um ou prove que o revisor errou (registre no resumo). Rode de novo typecheck e testes tocados, compare com o baseline, commit na mesma branch e atualize ${W2}/impl/${f.id}.md. Devolva no formato da implementação com as listas completas.
${persist(`${W2}/impl/${f.id}.json`)}`
}

async function featureTrack(f, maps) {
  const d0 = await agent(designPrompt(f, maps), { label: `desenho ${f.id}`, phase: 'Desenhar', schema: DESIGN_SCHEMA, effort: 'xhigh' })
  if (!d0) return { id: f.id, final: 'desenho_falhou' }
  const c = await agent(designCriticPrompt(f, d0), { label: `crítica ${f.id}`, phase: 'Desenhar', schema: CRITIC_SCHEMA, effort: 'xhigh' })
  const d = (c ? await agent(designRevisePrompt(f, d0, c), { label: `revisão desenho ${f.id}`, phase: 'Desenhar', schema: DESIGN_SCHEMA, effort: 'xhigh' }) : null) || d0
  let impl = await agent(implPrompt(f, d), { label: `implementar ${f.id}`, phase: 'Implementar', schema: IMPL_SCHEMA, effort: 'xhigh' })
  if (!impl || impl.status === 'blocked' || impl.status === 'failed') return { id: f.id, final: 'implementacao_falhou', design: d, impl }
  let final = 'precisa_do_dono'
  let reviews = []
  for (let round = 0; round <= 2; round++) {
    reviews = (await parallel(LENSES.map(l => () => agent(reviewPrompt(f, l, impl, round), { label: `revisar ${f.id} ${l.key} r${round + 1}`, phase: 'Implementar', schema: REVIEW_SCHEMA, effort: 'xhigh' })))).filter(Boolean)
    const blocking = reviews.filter(r => r.verdict === 'fix').flatMap(r => r.blocking)
    if (!blocking.length && reviews.length) { final = 'aprovada'; break }
    if (round === 2) break
    const fixed = await agent(fixPrompt(f, impl, blocking, round), { label: `corrigir ${f.id} r${round + 1}`, phase: 'Implementar', schema: IMPL_SCHEMA, effort: 'xhigh' })
    if (!fixed || fixed.status === 'blocked' || fixed.status === 'failed') { final = 'falhou_na_correcao'; break }
    impl = fixed
  }
  return { id: f.id, final, design: d, impl, reviews }
}

function integPrompt(ok) {
  return `${COMMON}

INTEGRAÇÃO das features aprovadas numa branch de integração.
Branches aprovadas, nesta ordem: ${ok.map(r => FEATURES.find(f => f.id === r.id).branch).join(', ')}.
1) sandbox_worktree_create com name "integ/features-2026-10-13" e base "origin/main". npm ci via heavy.sh; backend/.env.test a partir de ${W2}/pg-integ.sh se existir, senão crie esse env apontando para agentpack_wf2_integ_test (papel wf2), e npm run test:db:migrate.
2) git merge --no-ff de cada branch, na ordem. Conflito: resolva preservando as duas features (leia ${W2}/impl/<id>.md); arquivos GERADOS (docs de tools, modelo de dados, llms) não se resolvem na mão: regenere com os scripts do repo depois dos merges. Migrations das duas features: confira a ordem e que o migrate deploy aplica limpo do zero.
3) Commit da regeneração, se houver. Não faça push ainda.
${persist(`${W2}/integracao/integ.json`)}`
}

function gatesPrompt(integ) {
  return `${COMMON}

GATES na branch de integração (worktree ${integ.worktree}).
Via heavy.sh, um de cada vez: typecheck do backend e do frontend; lint dos arquivos tocados pelas features; testes do backend em 8 shards (--runInBand); testes do frontend das áreas tocadas e de a11y (--maxWorkers=1); se lockfile mudou, npx npm@10.9.4 ci --dry-run; as checagens de docs geradas em dia, se o repo tiver. Compare com /workspace/.sbcache/wf/baseline.json: só é nova a falha que não está lá. Não corrija; descreva cada nova com arquivo, teste e trecho do erro.
${persist(`${W2}/integracao/gates.json`)}`
}

function gateFixPrompt(integ, g) {
  return `${COMMON}

CORRIGIR AS FALHAS NOVAS DE GATE na branch de integração (worktree ${integ.worktree}).
Gates: ${JSON.stringify(g)}
Corrija só as falhas novas, sem desfazer as features. Se a causa estiver numa feature, corrija na branch dela e traga por merge para a integração. Commit e rode de novo os gates que falharam.
${persist(`${W2}/integracao/correcao.json`)}`
}

function pushPrompt(branches) {
  return `${COMMON}

PUBLICAR AS BRANCHES (nunca a main).
Para cada branch em ${JSON.stringify(branches)}: confira git status limpo na worktree dela e git push -u origin <branch>. Nada de force push. Se já existir no remoto com outro histórico, pare e explique.
${persist(`${W2}/integracao/push.json`)}`
}

function shotsPrompt(integ) {
  return `${COMMON}

TELAS PARA O DONO (opcional, só se couber nos 2 GB).
Na worktree ${integ.worktree}: suba o backend e o frontend em modo de desenvolvimento com dados de demonstração (um projeto com umas 25 tasks com datas e dependências, 4 prompts de agente, 2 ativos no projeto), tudo via heavy.sh e com prazo. Se o login exigir a Conta e não houver modo local de desenvolvimento documentado no repo, NÃO contorne autenticação: renderize as telas em teste de componente (vitest com jsdom) e capture o HTML, ou desista e explique.
Para capturar: sandbox_preview da porta do frontend e as tools do navegador (mcp__browsers__create_automation_session, navigate_to, take_screenshot) na URL pública do preview. Telas: catálogo de prompts, editor de prompt, aba de prompts do projeto, roadmap em Gantt, agenda em mês e em semana. Salve as imagens em ${W2}/relatorio/telas/. Derrube tudo no fim e feche a sessão do navegador.
${persist(`${W2}/relatorio/telas.json`)}`
}

function reportPrompt(sum) {
  return `${COMMON}

RELATÓRIO VISUAL para o dono.
Resumo (JSON): ${JSON.stringify(sum)}
Fontes: ${W2}/desenho/*.md, ${W2}/impl/*.md e *.json, ${W2}/integracao/*.json, ${W2}/relatorio/telas/ (se houver imagens).
1) Gere ${W2}/relatorio/index.html com UM SCRIPT PYTHON a partir de um dados.json (escrita manual de HTML perde pedaços aqui): PT-BR, autocontido (CSS inline, sem JS, sem fonte externa, sem CDN; imagens embutidas em base64 ou servidas da mesma pasta), fundo escuro, corpo de 17px, no máximo 3 cores de destaque, legível no celular. Ordem: números grandes (tools novas, telas novas, testes novos, falhas novas de gate); as telas capturadas; um diagrama de cada feature (objeto prompt de agente ligado a projeto e task; task com início e fim alimentando Gantt e agenda); cartões das decisões do dono com recomendação; mudanças de produção e ordem de deploy; o que ficou de fora.
2) Suba python3 -m http.server numa porta livre (tente 8791) com cwd ${W2}/relatorio, em background, e DEIXE DE PÉ. Confira com curl local que responde 200 e releia o fim do arquivo.
3) Encerre qualquer outro processo seu. Não desligue o Postgres se o outro workflow ainda estiver rodando (cheque se há jest ou servidor dele no ar); se não houver, pg_ctlcluster 15 main stop.
Devolva a URL pública https://sb-${SB}-p<porta>.mp.serendiped.com/index.html.
${persist(`${W2}/relatorio/relatorio.json`)}`
}

phase('Preparar')
const prep = await agent(prepPrompt(), { label: 'preparar', phase: 'Preparar', schema: PREP_SCHEMA, effort: 'high' })
if (!prep || !prep.ok) { log('Preparação falhou; parei antes de mapear.'); return { etapa: 'preparar', prep } }

phase('Mapear')
const maps = (await parallel(MAPS.map(m => () => agent(mapPrompt(m, prep), { label: `mapa ${m.id}`, phase: 'Mapear', schema: MAP_SCHEMA, effort: 'high' })))).filter(Boolean)
if (maps.length < MAPS.length) log(`${MAPS.length - maps.length} mapa(s) falharam; o desenho segue com o que voltou.`)

const results = await parallel(FEATURES.map(f => () => featureTrack(f, maps)))
const byId = {}
FEATURES.forEach((f, i) => { byId[f.id] = results[i] || { id: f.id, final: 'falhou' } })
const ok = FEATURES.map(f => byId[f.id]).filter(r => r.final === 'aprovada')
log(`Aprovadas: ${ok.map(r => r.id).join(', ') || 'nenhuma'}. Fora: ${FEATURES.filter(f => byId[f.id].final !== 'aprovada').map(f => `${f.id}=${byId[f.id].final}`).join(', ') || 'nenhuma'}.`)

phase('Integrar')
let integ = null, g = null, push = null
if (ok.length) {
  integ = await agent(integPrompt(ok), { label: 'integrar', phase: 'Integrar', schema: INTEG_SCHEMA, effort: 'xhigh' })
  if (integ && integ.ok) {
    g = await agent(gatesPrompt(integ), { label: 'gates', phase: 'Integrar', schema: GATES_SCHEMA, effort: 'medium' })
    for (let r = 1; g && g.novas > 0 && r <= 2; r++) {
      log(`${g.novas} falha(s) nova(s) de gate; corrigindo (rodada ${r}).`)
      await agent(gateFixPrompt(integ, g), { label: `corrigir gates r${r}`, phase: 'Integrar', schema: IMPL_SCHEMA, effort: 'high' })
      g = await agent(gatesPrompt(integ), { label: `gates r${r + 1}`, phase: 'Integrar', schema: GATES_SCHEMA, effort: 'medium' })
    }
    if (g && g.novas === 0) {
      const branches = ok.map(r => FEATURES.find(f => f.id === r.id).branch).concat(['integ/features-2026-10-13'])
      push = await agent(pushPrompt(branches), { label: 'push das branches', phase: 'Integrar', schema: PUSH_SCHEMA, effort: 'low' })
    } else {
      log('Gates com falha nova: branches NÃO publicadas.')
    }
  }
}

phase('Relatório')
const shots = integ && integ.ok ? await agent(shotsPrompt(integ), { label: 'capturar telas', phase: 'Relatório', schema: SHOTS_SCHEMA, effort: 'high' }) : null
const summary = {
  features: FEATURES.map(f => {
    const r = byId[f.id]
    return {
      id: f.id, titulo: f.titulo, branch: f.branch, status: r.final,
      resumo: r.impl ? r.impl.resumo : null,
      testes: r.impl ? r.impl.testes : [],
      mudancas_prod: r.impl ? r.impl.mudancas_prod : [],
      fora: r.impl ? r.impl.fora : [],
      decisoes_dono: r.design ? r.design.decisoes_dono : [],
      tools_mcp: r.design ? r.design.tools_mcp : [],
      telas: r.design ? r.design.telas : [],
    }
  }),
  integracao: integ ? { ok: integ.ok, head: integ.head, conflitos: integ.conflitos } : null,
  gates: g ? { novas: g.novas, head: g.head } : null,
  publicadas: push ? push.publicadas : [],
  telas_capturadas: shots ? shots.telas : [],
}
const report = await agent(reportPrompt(summary), { label: 'relatório visual', phase: 'Relatório', schema: REPORT_SCHEMA, effort: 'medium' })

return { relatorio: report ? report.url : null, ...summary }