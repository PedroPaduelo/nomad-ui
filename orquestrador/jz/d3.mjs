// Verificar D3: Math.min(ATRASO_MAXIMO...) esta no lugar e o overflow warning aparece sem ele?
const ATRASO_MAX = 2**31-1;
const budget = 24*60*60_000 + 5*60_000; // 24h + 5min = 86.700.000
console.log('orcamento 24h+5min =', budget, '> 2^31-1?', budget > ATRASO_MAX);
// sem o Math.min:
const sem = Math.max(1, budget);
console.log('Sem Math.min, setTimeout receberia', sem, '-> Node clampa para 1ms e avisa');
// com:
console.log('Com Math.min, setTimeout recebe', Math.min(ATRASO_MAX, budget));
// e o caso que o teste pega: 30 dias
const trinta = 30*24*60*60_000;
console.log('teto 30 dias =', trinta, '-> com Math.min =', Math.min(ATRASO_MAX, trinta));
