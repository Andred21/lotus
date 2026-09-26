#!/usr/bin/env python3
"""Le fichas do backlog.md para o portao do `lane.sh abrir`.

Uso:
  backlog.py ficha <backlog> <NN>
      stdout  slug<US>deps. deps sao os numeros de **Depende:** separados por
              espaco (vazio quando a ficha declara `—`), ou SEM-DEPENDE
              quando a linha **Prioridade:** da ficha nao tem **Depende:**.
              Ficha inexistente: nada.
  backlog.py conflito <backlog> <NN> [<NN vivo>...]
      stdout  uma linha por lane viva que cruza a dependencia de <NN>, em
              qualquer sentido e transitivamente. Nada quando nao cruza.
  exit 0 sempre. Erro de leitura emite nada, e o lane.sh recusa pela
  ausencia da ficha (falha fechada).

A ficha e `## <NN>. \\`<slug>\\``; termina no proximo `# `, `## ` ou `---`.
**Depende:** e lido so na PRIMEIRA linha **Prioridade:** da ficha: o Escopo
pode citar `**Depende:**` (a ficha 30 cita) e isso nao e declaracao. Ficha
que ja saiu do backlog (fechou) encerra a cadeia: nao ha de onde ler as
dependencias dela.
"""

import re
import sys

SEP = "\x1f"
TITULO = re.compile(r"^## (\d+)\. `([^`]+)`\s*$")
FIM = re.compile(r"^(#{1,2} |---\s*$)")
DEPENDE = re.compile(r"\*\*Depende:\*\*([^·]*)")


def normalizar(n):
    return str(int(n))


def ler_fichas(caminho):
    """{numero: (slug, deps)}; deps e None quando a ficha nao declara."""
    try:
        with open(caminho, encoding="utf-8") as f:
            linhas = f.read().splitlines()
    except OSError:
        return {}
    fichas = {}
    atual = slug = deps = None
    viu_prioridade = False
    for linha in linhas:
        m = TITULO.match(linha)
        if m:
            if atual:
                fichas[atual] = (slug, deps)
            atual, slug, deps = normalizar(m.group(1)), m.group(2), None
            viu_prioridade = False
            continue
        if atual is None:
            continue
        if FIM.match(linha):
            fichas[atual] = (slug, deps)
            atual = None
            continue
        if not viu_prioridade and linha.startswith("**Prioridade:**"):
            viu_prioridade = True
            d = DEPENDE.search(linha)
            if d:
                deps = [normalizar(x) for x in re.findall(r"\d+", d.group(1))]
    if atual:
        fichas[atual] = (slug, deps)
    return fichas


def fecho(fichas, n):
    """Tudo de que n depende, transitivamente."""
    vistos, pilha = set(), [n]
    while pilha:
        f = fichas.get(pilha.pop())
        if not f or not f[1]:
            continue
        for d in f[1]:
            if d not in vistos:
                vistos.add(d)
                pilha.append(d)
    return vistos


def conflitos(fichas, nn, vivas):
    saida = []
    de_nn = fecho(fichas, nn)
    for v in vivas:
        if v == nn:
            saida.append("a ficha %s ja tem lane viva" % nn)
        elif v in de_nn:
            saida.append("%s depende de %s, que tem lane viva" % (nn, v))
        elif nn in fecho(fichas, v):
            saida.append("a lane viva %s depende de %s" % (v, nn))
    return saida


def main(argv):
    if len(argv) < 4:
        return 0
    verbo, caminho = argv[1], argv[2]
    try:
        nn = normalizar(argv[3])
    except ValueError:
        return 0
    fichas = ler_fichas(caminho)
    if verbo == "ficha":
        f = fichas.get(nn)
        if f:
            slug, deps = f
            valor = "SEM-DEPENDE" if deps is None else " ".join(deps)
            sys.stdout.write("%s%s%s\n" % (slug, SEP, valor))
    elif verbo == "conflito":
        vivas = []
        for v in argv[4:]:
            try:
                vivas.append(normalizar(v))
            except ValueError:
                continue
        for linha in conflitos(fichas, nn, vivas):
            sys.stdout.write(linha + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
