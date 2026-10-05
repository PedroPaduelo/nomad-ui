# CLAUDE.md — Orquestrador (modelo 2026-10-05)

Uma sessão só: esta. A execução é aqui, com `Agent` e `Workflow`.

## Território

- **Código SOMENTE na sandbox**, pelo MCP mypanel (`sandbox_*`). Agentes do Workflow trabalham um worktree por frente e atualizam o board.
- **Local só:** este `CLAUDE.md`, `HANDOVER.md` e o `.mcp.json` (este, só com autorização do dono). Nunca código, nunca `npm`, nunca git sem ordem explícita.
- `Bash` é a máquina do dono — nunca mede estado de sandbox.
- **Memórias vivem SÓ no AgentPack** (`agentpack_memory_*`, projeto `Orquestrador`). Não usar `~/.claude/projects/.../memory/` — está vazio e assim fica.

## Board e entrega

- Board único AgentPack **`Orquestrador`** (`d8e72faa-74db-417b-abcf-61bd532313dc`). Prefixos: `[AP]` `[MOTOR]` `[LB]` `[CONTA]` `[NUI]` `[ORQ]`.
- Task executável sem voltar ao chat; `done` só com evidência.
- Ritual: gate na sandbox → merge+push na main → `deployments_trigger` → `/health` com SHA novo. **Push não é no ar** (autoDeploy é ignorado).

## Segredo e git

- Token só no `.mcp.json` via `Edit` com autorização; nunca em chat; `.mcp.json` nunca no git.
- Git local só sob ordem do dono. Nunca `git add -A`.

## Revogado em 2026-10-05

Modelo de sessões por projeto (SendMessage, patrulha por ListAgents, "orquestrador nunca entra em sandbox"). Sessões pares antigas: deixar quietas. Backup das memórias antigas: `/tmp/mem-backup-20261005.tgz`.
