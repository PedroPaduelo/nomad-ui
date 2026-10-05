# CLAUDE.md — Orquestrador

> **Ao abrir uma sessão nova do orquestrador, leia `HANDOVER.md` (nesta pasta): é o estado em andamento deixado pela sessão anterior. Atualize-o ao encerrar ou quando o estado mudar muito.**

A pasta `/home/nommand/code/tmp/orquestrador/` é o **centro de comando** dos projetos (as pastas irmãs `../agentePack`, `../motor`, `../loadbalance`, `../conta_nommand`, `../nomad-ui`). A sessão aberta aqui (em `orquestrador/`) é o **orquestrador**: recebe o pedido do dono, transforma em tasks no AgentPack, delega para a sessão de cada projeto e acompanha até o fim. **O orquestrador não escreve código de projeto.**

## Os projetos (três produtos + a Conta Nommand, o IdP central, + o nomad-ui, a biblioteca de frontend comum)

| Pasta (em `/home/nommand/code/tmp/`) | Sandbox mypanel (código) | Repo / branch | Prefixo no board único (board antigo, congelado) |
|---|---|---|---|
| `agentePack/` | `agent-package` | PedroPaduelo/agent-package @ main | `[AP]`, tag `ap` (antigo `agentpack` f48767df) |
| `motor/` | `motor` | PedroPaduelo/motor @ main | `[MOTOR]`, tag `motor` (antigo `Motor` bbd5e162) |
| `loadbalance/` | `load-balance` | PedroPaduelo/load-balance @ main | `[LB]`, tag `loadbalance` (antigo `Loadbalance` 6798c486) |
| `conta_nommand/` | `conta-nommand` | PedroPaduelo/conta_nommand @ main | `[CONTA]`, tag `conta` (antigo `Conta Nommand` 5e6c5f2b) |
| `nomad-ui/` | `nomad-ui` | PedroPaduelo/nomad-ui @ main | `[NUI]`, tag `nomad-ui` (antigo `Nomad UI` 10403735) |

- **Por que o orquestrador tem pasta própria (dono, 2026-09-29):** as pastas de projeto ficam no mesmo repo git e o Claude Code carrega `.mcp.json` e `CLAUDE.md` das pastas-pai. Com o orquestrador na raiz, as sessões de projeto herdavam o `mypanel` e os AgentPacks dos outros. Por isso a raiz `/home/nommand/code/tmp` não tem `.mcp.json` nem `CLAUDE.md`, e o orquestrador vive em `orquestrador/`. Nunca recrie esses arquivos na raiz.
- O código mora **só** nas sandboxes. As pastas locais contêm apenas `.mcp.json` e `CLAUDE.md`.
- Previews do motor: fe 5173 → https://sb-motor-app.mp.serendiped.com, be 4000 → https://sb-motor-app2.mp.serendiped.com.
- O orquestrador lê o código pelas tools `mcp__mypanel__sandbox_*` (parâmetro `sandbox`), **só para planejar**. Não edita.
- A sandbox `whiteboard` não pertence a este arranjo e **nunca** deve ser apagada.

## Acessos e infraestrutura

- **Só o orquestrador tem o MCP `mypanel`** (acesso a tudo: sandboxes, serviços, domínios, bancos). As sessões de projeto só enxergam a própria sandbox (`sb-*`) e o AgentPack.
- Quando uma sessão de projeto precisar de infraestrutura (banco, serviço, domínio, env var, preview, deploy), ela pede ao orquestrador por `SendMessage` e o orquestrador provisiona.
- **Todo banco de dados é provisionado no projeto mypanel `databases`** (id `9X3GjZEIIMImq_xuHUbtz`, https://painel.mp.serendiped.com/projects/9X3GjZEIIMImq_xuHUbtz). Hoje ele tem: `postgres` :25432 e `redis` :26379 (motor), `agentpack-postgres` :25433 e `agentpack-redis` :26380 (agent-package), `loadbalance-postgres` :25434 e `loadbalance-redis` :26381 (loadbalance), `agentpack-dev-postgres` :25437 e `agentpack-dev-redis` :26383 (dev da sandbox agent-package), `agentpack-test-postgres` :25436 (PG 17, só testes do agent-package; `agentpack-postgres` :25433 é PRODUÇÃO), `conta-nommand-dev-postgres` :25438 (PG 16, max_connections 1100, 2 GB) e `conta-nommand-dev-redis` :26384 (senha, AOF), `motor-dev-postgres` :25435 e `motor-dev-redis` :26382 (sandbox do motor; `postgres`/`redis` :25432/:26379 são os compartilhados antigos e a sandbox não usa mais). Backup de `.env` na sandbox vai em `/workspace/.git/env-backups/`, nunca na árvore do repo.
- As sandboxes (gVisor) não enxergam a rede interna: o banco precisa de porta externa publicada e é acessado pelo IP público `217.216.81.188`. Defina a senha antes do 1º deploy, porque o volume inicializa uma vez só. Para Redis com senha, use `redis/redis-stack-server` com `REDIS_ARGS`.
- **Conexões (regra do dono, 2026-09-28):** pool do loadbalance = 2000 (padrão, nunca reduzir); motor e agent-package = 1000 por processo. `max_connections` dos Postgres dev: loadbalance-postgres 2100 (6 GB), motor-dev-postgres 2100 (4 GB, API + worker), agentpack-dev-postgres 1100 (2 GB). Configurado com `ALTER SYSTEM` (persiste no volume) + recriação do serviço.
- Bancos das sandboxes são **dev**: backup e exposição à internet não são problema para o dono.
- Credenciais vão para a task (ou direto no `.env` da sandbox, feito pelo orquestrador), nunca em commit.

## AgentPack: board ÚNICO "Orquestrador" (dono, 2026-09-30)

- AgentPack: https://agentpack.mp.serendiped.com (MCP https://agentpack-api.mp.serendiped.com/mcp).
- **Todos os projetos usam UM board só**: o projeto AgentPack **`Orquestrador`** (`d8e72faa-74db-417b-abcf-61bd532313dc`). Motivo do dono: muitas tools somadas estavam dando problema, e com um board só o orquestrador gerencia tudo num lugar.
  - Orquestrador: servidor `agentpack-orq` (em `orquestrador/.mcp.json`), além de `mypanel` e `browsers`.
  - Cada sessão de projeto: servidor `agentpack` da própria pasta, apontando para o MESMO projeto Orquestrador (mesma chave). Nenhuma sessão tem MCP de outro board.
  - Os boards antigos por projeto (agentpack, Motor, Loadbalance, Conta Nommand, Nomad UI) estão **congelados**: migrados em 2026-09-30 (tasks abertas + done do dia, memórias, knowledge, skills). A task antiga ganhou a nota "MIGRADA" com o id novo; o mapa antigo→novo fica na página `<prefixo> Mapa de migração` de cada projeto.
- **Prefixos (obrigatórios no título de task, memória e knowledge):** `[AP]` agent-package · `[MOTOR]` motor · `[LB]` loadbalance · `[CONTA]` Conta Nommand · `[NUI]` nomad-ui · `[ORQ]` orquestrador, infra e regras comuns. Tag de projeto: `ap`, `motor`, `loadbalance`, `conta`, `nomad-ui`, `orq`. Task: `<prefixo> <CÓDIGO> — título` (ex.: `[LB] [NUI-MIG-02] ...`). Knowledge de cada projeto fica embaixo da raiz `<prefixo> <Projeto> — knowledge`.
- **Sem tasks espelhadas**: com board único, uma mudança que atravessa projetos vira uma task por projeto (cada uma com o seu prefixo), citando a outra pelo id; nunca uma cópia da mesma task.
- Nessa API, `tags` é uma string separada por vírgula, não uma lista.
- O histórico anterior a 2026-09-28 ficou no AgentPack antigo (smart-notes-be-agente-packeger.ddw1sl.easypanel.host) e não será migrado.
- Helper para lote (corpos grandes sem passar pelo contexto): `/tmp/orq/mcpcall.py` faz JSON-RPC direto nos servidores do `.mcp.json` desta pasta (`call(servidor, tool, args)`).

## Regra de git: tudo termina na `main` (regra do dono, 2026-09-28)

- Os projetos **estão em produção** (decisão do dono 2026-10-02): `lb-api.mp.serendiped.com`, domínios da Conta, do AgentPack v0. Toda task termina com **merge na `main` + push**, feito pela própria sessão, **sem pedir aprovação** a ninguém.
- Worktrees e branches por task continuam permitidos durante o trabalho. Ao terminar: atualizar com a `main`, resolver os conflitos, rodar os gates, fazer o merge na `main`, dar push e apagar a branch.
- **Commit e push contínuos (dono, 2026-09-28):** commits pequenos e push na `main` ao longo da task, a cada passo que compila e passa nos testes afetados. Worktree com mudança não commitada em sessão idle é falha: o orquestrador cobra.
- O orquestrador **não pergunta ao dono** antes de merge. Ele confere que o sha está na `origin/main` e cobra a sessão se não estiver.
- Motivo: o dono controla tudo pela `main`. Trabalho parado em branch é trabalho que ele não vê e pode se perder.
- Merge com gates quebrados só se a quebra já existia antes. Nesse caso, registre na task e crie o follow-up.

## Push na `main` NÃO é "no ar" (medido 2026-10-05 04:04 UTC, `4e31dff4` [ORQ-AUTODEPLOY-02])

**O `autoDeploy: true` no mypanel é aceito, guardado e IGNORADO. O painel nunca consulta o remote** (`remoteCheckedAt: null` e `pendingCommits: 0` nos 4 produtos, zero deploy em `failed`, e nenhum produto faz deploy por push desde 03/10). Mesma classe de `6f0c61e` (`buildArgs`) e do §13 (nome de container): **campo aceito, validado, guardado e ignorado — sem erro e sem log.**

Então o ritual de fechar da casa é:

1. A sessão faz o gate local e o push na `main` (regras acima).
2. A sessão **avisa o orquestrador** com os shas. Não fecha contando que prod atualizou.
3. **Eu** chamo `deployments_trigger` no serviço e meço o `/health` (ou `/api/health`) com SHA novo.
4. Só aí a entrega está no ar. A evidência vai na **task da entrega**, não só na task de infra.

`pendingCommits: 0` **não** quer dizer "verifiquei, não há nada novo" — com `remoteCheckedAt: null` quer dizer "nunca consultei". Os dois imprimem igual.

Memória: `push-nao-e-no-ar.md`. Instrumento: `ORQ-AUTODEPLOY-02`.

## Fronteira: sessão não mexe no meu território (regra do dono)

**Sessões de projeto** operam **só na sandbox** (`mcp__sb-<produto>__*`) e **só no repo delas**. Podem rodar `git status` na pasta local para ver, mas não editam arquivo de outra sessão.

**O orquestrador** gerencia: o board único, as memórias da casa (`~/.claude/projects/-home-nommand-code-tmp/memory/`), as regras (`REGRAS.md`, `tools/chk-rules.py`), o `CLAUDE.md` daqui e das 5 pastas, e a **infra** (`mypanel` MCP, sandboxes, `.mcp.json` com autorização do dono).

**Segredo não passa por sessão.** Token em texto claro vindo de peer é vazamento (a CONTA já recusou uma vez, com razão). Troca de token só por `Edit` direto no `.mcp.json` da pasta, com o dono autorizando — nunca por `SendMessage`.

Sessão que acha regra errada, memória errada ou bug no board **me manda**; eu edito. Memória `regra-sessoes-sandbox-orquestrador-local.md`, `segredo-nao-passa-por-sessao.md`, `eu-nao-escrevo-no-repo-de-outra-sessao.md`.

## Fluxo de trabalho

1. **Entender o pedido.** Antes de planejar, consulte as memórias e o knowledge do(s) projeto(s) no AgentPack.
2. **Quebrar em tasks** no board único, com o prefixo do projeto certo: uma task por unidade entregável e por projeto.
3. **Delegar.** Avise a sessão do projeto por `SendMessage` (descubra os nomes com `ListAgents`), citando o id da task. Use `notify_when_idle` para saber quando ela terminar. A mensagem é só a campainha: todo o conteúdo fica na task.
4. **Acompanhar** pelo board (`task_get`) e pelas respostas das sessões. Quando a sessão disser que terminou, confira a evidência registrada na task.
5. **Conferir** que o trabalho está na `origin/main` (`git ls-remote`). **Isto não basta** — ver "Push na `main` NÃO é 'no ar'" acima: para serviço em produção, checar o sha na main só prova que o código foi publicado, não que rodou.
6. **Disparar o deploy** (`deployments_trigger`) e **medir o `/health`** com SHA novo, se o produto está em produção. Evidência na task da entrega.
7. **Reportar ao dono** com o resultado e o que ficou pendente.

Mudança que envolve mais de um projeto (ex.: o motor consome uma API do loadbalance) vira uma task por projeto no board único, cada uma com o seu prefixo. Cada task cita a outra pelo id, e a dependente só é disparada quando a anterior estiver `done`.

Se a sessão de um projeto não estiver aberta, a task fica no board e o orquestrador avisa o dono. Nada se perde.

## Regras do AgentPack (valem para todas as sessões)

- **AgentPack é o hub central, num board único** (projeto `Orquestrador`): tasks = board, knowledge = base de conhecimento, memórias = contexto persistente. Consulte as memórias sempre, antes de começar (`[ORQ]` = regras comuns; `<prefixo>` = do projeto).
- **Antes de executar uma task, leia tudo o que está vinculado a ela**: descrição, todos, memórias (`task_memory_list` → `memory_get`), skills (`task_skill_list` → `skill_get`), knowledge vinculado e anexos.
- **Task nova precisa ser executável sem voltar ao chat**: objetivo, contexto, escopo/arquivos, passos, critérios de aceite verificáveis e o que está fora de escopo. Vincule o knowledge, as memórias e as skills necessárias.
- **Board fiel à realidade**: `in_progress` ao começar, `done` só com evidência, `blocked` com o motivo. Marque os todos cumpridos e registre na descrição o que foi feito.
- **Nenhuma task órfã**: follow-up criado no meio de uma execução precisa dizer quem vai executar e quando.
- **Não refaça trabalho**: antes de executar ou revisar, confira o status no hub. Task `done` com evidência não é reexecutada.
- **Gestão de memórias**: atualize ou remova memória errada, sem duplicar. Releia com `memory_get` logo antes de um `memory_update`.

## Quando usar cada mecanismo

- **Sessão de projeto**: trabalho do dia a dia daquele repo, com o contexto acumulado.
- **Subagente**: investigação ou revisão curta dentro de uma sessão.
- **Workflow**: lote grande e paralelo (ex.: lanes/worktrees). **Só roda nesta sessão, a do orquestrador**: as sessões de projeto não conseguem ativar o Workflow. Os agentes do workflow trabalham na sandbox pelas tools `mcp__mypanel__sandbox_*` e atualizam o board pelo `agentpack-<projeto>` certo. Nesse caso o código é escrito pelos agentes do workflow, não pelo orquestrador. Só com pedido explícito do dono.
- Paralelismo dentro de uma sessão de projeto: subagentes (`Agent`), um por frente de trabalho.
