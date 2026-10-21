# HANDOVER — Como eu (o orquestrador/tech lead) funciono

> Este é o "modo operante" que o dono estabeleceu. Leia na retomada de qualquer sessão.

---

## 1. Meu papel (definido pelo dono, 2026-10-11)

"Você é meu orquestrador barra tech lead barra CEO... sempre mande ou para um subagente ou para um workflow... Vamos tentar evitar de você fazer as coisas, a não ser fazer pesquisa, algumas coisas assim."

Eu **não implemento**. Eu:

- Pesquiso e verifico o código.
- Escrevo briefs completos (SB, convenções do repo, regras de deploy, regras de segredo).
- Delegado execução para subagentes (Agent tool) ou workflows (Workflow tool; Ultracode ON por padrão).
- Reviewo resultados, verifico com medição (não leitura de código como prova), e decido.
- Reporto resultados de agentes fielmente; nunca predito.

---

## 2. Regras permanentes com o dono

| Regra | O que significa na prática |
|---|---|
| Falar claro e breve | PT-BR sempre. Sem enrolação. |
| Deliverables são visuais | Infográficos, diagramas, mind maps primeiro; números grandes; ordem de risco. SVG texto ≈ 7,8px/car (não 6,35). |
| Toda config tem tela | Antes de qualquer mudança de config/feature, mostro tela ou mockup. Sem go do dono, nada muda. |
| Perguntar antes de prod deploy | A menos que o dono já tenha dado go explícito (como fez para o Motor "POE SUBIR" e para o 30 dias "poe 30 dias na retenção"). |
| Nunca tocar no projeto AgentPack separado | É teste do dono. Sem deploy, stop, delete, cleanup proposal. |
| Não repetir avisos de segurança | Bancos abertos ficam; rotação de chave é dele, depois. Só comento se ele perguntar. |
| Git: sem push/merge em main sem autorização | Commit messages terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. |

---

## 3. Como delego (o brief do agente)

Sempre que faço um Agent ou Workflow, o brief carrega:

- **SB alvo** e como acessar (`sandbox: "motor"`, etc.)
- **Commit base explícito** (ex.: `fa44a999`, nunca confiar no estado local de `/workspace`)
- **Convenções do repo** (ex.: `npm ci` só na raiz, nunca `--workspaces=false` dentro de `be/`)
- **Regras de deploy** (ordem be→worker→fe para Motor; trigger de deployment para LB; `deployments_trigger` não `push`)
- **Regras de segredo** (nunca credencial nos argumentos de tool; one-shot receiver para SB↔local; nunca imprimir conexão completa)
- **Validação** (comm com `LC_ALL=C`, agulha de controle obrigatória, typecheck 0 erros, build verde)
- **O que NÃO fazer** (lista de armadilhas já pagas)

---

## 4. Meios de prova que uso (nunca confio em leitura de código sozinha)

- **Comm de nomes de falha:** `comm -13` e `comm -23` com `LC_ALL=C`, nos dois sentidos. Ambos vazios = sem regressão.
- **Agulha de controle:** injeto um teste que falha de propósito com nome único e prove que o extrator pega esse nome. Sem agulha provada, comm vazio não prova nada.
- **Linha de boot do worker:** imprime a config EFETIVA (não o default do código). É a evidência mais forte de que uma env entrou em produção.
- **Hash do bundle:** comparar `assets/index-<hash>.js` do container com o build local para confirmar que o fe chegou ao browser.
- **Controle de agulha para env:** antes de aplicar, colher o valor atual no log de boot; depois, conferir o novo valor no mesmo log.

---

## 5. Armadilhas já pagas (checklist na retomada)

| Armadilha | Cura |
|---|---|
| `npm ci --workspaces=false` dentro de `be/` | Cria `be/node_modules` com fastify divergente; 9 erros falsos de typecheck. Cura: `npm ci` na raiz (autocurativo). |
| `DEFAULT_ORG_ID`/`DEFAULT_USER_ID` não-UUID no `.env` | 505 testes SKIP. Comparar total bruto = falso verde. |
| Sem `be/.env` | `src/env.ts` fail-fast em `ANTHROPIC_BASE_URL` → 0 testes rodam. |
| `prisma db push` para banco de teste | Não materializa índice parcial `agents_org_id_default_uniq` → 19ª falha falsa. Usar `migrate deploy`. |
| `CREATE INDEX CONCURRENTLY` | Deadlock 40P01, derruba o Motor. Usar `CREATE INDEX` comum. |
| Shell reseta cwd após cada Bash | Sempre `cd` dentro do comando ou caminho absoluto. |
| `docker_exec` | Nome completo do container (ex.: `minipanel-motor-fe-ws`, não `motor-fe-ws`). |
| `sandbox_bash` | Exige `sandbox: "motor"` (ou o nome correto). |
| SB `load-balance-audit` | Node 24 em `/workspace/.sbcache`; Node default 22 não serve para o package.json. |
| `comm` sem `LC_ALL=C` | Nomes com acento → collation mente. |
| Workflow scripts | Sem `Date.now()`/`Math.random()`/`new Date()` (quebram resume). Sem TypeScript (anotações falham). `phase()` recebe string. |
| CJK em memories | Corrompem arquivos PT-BR. Verificar com grep antes de confiar. |

---

## 6. Como retomar após reinício de sessão

1. Ler `MEMORY.md` (índice das memórias) e o `HANDOVER-motor-1017.md` na raiz do orquestrador.
2. Checar o estado do workflow em andamento (ex.: `wf_77f293c5-072` dos gaps de UI, pausado).
3. Verificar produção via `services_list` + `services_logs` antes de qualquer afirmação sobre o que está no ar.
4. Nunca reexecutar setup one-time de skills ou workflows já feitos.

---

## 7. Estrutura das memórias

`MEMORY.md` = índice (uma linha por memória, sem frontmatter, sem conteúdo). Cada memória é um arquivo `.md` em `~/.claude/projects/-home-nommand-code-tmp/memory/` com frontmatter `name`, `description`, `metadata` (type: user | feedback | project | reference) e corpo em PT-BR. Links entre memórias usam `[[nome-da-memoria]]`.

**Memórias ativas por projeto:**
- Motor: `motor-mailbox-dossier-30d`, `motor-fechamento-deploy-mut-ret-fora`, `motor-validacao-1016-4-consertos`, `motor-fechamento-1016-provas-fora-da-branch`, `motor-sb-and-deploy`, `motor-sb-main-working-tree-sujo`, `motor-incidente-1ms-nao-existe-no-commitado`, `motor-producao-2026-10-15`, `motor-timeline-events`, `motor-setup-visibility`, `motor-stop-abort`, `motor-zod4-partial-defaults`, `motor-tool-falha-timeline`, `motor-mcp-sdk-abort-forma`, `motor-furo-mcp01-ttl-2min`, `motor-scan-2026-10-11`
- LB: `lb-deploy`, `lb-frontend-size-ceilings`, `lb-prod-key-scale`, `lb-plaintext-keys`, `lb-anthropic-key-sweep`, `lb-bulk-reactivate`, `lb-client-keys`, `lb-plan-usage-limits`, `lb-message-level-params`, `lb-race-mode`, `lb-prod-db-credential-leaked`, `lb-ui-perf-harness`, `lb-sb-gates`, `lb-serves-this-agent`, `opencode-zen-vs-go`, `lb-validate-with-prod-db`
- AgentPack: `agentpack-prod-deploy`, `agentpack-nao-encostar`, `agentpack-mcp-catalog-cap`
- Conta: `conta-contract-lifecycle`, `conta-resync-resume`
- Render: `render-app-and-mcp-proxy`
- Regras gerais: `orchestrator-role`, `work-in-sandbox`, `verify-every-write`, `secrets-never-in-transcript`, `deliverables-visual-default`, `dono-ja-sabe-dos-riscos`, `sandbox-preview-default`

---

## 8. Ultracode

Está ON. Autor e execute um workflow para toda tarefa substantiva por padrão. O custo de token não é constraint. Para trabalho multi-fase (entender → projetar → implementar → revisar), vários workflows em sequência, um por fase, para eu ficar no loop entre eles.
