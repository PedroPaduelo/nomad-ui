
// BASELINE (main) — alvoDoWatchdog sem o filtro `reported`
const ATRASO_MAX = 2**31-1;
let leaseTimer=null;
let wakeups=0;
const leases=new Set();
function log(){/* acusacao */}
function alvoDoWatchdog(entry){
  let alvo=null;
  for (const l of entry.leases){ if(l.budgetMs<=0) continue; if(!alvo||l.acquiredAt<alvo.acquiredAt) alvo=l; }
  return alvo;
}
function programar(key,entry){
  const alvo=alvoDoWatchdog(entry); if(!alvo) return; if(entry.timer) return;
  const orc=alvo.budgetMs; const falta=alvo.acquiredAt+orc-Date.now();
  entry.timer=setTimeout(()=>{ entry.timer=undefined; const agora=Date.now(); let restam=false;
    for(const l of entry.leases){ if(l.budgetMs<=0) continue; if(agora-l.acquiredAt<l.budgetMs){restam=true;continue;} l.reported=true; log(); }
    if(restam) programar(key,entry);
  }, Math.min(ATRASO_MAX, Math.max(1,falta)));
}
module.exports={leases,programar,wakeups:()=>wakeups};
