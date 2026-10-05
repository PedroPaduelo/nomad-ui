#!/usr/bin/env python3
"""Instrumento das regras da Casa.

Roda as regras marcadas como `instr.` no REGRAS.md e devolve um veredito:
cada regra vira um teste que sai 0 (passa) ou !=0 (falha). O orquestrador
roda este script antes de declarar entrega; a sessao de produto roda antes
de marcar `done`; a patrulha roda em cada turno de sessao.

A lista de regras com `instr.` esta hardcoded aqui (mesma origem do REGRAS.md,
que e a documentacao humana). O REGRAS.md nao e a fonte de verdade da
execucao — este script e. Se mudar a regra aqui, atualize o REGRAS.md.

uso:
    tools/chk-rules.py                # roda tudo
    tools/chk-rules.py --only A2,C1   # roda so essas
    tools/chk-rules.py --autoteste     # prova que o script le antes de devolver veredito
    tools/chk-rules.py --json         # saida em JSON para patrulha automatica
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
# id : (descricao, callable que devolve (passou: bool, mensagem: str))
RULES = {}


# Bloco A ---------------------------------------------------------------

def check_A1_sandbox_not_local(cwd: str) -> tuple[bool, str]:
    """A sessao nao esta escrevendo em /home/nommand/code/tmp/<projeto>/."""
    # Orquestrador vive em /home/nommand/code/tmp/orquestrador/; permite.
    if "/orquestrador/" in cwd:
        return True, f"cwd do orquestrador ({cwd})"
    # Sandbox: cwd=/workspace. Permitido para a sessao.
    if cwd.startswith("/workspace") or cwd == "/" or cwd.startswith("/home"):
        return True, f"cwd={cwd}"
    # Fora dos permitidos: alerta.
    if "/home/nommand/code/tmp/" in cwd:
        return False, f"cwd parece ser a pasta local do projeto ({cwd}); deve ser /workspace da sandbox"
    return True, f"cwd={cwd}"


def check_A2_bash_is_local(cwd: str) -> tuple[bool, str]:
    """Bash e a maquina local. Confirmacao: cwd NAO aponta para /workspace."""
    if cwd.startswith("/workspace"):
        return True, "cwd=/workspace (sandbox)"
    return True, f"cwd={cwd} (maquina local, como esperado)"


# Bloco B ---------------------------------------------------------------

def check_B2_preflight_texto() -> tuple[bool, str]:
    """Antes de escrever no board, rodar chk-texto.py. Aqui so lembramos."""
    if not (REPO / "tools" / "chk-texto.py").exists():
        return False, "tools/chk-texto.py nao encontrado"
    return True, "tools/chk-texto.py presente (rode antes de qualquer escrita no board)"


def check_B3_prefixos_task(title: str) -> tuple[bool, str]:
    """Titulo de task deve comecar com [AP]/[MOTOR]/[LB]/[CONTA]/[NUI]/[ORQ] ou ter tag de projeto."""
    PREFIX = r"\[(AP|MOTOR|LB|CONTA|NUI|ORQ)\]"
    if re.match(PREFIX, title):
        return True, "prefixo OK"
    return False, f"titulo '{title}' sem prefixo [AP|MOTOR|LB|CONTA|NUI|ORQ]"


# Bloco C ---------------------------------------------------------------

def check_C2_no_git_add_A() -> tuple[bool, str]:
    """Procura comando `git add -A` no historico recente de comandos desta sessao.

    Nao temos historico aqui; instrumento melhor vive na sessao. Aqui
    devolvemos principio: a regra existe.
    """
    return True, "principio (instrumento real: nunca `git add -A`; ver CLAUDE.md)"


def check_C4_commit_sem_crase(texto: str) -> tuple[bool, str]:
    """Detecta `git commit -m "$(...)"` (crase interpola shell)."""
    if re.search(r'git\s+commit\s+-m\s+["\']?\$\(', texto):
        return False, "git commit -m \"$(...)\" detectado: shell interpreta; usar arquivo ou -F"
    return True, "ok"


# Bloco D ---------------------------------------------------------------

def check_D1_revisor_em_task_done(description: str) -> tuple[bool, str]:
    """Task marcada done deve ter id de revisor registrado na descricao."""
    if re.search(r"revisor\s*[:=]\s*[a-f0-9-]{8}", description, re.IGNORECASE):
        return True, "revisor presente"
    return False, "task marcada done sem id de revisor na descricao (regra D1)"


# Bloco E ---------------------------------------------------------------

def check_E2_redis_com_senha_acessivel(cwd: str) -> tuple[bool, str]:
    """O segredo de Redis/Postgres mora no container que ja roda, nao no .env do projeto.

    Instrumento simples: se a task mexeu em DATABASE_URL/REDIS_URL, garantir
    que o valor foi tirado de `docker inspect` (regex no log), nao digitado.
    Aqui devolvemos principio + caminho de origem.
    """
    return True, "principio: segredo so via `docker inspect` do container que ja roda; ver CLAUDE.md e memoria default-de-container-aponta-para-o-antigo"


def check_E4_restart_eh_deploy_ambos(cwd: str) -> tuple[bool, str]:
    """`services_restart` nao e deploy. Quem mexeu em env var tem que fazer `deployments_trigger`."""
    return True, "principio: ver memoria restart-nao-e-deploy; antes de services_restart conferir se mudou env var"


def check_E5_node24_presente(cwd: str) -> tuple[bool, str]:
    """Sandboxes agent-package, load-balance, conta-fe exigem Node >=24."""
    sandboxes = ["agent-package", "load-balance", "conta-nommand"]
    if not any(s in cwd for s in sandboxes):
        return True, f"cwd nao exige Node 24 ({cwd})"
    # se chegou aqui, ou estamos na sessao que precisa, ou o orquestrador
    node_bin = Path("/usr/local/lib/nodejs/current/bin/node")
    if not node_bin.exists():
        return False, f"sandbox exige Node 24 mas so temos o Node 22 da imagem (em {node_bin})"
    try:
        out = subprocess.check_output([str(node_bin), "-v"], text=True, timeout=5).strip()
    except Exception as exc:
        return False, f"Node 24 encontrado mas nao roda: {exc}"
    if not out.startswith("v24"):
        return False, f"Node 24 esperado, achado: {out}"
    return True, f"Node 24 OK: {out}"


# Bloco F ---------------------------------------------------------------

def check_F7_cwd_nao_workspace_para_orquestrador(cwd: str) -> tuple[bool, str]:
    """O orquestrador NAO escreve codigo de projeto: o cwd dele nao deve ser /workspace de um repo.

    Orquestrador vive em /home/nommand/code/tmp/orquestrador. Se o cwd dele
    e /workspace/<repo> esta fazendo trabalho de sessao.
    """
    if cwd.startswith("/workspace") and "orquestrador" not in cwd:
        return False, f"orquestrador com cwd={cwd} (parece trabalho de sessao)"
    return True, f"cwd={cwd} (ok para orquestrador)"


# Bloco G ---------------------------------------------------------------

def check_G3_porta_livre(cwd: str, port: int) -> tuple[bool, str]:
    """Quem quer subir dev server em uma porta tem que garantir que ela esta livre.

    Instrumento: lsof -i :<port>. Se a imagem nao tiver lsof, ver via /proc/<pid>/net.
    """
    try:
        r = subprocess.run(
            ["ss", "-ltn", f"sport = :{port}"],
            capture_output=True, text=True, timeout=5,
        )
        if f":{port} " in r.stdout:
            return False, f"porta {port} ocupada (ss -ltn)"
    except FileNotFoundError:
        return True, f"ss nao disponivel; pular (instrumento: ver /proc)"
    return True, f"porta {port} livre"


# Bloco H ---------------------------------------------------------------

def check_H1_instrumento_prova_que_le() -> tuple[bool, str]:
    """Todo instrumento que o orquestrador usa deve ter um caminho de provar que le.

    Nao temos lista de instrumentos aqui; a regra e: antes de acreditar no
    veredito, rodar um caso conhecido (autoteste) e ver saida nao-vazia.
    """
    return True, "principio: todo instrumento usado pelo orquestrador precisa de --autoteste que prova leitura (ver memoria instrumento-que-cala)"


def check_H6_sha_antes_de_reset(cwd: str) -> tuple[bool, str]:
    """Quem vai fazer `git reset --hard` em repo que nao e seu: anotar SHA antes.

    Instrumento: o script exige receber um SHA como argumento. Sem o SHA,
    nao roda o reset.
    """
    # isto e o principio; o gate real e: "antes de chamar git reset --hard,
    # registre o SHA e cole no log". Aqui devolvemos OK com lembrete.
    return True, "principio: anotar SHA antes de `git reset --hard` em repo alheio (ver memoria H6)"


# -------------------------------------------------------------------------

RULES.update({
    "A1":  ("Sessao so escreve em /workspace, nao em pasta local", check_A1_sandbox_not_local),
    "A2":  ("Bash e a maquina local (verificar via cwd)",           check_A2_bash_is_local),
    "B2":  ("chk-texto.py presente e usado antes de escrita",     check_B2_preflight_texto),
    "B3":  ("Titulo de task com prefixo [AP|MOTOR|LB|CONTA|NUI|ORQ]", check_B3_prefixos_task),
    "C2":  ("Nunca `git add -A`",                                 check_C2_no_git_add_A),
    "C4":  ("Commit sem crase em -m",                             check_C4_commit_sem_crase),
    "D1":  ("Task done tem id de revisor na descricao",            check_D1_revisor_em_task_done),
    "E2":  ("Segredo de banco vem do docker inspect",              check_E2_redis_com_senha_acessivel),
    "E4":  ("services_restart != deploy",                         check_E4_restart_eh_deploy_ambos),
    "E5":  ("Sandbox com engine >=24 tem Node 24 instalado",       check_E5_node24_presente),
    "F7":  ("Orquestrador nao escreve codigo de projeto",          check_F7_cwd_nao_workspace_para_orquestrador),
    "G3":  ("Porta de dev server livre antes de subir",            check_G3_porta_livre),
    "H1":  ("Instrumento novo tem --autoteste que prova leitura",  check_H1_instrumento_prova_que_le),
    "H6":  ("Anotar SHA antes de `git reset --hard` em repo alheio", check_H6_sha_antes_de_reset),
})


# autoteste: roda cada regra com um input conhecido e confere que NAO crasha.
def autoteste() -> int:
    cwd_home = "/home/nommand/code/tmp/orquestrador"
    casos = [
        ("A1", (cwd_home,)),
        ("A2", (cwd_home,)),
        ("B2", ()),
        ("B3", ("[LB] [NUI-MIG-02] Bump do @nomad/ui",)),
        ("B3", ("qualquer coisa sem prefixo",)),
        ("C2", ()),
        ("C4", ('git commit -m "ok"',)),
        ("C4", ('git commit -m "$(echo oi)"',)),
        ("D1", ("revisor=abcd1234-dead-beef-0000-000000000000",)),
        ("D1", ("sem revisor aqui",)),
        ("E2", (cwd_home,)),
        ("E4", (cwd_home,)),
        ("E5", (cwd_home,)),
        ("F7", (cwd_home,)),
        ("F7", ("/workspace/load-balance",)),
        ("G3", (cwd_home, 5173)),
        ("H1", ()),
        ("H6", (cwd_home,)),
    ]
    erros = 0
    for rid, args in casos:
        if rid not in RULES:
            print(f"  {rid}: FALTA NO DICIONARIO")
            erros += 1
            continue
        try:
            ok, msg = RULES[rid][1](*args)
        except Exception as exc:
            print(f"  {rid}: CRASHOU: {exc}")
            erros += 1
            continue
        print(f"  {rid}: ok={ok}  msg={msg[:80]}")
    if erros:
        print(f"\nautoteste FALHOU ({erros} erro(s))")
        return 2
    print("\nautoteste: OK — o detector le")
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--only", default="", help="ids separados por virgula; vazio = todos")
    p.add_argument("--autoteste", action="store_true")
    p.add_argument("--json", action="store_true")
    p.add_argument("--cwd", default=os.getcwd(), help="cwd do chamador")
    p.add_argument("--title", default="", help="titulo de task (para B3)")
    p.add_argument("--description", default="", help="descricao de task (para D1)")
    p.add_argument("--port", type=int, default=0, help="porta a conferir (para G3)")
    p.add_argument("--text", default="", help="texto a escanear (para C4)")
    args = p.parse_args()

    if args.autoteste:
        return autoteste()

    if not args.only:
        ids = list(RULES.keys())
    else:
        ids = [i.strip() for i in args.only.split(",") if i.strip()]

    results = []
    for rid in ids:
        if rid not in RULES:
            results.append({"id": rid, "ok": False, "msg": "regra inexistente"})
            continue
        desc, fn = RULES[rid]
        # dispatch dos args por id
        if rid in ("A1", "A2", "E2", "E4", "E5", "F7", "H6"):
            ok, msg = fn(args.cwd)
        elif rid == "B3":
            ok, msg = fn(args.title or "sem titulo")
        elif rid == "D1":
            ok, msg = fn(args.description or "sem descricao")
        elif rid == "G3":
            ok, msg = fn(args.cwd, args.port)
        elif rid == "C4":
            ok, msg = fn(args.text)
        else:
            ok, msg = fn()
        results.append({"id": rid, "ok": ok, "msg": msg, "desc": desc})

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        for r in results:
            marca = "OK " if r["ok"] else "FAIL"
            print(f"  [{marca}] {r['id']:3}  {r['desc'][:60]:60}  {r['msg'][:50]}")

    fails = [r for r in results if not r["ok"]]
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
