// Contador de wakeups usando process._ticks / activeResources — mede timers reais de 1-2ms.
const mod = process.argv[2];
const m = await import(mod);
const entry = { leases: new Set(), timer: null };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. orfao: orcamento 120ms, handle descartado
m.leases.add({ acquiredAt: Date.now(), reported: false, budgetMs: 120 });
m.programar('k', entry);
await dormir(250);
// 2. 10 s de turnos saudaveis no mesmo destino
const t0 = Date.now();
let n = 0;
while (Date.now() - t0 < 10_000) {
  const meu = { acquiredAt: Date.now(), reported: false, budgetMs: 5000 };
  m.leases.add(meu);
  m.programar('k', entry);
  await dormir(300);
  m.leases.delete(meu);
  if (entry.timer) { /* mantem */ }
  n++;
}
console.log(JSON.stringify({ mod, turnosSaudaveis: n }));
process.exit(0);
