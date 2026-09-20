#!/usr/bin/env bash
# Roda toda a suite do harness. Veredito: ultima linha e codigo de saida.

dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
FALHAS_TESTE=0
# shellcheck source=/dev/null
source "$dir/_assert.sh"

arquivos=("$dir"/*.tests.sh)
for a in "${arquivos[@]}"; do
  printf '== %s\n' "$(basename "$a")"
  # shellcheck source=/dev/null
  source "$a"
done
limpar_descartes

printf '\n'
if (( FALHAS_TESTE > 0 )); then
  printf 'FALHOU: %d asercao(oes)\n' "$FALHAS_TESTE"
  exit 1
fi
printf 'OK: %d arquivo(s) de teste, nenhuma falha\n' "${#arquivos[@]}"
exit 0
