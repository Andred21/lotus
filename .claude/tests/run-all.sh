#!/usr/bin/env bash
# Roda toda a suite do harness. Veredito: ultima linha e codigo de saida.

dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
FALHAS_TESTE=0
# shellcheck source=/dev/null
source "$dir/_assert.sh"

# Pre-voo, no shell principal: se nao da para criar repo descartavel, PARE antes
# de sourcear qualquer teste. O `criar_repo` roda dentro de `$(...)`, entao o
# `exit` dele mata so o subshell — o path volta vazio e todo `git -C "$vazio"`
# cai no diretorio atual, que e o repo real. Sem esta trava a suite chegou a
# criar branches e deixar o repo real em detached HEAD.
_sonda=$(mktemp -d "${TMPDIR:-/tmp}/lotus-hooks-sonda.XXXXXX" 2>/dev/null) || _sonda=''
if [[ -z $_sonda || ! -d $_sonda ]]; then
  printf 'ABORTADO: TMPDIR nao serve para repo descartavel; nao vou rodar git contra o repo real\n' >&2
  exit 1
fi
rmdir "$_sonda"

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
