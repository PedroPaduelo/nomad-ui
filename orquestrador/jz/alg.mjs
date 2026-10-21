// Reconstituicao FIEL dos dois algoritmos (transcrita de mcp-pool.ts, base vs conserto)
const ATRASO_MAX = 2 ** 31 - 1;
const variants = {
  BASELINE_main: {
    // alvoDoWatchdog SEM `reported` (main)
    alvo(l) { let a; for (const x of l) { if (x.budgetMs <= 0) continue; if (!a || x.acquiredAt < a.acquiredAt) a = x; } return a; },
    // laco de acusacao SEM `if (l.reported) continue`
    acusaLaco(l, agora) { let restam = false; const den = [];
      for (const x of l) { if (x.budgetMs <= 0) continue;
        if (agora - x.acquiredAt < x.budgetMs) { restam = true; continue; }
        x.reported = true; den.push(x); }
      return { restam, den }; },
    budgetPorLease: false,
  },
  CONSERTO_849d8d71: {
    alvo(l) { let a; for (const x of l) { if (x.budgetMs <= 0 || x.reported) continue; if (!a || x.acquiredAt < a.acquiredAt) a = x; } return a; },
    acusaLaco(l, agora) { let restam = false; const den = [];
      for (const x of l) { if (x.budgetMs <= 0) continue; if (x.reported) continue;
        if (agora - x.acquiredAt < x.budgetMs) { restam = true; continue; }
        x.reported = true; den.push(x); }
      return { restam, den }; },
    budgetPorLease: true,
  },
};

function rodar(v, nome) {
  const leases = new Set();
  let timer = null;
  let wakeups = 0;
  const programar = () => {
    const alvo = v.alvo(leases); if (!alvo) return; if (timer) return;
    const falta = alvo.acquiredAt + alvo.budgetMs - Date.now();
    const atraso = Math.min(ATRASO_MAX, Math.max(1, falta));
    if (atraso <= 2) wakeups++; // moinho
    timer = setTimeout(() => { timer = undefined;
      const agora = Date.now();
      const { restam } = v.acusaLaco(leases, agora);
      if (restam) programar();
    }, 0);
    timer.unref?.();
  };
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    // orfao: 120 ms, nunca devolvido
    leases.add({ acquiredAt: Date.now(), reported: false, budgetMs: 120 });
    programar();
    await dormir(250);
    // 10 s de turnos saudaveis, orcamento 5000, todos devolvidos
    const t0 = Date.now(); let n = 0;
    while (Date.now() - t0 < 10_000) {
      const meu = { acquiredAt: Date.now(), reported: false, budgetMs: 5000 };
      leases.add(meu); programar();
      await dormir(300);
      leases.delete(meu);
      if (timer && [...leases].every((l) => l.reported || l.budgetMs <= 0)) { clearTimeout(timer); timer = null; }
      n++;
    }
    console.log(nome, JSON.stringify({ turnosSaudaveis: n, wakeupsMoinhoLe2ms: wakeups, leasesVivos: leases.size }));
    // exit manual removido
  })();
}
rodar(variants.BASELINE_main, 'BASELINE(main)      ');
setTimeout(()=>rodar(variants.CONSERTO_849d8d71, "CONSERTO(849d8d71)  "), 12000);
