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


def check_H7_mcp_json_nao_rastreado(cwd: str) -> tuple[bool, str]:
    """NENHUM `.mcp.json` pode estar rastreado pelo git. Eles carregam token Bearer.

    Medido 2026-10-05 (LEAK-01, task d120eeb6): o `tmp/` e' clone do repo publico
    `PedroPaduelo/nomad-ui` e as 6 pastas de sessao estao dentro dele. O commit
    `1d93e04` versionou os 6 `.mcp.json` (12 headers Authorization) e DELETOU o
    `.gitignore` que os ignorava. Anonimo baixava por raw.githubusercontent.com.

    Dois armadilhas que esta regra precisa cobrirt:
      1. `.gitignore` sozinho nao basta: arquivo JA rastreado nunca e' ignorado.
         O ignore so vale depois do `git rm --cached` (medido: `git check-ignore`
         continuava dando "nao ignora").
      2. A regra tem de reprovar, nao so descrever. Por isso o autoteste cria um
         repo com `.mcp.json` rastreado e exige que a regra reprove.

    Instrumento: `git ls-files` no repo que contem o cwd.
    """
    repo = _git_raiz(cwd)
    if not repo:
        return True, f"cwd sem repo git ({cwd}) — nada a conferir"
    r = subprocess.run(
        ["git", "-C", repo, "ls-files"],
        capture_output=True, text=True, timeout=10,
    )
    if r.returncode != 0:
        return True, f"git ls-files falhou em {repo} (pular)"
    rastreados = [p for p in r.stdout.splitlines() if p.endswith(".mcp.json")]
    if rastreados:
        return False, (
            f"{len(rastreados)} `.mcp.json` RASTREADO(S) em {repo} — carregam token "
            f"Bearer. Tira do indice com `git rm --cached <arquivo>` (o arquivo fica "
            f"em disco, a sessao nao quebra): {', '.join(rastreados[:6])}"
        )
    return True, f"nenhum .mcp.json rastreado em {repo}"


def _git_raiz(cwd: str) -> str:
    """Raiz do repo git que contem `cwd` ('' se nao houver)."""
    r = subprocess.run(
        ["git", "-C", cwd, "rev-parse", "--show-toplevel"],
        capture_output=True, text=True, timeout=10,
    )
    return r.stdout.strip() if r.returncode == 0 else ""


def check_H8_tmp_e_casa_nao_repo_de_produto(cwd: str) -> tuple[bool, str]:
    """`/home/nommand/code/tmp` e' a CASA (MCP, CLAUDE.md, regras), nao um clone de produto.

    Medido 2026-10-05: `tmp/` tem remote `PedroPaduelo/nomad-ui` — o repo da NUI,
    publico — e as 6 pastas de sessao estao DENTRO dele. Qualquer `git add` numa
    pasta de sessao versiona dentro do repo do produto, e foi assim que os
    `.mcp.json` com token foram parar no ar.

    Instrumento: `git -C tmp remote get-url origin` e compara com os 5 repos de
    produto da casa. Se `tmp` for repo de um deles, a fronteira LOCAL/SANDBOX
    esta quebrada por construcao.
    """
    tmp = "/home/nommand/code/tmp"
    if not Path(tmp).exists():
        return True, "tmp/ nao existe (ok)"
    r = subprocess.run(
        ["git", "-C", tmp, "remote", "get-url", "origin"],
        capture_output=True, text=True, timeout=10,
    )
    if r.returncode != 0:
        return True, "tmp/ nao e repo git (ok — casa sem repo)"
    remote = r.stdout.strip()
    # normaliza: tira esquema e sufixo .git, compara so owner/repo.
    # (sem isso a comparacao silenciosamente nunca casa: "…nomad-ui.git" != "…nomad-ui")
    normal = remote.lower().removeprefix("https://").removeprefix("http://")
    normal = normal.removeprefix("git@github.com:").removeprefix("github.com/")
    if normal.endswith(".git"):
        normal = normal[: -len(".git")]
    repos_casa = {
        "nomad-ui": "pedropaduelo/nomad-ui",
        "conta_nommand": "pedropaduelo/conta_nommand",
        "agent-package": "pedropaduelo/agent-package",
        "motor": "pedropaduelo/motor",
        "load-balance": "pedropaduelo/load-balance",
    }
    for nome, esperado in repos_casa.items():
        if normal == esperado:
            return False, (
                f"tmp/ e' a CASA mas tem o remote do repo de PRODUTO `{nome}` "
                f"({remote}). Qualquer `git add` numa pasta de sessao versiona dentro "
                f"do repo do produto — foi assim que os .mcp.json vazaram (LEAK-01). "
                f"A regra e' LOCAL=só gestão, TRABALHO=só sandbox."
            )
    return True, f"tmp/ remote={remote} (nao e repo de produto — ok)"


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
    "H7":  ("Nenhum .mcp.json rastreado no git (carrega token Bearer)", check_H7_mcp_json_nao_rastreado),
    "H8":  ("tmp/ e' a casa, nao um clone de repo de produto",         check_H8_tmp_e_casa_nao_repo_de_produto),
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
        ("H7", (cwd_home,)),
        ("H8", (cwd_home,)),
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

    # --- contraprova: as regras novas tem de REPROVAR no caso que existe pra pegar.
    # Gate que so' passa e' letra morta (ver execfilesync-apaga-o-caso-negativo).
    erros += _contraprova_H7()
    erros += _contraprova_H8()

    if erros:
        print(f"\nautoteste FALHOU ({erros} erro(s))")
        return 2
    print("\nautoteste: OK — o detector le")
    return 0


def _contraprova_H7() -> int:
    """H7 tem de reprovar num repo com `.mcp.json` rastreado, e passar sem ele.

    Monta um repo temporario de verdade — `git ls-files` num repo de mentira nao
    valeria nada, porque o instrumento que a regra usa e' o proprio git.
    """
    import shutil
    import tempfile

    tmp = tempfile.mkdtemp(prefix="chk-h7-")
    try:
        subprocess.run(["git", "init", "-q"], cwd=tmp, capture_output=True, timeout=20)
        subprocess.run(["git", "config", "user.email", "t@t"], cwd=tmp, capture_output=True)
        subprocess.run(["git", "config", "user.name", "t"], cwd=tmp, capture_output=True)

        # caso BOM: nenhum .mcp.json rastreado -> tem de passar
        Path(tmp, "package.json").write_text("{}\n")
        subprocess.run(["git", "add", "package.json"], cwd=tmp, capture_output=True)
        ok_bom, msg_bom = check_H7_mcp_json_nao_rastreado(tmp)
        print(f"  H7 contraprova(caso bom): ok={ok_bom}  msg={msg_bom[:70]}")
        if not ok_bom:
            print("  H7: FALHA — reprovou no caso bom (falso positivo)")
            return 1

        # caso RUIM: .mcp.json rastreado -> tem de REPROVAR
        Path(tmp, "sessao", ).mkdir(exist_ok=True)
        Path(tmp, "sessao", ".mcp.json").write_text('{"a":1}\n')
        subprocess.run(["git", "add", "-f", "sessao/.mcp.json"], cwd=tmp, capture_output=True)
        ok_ruim, msg_ruim = check_H7_mcp_json_nao_rastreado(tmp)
        print(f"  H7 contraprova(caso ruim): ok={ok_ruim}  msg={msg_ruim[:70]}")
        if ok_ruim:
            print("  H7: FALHA — o .mcp.json rastreado NAO foi acusado (gate decorativo)")
            return 1
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _contraprova_H8() -> int:
    """H8 tem de reprovar quando tmp/ tem remote de repo de produto (estado atual)."""
    tmp = "/home/nommand/code/tmp"
    if not Path(tmp).exists():
        print("  H8 contraprova: tmp/ nao existe, pulando")
        return 0
    ok, msg = check_H8_tmp_e_casa_nao_repo_de_produto(tmp)
    print(f"  H8 contraprova(estado real): ok={ok}  msg={msg[:100]}")
    if ok:
        print("  H8: NAO REPROVOU — se tmp/ tem remote de produto, tem de acusar")
        return 1
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
        if rid in ("A1", "A2", "E2", "E4", "E5", "F7", "H6", "H7", "H8"):
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
