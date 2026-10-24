# HANDOVER — Projeto Load Balance (LB)

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.
> Última validação: **2026-10-24** (dossiê de 40 claims + 15 novidades; produção medida ao vivo).

---

## ⚠️ Atenção do dono (itens críticos em 2026-10-24)

- **Regressão do campo `phase` (desde o deploy de 22/10):** upstreams estritos rejeitam o campo extra que o LB marca no bloco `text` — **139×** `400 messages.N.content.N.text.phase: Extra inputs are not permitted` entre **06:15 e 08:10Z de 2026-10-24** (139 `request_id` únicos, upstream Anthropic via chaves `oauth_max` servindo `claude-opus-5-5`). Nenhum código remove `phase` antes de encaminhar.
- **Frontend um deploy atrás:** `pendingUpdate=8bd1436` parado; **33 arquivos** de frontend em 4 commits na main ainda não publicados (página `/app/arquitetura`, seção "Diagnóstico").
- **Frota NVIDIA morrendo em massa:** **553×** `API key auto-disabled reason=auth_failed status=403` entre **06:01 e 07:52Z de 2026-10-24**; nomes sobem de `nvidia-07xx` até `nvidia-11xx`.
- **2 chaves OAuth para reconectar:** `ff7dfb3f` e `79ab431f` — `needsReauth` por "refresh token invalid" (**2026-10-24 07:24–07:44Z**).
- **Commit órfão:** `dfdb3bf` (2026-10-24 05:23Z, "a rota google preserva a versão da base (v1beta)", pai `8bd1436`) existe **só** na SB `load-balance-audit`, sem branch nem ref que o contenha e fora de `origin/main` — pode se perder num `gc`.
- **`loadbalance-prod-postgres`:** a rotação da credencial vazada de 2026-10-12 segue pendente (não verificado em 24/10).

---

## 1. Estado de produção (atualizado em 2026-10-24)

| Serviço | ID | URL | Commit | Estado |
|---|---|---|---|---|
| loadbalance-backend-ws | VAkbDdZhzG7S7S-Zt52Tm | lb-api.mp.serendiped.com | 8bd1436 | Up, autoDeploy true, pendingUpdate null |
| loadbalance-frontend-ws | E2vxruTSJ42G_Qe_6lJHh | loadbalance.mp.serendiped.com | cb907f1 | Up, autoDeploy true, **pendingUpdate 8bd1436** (1 deploy atrás) |
| loadbalance-prod-postgres | cDNq9BNTdbEU0UlgUwIul | :25441 | — | Up (credencial VAZADA, ver §4) |

**Regra de deploy:** push para main NÃO dispara deploy; o painel marca `pendingUpdate`. Usar `deployments_trigger` no lado que mudou e confirmar pelo hash do bundle. Ordem: backend primeiro, depois frontend. (Confirmado de novo em 24/10: o frontend tem `autoDeploy:true` mas o `pendingUpdate 8bd1436` ficou parado sem ser aplicado.)

**Último deploy confirmado — backend:** `8bd1436` (deploy `RjqdQGRiTurfeLW7ODzvZ`, **2026-10-23 23:47Z**; container desde 23:48Z; `pendingUpdate` null). `/api/health` 200, `commit=8bd1436`, db ok, redis ok, `dbLogErrors=0`, uptime ~8h17 na medição de 24/10.
**Frontend ainda em `cb907f1`** (deploy `fuY04XaWdnd05Q577T0ad`, **2026-10-20**; container Up 4 dias), com **`pendingUpdate=8bd1436`** — 33 arquivos de frontend em 4 commits na main não publicados (`73de8b3` página `/app/arquitetura`, `cb4ab5d`, `2c1b774` seção "Diagnóstico" na navegação, `f00c609`); o bundle servido tem 0 ocorrências de `arquitetura`. Prova do bundle do fe (ainda o de 20/10): `<meta name="build-commit">` = cb907f1; `index-LFW3lcZD.js`; sha256 `7b569887…`; marcador `space-bunny-free` presente (0 no bundle antigo).

**Deploys de backend depois do `cb907f1` (todos confirmados no painel):** 22/10 — `dc5ff80` (22:40Z, merge do guard), `684ddfe` (22:45Z), `1a5b7ee` (22:53Z), `d75a69d` (23:00Z); 23/10 — `d9a8d5e` (17:50Z, gate FIRST-CHUNK com teto de 8 MB para frame em andamento), `81875c5` (23:02Z, transform de stream do meta decidido por `responseFormat`), `8bd1436` (23:47Z, `prompt_cache_breakpoint` só para o OpenRouter, depois de 400 "untagged enum" da NVIDIA). Produção = `8bd1436` = HEAD de `origin/main`.

### Cadeia de deploys até a cobertura OpenCode (2026-10-14 → 20-10)
`83ac46a` (14/10 05:47Z, usage-limits) → `4399081` (15/10 00:29Z, output_config) → `13b6104` (18/10 03:46Z — **aqui começa o trabalho OpenCode**: Zen-free directing com 400 PT-BR) → `fe3c26f` (18/10 05:04Z, Go completo) → `bba9896` (18/10 05:19Z, Zen pairing) → `0f0b731` (18/10 17:48Z, gemini Go na URL google-native direta + privacy 400 PT-BR + trava de protocolo) → `cb907f1` (20/10 00:58Z, cobertura de protocolo dos **122 ids** dos dois catálogos: 37 Go + 85 Zen, 249 casos, protocolo + URL fim a fim nas bases Go e Zen). Só o `cb907f1` caiu em 20/10; quatro caíram em 18/10; **nenhum em 19/10** (nem deploy, nem commit). A abertura da cadeia (`83ac46a` usage-limits e `4399081` output_config) **não é do OpenCode**.

### Diagnóstico dos 502 "upstream fechou o stream sem mandar nada" (2026-10-19)
Dois provedores diferentes (o `provider` da CHAVE decide, nunca o modelo):
- **Caso 1 — `gpt-6.1-sol` / chave "GPT Myke"** = provider `openai-codex` (`chatgpt.com/backend-api/codex`, OAuth). O Codex devolveu stream vazia em ~900ms. Chave com **7 requests, 7 falhas, 0 sucesso** desde 15/10 (não verificado em 24/10). Saiu do grupo pedro em 19:15. Precisa de reconnect do OAuth (não verificado em 24/10; em 24/10 duas outras chaves OAuth foram marcadas `needsReauth`: `ff7dfb3f` e `79ab431f`).
- **Caso 2 — `muse-spark-1.3-contributor` / "OpenCode 00 (copy)"** = provider `opencode`, base Go, **pareamento correto** (o modelo é do Go). As "2 tentativas" foram: primária OpenCode-Go (stream vazia, ~2,5s) + **fallover que cruzou de provedor** e caiu na chave do Codex → segunda stream vazia → grupo esgotado.
- **Furos do LB (medidos no código):** (a) o failover universal não filtra provedor (queima chaves entre provedores); (b) stream vazia repetida na mesma chave é classificada `temporary` fixo, então a chave segue ativa mesmo com 7/7 falhas.
- Método do probe: `resolveProvider(targetKey.provider, targetKey.authType, baseUrl)` (handlers.ts:1878) — match exato do provider da chave; o modelo nunca escolhe provedor.

### Prova do sweep de 120 modelos (2026-10-19)
"oi" com max_tokens 1 nos 120 ids: **28 OK (Go) · 9 400 ModelProtocolUnsupported (Go, roteamento certo — espelho de protocolo, sem bug) · 72 402 insufficient funds (Zen pago) · 11 403 FreeTierError (Zen free, só no app oficial)**. Os 9 do Go saem no protocolo certo (responses/messages/gemini por prefixo); o sweep "oi" usava chat/completions para todos, por isso o 400.

### Validacao adversarial do deploy cb907f1 (2026-10-21) — 5 agentes, 2 revisores adversariais
**[PROVADO em 21/10 — estado superado pela cadeia de 22–23/10]** Na data da validação, `cb907f1` estava nos dois serviços com `pendingUpdate` null. Desde então o backend recebeu 7 deploys e está em `8bd1436`; o frontend segue em `cb907f1` com `pendingUpdate=8bd1436`. `/api/health` segue 200 com db/redis ok e `dbLogErrors=0` (medição de 24/10). Suíte de protocolo `backend/test/opencodeGoProtocolFull1018.test.ts` (303 linhas, único arquivo do commit): **249/249 passam em 2,35 s**, cobrindo 37 ids Go + 85 ids Zen lidos do fonte com igualdade asserida nos dois sentidos — **mutante próprio** (`jev-`→`chat`) matou 4 casos, revertido voltou a 249/249 (verde real). Bundle `index-LFW3lcZD.js` sha256 `7b569887…` byte-idêntico ao local; marcador `space-bunny-free` presente no servido e ausente no deploy anterior `43990815da45`.

**[REFUTADO — não afirmar]** "Failover cruzando provedor foi observado ao vivo". O revisor reconstruiu 19 sequências de failover: **zero travessia de provedor**. 61 chaves de fallback = 60 `(openrouter)` + 1 `(nvidia)`; as 11/11 primárias têm provider provado. O incidente de 20/10 15:10 foi **mesmo provedor** (openrouter), não cruzamento. O defeito de **código** é real (abaixo), mas **não há evidência empírica de travessia**.
**[REFUTADO]** "7 requests / 7 falhas / 0 sucesso na chave do Codex" — a string `codex` aparece **0 vezes** em 14.266 linhas de log; nenhuma chave tem 7 falhas e 0 sucesso. O número veio da sessão anterior, não foi reconfirmado.
**[NÃO PROVADO]** A string literal "upstream fechou o stream sem mandar nada" apareceu 0 vezes nas 2.000 últimas linhas; a variante irmã `[FIRST-CHUNK] timeout de primeiro chunk (15000ms)` apareceu. O branch que classifica a stream vazia está ativo.

**Achados novos medidos (2026-10-21):**
- **Risco 1 (ATIVO) — stream vazia classificada `temporary`:** `classifyUpstreamError(200,'')` → `status=502, category=temporary, shouldCooldown=true`; `cooldownKey` tem default **60.000 ms** (`loadBalancer.ts:379`). Não existe contador de stream vazia em `src/` (grep vazio); `increment429`/strikes só contam 429 e `recordKeyError` só incrementa `errorCount` sem ninguém ler. Padrão a copiar: circuit breaker de OAuth (`loadBalancer.ts:477-507`, `consecutiveFailures` + `backoffSec`). Reconfirmado ao vivo em 24/10 (um 502 de primeiro chunk leva a cooldown sem desativar a chave).
- **Risco 2 — failover sem escopo de provedor:** o snapshot é montado sem filtro de provider e o consumo também não checa. **A primitiva certa já existe e não tem caller de produção:** `getNextKeyExcludingProvider` (`pool.ts:593-618`, filtro `k.provider !== excludeProvider` em `:604`), exposta em `loadBalancer.ts:809` — em `8bd1436` continua sem nenhum caller em `backend/src`.
- **Risco 3 — um request queima ~89 chaves** antes de desistir (~1,4 s cada ⇒ ~2 min até o erro final). Medido ao vivo em 21/10 06:40: `attempt 70`…`attempt 89` e depois `All keys exhausted for Provider transient 502 (stream), giving up`. **(não verificado em 24/10** — a janela de 21/10 já saiu do log legível; em 24/10 06:01–07:52Z a maior tentativa foi a **17**, com 7 `All keys exhausted` todos por `Request error 400 (stream)`; o teto snapshot+1 continua no código).
- **Risco 4 — 406 avisos `RATE_LIMIT … tpm … Proceeding anyway`** na janela: o limite de token não barra nada.

### Novidades 2026-10-24 (medições ao vivo, produção `8bd1436`)

Janela de referência: **2026-10-24 06:01–07:52Z** (111 min) e medições complementares até 08:15Z.

- **Regressão do `phase` (crítico):** upstreams estritos devolveram **139×** `400 messages.N.content.N.text.phase: Extra inputs are not permitted` (06:15:47–08:10:56Z; primeira 07:14:11Z, última 08:05:36Z; 139 `request_id` únicos). O `phase` é emitido em `responsesStreamTransform.ts:64` e `responsesToAnthropic.ts:92` e **nenhum código faz delete/strip** antes de encaminhar — o `sanitizeMessages` faz shallow copy e preserva campos extras por design. (Janela mais estreita 07:00–07:52Z: 62 ocorrências, chaves `ff7dfb3f` 23× e `5b6b23bd` 39×.)
- **Frota NVIDIA:** **553×** `API key auto-disabled reason=auth_failed status=403` entre 06:01 e 07:52Z (36 a 76 por 10 min), de `nvidia-07xx` até `nvidia-11xx` (após as `nvidia-0519…0847` registradas até 06:17Z). Uma chave `Claude Auditoria (copy)` também caiu. É essa frota que serve os aliases `claude-*`.
- **O que realmente atende as sessões que pedem Claude:** **3943 MODEL-OVERRIDE** em 111 min — `claude-haiku-5-5`→`stepfun-ai/step-5-preview` 1584; `claude-opus-5-5`→stepfun 1225; `claude-opus-5-5`→MiniMax-M3.1-Flash 705; `claude-sonnet-5`→MiniMax 236; →`muse-spark-1.3-contributor` 86; `claude-sonnet-5`→`claude-opus-5-5` 17.
- **Falhas vistas pelo cliente:** 7 `All keys exhausted for Request error 400 (stream)`. Quatro (06:19–06:21Z) após 400 da MiniMax `duplicate tool_call id` (chave `9a073ad2`); uma após 400 `messages.N: system content must contain at least one block` — esse 400 apareceu **94 vezes**, todas da chave `8e587a03`, que foi **duplicada pela UI às 07:48:30Z** e gerou a `5b6b23bd`.
- **OAuth:** `ff7dfb3f` (07:24:41Z e 07:44:50Z) e `79ab431f` (07:25:01Z) marcadas `needsReauth` — "PERMANENT oauth failure — refresh token invalid".
- **FIRST-CHUNK (24/10 06:01–07:52Z):** 830 linhas, 827 de timeout; **448 dos 452** com `fallbackKey` são da chave nvidia `cmv06xy3`; 378 dos `API Error: 502` são "timeout de primeiro chunk". **Nenhuma** ocorrência de "fechou o stream sem mandar nada" → o fix `d9a8d5e` está funcionando. O gate de "mesmo erro" disparou 16× (`[GUARD] Same error "timeout" … reverting auto-disable(s)`).
- **Saud do serviço:** `/api/health` 07:48Z — `dbLogDropped` 676 na janela de 1h, `dbLogErrors` 0, `rateLimitHits429` 249. **99,98% de uptime em 7 dias** (17 incidentes, batendo com os deploys), CPU 64,9%, memória 936 MB de 15 GB.
- **Painel dessincronizado:** todos os serviços de imagem (inclusive `loadbalance-prod-postgres`, `loadbalance-prod-redis` e os do Render) aparecem `stopped` desde **2026-10-19T19:56:43–44Z**, mas os containers estão Up há 4 dias. Os `postmaster.pid` do LB e do Render têm mtime **2026-10-19 20:04:40–41** — sinal de restart geral do host que o painel não registrou.
- **Postgres do LB:** `max_connections = 2100` em `postgresql.auto.conf` (gravado 2026-10-02), efetivo desde o restart de 19/10 20:04Z e **acima** do `DB_CONNECTION_LIMIT=2000` do backend.
- **Recursos de LB fora deste handover:** o serviço `lb-dev` (`XEjZWuj2Glq_jWGgtxHHg`) aparece `stopped` no painel, mas o container `minipanel-lb-dev` está Up 4 days em `a0a9c9b`; há também uma stack swarm legada `loadbalance_*` (back-dev, front-dev, redis, redis_dbgate) Up 4 days.
- **Catálogos OpenCode divergentes:** os catálogos atuais do binário v1.19.4 (arquivos locais `zen-catalogo-130.json` = 130 ids e `zen-go-catalogo-33.json` = 33 ids) **não batem** com a cobertura do LB aqui registrada (85 Zen + 37 Go). Vem de arquivos e memórias de 24/10, **não** de medição em produção.
- **Trabalho não mergeado na SB `load-balance-audit`:** branches `fix/upstream-503-failover` (`63dfac3`, 1 à frente e 67 atrás da main), `wt-guard-r3` (`ced557b`, 4 à frente), `wt-guard-r2-funcao` e `wt-fusao-dialeto`. A memória de 24/10 (`lb-guard-call-sites-nao-exportados`) diz que o **guard de commentary está morto no provider `meta`**; não dá para confirmar nem refutar pelo log — o guard só escreve `[commentary-guard]` quando falha, e houve **0** linhas na janela.

### Tempestade 502 medida por mim (2026-10-21 06:21–06:54Z) — o mecanismo, fechado
Segmentando o log de prod por request (delimitador = `All keys exhausted`):
- **8 requests** esgotaram o pool na janela. Cada um: **89 tentativas**, **59–60 chaves DISTINTAS**, **100% `(openrouter)`**, e **2–3 chaves re-selecionadas** no fim (`cmv07s25` 22×, `cmv07s24` 9–10×).
- Total na janela: **721 `[FIRST-CHUNK]`**, **713 seleções de chave**, **60 chaves distintas**, **8× `All keys exhausted`**, **9× `API Error: 502`**.
- **O modelo é `minimax/minimax-m3.1-flash:free` via openrouter em todas** — não é mistura de grupo nem de provedor. Depois da rajada o mesmo modelo passou a responder (com a chave `cmv07s24` e `cc4wrgo8`), então **o provedor se recuperou** — a rajada foi do upstream, não de chave ruim isolada.

**Mecanismo (lido no código; as referências de linha abaixo valem para o `cb907f1`; em `8bd1436` — o commit no ar — os tetos do failover estão em `handlers.ts:790` (streaming, `for` em `:791`) e `handlers.ts:1321` (non-stream, `for` em `:1322`); todas as peças citadas existem inalteradas nos dois commits):**
1. O snapshot é montado em `handlers.ts:538-541` (`getGroupKeysSnapshot`/`getUnlockedKeysSnapshot`), **sem filtro de cooldown** — `getUnlockedKeysSnapshot` (`pool.ts:232-261`) só filtra `active` e `groupId: null`; o cooldown é aplicado **dentro** de `getNextKeyWithDetails` (`pool.ts:496`), ou seja, só na escolha por grupo, **não** no snapshot.
2. `triedKeyIds` (`:497`, `:611-614`) impede repetir **id**, mas o `continue` do `:612` **consome a tentativa** (`attempt++`) sem testar a chave nova — daí `attempt` chegar a 89 com 60 chaves.
3. `MAX_FAILOVER_ATTEMPTS = retryKeysSnapshot.length + 1` — o teto é o **tamanho do snapshot**, não um número fixo (mudança B-A7-005, deliberada: "tenta TODAS antes de desistir").
4. **A pista decisiva:** o log tem **três identidades diferentes** por iteração — `Provider transient 502 for key X` = a chave que **atende** (`targetKey`), `keyPolicy keyIdPrefix` = a chave **cooldownada** (a que falhou, `fallbackKey` do `[FIRST-CHUNK]`), e `Retrying stream with key: Y` = a chave **realmente tentada**. `fallbackKey` vem de `getNextKeyWithDetails({ apiKeyId: nextKey.id })` (`handlers.ts:620-623`), que **ignora `apiKeyId` quando há `groupId`** (`pool.ts:487-508`): ele **re-escolhe do grupo** e devolve uma chave diferente da pedida. Por isso o `shift()` consome `nextKey` mas o dial real usa outra — e as repetições (`cmv07s25` 22×) são o grupo re-servindo a mesma chave.
5. **Natureza do defeito:** não é "falta de filtro de provedor" (embora isso também esteja errado) — é que **o snapshot e a escolha real divergem**: o `shift()` consome uma chave do snapshot e o dial real usa outra.

- **Achado colateral:** o painel declara `VITE_API_URL=https://lb-api.mp.serendiped.com` no `builderConfig`, mas a env do serviço está **vazia** e o build embute `VITE_API_URL=''`. Funciona (path relativo é o correto em prod, `frontend/src/config/env.ts:39-48`) — mesma família do `GIT_SHA=unknown` documentado no próprio Dockerfile.
- **Achado colateral 2:** existe o caminho `retrySameKeyFirst` (`markReasoningRejection`, `handlers.ts:449/1002`) que reinsere a própria chave na frente da fila (`:548/1079`) — em 20/10 07:58 a primária `cmv06xy3` (nvidia) falhou e o fallback foi a **mesma** chave, com sucesso. O padrão **continua em 24/10** (448 dos 452 FIRST-CHUNK com fallbackKey são da `cmv06xy3`); o mecanismo exato (retrySameKeyFirst vs grupo re-servindo) não foi desempatado.
- `dbLogDropped` (FK-ORFAO) **mudou de ordem de grandeza** — ver abaixo.
- Os **122 ids** são 37 Go + 85 Zen **somando as duas listas**; há **22 ids nas duas** (união distinta = 100). A asserção do teste é por lista, o que está correto; a leitura "122 distintos" é enganosa.

**`dbLogDropped` (medição de 2026-10-24, substitui a faixa 6→41→22):** `/api/health` 08:05:52Z `dbLogDropped=235` subindo para **409** às 08:15:17Z na mesma janela (`windowStartedAt` 07:48:55Z; janelas horárias reiniciam às :48). Nos logs do container (07:55:34–08:09:47Z): 102 linhas `payload descartado: request ja varrido antes do flush (FK-ORFAO)`, soma de órfãos=232, soma de batch=1012 (**~23% dos payloads do período**), zero `error flushing chunk`, zero `error buffering request`, zero `log buffer overflow`. **O descarte atinge SOMENTE o corpo de observabilidade** (linha de `request_payloads`); a linha de métricas em `requests` é preservada e o tráfego proxyado não é afetado (override/cache/429 fluindo no mesmo log). `dbLogErrors` segue 0.


### Investigação "fala e vai fazer e para" (2026-10-22) — URL `muse`, contas Meta

> ⚠️ **ATUALIZADO 2026-10-22 (tarde): a causa raiz do "fala e para" foi FECHADA e o conserto
> foi mergeado e DEPLOYADO em 22/10 (ver "DEPLOY EM PRODUÇÃO"). A seção antiga abaixo (que culpa
> o colapso do pool) está REFUTADA para esse sintoma — não a citar.**

#### CAUSA RAIZ FECHADA (medida ao vivo na API da Meta, 2026-10-22)

O modelo Meta (Muse Spark) entrega o **anúncio de intenção e a chamada de ferramenta no MESMO
turno** (SSE cru: `redacted_thinking` → `text` "Criando a.txt..." → `tool_use` → `stop_reason:
tool_use`). Quando ele **não tem a ferramenta de que precisa**, anuncia o plano e **encerra**:
`stop_reason: end_turn`, blocos `[redacted_thinking, text]`, **zero tool_use** — do lado do
cliente é indistinguível de uma resposta final.

**Discriminador binário, medido (mesma conta, mesmo modelo, mesma tarefa, 20 trials cada):**
| tools disponíveis | resultado |
|---|---|
| `bash` + `write_file` (as necessárias) | **20/20 `tool_use`** |
| só `write_file` (falta a `bash`) | **19/20 `end_turn` sem tool_use** |
| nenhuma tool | **20/20 `end_turn` sem tool_use** |

Texto do bug, reproduzido **via o LB** (grupo `muse`, conta Meta real):
> *"Não consigo fazer isso com as ferramentas que tenho disponíveis aqui. No momento eu só tenho
> a ferramenta de **leitura** de arquivo (`mcp__files__read`) — não tenho ferramenta para
> criar/escrever arquivo."* → `end_turn`, zero tool_use.

**Taxa base: 0/30** na Meta direta e **0/30** via LB (task simples, tool presente) → **o LB não
é o causador, é o vetor**; o que falta é o **guard de retomada**.

**Por que o harness nativo não sofre:** decompilando `~/.local/bin/muse-bin-1.4.11-R6667.1`
(Ghidra 12.1.4 + JDK 21), achei o prompt literal `<commentary-continue>`:
*"Your last message was commentary about what you would do next, and you called no tool, so nothing
was done. If the task is not finished, continue now with the next tool call…"* + a fase
`phase: commentary|final_answer` por output item. O harness usa **Responses API** (tem fase e
`previous_response_id`) e **se auto-cura**. O LB fala **Messages API** (sem fase, sem guard).

**Guard validado ao vivo: 8/8** turnos que pararam voltaram a chamar a tool após re-injetar o
prompt do harness nativo (loop agentico real na API da Meta).

**Contrato Meta medido:** `tool_choice` só aceita `auto` (`none`/`any`/nomeada → 400; `none` → 200
mas o modelo responde texto e encerra sem tool_use) · `parallel_tool_calls` → 400 no Messages ·
`budget_tokens` precisa ser ≥1024 e **< max_tokens** · `thinking.enabled` é aceito mas **não vira
effort** (o effort vem de `output_config.effort`) · `max_tokens` ≤256 → o modelo gasta tudo em
reasoning e devolve `stop_reason: max_tokens` com **só `redacted_thinking`** (assinatura de
truncamento: `out=64 think=62`).

#### PATCH (branch `fix-muse-commentary-guard`, **10 commits, +1983/−25 linhas em 11 arquivos**)

Commits `eb24f33`…`4177e78` (fork point `9f1656b`, zero merges internos). Arquivos:
`backend/src/routes/proxy/commentaryGuard.ts` (novo) + `commentaryGuardStream.ts` (novo) +
`handlers.ts` + `streaming.ts` (+29, `pipeStreamToReply` aceita `extraTransform`) +
`config/env.ts` (+13, `MUSE_COMMENTARY_GUARD=marker|always|off`) + 2 arquivos de teste (28+13).
**Typecheck limpo, suíte completa 2458 passed / 0 falhas** (45 testes novos). Cobre o caminho **não-streaming** e o
**streaming** (o que o Claude Code usa). **Fail-open por construção**: qualquer falha devolve o
stream original intacto; timeout próprio de 45 s na requisição de continuação (o gate de admissão
da Meta limita a 4 em voo e o stream original ainda ocupa um slot). O guard **foi mergeado e
deployado em 2026-10-22** (ver "DEPLOY EM PRODUÇÃO").

**O discriminador — o texto do bug tem DUAS formas** (medido na API real, não inventado):

| o turno PAROU → guard dispara | o turno TERMINOU → guard não dispara |
|---|---|
| *"Não consigo completar… **não tenho ferramenta** de terminal… **Passo 1 -** Executar `ls -la`"* | *"Criando seu arquivo com 'ola'."* |
| *"**Não consegui** concluir… **não tenho** como **ler** arquivos… a única ferramenta é de **escrita**"* | *"Pronto, fiz X."* |
| *"Não consigo completar esse pedido… **não tenho nenhuma ferramenta** para executar comandos"* | *"Concluído — 12 arquivos criados."* |
| *"**Vou fazer** isso em 3 passos… **Passo 1 de 3**"* | *"Relatório gravado em /tmp/relatorio.md."* |

Daí: marcadores de **compromisso futuro** (`vou`, `irei`, `Passo N`, `next step`, `I'll`…) **+**
`INCAPACITY_MARKERS` (**não consigo** / **não consegui** / **não tenho** / **não há** / **não é
possível** / **sem ferramenta** / **impossível** + equivalentes em inglês). Só os **260 primeiros
caracteres**. **10/10** nos textos reais capturados.

**A Messages API não expõe `phase`** — confirmado nos headers e no corpo (só `content, id, model,
role, stop_reason, stop_sequence, type, usage`). A fase `commentary|final_answer` só existe na
Responses API, que o LB não fala → a heurística de texto é a **única** opção nesse dialeto.

**O raciocínio da CONTINUAÇÃO é registrado no mapa de donos** (`collectReasoningMaterial` no
transform + `recordReasoningOwners` no handler). Sem isso o blob ficaria **órfão** e o heurístico
de envelope (cego entre duas contas Meta) o deixaria passar para outra conta — a causa do 400
crônico.

**E2E medido com o corpo exato que o patch monta, contra a Meta real:**
`T1: end_turn, tool_use=0` ("Passo 1 - … Não consigo executar esse comando…") → guard dispara →
`T2: stop_reason=tool_use, TOOL: Write` → **desbloqueou**.

**🔴 A REVISÃO ADVERSARIAL ACHOU 3 BLOQUEADORES — TODOS CORRIGIDOS E REVALIDADOS:**
1. **O guard de streaming nunca disparava no wire real** — o transform re-parsava o frame cru
   com `JSON.parse(raw.replace(/^data:\s*/,''))`, mas o frame real é
   `event: message_start\ndata: {...}`. O parse falhava e o guard era **no-op em produção**
   (`guardFired: 0`, output byte-idêntico). → `parseSseDataLine()` parseia a LINHA `data:`.
2. **Os frames da continuação eram invisíveis** — re-emitidos sem a linha `event:`, e o SDK da
   Anthropic só entrega o frame cujo nome de evento bate. → `formatSseFrame()`.
3. **Sintaxe SSE não-conforme** — 2 message_stop, 2 message_delta, message_delta depois do
   message_stop, sem `usage`. → **um** message_delta (com usage) e **um** message_stop, na ordem.

**Por que o teste original não pegou:** o helper `sse()` do teste produzia `data:`-only — um
formato que **não existe** no wire de produção. Agora os testes usam o formato real, e o E2E roda
com **bytes capturados da Meta**:
```
guardFired: 1   ← antes era 0
sequência: message_start → content_block_* → message_delta → message_stop  (1 de cada)
tool_use VISÍVEL ao cliente: Write idx=2
frames SEM linha event:: 0   ← o SDK vê todos
```

**Escopo por provider:** `commentaryGuardMode(provider, mode)` — em `marker` (default) o guard
só vale para **meta**; `always` é opt-in explícito e vale para todos. O falso-positivo do
discriminador (12% com os marcadores originais, 35% com o conjunto largo, em 26 respostas "já
terminei") fica restrito ao provider onde o sintoma foi medido. `MUSE_COMMENTARY_GUARD` **não
existe na env de prod** (24/10) → vale o default `marker`.

**Deadline próprio** (`withDeadline`, 60 s): o timeout do axios **não cobre** a espera do gate
de admissão (o interceptor segura a requisição antes do axios aplicar o timeout) — medido: 90 s
de espera com timeout de 45 s.

**✅ MIGRACAO DO PROVIDER `meta` PARA /v1/responses (commit `6d594c6`) — o sinal EXATO:**
O provider `meta` agora fala **Responses API** (`https://api.meta.ai/v1/responses`), convertendo o
corpo Anthropic do cliente com `anthropicToResponses(body, { assistantPhases: true })` e voltando
o stream por `createResponsesToAnthropicStreamTransform`. O dialeto Messages API **não expõe** a
fase `commentary|final_answer`; o Responses expõe — e ela marca **exatamente** o texto de anúncio.
Essa migração **já está em produção** (ancestral do `8bd1436`).

**Prova ao vivo (Meta real, conta do dono):**
```
type=reasoning      phase=None
type=message        phase=commentary   "Vou criar o arquivo solicitado."   ← O ANÚNCIO
type=function_call  phase=None         write_file                        ← a tool
```
Replicado do provider `opencode` (que **já** fazia isso, com a medição registrada no código:
*"turno de produção de 450k tokens que o Muse respondeu sem agir parou em **7 de 20** com `high`;
com `max` e o histórico no formato dele raciocinou e agiu em **10 de 10**"*). Inclui:
`outputsRightAfterCalls` (a Meta exige o `function_call_output` logo depois do `function_call`),
`museSparkEffort` (**o effort NÃO é cortado para `high`** — o `resolveReasoningEffort` compartilhado
corta `xhigh`/`max`), sem `tool_choice` quando não há tools, e `reasoning:{effort,summary:'auto'}`.

**✅ A fase também sobrevive até o cliente (commit `4177e78`):** o `response.output_item.added` com
`item.type === 'message'` traz a phase, e o `startText()` do `responsesStreamTransform` nasce o
bloco **marcado** (`content_block: {type:'text', text:'', phase:'commentary'}`). O guard lê a
marca: **`phase === 'commentary'` dispara sem depender do texto**; **`phase === 'final_answer'`
NUNCA dispara**, mesmo com texto de anúncio. Isso substitui o marker textual (recall 4–10%) e o
estrutural (48,5%, mas com FP em turnos legítimos) pelo discriminador **exato**.

**🔴 O campo `phase` NÃO é inofensivo — REGRESSÃO EM PRODUÇÃO (medida em 2026-10-24):**
A afirmação de que "o bloco aceita campos extras e o Claude Code os ignora" está **ERRADA** para
upstreams estritos. Entre 06:15:47 e 08:10:56Z de 24/10 o upstream Anthropic devolveu **139×**
`400 messages.N.content.N.text.phase: Extra inputs are not permitted` (139 `request_id` únicos,
`invalid_request_error`, chaves `oauth_max` servindo `claude-opus-5-5`). O `phase` é emitido em
`responsesStreamTransform.ts:64` e `responsesToAnthropic.ts:92` e **não há nenhum delete/strip**
em `backend/src` (o `sanitizeMessages` faz shallow copy e preserva campos extras por design).
Causa provável: o cliente reenvia o bloco marcado no histórico e o upstream rejeita — com isso
essas chaves queimam failover. **Correção pendente.**

**Prova final do fluxo novo (ao vivo):** o SSE de `/v1/responses` emite
`output_item.added type=message phase=commentary` — a fase chega pelo stream. E o guard decide:
caso real **DISPARA** (`phase=='commentary'`), resposta final legítima **NÃO** (`phase=='final_answer'`),
turno normal **NÃO** (`stop_reason != 'end_turn'`).

**O que a fase NÃO conserta:** ela dá o sinal exato de *que* o modelo parou, mas não de *por quê* —
não conserta o caso em que a tool que o modelo quer está `defer_loading` e não foi carregada
(57/69 tools na conversa real). O guard é **mitigação**, não correção da causa. (Em `cb907f1` o
`grep -c phase src/converters/responsesToAnthropic.ts` era **0**; em `8bd1436` a contagem é **2**
— linhas 24 e 92 — porque o `d75a69d` passou a preservar a phase no caminho não-streaming.)

**🔴 A LENTE DE "GATILHO" (analisou o corpus real de prod: 599 respostas, 120 requests) achou
mais 3 BLOQUEADORES no gatilho — todos corrigidos no commit `cef419a`:**
1. **Recall de 4–10%**: o marker de texto **não pegava o caso real** (*"Deploy do Termo publicado e
   no ar. **Fazendo** o QA visual agora."*) — e **eu mesmo tinha removido** `\bcome[çc]ando\b` no
   commit `178e69a`. → classe **gerúndio/presente-progressivo** restaurada.
2. **FP perigoso**: a resposta final legítima era descartada e substituída por uma `tool_use` que o
   cliente executava (reproduziu `rm -rf` chegando ao cliente). → `MAX_ANNOUNCEMENT_CHARS = 400`:
   resposta substancial nunca é tratada como anúncio.
3. **Furo de 42%**: o guard só estava no caminho primário — **42% dos turnos degradados vieram por
   retry/failover** e nunca passavam por ele. → funções reutilizáveis instaladas em **todos** os
   pontos (streaming primário, OAuth-refresh, cross-key, retry de erro; não-streaming primário +
   fallback).

**O discriminador que a lente mediu como melhor é o ESTRUTURAL** — "a última mensagem do user é um
`tool_result`" (o loop agêntico estava ativo e o modelo parou sem chamar a próxima tool): cobre
**48,5%** dos turnos degradados contra 4,6% do marker de texto. Era a condição do sketch original,
que eu tinha abandonado. Agora é o gatilho **principal**, com o marker como complemento.

**⚠️ A HIPÓTESE CENTRAL ESTÁ FALSADA PARA O CASO REAL:** em **100%** dos requests prod as tools
estavam presentes (mediana 109). O modelo estava no meio do loop agêntico **com a ferramenta à
disposição** — e **57 das 69 tools** da conversa real são `defer_loading:true` (não estão no
contexto até o ToolSearch). O guard **não conserta** isso (replay do mesmo body não re-dispensa
ToolSearch) → **é mitigação, não correção da causa**.

**Em aberto (achados da revisão, não corrigidos):** a contabilidade no streaming sub-conta (o
`collector` termina antes da continuação); a continuação não cria linha na tabela `requests`;
um 429 na continuação (invisível para o cliente) pode colocar a conta Meta em `limited`; o
`controlledUpstream` sobrescreve `_sanitizedBody` com o corpo do guard; e a 2ª resposta não
deixa rastro auditável.

**🔴 A LENTE DE PROTOCOLO (rodou o SDK REAL `@anthropic-ai/sdk` 1.1.0 e o validador do Claude
Code 2.1.308) achou mais 3 OBRIGATÓRIOS — todos corrigidos:**
1. O `message_delta` final podia sair **sem `usage`** → o cliente quebrava com
   `AnthropicError: Cannot read properties of undefined (reading 'output_tokens')` — o oposto do
   fail-open. → **usage cumulativa** das duas respostas, sempre presente.
2. Um frame `event: error` da continuação **era repassado ao cliente** (o turno morria com o erro
   da Meta). → fail-open: o frame de erro não é repassado.
3. O guard segurava o stream do cliente **em silêncio por até 60 s** — e o **Claude Code 2.1.308
   tem watchdog de stall de 20 s** que **ABORTA o stream**. → `event: ping` a cada 10 s durante a
   espera (é o que a API da Anthropic faz).
4. (recomendado) O streaming não tinha a regra "a continuação precisa ter progrediu" que o
   não-streaming tinha. → se a continuação também parar, a **resposta original** é devolvida.

**Formato do wire real da Meta (medido):** o `tool_use` chega como
`{"delta":{"partial_json":"{...}","type":"input_json_delta"}}` — o texto está em
**`delta.partial_json`** (formato novo). Um teste sintético no formato antigo
(`delta.input_json_delta`) quebra o `partialParse` do SDK com "Unexpected end of JSON input" —
**falso negativo**. O patch re-emite o frame exatamente como veio, então preserva o
`partial_json`.

**E2E contra o SDK real** (saída do transform → `messages.stream()` com `fetch` mock): os 4
cenários passam — continuação OK (`tool_use` + tool_use visível), continuação truncada,
continuação **com erro** (fail-open, erro não repassado) e continuação que **também para**
(fail-open, resposta original).

**Em aberto:** o texto da continuação NÃO é descartado (o cliente vê 2 blocos de texto — UX); e
a mesclagem pode deixar um bloco de raciocínio no meio do content (especulativo, precisa de 1
request real na Meta).

**Alternativa client-side (complementar):** o Claude Code tem o hook `Stop` com
`decision:"block"` + `reason`, que **impede o turno de parar** (máx. 3 continuações). O harness
nativo da Meta usa o mesmo mecanismo (`stop_hook_continuations` no binário). Cobre só quem
configurar; o guard no proxy cobre todos os clientes, inclusive APIs cruas.

#### ✅ DEPLOY EM PRODUÇÃO (2026-10-22) — hoje superado pelo `8bd1436` de 23/10
Em 22/10 a main ficou em **`d75a69d`** e o `/api/health` reportava `commit: d75a69d`. O merge
`dc5ff80` (22:38Z) trouxe os **10 commits** do branch `fix-muse-commentary-guard`; depois dele
vieram 3 fixes na mesma linha do guard/meta: `684ddfe` (`responseFormat`+`transformResponse`),
`1a5b7ee` (`stream:true` no corpo) e `d75a69d` (`phase` no não-streaming) — **14 commits** no
escopo completo guard+meta até `d75a69d` (13 sem contar o merge). **Desde 2026-10-23 23:47Z a
produção é `8bd1436`**, depois de mais 3 deploys (`d9a8d5e`, `81875c5`, `8bd1436`).

**Duas armadilhas do /v1/responses que quebraram prod (as duas medidas ao vivo):**
1. **A Meta só devolve SSE se o CORPO tiver `stream: true`.** O header
   `Accept: text/event-stream` não basta — ela responde 200 com `application/json` e o
   JSON completo. O `readFirstFrame` lia isso como stream SSE e disparava failover com
   **"upstream fechou o stream sem mandar nada" (502)** — 8 FIRST-CHUNK em 4 min.
2. **A `phase` só chegava no streaming.** O `responsesToAnthropic` (não-streaming)
   montava o bloco text sem a phase, e o guard não-streaming depende dela.

**Validação em produção (URL `/muse`, conta Meta real, retrato de 2026-10-22):** `stop_reason`/`usage`
no dialeto Anthropic; **6/6** requests com `phase=['commentary']` + tool chamada + `stop=tool_use`;
streaming com `content_block_start(text phase=commentary)`; **guard disparou** no log;
**zero FIRST-CHUNK, zero API Error**, com o tráfego real da sessão do Claude Code passando.

**Entregável (caminho e URL corrigidos em 24/10):** os relatórios existem como
`diagnostico-v2.html` (43.485 bytes) e `diagnostico.html` (32.317 bytes) em
`/workspace/.sandbox/entrega/` da SB `load-balance-audit` — **fora do git**. O caminho
`medicao/muse-reasoning/` **nunca existiu** (nem no filesystem nem no histórico do repo). A URL
`https://sb-load-balance-audit-p7788.mp.serendiped.com/diagnostico-v2.html` responde **503**
("Nothing is listening on port 7788 yet") — nada ouve na porta 7788; as ports vivas da SB são
8802/8803/8805. Para reativar a entrega é preciso subir um servidor estático nas 7788.
· memória `muse-fala-e-para-causa` · `muse-harness-commentary-phase`.

#### (seção anterior — o 400 e o pool; o 400 continua valendo, o pool NÃO explica o "fala e para")
**Veredito de 3 lentes adversariais + síntese (confiança média). Duas causas, não uma.**

**CAUSA PRIMÁRIA (operação): colapso do pool de contas.** O grupo
`cmv11hpmh001tp807zubedhhm` (strategy=`priority`) tem 3 contas Meta e **1 efetiva**:
`9464572f` (corte 100%, 429, quota reseta 26/10), `e7ccfa9a` (corte 100%, **402** fatura,
2804 erros), `f47f296e` (a única viva, e a de **pior** prioridade −5). O announce-and-stop
varia **com a conta**, mesmo modelo: e7ccfa9a 3,2% → 9464572f 6,8% → f47f296e **22,2%**.
Mesma sessão (7cdb6bfe), mesma frota, raciocínio intacto, **zero 400**: end_turn 14,6% → 21,1%.

**AGRAVANTE 1 (código): TTL de 24 h do registro de dono.** `REASONING_OWNER_TTL_SEC`
(env.ts:80, default 86400) **não existe** no env de prod (reconfirmado em 24/10). Conversas
agentic duram 29–82 h. Expirado → sanitizador cai no heurístico `/^Q-Pa/` (sanitizer.ts:43),
cego entre contas Meta → 400 `reasoning encrypted_content was not issued to this caller`.
**Prova do gatilho**: 361 requests da f47f296e entre a troca (12:11) e a 1ª recusa (18:10) com
**ZERO recusas**; os blobs que dispararam o 400 expiraram **38 h antes** dele.
→ **a troca de conta é condição necessária, não o gatilho**.

**AGRAVANTE 2 (código): o retry arranca todo o raciocínio.** `markReasoningRejection`
(handlers.ts:100-112) → `_stripEncryptedReasoning` → `preserveThinkingFor`
(headers.ts:176-179) força `false` **para todos os providers** → body re-sanitizado
{thinking:79, redacted:37}→{0,0}, tool_use preservado (125/125). Efeito: resposta curta
(end_turn & out≤60) 2,2%→16,0%, p50_out 264→116.

**Números (dependem da janela de log):** 176 recusas / 3144 min / 60 000 linhas (não
92/135/4001); 1934 MODEL-OVERRIDE (não 133); payload da request que falhou 491/263/228.
**ZERO linhas com responseStatus=400 na tabela requests** — o 400 é sempre interno.

**Correções por custo:** (1) fail-safe no sanitizador — descartar Q-Pa sem dono para `meta`
quando o mapa carregou (baixo); (2) TTL 24 h→7 d no env do serviço (muito baixo);
(3) preservar o raciocínio da própria conta no retry (médio); (4) **rotear para a chave que
emitiu foi avaliada e rejeitada** (quando o TTL expira a informação já morreu; a emissora
está fora); (5) restaurar o pool de contas (operação).

**Lacunas:** falta o A/B decisivo porque o proxy **não registra o motivo do retry** (só o
contador) — lacuna de instrumentação; "conta vs tier vs device" não testado contra a API
da Meta; SSE cru não observado; o sintoma aparece **também** em openrouter e nui com zero
recusas — é mais amplo que a causa do LB.

Entregável: `medicao/muse-reasoning/diagnostico.html` · memória `lb-muse-reasoning-cifrado`.

## 2. Regras cruzadas com Conta Nomad

Conta Nomad é a fonte única de organizações, membros e contratos:
- Contrato cancelado / empresa deletada → chaves da empresa suspensas em todos os apps. Re-contrato → chaves voltam.
- Membro sai → só as chaves pessoais dele são revogadas.
- Chaves admin do AgentPack são da empresa, não de quem criou.
- Resumo: apenas um resync completo disparado por admin da Nomad (`POST /api/platform/organizations/:orgId/apps/:appId/provisioning/resync`) retoma. `app_access.granted` NÃO retoma sozinho.

## 3. Limites de uso de plano (screen `/app/usage-limits`, ADMIN, deployado 2026-10-14)

Claude, Codex, MiniMax e Muse: janelas de 5h e semanal, corte default 95% (ajustável por chave em `ApiKey.usageCutoffPct`).
- Claude/Codex: uso vem nos headers de cada resposta upstream → atualização por minuto.
- MiniMax (`/v1/token_plan/remains`) e Muse (`/muse-code/key`): nada nos headers → sonda Redis a cada 5 min e após 429.
- Produto: `GET /api/keys/usage` (org-scoped), `GET /api/platform/keys/usage` (404 se não platform admin). Corte editável via `PUT /api/keys/:id`.

## 4. Segredos e credenciais — pendências CRÍTICAS

1. **`loadbalance-prod-postgres` credencial VAZADA** (2026-10-12): connection string completa (host, porta, usuário, senha 40-hex) impressa em tool output durante auditoria do hedge/rating. Persistida no LB (`request_payloads`). **O dono deve rotacionar.** *(não verificado em 24/10 — o painel não expõe `updatedAt` da `DATABASE_URL`, só `createdAt` 2026-10-03.)* SB `fiscal-tests` também tem senha HML em texto claro em `/workspace/tests/run.js`. Rotar em ordem: (1) senha HML do `auditoria`; (2) `loadbalance-prod-postgres`.
2. **Chaves em texto claro no LB** (2026-10-09): boot log "[SECRETS] 98 linha(s) de ApiKey com segredo cifrado" enquanto grupos únicos têm 646 chaves *(não verificado em 24/10 — o boot do container atual, 2026-10-23 23:48:52Z, está fora do trecho de log legível; 25.000 linhas cobrem só 111 min)*. Scripts de importação deixados em SB `/tmp` fazem `INSERT INTO api_keys` sem criptografia → lotes (NVIDIA, OpenRouter "NNN - Open Router", hunter) provavelmente em texto claro em repouso. Fix: `npm run secrets:encrypt-backfill` (dry-run, depois sem) com `KEY_ENCRYPTION_KEY` da imagem prod. Só com go do dono (escrita em prod). Novos lotes só por `backend/scripts/import-keys-lote.ts`.

## 5. Sweeps de chave mortos — já executados (2026-10-09/10)

| Provedor | Total testado | Mortos deletados | Restou |
|---|---|---|---|
| Anthropic (org fiscaliza) | 262 api_key | 262 (todos mortos, 0 usado) | oauth_max 1 |
| OpenAI `service` (sk-) | 529 | 529 (todos 401) | 0 |
| Google Gemini (AIza…) | 649 | 649 (todos inativos/vazados) | 0 |
| OpenRouter | 4.311 plaintext | 4.225 deletados; 84 cifrados mantidos | 84 cifrados + 86 plaintext que autenticaram |

Regra de ouro dos sweeps: chave que nunca teve sucesso via LB = deletável; chave com sucesso na `requests` = mantida. `sk-admin` chaves testam na Admin API (`/v1/organizations/api_keys`), não em `/v1/messages`.

## 6. Hedged requests / race mode (slices 1–6, deployado como `bad2c4f`)

- Slice 4 (simultânea, N chaves de t=0) deployado 2026-10-12 ~06:10 como `98d7770`, depois `bad2c4f` com `first-chunk-before-200` (10:34 UTC).
- **O modo nunca dispara no grupo NVIDIA:** `decideHedge` bloqueia toda vez que a requisição tem tools (4/4 Motor turns). `distinctUrls = 1` no NVIDIA também trava. Pra ver o shadow funcionar, enviar mensagem SEM tool definitions via config de chat simples (`ap`).
- NVIDIA: p50 15,8s foi incidente de 10-09 (burst em 1 URL); em dia limpo (10-10) p50 era 4,7s. Não usar 15,7s como baseline.
- Rating `ttftMs` aquecido: 2484/2484 das requisições da última hora têm, 2322 requisições em 144 chaves, zero chaves frias escolhidas.

## 7. Tamanho de arquivos do front (gate max-lines, só encolhe)

- `SIZE_EXCEPTIONS` no `frontend/eslint.config.js` espelhado em `frontend/src/test/sizeLimitsBaseline.json` — `sizeLimits.test.ts` falha se divergirem.
- `src/types/api.ts` está em 621 (no teto). Novos tipos compartilhados vão no barrel `src/types/index.ts` (sem teto), não em `api.ts`.
- Prettier: `@nomad/ui/prettier`, printWidth 100, sem ponto e vírgula, aspas simples.

## 8. Traps da SB `load-balance-audit`
(SB `load-balance-audit` = sandbox de validação do LB: container isolado com o clone do repositório `load-balance` em `/workspace`, usada para medir produção, rodar a suíte e hospedar entregáveis.)

- Node default 22; o package.json exige >=24.15. Node 24 e Playwright Chromium em `/workspace/.sbcache` (git-ignorado via `.git/info/exclude`): `export PATH=/workspace/.sbcache/node24/bin:$PATH PLAYWRIGHT_BROWSERS_PATH=/workspace/.sbcache/ms-playwright`.
- `test:it` precisa Postgres 15 + Redis locais, `TENANCY_IT_DATABASE_URL` e `TENANCY_IT_REDIS_URL` com senha `it-local-sb`.
- `test/zzResidueCleanup.test.ts` é teste real do repo: nomear probes diferentes, deletar por caminho exato; `rm test/zz*` já deletou esse teste uma vez (restaurado via git checkout).
- A11y (Playwright Chromium) precisa `npx playwright install-deps chromium` após cada restart da SB (bibliotecas apt somem).
- Vitest `--maxWorkers=6` + eslint paralelo já derrubou a SB (gVisor, `/root` e apt somem no restart). Use `--maxWorkers=4`, um passo pesado por vez.
- **Branches de trabalho não mergeadas (estado em 24/10):** `fix/upstream-503-failover` (`63dfac3`, 1 à frente e 67 atrás da main), `wt-guard-r3` (`ced557b`, 4 à frente), `wt-guard-r2-funcao` e `wt-fusao-dialeto`. O commit `dfdb3bf` (fix da rota google v1beta, pai `8bd1436`) existe **só** nesta SB, sem branch nem ref — risco de perda em `gc`.

**Memórias relacionadas:** `lb-deploy`, `lb-frontend-size-ceilings`, `lb-prod-key-scale`, `lb-plaintext-keys`, `lb-anthropic-key-sweep`, `lb-bulk-reactivate`, `lb-client-keys`, `lb-plan-usage-limits`, `lb-message-level-params`, `lb-race-mode`, `lb-prod-db-credential-leaked`, `lb-ui-perf-harness`, `lb-sb-gates`, `lb-serves-this-agent`, `lb-frota-nvidia-morre-em-massa`, `lb-openai-compat-nao-e-uniforme`, `lb-guard-call-sites-nao-exportados`, `opencode-zen-vs-go`, `opencode-zen-gate-e-bases`, `opencode-zen-wire-real`, `conta-contract-lifecycle`, `conta-resync-resume`, **`lb-muse-reasoning-cifrado`**.