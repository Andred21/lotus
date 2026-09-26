#!/usr/bin/env bash
# Restringe o shell quando a branch da arvore e `main`.
# Duas politicas opostas, de proposito:
#   - falha ABERTA por infraestrutura: nao deu para saber se e a main, entao
#     nao ha o que guardar;
#   - falha FECHADA por classificacao: o comando existe e nao deu para
#     entende-lo, que e exatamente a hipotese que a allowlist trata.
# Contrato: exit 0 sempre, JSON no stdout.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

corpo() {
  ler_payload
  local cmd cwd raiz branch motivo codigo
  cmd=$(campo '.tool_input.command')
  cwd=$(campo '.cwd')
  [[ -z $cmd ]] && return 0

  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0
  branch=$(branch_de "$raiz")
  [[ $branch != main ]] && return 0

  motivo=$(LOTUS_RAIZ="$raiz" python3 "$DIR/lib/classificar-comando.py" "$cmd" 2>/dev/null)
  codigo=$?
  if (( codigo != 0 )); then
    negar_pretooluse "Bloqueado pelo harness: o classificador de comando \
falhou (codigo $codigo, arquivo $DIR/lib/classificar-comando.py). Na \`main\`, \
comando que nao da para classificar e negado. Rode no seu terminal."
    return 0
  fi
  [[ -n $motivo ]] && negar_pretooluse "$motivo"
  return 0
}

corpo || true
exit 0
