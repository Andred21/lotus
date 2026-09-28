#!/usr/bin/env bash
# Injeta o estado real das lanes no inicio da sessao.
# A fonte e `lane.sh descobrir`: `git worktree list` mais o estado.md de cada
# lane, lido na arvore dela (spec 2026-09-26, 4.3). Nao ha mais estado central
# para comparar com o da arvore: cada bloco guarda o seu na propria pasta, e
# duas lanes nunca escrevem o mesmo arquivo.
# Contrato: SessionStart NUNCA bloqueia. Texto puro no stdout, exit 0.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"
# shellcheck source=/dev/null
source "$DIR/lib/estados.sh"

LANE="$DIR/../scripts/lane.sh"

corpo() {
  ler_payload
  local cwd raiz branch_atual head sujos
  cwd=$(campo '.cwd')
  [[ -z $cwd ]] && return 0
  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0
  [[ -f $LANE ]] || return 0
  branch_atual=$(branch_de "$raiz")
  head=$(git -C "$raiz" rev-parse --short HEAD 2>/dev/null)
  sujos=$(git -C "$raiz" status --porcelain 2>/dev/null | wc -l)

  local -a linhas=() orfas=() interrompidas=() incoerencias=()
  local tipo a b c d e f marca offset problema minha='' n_lanes=0
  linhas+=('Harness de blocos. Lanes:' '')
  # Separador US, nao TAB: ver o docstring do ler-frontmatter.py.
  while IFS=$'\x1f' read -r tipo a b c d e f; do
    case $tipo in
      lane)
        # a=NN b=workflow_state c=branch d=arvore e=next_action f=offset
        n_lanes=$((n_lanes + 1))
        marca='  '
        if [[ $(realpath -m "$d") == "$(realpath -m "$raiz")" ]]; then
          marca='* '
          minha=$a
          # So a lane da sessao e conferida: as outras pertencem a outras
          # sessoes, e alarme que esta sessao nao pode resolver treina a
          # ignorar alarme.
          while IFS= read -r problema; do
            [[ -n $problema ]] && incoerencias+=("$problema")
          done < <(coerencia_da_lane "$raiz/docs/superpowers/blocos/${c#*/}/estado.md" \
                     "$branch_atual" "$raiz")
        fi
        if [[ -n $f ]]; then offset="offset +$f"; else offset='sem offset'; fi
        linhas+=("${marca}${a} [${b:-sem-estado}] ${c} em ${d} (${offset}) -> ${e:-sem-proxima-acao}")
        ;;
      orfa) orfas+=("$a em $b") ;;
      sem-arvore) interrompidas+=("$a: a branch $b existe e nao tem worktree") ;;
    esac
  done < <(cd "$raiz" && bash "$LANE" descobrir 2>/dev/null)
  (( n_lanes == 0 )) && linhas+=('  Nenhuma lane viva.')

  linhas+=('')
  linhas+=("Git agora: branch=$branch_atual HEAD=$head arquivos-modificados=$sujos")
  if [[ -n $minha ]]; then
    linhas+=("Esta sessao e a lane $minha (marcada com *). As demais pertencem a outras sessoes: nao mexa nelas.")
    linhas+=("Estado dela: docs/superpowers/blocos/${branch_atual#*/}/estado.md. Contrato: docs/superpowers/state.md.")
  else
    linhas+=('Esta sessao nao esta numa lane. As lanes acima pertencem a outras sessoes: nao mexa nelas.')
  fi
  linhas+=('HEAD a frente do campo commit e NORMAL: o estado so e reescrito em fronteira duravel.')
  linhas+=('Divergencia entre o estado, o plano, a spec e o git bloqueia a sessao: pare e relate.')

  local i
  if (( ${#incoerencias[@]} > 0 )); then
    linhas+=('' "ESTADO INCOERENTE — lane $minha:")
    for i in "${!incoerencias[@]}"; do linhas+=("  ${incoerencias[$i]}"); done
    linhas+=('Corrija o estado.md antes de seguir. Nao escolha fonte por heuristica.')
  fi
  if (( ${#interrompidas[@]} > 0 )); then
    linhas+=('' 'FECHAMENTO INTERROMPIDO — branch de lane sem worktree:')
    for i in "${!interrompidas[@]}"; do linhas+=("  ${interrompidas[$i]}"); done
    linhas+=('O merge pode ter acontecido e o fechamento nao. Nao apague a branch antes de conferir.')
  fi
  if (( ${#orfas[@]} > 0 )); then
    linhas+=('' 'ARVORE ORFA — worktree fora do padrao de lane <tipo>/<NN>-<slug>:')
    for i in "${!orfas[@]}"; do linhas+=("  ${orfas[$i]}"); done
  fi

  printf '%s\n' "${linhas[@]}"
  return 0
}

corpo || true
exit 0
