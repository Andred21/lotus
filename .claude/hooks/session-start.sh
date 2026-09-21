#!/usr/bin/env bash
# Injeta o estado real das lanes no inicio da sessao.
# Nao e porte: o harness de origem lia um lane.ps1 que ficou fora de escopo.
# A fonte aqui e o disco — `git worktree list` mais o state.md de cada arvore.
# Contrato: SessionStart NUNCA bloqueia. Texto puro no stdout, exit 0.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

LER_ESTADO="$DIR/lib/ler-estado.py"

corpo() {
  ler_payload
  local cwd raiz branch_atual head sujos
  cwd=$(campo '.cwd')
  [[ -z $cwd ]] && return 0
  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0
  branch_atual=$(branch_de "$raiz")
  head=$(git -C "$raiz" rev-parse --short HEAD 2>/dev/null)
  sujos=$(git -C "$raiz" status --porcelain 2>/dev/null | wc -l)

  # --- inventario das arvores
  local -a arv_caminho=() arv_branch=()
  local linha cam='' br=''
  while IFS= read -r linha; do
    case $linha in
      'worktree '*) cam=${linha#worktree }; br='(sem branch)' ;;
      'branch refs/heads/'*) br=${linha#branch refs/heads/} ;;
      'detached') br='(detached)' ;;
      '') [[ -n $cam ]] && { arv_caminho+=("$cam"); arv_branch+=("$br"); cam=''; } ;;
    esac
  done < <(git -C "$raiz" worktree list --porcelain 2>/dev/null; printf '\n')

  # A arvore da main e a referencia: o state.md dela e o que descreve todas
  # as lanes.
  local principal='' i
  for i in "${!arv_caminho[@]}"; do
    [[ ${arv_branch[$i]} == main ]] && principal=${arv_caminho[$i]}
  done
  [[ -z $principal ]] && principal=$raiz
  local estado_principal="$principal/docs/superpowers/state.md"
  [[ -f $estado_principal ]] || return 0

  local -a linhas=() vencidas=() interrompidas=() reclamadas=()
  linhas+=('Harness de blocos. Lanes:')
  linhas+=('')

  local id ws item br_lane tree na marca outro estado_outro ws2 item2
  while IFS=$'\t' read -r _ id ws item br_lane tree na; do
    reclamadas+=("$br_lane")
    marca='  '
    [[ -n $br_lane && $br_lane == "$branch_atual" ]] && marca='* '
    linhas+=("${marca}${id} [${ws:-sem-estado}] ${item:-sem-item} em ${tree:-sem-arvore} (${br_lane:-sem-branch}) -> ${na:-sem-proxima-acao}")

    outro=$tree
    [[ $outro != /* ]] && outro="$principal/$tree"
    estado_outro="$outro/docs/superpowers/state.md"
    if [[ -d $outro ]]; then
      if [[ $(realpath -m "$outro") != "$(realpath -m "$principal")" && -f $estado_outro ]]; then
        # Compara o que a main diz da lane com o que a arvore da lane diz de
        # si mesma. Foi esta divergencia — a main dizendo lane-c idle enquanto
        # a arvore dizia executing — que custou duas paradas no planejamento
        # deste bloco.
        IFS=$'\t' read -r _ _ ws2 item2 _ < <(python3 "$LER_ESTADO" "$estado_outro" | awk -F'\t' -v k="$id" '$2==k')
        if [[ -n $ws2 && ( $ws2 != "$ws" || $item2 != "$item" ) ]]; then
          vencidas+=("$id: a main diz [$ws / ${item:-sem-item}], a arvore $tree diz [$ws2 / ${item2:-sem-item}]")
        fi
      fi
    elif [[ $ws == ready_for_closure ]]; then
      interrompidas+=("$id em ready_for_closure, e a arvore $tree nao existe no disco")
    fi
  done < <(python3 "$LER_ESTADO" "$estado_principal")

  # Arvore no disco que nenhuma lane reclama.
  local orfas=() j reclamada
  for i in "${!arv_caminho[@]}"; do
    reclamada=0
    for j in "${reclamadas[@]}"; do
      [[ $j == "${arv_branch[$i]}" ]] && reclamada=1
    done
    (( reclamada == 0 )) && [[ ${arv_branch[$i]} != main ]] \
      && orfas+=("${arv_caminho[$i]} em ${arv_branch[$i]}")
  done

  linhas+=('')
  linhas+=("Git agora: branch=$branch_atual HEAD=$head arquivos-modificados=$sujos")
  linhas+=('A lane marcada com * e a desta sessao. As demais pertencem a outras sessoes: nao mexa nelas.')
  linhas+=('HEAD a frente do campo commit e NORMAL: o estado so e reescrito em fronteira duravel.')
  linhas+=('Divergencia entre o estado, o plano, a spec e o git bloqueia a sessao: pare e relate.')

  if (( ${#vencidas[@]} > 0 )); then
    linhas+=('')
    linhas+=('ESTADO VENCIDO — a main e a arvore da lane discordam:')
    for i in "${!vencidas[@]}"; do linhas+=("  ${vencidas[$i]}"); done
    linhas+=('Quem manda e o state.md da arvore que esta executando. Nao promova nada ate reconciliar.')
  fi
  if (( ${#interrompidas[@]} > 0 )); then
    linhas+=('')
    linhas+=('FECHAMENTO INTERROMPIDO:')
    for i in "${!interrompidas[@]}"; do linhas+=("  ${interrompidas[$i]}"); done
    linhas+=('O merge pode ter acontecido e o fechamento nao. Nao apague a branch antes de conferir.')
  fi
  if (( ${#orfas[@]} > 0 )); then
    linhas+=('')
    linhas+=('ARVORE ORFA — no disco, sem lane que a reclame:')
    for i in "${!orfas[@]}"; do linhas+=("  ${orfas[$i]}"); done
  fi

  printf '%s\n' "${linhas[@]}"
  return 0
}

corpo || true
exit 0
