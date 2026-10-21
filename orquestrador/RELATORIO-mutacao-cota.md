# Contradição 2 — a mutação da cota: "1 teste morre" contra "0 testes morrem"

**Veredito: "1 teste morre" está CORRETO. A mutação NÃO é indetectável.**

Branch `medir/mutacao-cota` (de `integra-validacao-1016` @ 5bd76b86), worktree
`/workspace/.worktrees/medir-mutacao-cota`. Medido na SB `motor`.

---

## 1. A medição (o que as duas lentes discordaram)

Mutação aplicada em `be/src/queue/retention.ts:119`:

```diff
-    mailboxWriteBudget: num(process.env.RETENTION_MAILBOX_WRITE_BUDGET, 300) || 300,
+    mailboxWriteBudget: num(process.env.RETENTION_MAILBOX_WRITE_BUDGET, 300) || Number.MAX_SAFE_INTEGER,
```

Método: suíte inteira do be em **14 chunks** (213 arquivos, `fileParallelism:false`,
`--maxWorkers=2`), duas voltas completas — baseline e mutado — comparando o **conjunto
de nomes que falham** (`comm`), nunca os totais brutos. `LC_ALL=C` nas duas pontas.

| | nomes que falham |
|---|---|
| baseline (sem mutação) | **19** |
| mutado | **20** |

`comm -13` (mutado tem, baseline não tem) — **1 nome**:

```
be/src/queue/retention-env-compose.test.ts :: TAREFA A — as duas envs de retenção na
lista fechada do compose efeito por execução: vazio no compose cai no default do
código `0` é o kill-switch de verdade nos dois sentidos que importam
```

`comm -23` (só baseline) — **VAZIO**. A mutação não conserta nada; ela quebra exatamente 1.

### Por que a lente "0 testes morrem" mediu zero

Ela mediu o arquivo `retention-cota-antes-do-select.test.ts` (que passa `mailboxWriteBudget`
por `opts`, não por `retentionConfig()`) e/ou leu o `||` como código morto. O `||` **não é**
código morto — ver §2.

### Agulha de controle (a medição foi checada antes de ser usada)

Um arquivo `__zz-agulha-controle.test.ts` com um teste falhando de propósito
(`expect(1+1).toBe(3)`, nome `AÇÚCAR-ÇÕÕ-1º-AGULHA`) foi inserido em **todos os 14 chunks**.
Resultado: a agulha apareceu **14/14** nos dois runs, e o nome saiu byte-idêntico
**com e sem** `LC_ALL=C` — o parser não depende de locale. Um `comm -13` vazio aqui
significaria "extractor cego", e foi descartado por desenho.

---

## 2. Por que o `||` é alcançável (o ponto que fecha a contradição)

```ts
const num = (v, d) => {
  if (v === undefined || v.trim() === '') return d;   // ausente/vazio → 300
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;         // "0" → 0  ← aqui
};
mailboxWriteBudget: num(process.env.RETENTION_MAILBOX_WRITE_BUDGET, 300) || 300
```

`num` devolve `0` (numérico, finito, ≥ 0) quando a env é a string `"0"`. E `0 || X`
devolve `X`. O estado `"0"` é **o kill-switch documentado no compose**
(`RETENTION_MAILBOX_WRITE_BUDGET: ${RETENTION_MAILBOX_WRITE_BUDGET:-}` + o `0` do dono),
e está travado por `retention-env-compose.test.ts:150`. Logo o lado direito do `||`
**é alcançável em produção**, e é ele que decide o teto nesse estado.

Medido num arquivo dedicado (`__zz-prova-alcance-mutacao.test.ts`, temporário, removido):

| env | cota devolvida | chega no `||`? |
|---|---|---|
| ausente / `''` / `'   '` / `'abc'` / `'-1'` | 300 | não |
| `'0'` | **300** | **sim** |
| `'7'` / `'999999'` | 7 / 999999 | não |

---

## 3. O buraco de gate que existia (e a correção)

O 300 **era** testado, mas **de acidente**: a única trava era um `it` dentro de
`retention-env-compose.test.ts`, cujo assunto é a **forma do YAML do compose**.
Tirar aquele arquivo da suíte, ou trocar de assunto, derrubava a trava do teto de
produção sem nada reclamar.

**Correção:** `be/src/queue/retention-cota-300-invariant.test.ts` (novo, 6 testes) —
o invariante mora sozinho, com o assunto sendo o invariante:

1. env ausente → 300
2. env vazia / só espaços → 300
3. teto é **finito**, inteiro seguro, `< 500×20`, e cabe no lock de 60 s
4. varredura dos 8 estados que o sistema produz (incluindo todas as variantes
   textuais de `0`) → todos dão o default 300, nenhum dá teto que não limita
5. `"0"` (o kill-switch) → 300, nunca teto cru
6. cota explícita alta é respeitada (o dono **pode** configurar; o que não pode é
   herdar teto subirado por acidente)

**Prova dos dois lados** (mesma mutação, mesmo arquivo):

| estado | `comm`/nomes que falham |
|---|---|
| sem mutação | **0** (o arquivo passa inteiro) |
| com `\|\| Number.MAX_SAFE_INTEGER` | **2** (os testes 4 e 5 morrem) |

`tsc --noEmit` limpo com o arquivo novo.

---

## 4. Tempo e queries de um tick com a cota em teto cru (item 5)

Medido com relógio de parede e espião no Prisma, org nova por medição.

| itens semeados | cota | apagados | findMany | deleteMany | duração | ms/item |
|---|---|---|---|---|---|---|
| 600 | 300 | 300 | 1 | 1 | **2 243 ms** | 7,5 |
| 600 | teto cru | 600 | 2 | 2 | **4 546 ms** | 7,6 |
| 3 000 | 300 | 300 | 1 | 1 | **2 047 ms** | 6,8 |
| 3 000 | teto cru | 3 000 | 7 | 6 | **18 220 ms** | 6,1 |
| **10 000** | 300 | 300 | 1 | 1 | **1 845 ms** | 6,2 |
| **10 000** | **teto cru** | **10 000** | **20** | **20** | **58 387 ms** | 5,8 |

**O número que importa:** 10 000 linhas (o pior caso que `batch × maxBatches` permite)
com a cota em teto cru levam **58 387 ms — 97% do `lockDuration` de 60 s do BullMQ**,
com 20 `findMany` + 20 `deleteMany`. Com a cota de 300, o mesmo tick leva 1 845 ms.

Ou seja: o teto não é conservador, é **o que separa "o job termina" de "o job estoura
o lock"**. Em produção, com o banco 5× mais lento que o Postgres local da SB (a taxa de
~7,5 ms/item vira ~37 ms/item), 58 s viram ~6 minutos: o job nunca termina, o BullMQ
reentrega o MESMO job a outra réplica, as duas gravam o mesmo evento e o moinho de 1 ms
nasce. **É o cenário de "orçamento = teto cru", medido e não estimado.**

---

## 5. O que eu NÃO provei

- **Não medi** o tempo do tick com o Postgres de produção (2 M mailbox). Medi um
  Postgres local em `adv_cota`, com até 10 000 linhas semeadas. O 58 s é o pior caso
  *permitido pela configuração* num banco ocioso; o número de produção é **desconhecido**
  e deve ser maior.
- **Não medi** o efeito de replay do BullMQ (o moinho de 1 ms em si). Medi o
  pressuposto dele: o tick estoura o lock.
- **Não rodei** a suíte com o Postgres de produção nem com `RETENTION_*` de produção.
  O `.env` da suíte é derivado de `.env.example`, com `DATABASE_URL` apontando para
  `adv_cota` e as duas envs de retenção **vazias** (estado que o compose produz).
- **Não reproduzi** o moinho de 1 ms. A origem do log de 2026-10-15 continua aberta
  (o registro `motor-incidente-1ms-nao-existe-no-commitado`).
- **Não comparei** com a lens que mediu 0 — não tenho o log dela, só o número. O que
  afirmo é o que medi aqui, com agulha de controle, duas voltas completas.
- **Sandbox:** o primeiro run morreu 3× por pressão de memória (vitest com 12 cores
  nos 8 GB do sandbox) e o Postgres/Redis caíram junto. Subi de volta e refiz do zero
  com `--maxWorkers=2`; o Postgres foi recriado vazio e o schema re-aplicado. O
  baseline foi medido **antes** do incidente e o mutado **depois**, em bancos
  equivalentes — o comparativo é válido porque as duas voltas rodaram contra schemas
  idênticos, mas não foram simultâneas.

---

## 6. Arquivos

**Entregue:** `be/src/queue/retention-cota-300-invariant.test.ts` (novo, 6 testes)

**Medição (não entra no commit):** `.medida/` — `run-suite.sh`, `chunks.sh`,
`extract.py`, `env.sh`, e `resultados/` com os dois conjuntos de nomes, o `comm -13`,
o `comm -23` e os logs por chunk.

**Removidos depois de medir:** `__zz-agulha-controle.test.ts`,
`__zz-prova-alcance-mutacao.test.ts`, `__zz-medicao-tempo-tick.test.ts`,
`__zz-medicao-pior-caso.test.ts` (scaffolding de medida, não são regressão).

**NÃO alterado:** `be/src/queue/retention.ts` — a mutação foi revertida.