// Checar se a ORG pode ter turnTimeoutMs > 24h gravado e o que o conserto faz
const TETO_MAX = 24*60*60_000;
const FOLGA = 5*60_000;
const CASOS = [0, 300, 60*60_000, 24*60*60_000, 30*24*60*60_000, 1e12, -5, NaN, Infinity];
for (const t of CASOS) {
  // conserto
  const comFolga = t + FOLGA;
  const comSaturacao = Math.min(2**31-1, Math.max(1, comFolga));
  // baseline (nao havia orcamento por turno; era so a constante/env)
  console.log(String(t).padStart(14), '-> orcamento', String(comFolga).padStart(14), '-> setTimeout', String(comSaturacao).padStart(10),
    t > TETO_MAX ? ' [ACIMA DE 24h: schema recusa na escrita; leitura satura]' : '');
}
