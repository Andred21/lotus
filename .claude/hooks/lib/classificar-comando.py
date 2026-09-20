#!/usr/bin/env python3
"""Classifica um comando de shell contra a allowlist da branch main do Lotus.

Contrato:
  argv[1]     a linha de comando
  LOTUS_RAIZ  raiz do repositorio (opcional; so o pdftoppm usa)

  exit 0 + stdout vazio  -> liberado
  exit 0 + motivo        -> negado
  exit != 0              -> a casca nega com motivo generico (falha fechada)

O harness de origem resolvia isto pelo AST do PowerShell. Bash nao tem
equivalente, entao a descida em substituicao de comando, que o AST dava de
graca, e escrita a mao em varrer().
"""

import os
import re
import shlex
import sys

RAIZ = os.environ.get("LOTUS_RAIZ", "")
SUBST = "__SUBSTITUICAO__"
REDIR_OK = re.compile(r">&1(?=\s|$)|>{1,2}\s*/dev/null(?=\s|$)")
OPERADORES = {"|", "||", "&&", ";", ";;", "&", "\n"}

LEITURA = {
    "ls", "cat", "head", "tail", "grep", "rg", "find", "wc", "sort", "uniq",
    "cut", "tr", "diff", "jq", "stat", "file", "realpath", "basename",
    "dirname", "pwd", "echo", "printf", "date", "tree", "sed", "pdfinfo",
    "pdftoppm",
}

# Portas de execucao arbitraria ou de escrita, negadas sob qualquer forma.
# E a mesma regua que tirou npx e bunx da lista do harness de origem.
NEGADOS_SEMPRE = {
    "tee", "xargs", "env", "awk", "perl", "ruby", "bash", "sh", "zsh",
    "python", "python3", "node", "npx", "bunx", "eval", "exec", "source",
    ".", "rm", "mv", "cp", "mkdir", "touch", "chmod", "chown",
}


class Negado(Exception):
    pass


def negar(motivo):
    raise Negado(motivo)


def desaspar(token):
    if len(token) >= 2 and token[0] == token[-1] and token[0] in "\"'":
        return token[1:-1]
    return token


def fechar(linha, i):
    """linha[i] == '('; devolve o indice do ')' correspondente."""
    profundidade = 0
    while i < len(linha):
        if linha[i] == "(":
            profundidade += 1
        elif linha[i] == ")":
            profundidade -= 1
            if profundidade == 0:
                return i
        i += 1
    negar("parentese de substituicao de comando nao fechado.")


def varrer(linha):
    """Uma passada de caractere que faz quatro trabalhos ao mesmo tempo:
    rastreia aspas, extrai substituicao de comando, nega substituicao de
    processo e nega redirecionamento para arquivo. Sao quatro porque todos
    dependem do mesmo estado: se o caractere esta ou nao dentro de aspas.

    Devolve (linha com as substituicoes trocadas por SUBST, lista de conteudos).
    """
    partes, saida = [], []
    i, n, aspas = 0, len(linha), None
    while i < n:
        c = linha[i]
        if aspas == "'":
            if c == "'":
                aspas = None
            saida.append(c)
            i += 1
            continue
        if c == "\\" and i + 1 < n:
            saida.append(linha[i:i + 2])
            i += 2
            continue
        if aspas is None and c in ("\"", "'"):
            aspas = c
            saida.append(c)
            i += 1
            continue
        if aspas == "\"" and c == "\"":
            aspas = None
            saida.append(c)
            i += 1
            continue
        if c == "$" and i + 1 < n and linha[i + 1] == "(":
            fim = fechar(linha, i + 1)
            partes.append(linha[i + 2:fim])
            saida.append(SUBST)
            i = fim + 1
            continue
        if c == "`":
            fim = linha.find("`", i + 1)
            if fim < 0:
                negar("crase de substituicao de comando nao fechada.")
            partes.append(linha[i + 1:fim])
            saida.append(SUBST)
            i = fim + 1
            continue
        if aspas is None and c in "<>" and i + 1 < n and linha[i + 1] == "(":
            negar("substituicao de processo vira caminho de arquivo magico, "
                  "e este guarda nao sabe para onde ele aponta.")
        if aspas is None and c == "\n":
            # newline fora de aspas separa comandos igual a ';' no bash, mas
            # shlex com whitespace_split trata newline como espaco e descarta
            # o separador, dobrando a segunda linha nos argumentos da
            # primeira. So aqui, em varrer(), da para saber se o newline esta
            # dentro de aspas (dado) ou fora (separador) — o tokenizador ja
            # recebe a linha escaneada e nao tem mais esse contexto.
            saida.append(" ; ")
            i += 1
            continue
        if aspas is None and c == ">":
            fd2 = saida[-1:] == ["2"] and (len(saida) == 1 or saida[-2].isspace())
            m = REDIR_OK.match(linha, i)
            if fd2 and m:
                saida[-1] = " "
                i = m.end()
                continue
            negar("o comando redireciona para arquivo, que e escrita com "
                  "outro nome. So `2>/dev/null` e `2>&1` passam.")
        saida.append(c)
        i += 1
    if aspas is not None:
        negar("aspas nao fechadas: o comando nao pode ser analisado "
              "sintaticamente.")
    return "".join(saida), partes


def tokenizar(linha):
    lex = shlex.shlex(linha, posix=False, punctuation_chars=True)
    lex.whitespace_split = True
    # shlex por padrao trata '#' como inicio de comentario em qualquer
    # posicao da palavra; bash so reconhece '#' como comentario no comeco
    # da palavra. Sem isto, "echo x#y; rm -rf /" vira um comentario que
    # engole o resto da linha e esconde o `rm -rf /` do classificador.
    lex.commenters = ""
    try:
        return list(lex)
    except ValueError as e:
        negar("o comando nao pode ser analisado sintaticamente (%s)." % e)


def partir_em_simples(tokens):
    simples, atual = [], []
    for t in tokens:
        if t in OPERADORES:
            if atual:
                simples.append(atual)
            atual = []
        else:
            atual.append(t)
    if atual:
        simples.append(atual)
    return simples


def destino_fora_do_repo(caminho):
    if not RAIZ:
        return False
    alvo = os.path.realpath(os.path.join(RAIZ, caminho))
    raiz = os.path.realpath(RAIZ)
    return alvo != raiz and not alvo.startswith(raiz + os.sep)


def familia_leitura(nome, args):
    if nome == "sed":
        for a in args:
            if a == "--in-place" or a.startswith("--in-place="):
                negar("`sed --in-place` reescreve o arquivo.")
            if a.startswith("-") and not a.startswith("--") and "i" in a:
                negar("`sed -i` reescreve o arquivo no lugar. `sed -n` passa.")
    if nome == "find":
        for a in args:
            if a in ("-exec", "-execdir", "-ok", "-okdir", "-delete",
                     "-fprint", "-fprintf", "-fls"):
                negar("`find %s` executa comando ou escreve arquivo." % a)
    if nome == "pdftoppm":
        posicionais = [a for a in args if not a.startswith("-")]
        if len(posicionais) < 2:
            negar("`pdftoppm` sem prefixo de destino: nao da para saber "
                  "onde ele escreve.")
        destino = posicionais[-1]
        if destino == SUBST or not destino_fora_do_repo(destino):
            negar("`pdftoppm` so com destino fora do repositorio. O "
                  "CLAUDE.md manda gerar em /tmp.")


GIT_SUB = {
    "status", "log", "diff", "show", "rev-parse", "merge-base", "cat-file",
    "ls-files", "blame", "shortlog", "describe", "branch", "worktree",
    "remote", "tag", "add", "commit", "merge", "fetch", "pull", "push",
}
GIT_GLOBAIS_COM_VALOR = {"-C", "--git-dir", "--work-tree", "--namespace"}
GIT_BRANCH_ESCRITA = {"-d", "-D", "-m", "-M", "-c", "-C", "-f",
                      "--delete", "--move", "--copy", "--force"}
URL_REMOTA = re.compile(r"^(https?|git|ssh)://|^[^/\s]+@[^/\s]+:")


def curta_contem(token, letras):
    """`-Dq` e `-qD` sao a mesma coisa para o parse-options do git, entao a
    comparacao por igualdade exata do token nao basta: a letra perigosa pode
    vir agrupada com outras. Mesma regua que o `sed -i` do familia_leitura."""
    return (token.startswith("-") and not token.startswith("--")
            and any(l in token[1:] for l in letras))


def familia_git(args):
    i = 0
    while i < len(args) and args[i].startswith("-"):
        t = args[i]
        # A comparacao e SENSIVEL A CAIXA de proposito: `-C` troca de
        # diretorio e passa; `-c` injeta configuracao, e core.pager executa
        # shell.
        if t == "-c":
            negar("`git -c` injeta configuracao, e `core.pager` executa "
                  "shell. Para trocar de diretorio use `-C` maiusculo.")
        if t.startswith("--config-env"):
            negar("`git --config-env` injeta configuracao pelo ambiente.")
        if t.startswith("--exec-path"):
            negar("`git --exec-path` troca os binarios que o git executa.")
        if t in GIT_GLOBAIS_COM_VALOR:
            i += 2
            continue
        i += 1
    if i >= len(args):
        negar("`git` sem subcomando.")
    sub = args[i]
    resto = args[i + 1:]
    if sub not in GIT_SUB:
        negar("`git %s` nao esta na lista de subcomandos liberados na "
              "main." % sub)
    for a in resto:
        if a == "-o" or a == "--output" or a.startswith("--output="):
            negar("`git %s %s` escreve arquivo." % (sub, a))
        if (a.startswith("--upload-pack") or a.startswith("--receive-pack")
                or a.startswith("--exec")):
            negar("`git %s %s` passa um comando externo para o transporte "
                  "local do git executar, o que e execucao arbitraria "
                  "disfarcada de flag." % (sub, a))
    if sub == "branch":
        for a in resto:
            if a in GIT_BRANCH_ESCRITA or curta_contem(a, "dDmMcCf"):
                negar("`git branch %s` altera branch." % a)
    elif sub == "tag":
        for a in resto:
            if a in ("-d", "--delete", "-f", "--force") or curta_contem(a, "df"):
                negar("`git tag %s` altera tag." % a)
    elif sub == "push":
        for a in resto:
            if (a.startswith("--force") or a in ("-f", "-d", "--delete",
                                                  "--mirror", "--prune")
                    or curta_contem(a, "fd")):
                negar("`git push %s` reescreve o remoto." % a)
            if not a.startswith("-") and (a.startswith(":") or a.startswith("+")):
                negar("o refspec `%s` apaga ou forca no remoto." % a)
            if a == "--no-verify" or a.startswith("--no-verify="):
                negar("`git push --no-verify` pula o hook `pre-push` que "
                      "recusa push direto na main.")
    elif sub == "commit":
        for a in resto:
            if (a == "--no-verify" or a.startswith("--no-verify=")
                    or curta_contem(a, "n")):
                negar("`git commit %s` pula os hooks de commit — em "
                      "`commit`, `-n` e `--no-verify`, nao `--dry-run`." % a)
    elif sub == "worktree":
        if not resto:
            negar("`git worktree` sem subcomando.")
        if resto[0] in ("remove", "move", "prune", "lock", "unlock", "repair"):
            negar("`git worktree %s` mexe na arvore de outra lane." % resto[0])
        if resto[0] == "add" and ("--force" in resto or "-f" in resto):
            negar("`git worktree add --force` sobrescreve arvore existente.")
    elif sub == "remote":
        if resto and resto[0] in ("add", "remove", "rm", "set-url", "rename",
                                  "set-head", "prune"):
            negar("`git remote %s` altera o remoto." % resto[0])
    elif sub in ("pull", "fetch"):
        for a in resto:
            if (URL_REMOTA.match(a) or "://" in a
                    or a.startswith(("/", "./", "../", "~"))):
                negar("`git %s` com URL busca de uma origem que nao esta "
                      "configurada." % sub)


def familia_docker(args):
    negar("a familia `docker` ainda nao foi implementada neste guarda.")


def familia_pnpm(args):
    negar("a familia `pnpm` ainda nao foi implementada neste guarda.")


def familia_gh(args):
    negar("a familia `gh` ainda nao foi implementada neste guarda.")


def classificar_simples(tokens):
    tokens = [desaspar(t) for t in tokens]
    if not tokens:
        return
    nome = tokens[0]
    args = tokens[1:]
    if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", nome):
        negar("atribuicao de variavel na frente do comando (`%s`) muda o que "
              "ele faz sem mudar o nome dele." % nome)
    if not re.fullmatch(r"[A-Za-z0-9_./+-]+", nome):
        negar("o nome do comando (`%s`) nao e literal, entao nao da para "
              "classifica-lo." % nome)
    base = nome.rsplit("/", 1)[-1]
    if base == "pint":
        negar("`pint` reformata, logo escreve. Rode no seu terminal, de "
              "dentro de backend/ e sempre com argumento.")
    if base in NEGADOS_SEMPRE:
        negar("`%s` executa codigo arbitrario ou escreve arquivo." % base)
    if base == "git":
        return familia_git(args)
    if base == "docker":
        return familia_docker(args)
    if base == "pnpm":
        return familia_pnpm(args)
    if base == "gh":
        return familia_gh(args)
    if base in LEITURA:
        return familia_leitura(base, args)
    negar("`%s` nao esta na lista de comandos liberados quando a branch e "
          "main." % base)


def classificar(linha):
    limpa, partes = varrer(linha)
    for p in partes:
        classificar(p)
    for simples in partir_em_simples(tokenizar(limpa)):
        classificar_simples(simples)


def main():
    if len(sys.argv) < 2:
        return 0
    try:
        classificar(sys.argv[1])
    except Negado as e:
        saida = (
            "Bloqueado pelo harness: %s A branch e `main`, onde so leitura e "
            "um punhado de comandos de verificacao passam. Rode no seu "
            "terminal, ou acrescente a entrada em "
            ".claude/hooks/lib/classificar-comando.py e commite — `.claude/` "
            "e gravavel na main." % e
        )
        sys.stdout.write(saida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
