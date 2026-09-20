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


def familia_git(args):
    negar("a familia `git` ainda nao foi implementada neste guarda.")


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
