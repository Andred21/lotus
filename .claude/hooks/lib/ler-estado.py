#!/usr/bin/env python3
"""Le o frontmatter de um state.md e emite uma linha por lane.

Contrato:
  argv[1]  caminho do state.md
  stdout   lane<US>id<US>workflow_state<US>active_work_item<US>branch
           <US>tree<US>next_action, onde <US> e o Unit Separator do ASCII
           (0x1F), um byte por campo.
  exit 0   sempre. Arquivo ausente, frontmatter ausente ou YAML invalido
           emitem nada: quem chama nao distingue os casos, e nao precisa.

O separador NAO e TAB. TAB e espaco em branco para o IFS do bash, e espaco
em branco COLAPSA: uma sequencia de TABs vira um separador so, entao um
campo vazio no meio da linha empurra todos os campos seguintes uma casa para
a esquerda. Com `active_work_item: null` na lane-c do state.md real, o
`session-start.sh` recebia a branch no lugar do item, o caminho da arvore no
lugar da branch e o next_action no lugar da arvore — e a comparacao de
ESTADO VENCIDO daquela lane era pulada em silencio, justo a lane cuja
divergencia motivou o hook. O Unit Separator nao e espaco em branco para o
IFS, entao campo vazio sobrevive na posicao dele.
"""

import sys

import yaml

SEP = "\x1f"
CAMPOS = ("workflow_state", "active_work_item", "branch", "tree",
          "next_action")


def main():
    if len(sys.argv) < 2:
        return 0
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            texto = f.read()
    except OSError:
        return 0
    if not texto.startswith("---"):
        return 0
    partes = texto.split("---", 2)
    if len(partes) < 3:
        return 0
    try:
        dados = yaml.safe_load(partes[1])
    except yaml.YAMLError:
        return 0
    if not isinstance(dados, dict):
        return 0
    lanes = dados.get("lanes")
    if not isinstance(lanes, dict):
        return 0
    for ident in sorted(lanes):
        lane = lanes[ident]
        if not isinstance(lane, dict):
            continue
        valores = [str(lane.get(c) if lane.get(c) is not None else "")
                   for c in CAMPOS]
        sys.stdout.write("lane%s%s%s%s\n"
                         % (SEP, ident, SEP, SEP.join(valores)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
