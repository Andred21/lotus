#!/usr/bin/env python3
"""Le campos do frontmatter YAML de um arquivo markdown, numa linha so.

Contrato:
  argv[1]    caminho do arquivo
  argv[2..]  nomes de campo
  stdout     UMA linha com os valores na ordem pedida, separados pelo Unit
             Separator do ASCII (0x1F). `null`, `~`, valor vazio, campo
             ausente e valor que nao e escalar (lista, mapa) viram vazio.
             Quebra de linha e US dentro de valor viram espaco, para a
             linha continuar uma so.
  exit 0     sempre. Arquivo ausente, sem frontmatter, frontmatter que nao
             e mapa ou YAML invalido emitem nada: quem chama nao distingue
             os casos, e nao precisa.

Os escalares saem como estao escritos (BaseLoader): `updated_at` nao vira
datetime, `offset: 1` nao vira int e `efeito_externo: nao` nao vira False.

O separador NAO e TAB. TAB e espaco em branco para o IFS do bash, e espaco
em branco COLAPSA: uma sequencia de TABs vira um separador so, entao um
campo vazio no meio da linha empurra todos os campos seguintes uma casa para
a esquerda. Foi o que aconteceu com o ler-estado.py, que este arquivo
substitui: com `active_work_item: null` na lane-c do state.md real, o
`session-start.sh` recebia a branch no lugar do item, o caminho da arvore no
lugar da branch e o next_action no lugar da arvore — e a comparacao daquela
lane era pulada em silencio. O Unit Separator nao e espaco em branco para o
IFS, entao campo vazio sobrevive na posicao dele.
"""

import re
import sys

import yaml

SEP = "\x1f"
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---[ \t]*(?:\n|\Z)", re.S)
NULOS = {"", "null", "Null", "NULL", "~"}


def main(argv):
    if len(argv) < 3:
        return 0
    try:
        with open(argv[1], encoding="utf-8") as f:
            texto = f.read()
    except OSError:
        return 0
    m = FRONTMATTER.match(texto)
    if not m:
        return 0
    try:
        dados = yaml.load(m.group(1), Loader=yaml.BaseLoader)
    except yaml.YAMLError:
        return 0
    if not isinstance(dados, dict):
        return 0
    valores = []
    for campo in argv[2:]:
        v = dados.get(campo)
        if not isinstance(v, str) or v in NULOS:
            v = ""
        valores.append(v.replace("\n", " ").replace(SEP, " ").strip())
    sys.stdout.write(SEP.join(valores) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
