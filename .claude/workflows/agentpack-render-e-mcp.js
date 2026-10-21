export const meta = {
  name: 'agentpack-render-e-mcp',
  description: 'AgentPack (SB agent-package-audit): mapeia e desenha a extração do Render para app própria e diagnostica e corrige o proxy de MCP com sessão. Branch empurrada, sem main, sem deploy.',
  whenToUse: 'Pedido do dono em 2026-10-13: tirar o Render do AgentPack para uma app nova e arrumar os MCPs proxiados que têm sessão',
  phases: [
    { title: 'Preparar', detail: 'worktree de leitura, semáforo de 1 vaga, Node 24, Postgres local' },
    { title: 'Mapear', detail: 'render backend, frontend e acoplamento; padrões e infra; baseline; diagnóstico do proxy MCP' },
    { title: 'Desenhar', detail: 'desenho da app Render e plano do MCP, com crítica adversarial' },
    { title: 'Corrigir MCP', detail: 'implementação, revisão em 3 lentes, gates, push da branch' },
    { title: 'Relatório', detail: 'completude e relatório visual' },
  ],
}

const SB = 'agent-package-audit'
const BASE = '26268c0'
const WF = '/workspace/.sbcache/wf'
const WR = '/workspace/.sbcache/wf-render'
const WM = '/workspace/.sbcache/wf-mcp'
const FIXBR = 'fix/mcp-proxy-sessoes'
const COAUTHOR = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'

const COMMON = `CONTEXTO FIXO (vale para todo agente deste workflow)
- Dono: Myke, fala PT-BR. É muito visual: relatório para ele começa com números grandes e diagramas, não com texto corrido.
- Trabalhe SÓ nos sandboxes do MyPanel, pelas tools MCP mypanel (descubra os nomes com ToolSearch: mcp__mypanel__sandbox_bash, sandbox_read, sandbox_edit, sandbox_write, sandbox_grep, sandbox_glob, sandbox_ls, sandbox_process_wait, sandbox_process_output, sandbox_worktree_create, sandbox_worktree_list, sandbox_worktree_remove, sandbox_preview). NUNCA crie, leia ou edite arquivos na máquina local.
- Sandbox deste workflow: "${SB}" (repo /workspace = GitHub PedroPaduelo/agent-package, main em ${BASE}). ATENÇÃO: o clone principal /workspace está na branch feat/admin-agent-key com 2 commits locais que NÃO são deste workflow. NUNCA faça checkout, commit, reset, stash, rebase ou merge no clone principal e não mexa nessa branch. Todo trabalho é em worktree criada a partir de origin/main.
- Regras do repo: AGENTS.md (o CLAUDE.md só importa ele). Leia antes de mexer. Duas correções ao AGENTS.md: o sandbox se chama ${SB}, não agent-package, e tem 2 GB de RAM, não 6. Por isso: comando pesado (npm ci, tsc, jest, eslint, vite build, vitest, build) SEMPRE via ${WF}/heavy.sh <comando> (uma vaga só, os outros agentes esperam); lint só dos arquivos tocados (o lint completo do frontend estoura a memória); jest do backend com --runInBand e em shards. Use timeout_ms >= 2400000 no sandbox_bash e siga com sandbox_process_wait até terminar.
- Node 24: export PATH=/workspace/.node/bin:$PATH em todo comando de node ou npm.
- Banco de teste: o backend/.env.test não existe e a senha do banco de teste remoto é segredo. NÃO tente obtê-la (nada de docker inspect, nada de leitura de env_vars). Use o Postgres LOCAL do sandbox, descrito em ${WF}/pg-env.sh.
- Produção do AgentPack (projeto workspace_nommand): agentpack-backend-ws (id W6HIdYaUE2N9CVPaL8fE5) e agentpack-frontend-ws (id b0e_tBASjYIb_MOl7mADq, https://agentpack-v0.mp.serendiped.com). Pode LER logs de produção (services_logs, docker_container_logs) e metadados (services_get, nomes de env com env_vars_list; os valores secretos vêm mascarados). PROIBIDO: deploy, deployments_trigger, alterar env_vars, services ou domains, restart, docker_exec em produção, git push na main, qualquer escrita em produção.
- Frontend: o build Docker fixa npm 10.9.4 e o @nomad/ui vem resolvido como git+https. Se mexer em lockfile: npx npm@10.9.4 install --package-lock-only e confirme npx npm@10.9.4 ci --dry-run.
- Segredos: nunca imprima token, senha, chave, string de conexão nem conteúdo de .env. Esta sessão passa pelo LB de produção, que guarda os payloads das chamadas.
- Escritas neste ambiente já perderam pedaços de uns 7 caracteres perto de "data:" e "id:". Releia o trecho depois de cada sandbox_write ou sandbox_edit e rode typecheck do que tocou.
- Regras entre apps, decididas pelo dono: a Conta Nomad é a única fonte de empresas, membros, papéis e contratos; cada app guarda só os próprios recursos. Contrato encerrado na Conta suspende as chaves da empresa em todos os apps, sem apagar nada; recontratar reativa as mesmas chaves; saída de um membro revoga só as chaves pessoais dele; as chaves admin do AgentPack são da empresa.
- Outros sandboxes existem (motor, nomad-ui, load-balance-audit, auditoria, template, rea-mcp-proxy) e pertencem a outras frentes. Só leitura, e só quando a tarefa pedir.
- Commits no estilo do histórico do repo (veja git log), com a última linha: ${COAUTHOR}
- Todo processo que você subir (servidor MCP de teste, laço, servidor HTTP) tem prazo e é encerrado antes de você terminar, salvo o que a tarefa mandar manter.`

const persist = p => `Grave o JSON que você vai devolver em ${p} (sandbox_write; crie a pasta antes) e valide com: python3 -c "import json;json.load(open('${p}'))". Se falhar, regrave.`

const S = { type: 'string' }, SA = { type: 'array', items: { type: 'string' } }, B = { type: 'boolean' }

const PREP_SCHEMA = { type: 'object', properties: { ok: B, base: S, worktree_leitura: S, heavy: S, node: S, pg_env: S, notes: S }, required: ['ok', 'base', 'worktree_leitura', 'heavy', 'node', 'pg_env'] }
const BASELINE_SCHEMA = { type: 'object', properties: { ok: B, worktree: S, gates: { type: 'array', items: { type: 'object', properties: { gate: S, ok: B, falhas: SA }, required: ['gate', 'ok', 'falhas'] } }, notes: S }, required: ['ok', 'worktree', 'gates'] }
const MAP_SCHEMA = { type: 'object', properties: {
  resumo: S, doc: S,
  componentes: { type: 'array', items: { type: 'object', properties: { nome: S, caminhos: SA, papel: S, depende_de: SA, usado_por: SA, classe: { type: 'string', enum: ['MOVE', 'SHARED', 'STAY'] } }, required: ['nome', 'caminhos', 'papel', 'classe'] } },
  tabelas: SA, envs: SA, endpoints: SA, tools_mcp: SA, servicos_externos: SA, riscos: SA, perguntas: SA,
}, required: ['resumo', 'doc', 'componentes', 'riscos'] }
const DIAG_SCHEMA = { type: 'object', properties: {
  resumo: S, doc: S,
  mapa_codigo: { type: 'array', items: { type: 'object', properties: { arquivo: S, papel: S }, required: ['arquivo', 'papel'] } },
  evidencias_prod: SA,
  reproducoes: { type: 'array', items: { type: 'object', properties: { caso: S, resultado: S, evidencia: S }, required: ['caso', 'resultado'] } },
  causas: { type: 'array', items: { type: 'object', properties: { id: S, titulo: S, evidencia: S, confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] } }, required: ['id', 'titulo', 'evidencia', 'confianca'] } },
}, required: ['resumo', 'doc', 'mapa_codigo', 'causas'] }
const DESIGN_SCHEMA = { type: 'object', properties: {
  resumo: S, doc: S,
  pacotes: { type: 'array', items: { type: 'object', properties: { id: S, titulo: S, escopo: S, de_agentpack: SA, arquivos_novos: SA, depende_de: SA, testes: SA }, required: ['id', 'titulo', 'escopo', 'depende_de', 'testes'] } },
  decisoes_dono: { type: 'array', items: { type: 'object', properties: { pergunta: S, opcoes: SA, recomendacao: S }, required: ['pergunta', 'opcoes', 'recomendacao'] } },
  runbook_prod: SA, riscos: SA,
}, required: ['resumo', 'doc', 'pacotes', 'decisoes_dono', 'runbook_prod', 'riscos'] }
const CRITIC_SCHEMA = { type: 'object', properties: { veredito: { type: 'string', enum: ['aprovar', 'revisar'] }, problemas: { type: 'array', items: { type: 'object', properties: { severidade: { type: 'string', enum: ['bloqueante', 'importante', 'menor'] }, area: S, problema: S, correcao: S }, required: ['severidade', 'problema', 'correcao'] } } }, required: ['veredito', 'problemas'] }
const PLAN_SCHEMA = { type: 'object', properties: { escopo_agora: SA, depois: SA, arquivos: SA, abordagem: S, testes: SA, mudancas_prod: SA, riscos: SA, dependencias_novas: SA }, required: ['escopo_agora', 'depois', 'arquivos', 'abordagem', 'testes', 'mudancas_prod', 'riscos'] }
const IMPL_SCHEMA = { type: 'object', properties: { status: { type: 'string', enum: ['done', 'partial', 'blocked', 'failed'] }, worktree: S, head: S, commits: SA, arquivos: SA, resumo: S, testes: SA, falhas_novas: SA, mudancas_prod: SA, fora: SA }, required: ['status', 'worktree', 'head', 'commits', 'arquivos', 'resumo', 'testes', 'falhas_novas', 'mudancas_prod', 'fora'] }
const REVIEW_SCHEMA = { type: 'object', properties: { verdict: { type: 'string', enum: ['approve', 'fix'] }, blocking: { type: 'array', items: { type: 'object', properties: { file: S, line: S, problem: S, fix: S }, required: ['file', 'problem', 'fix'] } }, non_blocking: SA, evidence: S }, required: ['verdict', 'blocking', 'non_blocking', 'evidence'] }
const GATES_SCHEMA = { type: 'object', properties: { head: S, novas: { type: 'integer' }, gates: { type: 'array', items: { type: 'object', properties: { gate: S, ok: B, novas: SA }, required: ['gate', 'ok', 'novas'] } }, notes: S }, required: ['head', 'novas', 'gates'] }
const PUSH_SCHEMA = { type: 'object', properties: { pushed: B, branch: S, head: S, notes: S }, required: ['pushed', 'branch', 'head'] }
const COMPLETE_SCHEMA = { type: 'object', properties: { faltando: { type: 'array', items: { type: 'object', properties: { trilha: S, item: S, por_que_importa: S, proximo_passo: S }, required: ['trilha', 'item', 'proximo_passo'] } } }, required: ['faltando'] }
const REPORT_SCHEMA = { type: 'object', properties: { url: S, ok: B, notes: S }, required: ['url', 'ok'] }

function prepPrompt() {
  return `${COMMON}

TAREFA: preparar o sandbox ${SB}. Não altere código do repo.
1) git -C /workspace fetch origin. Confirme que origin/main é ${BASE}; se mudou, use o novo e diga em notes.
2) Worktree de LEITURA: sandbox_worktree_create com name "wf/leitura" e base "origin/main". Ela serve só para os mapeadores lerem código. NÃO rode npm ci nela.
3) Crie ${WF}/heavy.sh <comando...>: semáforo de UMA vaga (flock em ${WF}/locks/heavy.lock, esperando em laço com sleep 5), que exporta PATH=/workspace/.node/bin:$PATH e NODE_OPTIONS=--max-old-space-size=1536 quando não vier definido e devolve o exit code do comando. Teste com dois comandos concorrentes.
4) Node 24 em /workspace/.node, conforme o AGENTS.md. Instale se faltar. node -v tem que dar 24.x.
5) Postgres local: apt-get update && apt-get install -y postgresql (vem o 15), pg_ctlcluster 15 main start. Crie um usuário e o banco agentpack_wf_test (o nome TEM que terminar em _test, senão o globalSetup do jest recusa) com senha descartável. Grave ${WF}/pg-env.sh (chmod 600) exportando DATABASE_URL e as variáveis que o jest do backend exige para o banco de teste (descubra no globalSetup e no AGENTS.md). Não imprima a senha. Deixe o Postgres de pé: o workflow inteiro usa.
6) Grave ${WF}/README.txt dizendo onde ficam heavy.sh, pg-env.sh, a worktree de leitura e as pastas ${WR} (render) e ${WM} (mcp).
ok=true só se heavy.sh, Node 24, Postgres e a worktree de leitura estiverem prontos.
${persist(`${WF}/preparo.json`)}`
}

function baselinePrompt(prep) {
  return `${COMMON}

TAREFA: medir o baseline dos gates em origin/main (${prep.base}).
1) sandbox_worktree_create com name "wf/baseline" e base "origin/main". npm ci conforme o AGENTS.md (raiz, backend, frontend — o que o repo pede), sempre via heavy.sh.
2) Na worktree, crie backend/.env.test (é git-ignored) a partir de ${WF}/pg-env.sh e rode npm run test:db:migrate.
3) Via heavy.sh, um de cada vez: typecheck do backend; typecheck do frontend; testes do backend em 8 shards (npx jest --runInBand --shard=1/8 até 8/8); testes do frontend que tocam mcps e render (vitest --maxWorkers=1 com filtro). Se algo não couber nos 2 GB, registre o que rodou e o que não rodou, não esconda.
4) Grave ${WF}/baseline.json no formato {"base":"...","gates":{"<gate>":{"ok":true|false,"falhas":["arquivo > teste"]}}}.
${persist(`${WF}/baseline-resultado.json`)}`
}

const MAPS = [
  {
    id: 'render-backend',
    titulo: 'Render no backend',
    pedido: `Inventarie o lado backend do Render no AgentPack (worktree de leitura em origin/main). Ponto de partida, conferido pelo orquestrador: backend/src/services (57 arquivos de render), backend/src/lib/render-* e backend/src/lib/render-contracts/*, backend/src/routes/render.ts e render-scoped.ts, backend/src/tools (13 arquivos, tools MCP do render), backend/src/schemas/render.ts, backend/schemas/render/*.json, backend/scripts/gen-render-*, render-security-scan, backend/src/scripts/freeze-legacy-render-library.ts e prune-render-revisions.ts, as migrations de render em backend/prisma/migrations, os models de render no schema.prisma, backend/prisma/seed-skills/agentpack-render-*, os testes backend/tests/render-*, a ADR docs/adr/0014-render-design-system-versioning.md, docs/render-tailwind.md e a parte de render em docs/mcp/tools.md. Ache também o que não tem "render" no nome mas é do render (grep por DesignSystem, Screen, Token, Bundle, Manifest, Revision, Screenshot, Kit, Component e pelos toolsets "render" e "render-admin" no gateway MCP).
Para cada componente: papel, arquivos, dependências internas e externas, tabelas, envs, endpoints (método e caminho), tools MCP (nomes exatos), jobs e uso do serviço shot/ de screenshot. Classifique cada um: MOVE (só do render, vai para a app nova), SHARED (o render precisa, mas é núcleo: copiar ou adaptar na app nova) ou STAY (fica no AgentPack).`,
  },
  {
    id: 'render-frontend',
    titulo: 'Render no frontend',
    pedido: `Inventarie o lado frontend do Render no AgentPack (worktree de leitura em origin/main): frontend/src/pages (112 arquivos de render), frontend/src/render (69), frontend/src/hooks, frontend/src/api, frontend/src/types e os testes frontend/src/test de render (59). Mapeie as rotas, como a tela obtém sessão, empresa e projeto, como chama a API, o uso do kit @nomad/ui (quais componentes) e os tetos de tamanho de arquivo do lint que esses arquivos ocupam. Liste também as peças do núcleo do frontend que o render usa (layout, guarda de autenticação, cliente da API, ThemeProvider e PaletteProvider, TopBar, navegação). Classifique como MOVE, SHARED ou STAY.`,
  },
  {
    id: 'render-acoplamento',
    titulo: 'Acoplamento entre Render e núcleo',
    pedido: `Mapeie o acoplamento nos DOIS sentidos entre o Render e o resto do AgentPack (worktree de leitura em origin/main). (a) O que o render precisa do núcleo: SSO via Conta (OIDC) e sessões, models de empresa, projeto, usuário e membro, chaves de agente e autenticação do gateway MCP, permissões, skills (as seed-skills agentpack-render-*), knowledge, arquivos e blobs, filas e jobs, Redis, rate limit, auditoria, serviço shot/, envs. (b) O que o núcleo usa do render: links e navegação, registro dos toolsets "render" e "render-admin" no gateway /mcp, busca, tasks ou knowledge que apontam para telas, seeds, contadores. (c) Os dados: quais tabelas do render existem e com que FKs para o núcleo, e o que uma migração dos dados de produção para um banco novo exigiria (sem acessar o banco de produção — deduza pelas migrations e pelo schema). Classifique os pontos como MOVE, SHARED ou STAY.`,
  },
  {
    id: 'padroes-infra',
    titulo: 'Padrões de arquitetura, infra e sandboxes',
    pedido: `Levante o padrão que a app nova vai copiar. (a) Do AgentPack (worktree de leitura): AGENTS.md, docs/architecture.md, docs/adr, docs/api-guidelines.md, docs/glossary.md, estrutura de pastas, versões das dependências, configs de lint, de ratchet e de teto de tamanho, configuração do jest e do vitest, globalSetup, Dockerfiles do backend, do frontend e do shot/, nginx (inclusive o resolver ${'$'}{NGINX_LOCAL_RESOLVERS} e o teste nginx-resolver), docker-compose.test.yml, .env.example, o npm 10.9.4 fixado e como o @nomad/ui chega no build Docker (nome do build arg do token, o insteadOf do git), renovate.json, llms.txt, server.json, CHANGELOG e HANDOVER. (b) Do MyPanel, só leitura: services_get dos dois serviços de produção do AgentPack (build, portas, limites, volumes, nomes dos build args) e env_vars_list para pegar os NOMES das envs (não os valores). (c) sandboxes_list: uma linha por sandbox dizendo o que é e se parece em uso; não toque em nenhum. (d) A biblioteca nomad-ui: versão e forma como o AgentPack a consome (url git+https, tag ou commit), os componentes usados, e como o Motor e o LB a usam (pelo package.json deles no GitHub, com as tools de leitura do github se precisar). O sandbox nomad-ui tem trabalho não commitado de outra pessoa: só leitura, nem git status sujo você pode mudar.`,
  },
]

function mapPrompt(m, prep) {
  return `${COMMON}

MAPEAMENTO: ${m.titulo}
Leia na worktree de leitura ${prep.worktree_leitura} (origin/main). Não instale nada, não rode build: só git, grep, leitura.
${m.pedido}
Escreva o documento detalhado em ${WR}/mapa/${m.id}.md (markdown, PT-BR, com caminhos exatos e arquivo:linha onde importar). Releia o fim do arquivo depois de escrever.
${persist(`${WR}/mapa/${m.id}.json`)}`
}

function diagPrompt(prep) {
  return `${COMMON}

DIAGNÓSTICO: proxy de MCP do AgentPack.
O que o dono disse: "o AgentPack tem os MCPs. A ideia é eu cadastrar um MCP lá e ele ser o proxy desse MCP para outro local, que ele fornece dentro do projeto. Não está funcionando. Tem MCP que tem sessão que não está funcionando. Não está funcionando alguns. Arruma."
Código, ponto de partida conferido: backend/src/mcp/proxy-call.ts, backend/src/services/mcp-proxy.ts, mcp-proxy-pool.ts, mcp-proxy-errors.ts, backend/tests/mcp-proxy.test.ts, mcp-transport.test.ts, frontend/src/features/mcps/components/McpTransportSection.tsx. O AGENTS.md diz que o gateway /mcp do AgentPack é Streamable HTTP e STATELESS.

Hipóteses do orquestrador. Confirme ou refute cada uma com evidência; nenhuma é fato:
- H1 MCP com estado: como o gateway é stateless, não existe sessão de quem chama para amarrar uma sessão no MCP de destino. Cada chamada pode abrir uma sessão nova no destino, ou uma sessão do pool pode ser compartilhada entre quem não deveria. O MCP "browsers" que o dono usa guarda janela de automação por sessão MCP ("se a SUA sessão já tem janela, ela é reaproveitada; janelas de outros clientes nunca são compartilhadas"): create_automation_session numa chamada e navigate_to na seguinte caem em sessões diferentes.
- H2 sessão expirada no destino (HTTP 404 com Mcp-Session-Id) sem novo initialize.
- H3 versão de protocolo: o MCP do MyPanel só aceita a versão 2026-07-28. O Motor resolveu isso trocando o cliente para o SDK oficial v2 (@modelcontextprotocol/client) com versionNegotiation em modo auto. O proxy do AgentPack pode estar no SDK v1. Princípio do dono: corrigir o lado cliente para seguir os protocolos novos; não pedir para o MCP de destino mudar.
- H4 transporte: servidores SSE legados e MCPs só de stdio expostos por ponte HTTP. O sandbox rea-mcp-proxy tem /workspace/rea-bridge.mjs, uma ponte do REA (stdio) para HTTP stateless na porta 6402 que reescreve os ids JSON-RPC. Parece uma tentativa de cadastrar o REA no proxy do AgentPack. Leia o arquivo (só leitura; não pare, não altere e não apague esse sandbox) e use como caso de teste.
- H5 cabeçalhos e credenciais por empresa ou projeto: pool chaveado só por URL e headers pode vazar credencial ou sessão entre empresas.

FAÇA:
1) Mapa do código do proxy: arquivo:linha de onde o MCP é cadastrado, como o cliente do destino é criado (qual SDK e versão), a chave do pool, onde a sessão do destino nasce e morre, como erros e timeouts viram resposta, e como as tools do destino aparecem no gateway (o toolset "proxied").
2) Evidência de produção: leia os logs do agentpack-backend-ws (só leitura, tail grande) e traga as linhas de erro do proxy com o nome do MCP, o status e a mensagem. As tools agentpack-orq desta sessão apontam para a instalação ANTIGA do AgentPack (agentpack.mp.serendiped.com, não produção): use só como referência de caixa-preta.
3) Reprodução local na worktree wf/baseline quando ela existir (a preparação de baseline está rodando em paralelo; se ainda não existir, use a worktree de leitura só para ler, e espere com prazo de 30 minutos para rodar). Suba servidores MCP de teste com o SDK oficial em ${WM}/lab: um com estado por sessão (contador), um que expira a sessão (404), um que só aceita a versão 2026-07-28, um SSE legado e um stateless. Faça o proxy do AgentPack falar com cada um, num teste de laboratório fora do repo ou num script tsx, e registre o que funciona e o que quebra.
4) Causas raiz com confiança e evidência, em ordem de impacto para o dono.
Escreva o documento em ${WM}/diagnostico.md. Encerre os servidores de teste no fim.
${persist(`${WM}/diagnostico.json`)}`
}

function designPrompt(maps) {
  return `${COMMON}

DESENHO: app Render, separada do AgentPack.
O que o dono pediu: "criar uma aplicação, backend, frontend, tudo igualzinho o AgentPack, somente para o render. Vamos tirar o render de dentro do AgentPack, mas não agora: primeiro criamos a primeira aplicação do render, depois voltamos no AgentPack e matamos. O render não é o agente inteiro, é o render." E: "seguir o padrão de arquitetura dos projetos que estão aí, usar a biblioteca nomad UI, não reinventar a roda."
Fatos: repositório PedroPaduelo/render já criado, PRIVADO, só com README. O sandbox "render" ainda não existe porque o host está sem memória; outro workflow vai construir a app lá. Este desenho é a planta dessa construção.
Mapas (JSON) e documentos em ${WR}/mapa/: ${JSON.stringify(maps)}

Produza o desenho cobrindo:
1) Estrutura do repo e stack, iguais ao AgentPack (mesmas versões): backend Fastify 5, Prisma 6, Postgres, zod, SDK MCP, Jest; frontend Vite, React 19, TanStack Query, Zustand, Tailwind, Vitest, @nomad/ui; serviço shot/. O que é copiado igual, o que é adaptado e o que não vai.
2) Autenticação: SSO via Conta (OIDC) para pessoas; chaves próprias para máquinas; os eventos da Conta seguindo a regra entre apps (contrato encerrado suspende, recontrato reativa, saída de membro revoga só as pessoais). O AgentPack ainda não implementou a suspensão por contrato; a app nova nasce com ela.
3) Empresa e projeto: o render hoje pertence a projetos do AgentPack? Como a app nova representa isso sem duplicar o que é do AgentPack ou da Conta.
4) Compatibilidade: mesmos caminhos REST e mesmos nomes de tools MCP, para que a troca futura seja só de URL. Gateway /mcp próprio. Avalie e recomende: durante a transição, o AgentPack cadastra o MCP da app Render no proxy de MCP dele (o que está sendo corrigido em paralelo), e os agentes continuam com uma URL só.
5) Banco: schema só do render, migration inicial nova, seeds (as skills agentpack-render-* são skills do AgentPack: decida onde ficam), envs, Dockerfiles, nginx com o resolver correto, npm 10.9.4 e o @nomad/ui via git+https com o build arg do token.
6) Topologia de deploy no MyPanel: serviços a criar, domínios propostos, build args, banco e Redis, e o cadastro do cliente OIDC "render" na Conta (ação do dono). Nada disso é executado agora: vira runbook.
7) Migração dos dados do render de produção do AgentPack para o banco novo: desenho do script (não rodar).
8) Plano futuro de "matar" o render no AgentPack: a lista dos pontos a remover.
9) Pacotes de trabalho para a construção, cada um do tamanho de UM agente, com dependências, arquivos de origem no AgentPack e testes: por exemplo núcleo do backend, domínio do render no backend, tools MCP, casca do frontend, telas do render, shot e infra, docs e seeds, script de migração.
10) Riscos e decisões que ficam com o dono, cada uma com recomendação.
Escreva ${WR}/desenho/desenho.md (PT-BR, com um diagrama em texto ou mermaid da arquitetura).
${persist(`${WR}/desenho/desenho.json`)}`
}

const DESIGN_CRITICS = [
  { key: 'paridade', texto: 'paridade e completude: algo que o render faz hoje no AgentPack que o desenho perde, quebra ou esquece (tool MCP, rota, tela, job, seed, screenshot, teste, limite de segurança do render)' },
  { key: 'arquitetura', texto: 'arquitetura, segurança e regras entre apps: autenticação, multiempresa, segredos, regra de contrato da Conta, uso do @nomad/ui, gates do repo, deploy no MyPanel e reversibilidade' },
]

function designCriticPrompt(c, d) {
  return `${COMMON}

CRÍTICA ADVERSARIAL do desenho da app Render. Lente: ${c.texto}.
Desenho (JSON): ${JSON.stringify(d)}. Documento: ${WR}/desenho/desenho.md. Mapas: ${WR}/mapa/.
Seu papel é achar o que está errado ou faltando, não aprovar. Confira no código (worktree de leitura) o que precisar. Cada problema com severidade, área e correção concreta.
${persist(`${WR}/desenho/critica-${c.key}.json`)}`
}

function designRevisePrompt(d, critics) {
  return `${COMMON}

REVISÃO FINAL do desenho da app Render.
Desenho (JSON): ${JSON.stringify(d)}
Críticas (JSON): ${JSON.stringify(critics)}
Trate cada problema: aceite e corrija, ou recuse dizendo por quê. Reescreva ${WR}/desenho/desenho.md e acrescente uma seção "Críticas e respostas". Os pacotes de trabalho finais são a entrada do próximo workflow: deixe cada um autocontido.
${persist(`${WR}/desenho/desenho-final.json`)}`
}

function mcpPlanPrompt(diag) {
  return `${COMMON}

PLANO da correção do proxy de MCP.
Diagnóstico (JSON): ${JSON.stringify(diag)}. Documento: ${WM}/diagnostico.md.
O alvo: todo MCP cadastrado no AgentPack funciona pelo proxy, inclusive os que têm sessão. Diretrizes:
- Quem chama o gateway passa a ter uma sessão estável (o gateway emite Mcp-Session-Id, ao menos quando o projeto tem MCPs proxiados, ou outra chave estável e documentada). Cada sessão de quem chama ganha a SUA sessão no MCP de destino, chaveada por empresa, projeto, chave de agente, sessão de quem chama e MCP de destino. Initialize preguiçoso, novo initialize transparente no 404, prazo de expiração e limpeza no DELETE ou no fim da sessão. Nunca compartilhar sessão do destino entre sessões ou empresas diferentes.
- Negociação de versão de protocolo pelo SDK oficial v2, se couber nas dependências (cuidado com os dois lockfiles e o npm 10.9.4); fallback para SSE legado; ids JSON-RPC íntegros; notificações e progresso repassados quando der; erros claros em português.
- Hoje o backend tem 1 réplica: documente a exigência de afinidade quando houver mais de uma.
- Mudança mínima e testável; stateless continua funcionando como hoje.
Liste os testes que provam cada causa resolvida, com servidores MCP reais de teste do SDK oficial: estado por sessão, isolamento entre sessões e entre empresas, 404 com novo initialize, versão 2026-07-28, SSE legado, stateless sem regressão.
${persist(`${WM}/plano.json`)}`
}

function mcpCriticPrompt(plan, diag) {
  return `${COMMON}

CRÍTICA ADVERSARIAL do plano de correção do proxy de MCP.
Diagnóstico: ${JSON.stringify(diag)}
Plano: ${JSON.stringify(plan)}
Procure: causa do diagnóstico que o plano não fecha; regressão para MCP stateless; vazamento de sessão ou credencial entre empresas; crescimento sem limite de sessões ou memória; quebra da autenticação do gateway; dependência nova que quebra o build Docker (npm 10.9.4, @nomad/ui); escopo grande demais. Cada problema com severidade e correção.
${persist(`${WM}/critica-plano.json`)}`
}

function mcpImplPrompt(plan, critic) {
  return `${COMMON}

IMPLEMENTAÇÃO da correção do proxy de MCP.
Plano: ${JSON.stringify(plan)}
Crítica do plano: ${JSON.stringify(critic)}
1) sandbox_worktree_create com name "${FIXBR}" e base "origin/main". Se já existir (retomada), continue do git log e do git status.
2) npm ci via heavy.sh; backend/.env.test (git-ignored) a partir de ${WF}/pg-env.sh; npm run test:db:migrate.
3) Implemente o plano, ajustado pela crítica, com testes que falham sem a mudança, incluindo os servidores MCP de teste do SDK oficial dentro dos testes do repo.
4) Typecheck do que tocou, lint dos arquivos tocados e os testes tocados e vizinhos, tudo via heavy.sh. Compare com ${WF}/baseline.json (se ainda não existir, espere com prazo de 60 minutos): nenhuma falha nova.
5) Commits na branch ${FIXBR}. Confira que .env.test, node_modules e artefatos não entram.
6) Escreva ${WM}/IMPLEMENTACAO.md: o que mudou e por quê, como testar, mudanças de produção, o que ficou de fora.
status "done" só se tudo passou.
${persist(`${WM}/impl.json`)}`
}

const LENSES = [
  { key: 'correcao', texto: 'correção: cada causa do diagnóstico está fechada? sessão por quem chama, novo initialize no 404, negociação de versão, SSE legado, ids JSON-RPC, erros; MCP stateless sem regressão; os testes falham sem a mudança?' },
  { key: 'concorrencia', texto: 'concorrência e ciclo de vida: chamadas paralelas na mesma sessão, muitas sessões ao mesmo tempo, expiração e limpeza, vazamento de memória ou de conexão, reinício do processo, réplica única hoje' },
  { key: 'seguranca', texto: 'segurança: isolamento de sessão e de credencial entre empresas, projetos e chaves; cabeçalhos repassados ao destino; SSRF na URL cadastrada; segredo em log; sessões sem limite como vetor de abuso' },
]

function reviewPrompt(lens, impl, round) {
  return `${COMMON}

REVISÃO ADVERSARIAL (rodada ${round + 1}), lente: ${lens.texto}
Implementação: ${JSON.stringify(impl)}
Diff: git -C ${impl.worktree} diff origin/main...HEAD. Documentos: ${WM}/diagnostico.md, ${WM}/IMPLEMENTACAO.md.
Seu papel é achar o que está errado, não aprovar. Rode você mesmo os testes do proxy e o typecheck via heavy.sh. Não edite a worktree. verdict "fix" só com bloqueantes concretos (arquivo, linha, problema, correção); o resto em non_blocking.
${persist(`${WM}/revisao-${lens.key}-r${round + 1}.json`)}`
}

function fixPrompt(impl, blocking, round) {
  return `${COMMON}

CORREÇÃO (rodada ${round + 1}) da implementação do proxy de MCP.
Estado: ${JSON.stringify(impl)}
Bloqueantes: ${JSON.stringify(blocking)}
Corrija cada um ou prove que o revisor errou (registre no resumo). Rode de novo typecheck e os testes tocados, compare com ${WF}/baseline.json, commit na mesma branch e atualize ${WM}/IMPLEMENTACAO.md. Devolva no formato da implementação com as listas completas.
${persist(`${WM}/impl.json`)}`
}

function gatesPrompt(impl) {
  return `${COMMON}

GATES na branch ${FIXBR} (worktree ${impl.worktree}).
Via heavy.sh, um de cada vez: typecheck do backend; typecheck do frontend se ele foi tocado; lint dos arquivos tocados; testes do backend em 8 shards (--runInBand); testes do frontend tocados; se algum lockfile mudou, npx npm@10.9.4 ci --dry-run no pacote afetado. Compare cada falha com ${WF}/baseline.json: só é nova a que não está lá. Não corrija nada; descreva cada falha nova com arquivo, teste e trecho do erro.
${persist(`${WM}/gates.json`)}`
}

function gateFixPrompt(impl, g) {
  return `${COMMON}

CORRIGIR AS FALHAS NOVAS DE GATE na branch ${FIXBR} (worktree ${impl.worktree}).
Gates: ${JSON.stringify(g)}
Corrija só as falhas novas, sem desfazer a correção do proxy. Commit na branch e rode de novo os gates que falharam.
${persist(`${WM}/correcao-gates.json`)}`
}

function pushPrompt(impl) {
  return `${COMMON}

PUBLICAR A BRANCH (não a main).
Na worktree ${impl.worktree}: confira git status limpo e git log origin/main..HEAD. Depois git push -u origin ${FIXBR}. NUNCA faça push da main nem force push. Se a branch já existir no remoto com outro histórico, pare e explique em notes.
${persist(`${WM}/push.json`)}`
}

function completePrompt(design, mcp) {
  return `${COMMON}

CRÍTICO DE COMPLETUDE das duas trilhas.
Render (desenho final): ${JSON.stringify(design)}
MCP (resultado): ${JSON.stringify(mcp)}
Pergunte o que está faltando: algo que o dono pediu e não foi feito; afirmação sem evidência; risco sem dono; passo de produção não listado; teste que deveria existir; documento que não foi escrito. Para cada falta: trilha, item, por que importa e próximo passo.
${persist(`/workspace/.sbcache/wf-relatorio/completude.json`)}`
}

function reportPrompt(sum) {
  return `${COMMON}

RELATÓRIO VISUAL para o dono.
Resumo (JSON): ${JSON.stringify(sum)}
Fontes no sandbox: ${WR}/mapa/*.md e *.json, ${WR}/desenho/desenho.md e desenho-final.json, ${WM}/diagnostico.md, ${WM}/plano.json, ${WM}/IMPLEMENTACAO.md, ${WM}/revisao-*.json, ${WM}/gates.json, /workspace/.sbcache/wf-relatorio/completude.json, ${WF}/baseline.json.
1) Gere /workspace/.sbcache/wf-relatorio/index.html com UM SCRIPT PYTHON a partir de um dados.json (escrita manual de HTML perde pedaços aqui). PT-BR, autocontido (CSS inline, sem JS, sem fonte externa, sem CDN), fundo escuro, alto contraste, corpo de 17px, no máximo 3 cores de destaque, legível no celular. Ordem: faixa de números grandes (arquivos do render mapeados, pacotes de trabalho, causas do MCP, testes novos, gates); diagrama da arquitetura da app Render (SVG ou CSS); diagrama do proxy de MCP antes e depois (sessão por quem chama); cartões de decisões do dono com a recomendação; próximos passos em ordem (construir o Render no sandbox novo, merge da correção do MCP, runbook de deploy). Gere também desenho.html e mcp.html renderizando os documentos markdown. Mantenha hostnames públicos como estão; nenhum segredo, IP interno ou nome de container de banco.
2) Suba python3 -m http.server numa porta livre (tente 8790) com cwd /workspace/.sbcache/wf-relatorio, em background, e DEIXE DE PÉ: é o canal de leitura do dono. Confira com curl local que as três páginas respondem 200 e releia o fim de cada arquivo.
3) Pare o Postgres local (pg_ctlcluster 15 main stop) e qualquer processo seu que sobrou, exceto o http.server.
Devolva a URL pública https://sb-${SB}-p<porta>.mp.serendiped.com/index.html.
${persist(`/workspace/.sbcache/wf-relatorio/relatorio.json`)}`
}

phase('Preparar')
const prep = await agent(prepPrompt(), { label: 'preparar sandbox', phase: 'Preparar', schema: PREP_SCHEMA, effort: 'high' })
if (!prep || !prep.ok) {
  log('A preparação falhou; parei antes de mapear.')
  return { etapa: 'preparar', prep }
}
log(`Sandbox pronto: base ${prep.base}, Node ${prep.node}.`)

async function renderTrack() {
  const maps = (await parallel(MAPS.map(m => () => agent(mapPrompt(m, prep), { label: `mapa ${m.id}`, phase: 'Mapear', schema: MAP_SCHEMA, effort: 'high' })))).filter(Boolean)
  if (maps.length < MAPS.length) log(`Render: ${MAPS.length - maps.length} mapa(s) falharam; o desenho segue com o que voltou.`)
  if (!maps.length) return { design: null, maps: [] }
  const d0 = await agent(designPrompt(maps), { label: 'desenho render', phase: 'Desenhar', schema: DESIGN_SCHEMA, effort: 'xhigh' })
  if (!d0) return { design: null, maps }
  const critics = (await parallel(DESIGN_CRITICS.map(c => () => agent(designCriticPrompt(c, d0), { label: `crítica desenho ${c.key}`, phase: 'Desenhar', schema: CRITIC_SCHEMA, effort: 'xhigh' })))).filter(Boolean)
  const d1 = await agent(designRevisePrompt(d0, critics), { label: 'revisão do desenho', phase: 'Desenhar', schema: DESIGN_SCHEMA, effort: 'xhigh' })
  return { design: d1 || d0, maps, critics }
}

async function baselineTrack() {
  return await agent(baselinePrompt(prep), { label: 'baseline dos gates', phase: 'Mapear', schema: BASELINE_SCHEMA, effort: 'medium' })
}

async function mcpTrack() {
  const diag = await agent(diagPrompt(prep), { label: 'diagnóstico MCP', phase: 'Mapear', schema: DIAG_SCHEMA, effort: 'xhigh' })
  if (!diag) return { status: 'diagnostico_falhou' }
  const plan = await agent(mcpPlanPrompt(diag), { label: 'plano MCP', phase: 'Desenhar', schema: PLAN_SCHEMA, effort: 'xhigh' })
  if (!plan) return { status: 'plano_falhou', diag }
  const critic = await agent(mcpCriticPrompt(plan, diag), { label: 'crítica plano MCP', phase: 'Desenhar', schema: CRITIC_SCHEMA, effort: 'xhigh' })
  let impl = await agent(mcpImplPrompt(plan, critic), { label: 'implementar MCP', phase: 'Corrigir MCP', schema: IMPL_SCHEMA, effort: 'xhigh' })
  if (!impl || impl.status === 'blocked' || impl.status === 'failed') return { status: 'implementacao_falhou', diag, plan, impl }
  let reviews = []
  let final = 'precisa_do_dono'
  for (let round = 0; round <= 2; round++) {
    reviews = (await parallel(LENSES.map(l => () => agent(reviewPrompt(l, impl, round), { label: `revisar MCP ${l.key} r${round + 1}`, phase: 'Corrigir MCP', schema: REVIEW_SCHEMA, effort: 'xhigh' })))).filter(Boolean)
    const blocking = reviews.filter(r => r.verdict === 'fix').flatMap(r => r.blocking)
    if (!blocking.length && reviews.length) { final = 'aprovada'; break }
    if (round === 2) break
    const fixed = await agent(fixPrompt(impl, blocking, round), { label: `corrigir MCP r${round + 1}`, phase: 'Corrigir MCP', schema: IMPL_SCHEMA, effort: 'xhigh' })
    if (!fixed || fixed.status === 'blocked' || fixed.status === 'failed') { final = 'falhou_na_correcao'; break }
    impl = fixed
  }
  let g = await agent(gatesPrompt(impl), { label: 'gates MCP', phase: 'Corrigir MCP', schema: GATES_SCHEMA, effort: 'medium' })
  for (let r = 1; g && g.novas > 0 && r <= 2; r++) {
    log(`MCP: ${g.novas} falha(s) nova(s) de gate; corrigindo (rodada ${r}).`)
    await agent(gateFixPrompt(impl, g), { label: `corrigir gates MCP r${r}`, phase: 'Corrigir MCP', schema: IMPL_SCHEMA, effort: 'high' })
    g = await agent(gatesPrompt(impl), { label: `gates MCP r${r + 1}`, phase: 'Corrigir MCP', schema: GATES_SCHEMA, effort: 'medium' })
  }
  let push = null
  if (final === 'aprovada' && g && g.novas === 0) {
    push = await agent(pushPrompt(impl), { label: 'push da branch MCP', phase: 'Corrigir MCP', schema: PUSH_SCHEMA, effort: 'low' })
  } else {
    log(`MCP: branch NÃO publicada (revisão: ${final}; falhas novas de gate: ${g ? g.novas : 'sem gates'}).`)
  }
  return { status: final, diag, plan, impl, reviews, gates: g, push }
}

const [renderRes, baseRes, mcpRes] = await parallel([() => renderTrack(), () => baselineTrack(), () => mcpTrack()])
log(`Render: desenho ${renderRes && renderRes.design ? 'pronto' : 'não saiu'}. MCP: ${mcpRes ? mcpRes.status : 'falhou'}. Baseline: ${baseRes && baseRes.ok ? 'ok' : 'com problemas'}.`)

phase('Relatório')
const complete = await agent(completePrompt(renderRes ? renderRes.design : null, mcpRes ? { status: mcpRes.status, impl: mcpRes.impl, gates: mcpRes.gates, push: mcpRes.push } : null), { label: 'crítico de completude', phase: 'Relatório', schema: COMPLETE_SCHEMA, effort: 'high' })

const summary = {
  render: renderRes && renderRes.design ? {
    resumo: renderRes.design.resumo,
    pacotes: renderRes.design.pacotes.map(p => ({ id: p.id, titulo: p.titulo, depende_de: p.depende_de })),
    decisoes_dono: renderRes.design.decisoes_dono,
    runbook_prod: renderRes.design.runbook_prod,
    riscos: renderRes.design.riscos,
    mapas: (renderRes.maps || []).map(m => ({ resumo: m.resumo, doc: m.doc })),
  } : null,
  mcp: mcpRes ? {
    status: mcpRes.status,
    causas: mcpRes.diag ? mcpRes.diag.causas : [],
    resumo_impl: mcpRes.impl ? mcpRes.impl.resumo : null,
    commits: mcpRes.impl ? mcpRes.impl.commits : [],
    testes: mcpRes.impl ? mcpRes.impl.testes : [],
    mudancas_prod: mcpRes.impl ? mcpRes.impl.mudancas_prod : [],
    gates_novas: mcpRes.gates ? mcpRes.gates.novas : null,
    branch: mcpRes.push && mcpRes.push.pushed ? FIXBR : null,
    head: mcpRes.push ? mcpRes.push.head : null,
  } : null,
  baseline: baseRes ? { ok: baseRes.ok, gates: baseRes.gates } : null,
  faltando: complete ? complete.faltando : [],
}

const report = await agent(reportPrompt(summary), { label: 'relatório visual', phase: 'Relatório', schema: REPORT_SCHEMA, effort: 'medium' })

return { relatorio: report ? report.url : null, ...summary }