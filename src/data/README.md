# `@nomad/ui/data` — levantamento e regras

Camada de dados do Padrão Frontend Nomad, extraída do `frontend/` do agent-package (a base
escolhida como referência). Aqui fica o levantamento (o que o agent-package faz e onde) e o que virou pacote. O
README da raiz tem os exemplos de uso; o documento "Padrão Frontend Nomad v1" cita esta página.

## Levantamento no agent-package

| Tema              | Onde (agent-package `frontend/src`)                         | O que ele faz                                                                                                                                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QueryClient       | `lib/queryClient.ts`, `app/App.tsx`                         | Um só client, criado no módulo do `App` e dado ao `QueryClientProvider`. `staleTime` 60 s, `gcTime` 5 min, `retry` 1 vez salvo 401 (`retryUnlessUnauthorized`), `refetchOnWindowFocus: false`. `clearCacheOnSessionChange` esvazia o cache quando o token muda; `resetQueriesAfterError` refaz tudo menos a sessão. |
| Query keys        | `features/*/hooks/use*.ts` (`projectKeys`, `taskKeys`...)   | Fábrica por entidade: `all: ['projects']`, `list(params)`, `detail(id)` e chaves extras derivadas de `all`; filhos começam pela chave do pai (`['tasks', id, 'decisions']`). O codegen também gera `queryOptions`/chaves (`api/generated/.../@tanstack/react-query.gen.ts`).                                        |
| Hooks por feature | `features/<dominio>/{api,hooks}`                            | `api/` tem as chamadas (`projectsApi.list()`), `hooks/` tem `useX`/`useXMutation`/`queryOptions`. Tela e componente nunca importam a API: só os hooks (fronteira de dados, regra FE-02/FE-07, ERRO no ESLint).                                                                                                      |
| Invalidação       | `useCreateProject` etc.                                     | `onSuccess` → `invalidateQueries({ queryKey: keys.all })` (e o `detail(id)` na edição); `onError` → toast com `err.message`. Queries "sempre frescas" usam `staleTime: 0, gcTime: 0`; payload versionado usa `staleTime: Infinity`.                                                                                 |
| Cliente HTTP      | `api/client.ts`                                             | Uma instância do axios (`api`), `timeout` 10 s (120 s por chamada nas longas). Interceptor põe `Bearer` só em URL do backend, salvo `skipAuth`. Guarda o `x-request-id`. Resposta HTML → erro. Todo erro vira `ApiError(message pt-BR, status, details, requestId)`.                                                |
| Client gerado     | `api/generatedClient.ts`, `openapi-ts.config.ts`            | `@hey-api/openapi-ts` (client-axios, typescript, sdk, tanstack-query) gera em `api/generated`; `runtimeConfigPath` faz as operações usarem a MESMA instância do axios (`throwOnError: true`, `paramsSerializer: { indexes: null }`). O CI roda `api:check`.                                                         |
| Erro e predicados | `api/client.ts`, `api/renderErrors.ts`, `lib/errorReporter` | `fallbackErrorMessage` (pt-BR por status/código), `isNotFoundError`, `isNetworkError`, 409 classificado por `details.reason`. O reporter manda erros de render/rota/window ao `POST /client-errors` com o `requestId` (código para suporte).                                                                        |
| 401               | `api/client.ts`, `stores/authStore.ts`, `lib/authRedirect`  | 401 com o token ATUAL → `expire()` no store da sessão → o guard leva a `/login?next=` (validado por `safeNextPath`). 401 de token velho não derruba o login novo. `authChannel` compartilha a sessão entre abas.                                                                                                    |
| Conectividade     | `lib/connectivity.ts`                                       | O client avisa `reportNetworkFailure`/`reportBackendResponse`; um monitor liga o `onlineManager` do TanStack a "navegador online E backend respondendo" (sonda `/health/live` com backoff).                                                                                                                         |
| Zod               | `features/mcps/components/mcpForm.ts`, `features/skills`    | Validação de formulário (espelho do backend, erro por campo). Respostas: tipos do OpenAPI gerado, sem parse em runtime. Env: `config/endpoints.ts` lê `import.meta.env` sem schema.                                                                                                                                 |
| Zustand           | `stores/{uiStore,authStore,projectStore}.ts`                | Só estado de UI: tema, paleta, menu, command palette, toasts, modo de visualização (persistidos por `partialize`) e o token da sessão. Dados do servidor (inclusive o usuário da sessão) ficam no TanStack Query. Projeto ativo: a verdade é a URL.                                                                 |

## O que virou pacote

| Export                                                            | Origem                                 | Mudança                                                                                                                                                               |
| ----------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createQueryClient(config?)`, `retryUnlessUnauthorized`           | `lib/queryClient.ts`                   | Mesmos padrões; `config` mescla em cima. `mutations.retry: false` explícito.                                                                                          |
| `clearCacheOnSessionChange(qc, store, identityOf)`                | `lib/queryClient.ts`                   | Sem o `authStore` do produto: recebe qualquer store com `subscribe` e o seletor da identidade.                                                                        |
| `resetQueriesAfterError(qc, keep?)`                               | `lib/queryClient.ts`                   | As raízes preservadas viram parâmetro (antes: `authKeys.all`).                                                                                                        |
| `QueryProvider`                                                   | `app/App.tsx`                          | Provider com o client do app (ou um com os padrões).                                                                                                                  |
| `createHttpClient({ baseURL, getToken, onUnauthorized, ... })`    | `api/client.ts`                        | Sem store nem URL do produto: token por `getToken`, sessão vencida por `onUnauthorized`, conectividade por `onResponse`/`onNetworkError`. Aceita `detail` (RFC 9457). |
| `generatedClientConfig(http, rootUrl)`                            | `api/generatedClient.ts`               | O mesmo objeto de configuração do client gerado.                                                                                                                      |
| `ApiError`, `is*Error`, `getErrorMessage`, `fallbackErrorMessage` | `api/client.ts`, `api/renderErrors.ts` | Predicados genéricos por status; os de `details.reason` do Render ficam no app.                                                                                       |
| `createQueryKeys('entidade', extra?)`                             | `projectKeys`, `taskKeys`...           | A convenção vira fábrica (`all`, `lists`, `list`, `details`, `detail` + extras).                                                                                      |
| `parseResponse`, `responseParser`, `parseEnv`, `fieldErrors`      | `mcpForm.ts` (formulário)              | Novo: parse de resposta com erro legível (`ResponseParseError`) e env validado no boot (`EnvError`), para apps sem OpenAPI gerado.                                    |
| `createScreenStore(initial, actions?, { persist? })`              | `stores/uiStore.ts`                    | Store de tela com `reset`/`patch` e persistência só das chaves listadas.                                                                                              |
| `safeNextPath(raw, { loginPath? })`                               | `lib/authRedirect.ts`                  | O caminho do login vira parâmetro.                                                                                                                                    |

Ficaram no app (são do produto ou dependem do backend dele): o reporter de erros
(`POST /client-errors`), o monitor de conectividade (`/health/live`; o client já expõe os ganchos),
o `authChannel`, os predicados de 409 do Render e o codegen (cada app tem o seu OpenAPI).

## Regras (entram no "Padrão Frontend Nomad v1")

1. **Estado do servidor só no TanStack Query.** Um `createQueryClient()` por app, no módulo de
   entrada, ligado à sessão por `clearCacheOnSessionChange`.
2. **Query keys por fábrica** (`createQueryKeys`), uma por entidade, no `hooks/` da feature. Mutation
   invalida pela raiz (`keys.all`) ou pelo pai.
3. **Fronteira de dados:** só `src/api`, `features/*/api`, `hooks/` e `src/lib` falam com a API; tela e
   componente usam hooks (`useX`, `useXMutation`, `queryOptions`). O preset `@nomad/ui/eslint` barra
   como erro.
4. **Um cliente HTTP** (`createHttpClient`), usado também pelo client gerado. Erro sempre `ApiError`
   com mensagem pt-BR; 401 tratado num lugar só (`onUnauthorized`).
5. **Zod na borda:** formulário (`fieldErrors`), env no boot (`parseEnv`) e resposta sem contrato
   gerado (`parseResponse`).
6. **Zustand só para estado de tela** (`createScreenStore`): preferências, painéis, seleção, rascunho,
   token. Nunca uma cópia de dado do servidor; o que cabe na URL mora na URL.
