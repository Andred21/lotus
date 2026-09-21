#!/usr/bin/env python3
"""Le o frontmatter de um state.md e emite uma linha por lane, com TAB.

Contrato:
  argv[1]  caminho do state.md
  stdout   lane<TAB>id<TAB>workflow_state<TAB>active_work_item<TAB>branch
           <TAB>tree<TAB>next_action
  exit 0   sempre. Arquivo ausente, frontmatter ausente ou YAML invalido
           emitem nada: quem chama nao distingue os casos, e nao precisa.
"""

import sys

import yaml

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
        sys.stdout.write("lane\t%s\t%s\n" % (ident, "\t".join(valores)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
