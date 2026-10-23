# HANDOVER — Projeto Load Balance (LB)

> Status: source of truth deste projeto. Cada seção tem o arquivo de memória de origem para conferência.

---

## 1. Estado de produção (2026-10-20)

| Serviço | ID | URL | Commit | Estado |
|---|---|---|---|---|
| loadbalance-backend-ws | VAKbDdZhzG7S7S-Zt52Tm | lb-api.mp.serendiped.com | cb907f1 | Up, autoDeploy true |
| loadbalance-frontend-ws | E2vxruTSJ42G_Qe_6lJHh | loadbalance.mp.serendiped.com | cb907f1 | Up, autoDeploy true |
| loadbalance-prod-postgres | cDNq9BNTdbEU0UlgUwIul | :25441 | — | Up (credencial VAZADA, ver §4) |

**Regra de deploy:** push para main NÃO dispara deploy; o painel marca `pendingUpdate`. Usar `deployments_trigger` no lado que mudou e confirmar pelo hash do bundle. Ordem: backend primeiro, depois frontend.

**Último deploy confirmado:** `cb907f1` (backend e frontend, 2026-10-20). Backend `X3WixBl7hxMT3WO2RsSzm`; frontend `fuY04XaWdnd05Q577T0ad`. `/api/health` retorna `commit=cb907f1`, db ok, redis ok. Prova do bundle do fe: `<meta name="build-commit">` = cb907f1; `index-LFW3lcZD.js`; marcador de feature `space-bunny-free` presente (0 no bundle antigo).

### Cadeia de deploys do OpenCode (2026-10-19/20)
`83ac46a` → `4399081` → `13b6104` (Zen-free directing com 400 PT-BR) → `fe3c26f` (Go completo) → `bba9896` (Zen pairing) → `0f0b731` (gemini Go na URL google-native direta + privacy 400 PT-BR + trava de protocolo) → `cb907f1` (cobertura de protocolo dos **122 ids** dos dois catálogos: 37 Go + 85 Zen, 249 casos, protocolo + URL fim a fim nas bases Go e Zen).

### Diagnóstico dos 502 "upstream fechou o stream sem mandar nada" (2026-10-19)
Dois provedores diferentes (o `provider` da CHAVE decide, nunca o modelo):
- **Caso 1 — `gpt-6.1-sol` / chave "GPT Myke"** = provider `openai-codex` (`chatgpt.com/backend-api/codex`, OAuth). O Codex devolveu stream vazia em ~900ms. Chave com **7 requests, 7 falhas, 0 sucesso** desde 15/10. Saiu do grupo pedro em 19:15. Precisa de reconnect do OAuth.
- **Caso 2 — `muse-spark-1.3-contributor` / "OpenCode 00 (copy)"** = provider `opencode`, base Go, **pareamento correto** (o modelo é do Go). As "2 tentativas" foram: primária OpenCode-Go (stream vazia, ~2,5s) + **fallover que cruzou de provedor** e caiu na chave do Codex → segunda stream vazia → grupo esgotado.
- **Furos do LB (medidos no código):** (a) o failover universal não filtra provedor (queima chaves entre provedores); (b) stream vazia repetida na mesma chave é classificada `temporary` fixo, então a chave segue ativa mesmo com 7/7 falhas.
- Método do probe: `resolveProvider(targetKey.provider, targetKey.authType, baseUrl)` (handlers.ts:1878) — match exato do provider da chave; o modelo nunca escolhe provedor.

### Prova do sweep de 120 modelos (2026-10-19)
"oi" com max_tokens 1 nos 120 ids: **28 OK (Go) · 9 400 ModelProtocolUnsupported (Go, roteamento certo — espelho de protocolo, sem bug) · 72 402 insufficient funds (Zen pago) · 11 403 FreeTierError (Zen free, só no app oficial)**. Os 9 do Go saem no protocolo certo (responses/messages/gemini por prefixo); o sweep "oi" usava chat/completions para todos, por isso o 400.

### Validação adversarial do deploy cb907f1 (2026-10-21) — 5 agentes, 2 revisores adversariais
**[PROVADO]** `cb907f1` nos dois serviços (pendingUpdate null). `/api/health` 200, `commit=cb907f1`, db/redis ok, `dbLogErrors=0`. Suíte de protocolo `backend/test/opencodeGoProtocolFull1018.test.ts` (303 linhas, único arquivo do commit): **249/249 passam em 2,35 s**, cobrindo 37 ids Go + 85 ids Zen lidos do fonte com igualdade asserida nos dois sentidos — **mutante próprio** (`jev-`→`chat`) matou 4 casos, revertido voltou a 249/249 (verde real). Bundle `index-LFW3lcZD.js` sha256 `7b569887…` byte-idêntico ao local; marcador `space-bunny-free` presente no servido e ausente no deploy anterior `43990815da45`.

**[REFUTADO — não afirmar]** "Failover cruzando provedor foi observado ao vivo". O revisor reconstruiu 19 sequências de failover: **zero travessia de provedor**. 61 chaves de fallback = 60 `(openrouter)` + 1 `(nvidia)`; as 11/11 primárias têm provider provado. O incidente de 20/10 15:10 foi **mesmo provedor** (openrouter), não cruzamento. O defeito de **código** é real (abaixo), mas **não há evidência empírica de travessia**.
**[REFUTADO]** "7 requests / 7 falhas / 0 sucesso na chave do Codex" — a string `codex` aparece **0 vezes** em 14.266 linhas de log; nenhuma chave tem 7 falhas e 0 sucesso. O número veio da sessão anterior, não foi reconfirmado.
**[NÃO PROVADO]** A string literal "upstream fechou o stream sem mandar nada" apareceu 0 vezes nas 2.000 últimas linhas; a variante irmã `[FIRST-CHUNK] timeout de primeiro chunk (15000ms)` apareceu. O branch que classifica a stream vazia está ativo.

**Achados novos medidos (2026-10-21):**
- **Risco 1 (ATIVO) — stream vazia classificada `temporary`:** `classifyUpstreamError(200,'')` → `status=502, category=temporary, shouldCooldown=true`; `cooldownKey` tem default **60.000 ms** (`loadBalancer.ts:379`). Não existe contador de stream vazia em `src/` (grep vazio); `increment429`/strikes só contam 429 e `recordKeyError` só incrementa `errorCount` sem ninguém ler. Padrão a copiar: circuit breaker de OAuth (`loadBalancer.ts:477-507`, `consecutiveFailures` + `backoffSec`).
- **Risco 2 — failover sem escopo de provedor:** `handlers.ts:537-541` (streaming) e `1069-1072` (non-stream) montam o snapshot sem filtro de provider; consumo em `603`/`1121` (`retryKeysSnapshot.shift()`) também não checa. **A primitiva certa já existe e não tem caller de produção:** `getNextKeyExcludingProvider` (`pool.ts:593-618`, filtro `k.provider !== excludeProvider` em `:604`), exposta em `loadBalancer.ts:809` — grep só acha 4 arquivos de teste.
- **Risco 3 — um request queima ~89 chaves** antes de desistir (~1,4 s cada ⇒ ~2 min até o erro final). Medido ao vivo em 21/10 06:40: `attempt 70`…`attempt 89` e depois `All keys exhausted for Provider transient 502 (stream), giving up`.
- **Risco 4 — 406 avisos `RATE_LIMIT … tpm … Proceeding anyway`** na janela: o limite de token não barra nada.

### Tempestade 502 medida por mim (2026-10-21 06:21–06:54Z) — o mecanismo, fechado
Segmentando o log de prod por request (delimitador = `All keys exhausted`):
- **8 requests** esgotaram o pool na janela. Cada um: **89 tentativas**, **59–60 chaves DISTINTAS**, **100% `(openrouter)`**, e **2–3 chaves re-selecionadas** no fim (`cmv07s25` 22×, `cmv07s24` 9–10×).
- Total na janela: **721 `[FIRST-CHUNK]`**, **713 seleções de chave**, **60 chaves distintas**, **8× `All keys exhausted`**, **9× `API Error: 502`**.
- **O modelo é `minimax/minimax-m3.1-flash:free` via openrouter em todas** — não é mistura de grupo nem de provedor. Depois da rajada o mesmo modelo passou a responder (com a chave `cmv07s24` e `cc4wrgo8`), então **o provedor se recuperou** — a rajada foi do upstream, não de chave ruim isolada.

**Mecanismo (lido no código, `cb907f1`):**
1. O snapshot é montado em `handlers.ts:538-541` (`getGroupKeysSnapshot`/`getUnlockedKeysSnapshot`), **sem filtro de cooldown** — `getUnlockedKeysSnapshot` (`pool.ts:232-261`) só filtra `active` e `groupId: null`; o cooldown é aplicado **dentro** de `getNextKeyWithDetails` (`pool.ts:496`), ou seja, só na escolha por grupo, **não** no snapshot.
2. `triedKeyIds` (`:497`, `:611-614`) impede repetir **id**, mas o `continue` do `:612` **consome a tentativa** (`attempt++`) sem testar a chave nova — daí `attempt` chegar a 89 com 60 chaves.
3. `MAX_FAILOVER_ATTEMPTS = retryKeysSnapshot.length + 1` (`:561`) — o teto é o **tamanho do snapshot**, não um número fixo (mudança B-A7-005, deliberada: "tenta TODAS antes de desistir").
4. **A pista decisiva:** o log tem **três identidades diferentes** por iteração — `Provider transient 502 for key X` = a chave que **atende** (`targetKey`), `keyPolicy keyIdPrefix` = a chave **cooldownada** (a que falhou, `fallbackKey` do `[FIRST-CHUNK]`), e `Retrying stream with key: Y` = a chave **realmente tentada**. `fallbackKey` vem de `getNextKeyWithDetails({ apiKeyId: nextKey.id })` (`handlers.ts:620-623`), que **ignora `apiKeyId` quando há `groupId`** (`pool.ts:487-508`): ele **re-escolhe do grupo** e devolve uma chave diferente da pedida. Por isso o `shift()` consome `nextKey` mas o dial real usa outra — e as repetições (`cmv07s25` 22×) são o grupo re-servindo a mesma chave.
5. **Natureza do defeito:** não é "falta de filtro de provedor" (embora isso também esteja errado) — é que **o snapshot e a escolha real divergem**: o `shift()` consome uma chave do snapshot e o dial real usa outra.

- **Achado colateral:** o painel declara `VITE_API_URL=https://lb-api.mp.serendiped.com` no `builderConfig`, mas a env do serviço está **vazia** e o build embute `VITE_API_URL=''`. Funciona (path relativo é o correto em prod, `frontend/src/config/env.ts:39-48`) — mesma família do `GIT_SHA=unknown` documentado no próprio Dockerfile.
- **Achado colateral 2:** existe o caminho `retrySameKeyFirst` (`markReasoningRejection`, `handlers.ts:449/1002`) que reinsere a própria chave na frente da fila (`:548/1079`) — em 20/10 07:58 a primária `cmv06xy3` (nvidia) falhou e o fallback foi a **mesma** chave, com sucesso.
- `dbLogDropped` (FK-ORFAO) oscila (6 → 41 → 22) sem `dbLogErrors` — não degrada o serviço.
- Os **122 ids** são 37 Go + 85 Zen **somando as duas listas**; há **22 ids nas duas** (união distinta = 100). A asserção do teste é por lista, o que está correto; a leitura "122 distintos" é enganosa.


### Investigação "fala e vai fazer e para" (2026-10-22) — URL `muse`, contas Meta

> ⚠️ **ATUALIZADO 2026-10-22 (tarde): a causa raiz do "fala e para" foi FECHADA e o conserto
> está ESCRITO. A seção antiga abaixo (que culpa o colapso do pool) está REFUTADA para esse
> sintoma — não a citar. Ver "CAUSA RAIZ FECHADA" e "PATCH" logo abaixo.**

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
(Ghidra 12.1.4 + JDK 21, instalados nesta sessão), achei o prompt literal `<commentary-continue>`:
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

#### PATCH (branch `fix-muse-commentary-guard` na SB `load-balance-audit`, **12 commits, +1983 linhas**)

`backend/src/routes/proxy/commentaryGuard.ts` (novo) + `commentaryGuardStream.ts` (novo) +
`handlers.ts` + `streaming.ts` (+29, `pipeStreamToReply` aceita `extraTransform`) +
`config/env.ts` (+13, `MUSE_COMMENTARY_GUARD=marker|always|off`) + 2 arquivos de teste (28+13).
**Typecheck limpo, suíte completa 2458 passed / 0 falhas** (45 testes novos). Cobre o caminho **não-streaming** e o
**streaming** (o que o Claude Code usa). **Fail-open por construção**: qualquer falha devolve o
stream original intacto; timeout próprio de 45 s na requisição de continuação (o gate de admissão
da Meta limita a 4 em voo e o stream original ainda ocupa um slot). Revisão adversarial em
andamento. `main` **intacto** — merge e deploy dependem do go do dono.

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
terminei") fica restrito ao provider onde o sintoma foi medido.

**Deadline próprio** (`withDeadline`, 60 s): o timeout do axios **não cobre** a espera do gate
de admissão (o interceptor segura a requisição antes do axios aplicar o timeout) — medido: 90 s
de espera com timeout de 45 s.

**✅ MIGRACAO DO PROVIDER `meta` PARA /v1/responses (commit `6d594c6`) — o sinal EXATO:**
O provider `meta` agora fala **Responses API** (`https://api.meta.ai/v1/responses`), convertendo o
corpo Anthropic do cliente com `anthropicToResponses(body, { assistantPhases: true })` e voltando
o stream por `createResponsesToAnthropicStreamTransform`. O dialeto Messages API **não expõe** a
fase `commentary|final_answer`; o Responses expõe — e ela marca **exatamente** o texto de anúncio.

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
bloco **marcado** (`content_block: {type:'text', text:'', phase:'commentary'}`) — o dialeto
Anthropic não tem `phase`, mas o bloco aceita campos extras e o Claude Code os ignora. O guard
lê a marca: **`phase === 'commentary'` dispara sem depender do texto**; **`phase ===
'final_answer'` NUNCA dispara**, mesmo com texto de anúncio. Isso substitui o marker textual
(recall 4–10%) e o estrutural (48,5%, mas com FP em turnos legítimos) pelo discriminador **exato**.

**Prova final do fluxo novo (ao vivo):** o SSE de `/v1/responses` emite
`output_item.added type=message phase=commentary` — a fase chega pelo stream. E o guard decide:
caso real **DISPARA** (`phase=='commentary'`), resposta final legítima **NÃO** (`phase=='final_answer'`),
turno normal **NÃO** (`stop_reason != 'end_turn'`).

**O que ainda falta:** a fase dá o sinal exato de *que* o modelo parou, mas não de *por quê* —
ela não conserta o caso em que a tool que o modelo quer está `defer_loading` e não foi carregada
(57/69 tools na conversa real). O guard é **mitigação**, não correção da causa. (`grep -c phase src/converters/responsesToAnthropic.ts`
= **0**). Com ela disponível, o guard pode passar a usar `phase==='commentary'` + ausência de
`function_call` — o discriminador **exato**, que substitui o marker (recall 4–10%) e o estrutural
(48,5% mas com FP em turnos legítimos: 20 de 77 relatórios reais disparam).

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

**Achado da lente sobre a fase:** `phase: commentary|final_answer` **existe** em
`/v1/responses` da Meta, e o provider `opencode` do LB **já** usa `assistantPhases: true` para
Muse Spark. O bloqueio é pontual: **`responsesToAnthropic.ts` tem `grep -c phase` = 0** — a phase
chega no wire e é **descartada silenciosamente**. Migrar o provider `meta` para `/v1/responses`
daria o discriminador **exato**, ao custo de `tool_search`/deferred loading — que é justamente o
mecanismo de que o caso real depende (`meta.ts:17-24` já enumera essa troca). **Decisão do dono.**

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

#### ✅ DEPLOY EM PRODUÇÃO (2026-10-22)
`main` = **`d75a69d`** · 12 commits · 2458 testes verdes · typecheck limpo ·
`/api/health` reporta `commit: d75a69d`. Commits: `dc5ff80` (merge) · `684ddfe`
(`responseFormat`+`transformResponse`) · `1a5b7ee` (`stream:true` no corpo) · `d75a69d`
(`phase` no não-streaming).

**Duas armadilhas do /v1/responses que quebraram prod (as duas medidas ao vivo):**
1. **A Meta só devolve SSE se o CORPO tiver `stream: true`.** O header
   `Accept: text/event-stream` não basta — ela responde 200 com `application/json` e o
   JSON completo. O `readFirstFrame` lia isso como stream SSE e disparava failover com
   **"upstream fechou o stream sem mandar nada" (502)** — 8 FIRST-CHUNK em 4 min.
2. **A `phase` só chegava no streaming.** O `responsesToAnthropic` (não-streaming)
   montava o bloco text sem a phase, e o guard não-streaming depende dela.

**Validação em produção (URL `/muse`, conta Meta real):** `stop_reason`/`usage` no dialeto
Anthropic; **6/6** requests com `phase=['commentary']` + tool chamada + `stop=tool_use`;
streaming com `content_block_start(text phase=commentary)`; **guard disparou** no log;
**zero FIRST-CHUNK, zero API Error**, com o tráfego real da sessão do Claude Code passando.

Entregável: `medicao/muse-reasoning/diagnostico-v2.html` → `https://sb-load-balance-audit-p7788.mp.serendiped.com/diagnostico-v2.html`
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
(env.ts:80, default 86400) **não existe** no env de prod. Conversas agentic duram 29–82 h.
Expirado → sanitizador cai no heurístico `/^Q-Pa/` (sanitizer.ts:43), cego entre contas Meta
→ 400 `reasoning encrypted_content was not issued to this caller`.
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

1. **`loadbalance-prod-postgres` credencial VAZADA** (2026-10-12): connection string completa (host, porta, usuário, senha 40-hex) impressa em tool output durante auditoria do hedge/rating. Persistida no LB (`request_payloads`). **O dono deve rotacionar.** SB `fiscal-tests` também tem senha HML em texto claro em `/workspace/tests/run.js`. Rotar em ordem: (1) senha HML do `auditoria`; (2) `loadbalance-prod-postgres`.
2. **Chaves em texto claro no LB** (2026-10-09): boot log "[SECRETS] 98 linha(s) de ApiKey com segredo cifrado" enquanto grupos únicos têm 646 chaves. Scripts de importação deixados em SB `/tmp` fazem `INSERT INTO api_keys` sem criptografia → lotes (NVIDIA, OpenRouter "NNN - Open Router", hunter) provavelmente em texto claro em repouso. Fix: `npm run secrets:encrypt-backfill` (dry-run, depois sem) com `KEY_ENCRYPTION_KEY` da imagem prod. Só com go do dono (escrita em prod). Novos lotes só por `backend/scripts/import-keys-lote.ts`.

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

- Node default 22; o package.json exige >=24.15. Node 24 e Playwright Chromium em `/workspace/.sbcache` (git-ignorado via `.git/info/exclude`): `export PATH=/workspace/.sbcache/node24/bin:$PATH PLAYWRIGHT_BROWSERS_PATH=/workspace/.sbcache/ms-playwright`.
- `test:it` precisa Postgres 15 + Redis locais, `TENANCY_IT_DATABASE_URL` e `TENANCY_IT_REDIS_URL` com senha `it-local-sb`.
- `test/zzResidueCleanup.test.ts` é teste real do repo: nomear probes diferentes, deletar por caminho exato; `rm test/zz*` já deletou esse teste uma vez (restaurado via git checkout).
- A11y (Playwright Chromium) precisa `npx playwright install-deps chromium` após cada restart da SB (bibliotecas apt somem).
- Vitest `--maxWorkers=6` + eslint paralelo já derrubou a SB (gVisor, `/root` e apt somem no restart). Use `--maxWorkers=4`, um passo pesado por vez.

**Memórias relacionadas:** `lb-deploy`, `lb-frontend-size-ceilings`, `lb-prod-key-scale`, `lb-plaintext-keys`, `lb-anthropic-key-sweep`, `lb-bulk-reactivate`, `lb-client-keys`, `lb-plan-usage-limits`, `lb-message-level-params`, `lb-race-mode`, `lb-prod-db-credential-leaked`, `lb-ui-perf-harness`, `lb-sb-gates`, `lb-serves-this-agent`, `opencode-zen-vs-go`, `conta-contract-lifecycle`, `conta-resync-resume`, **`lb-muse-reasoning-cifrado`**.
