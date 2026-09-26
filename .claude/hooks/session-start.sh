#!/usr/bin/env bash
# Injeta o estado real das lanes no inicio da sessao.
# Nao e porte: o harness de origem lia um lane.ps1 que ficou fora de escopo.
# A fonte aqui e o disco — `git worktree list` mais o state.md de cada arvore.
# Contrato: SessionStart NUNCA bloqueia. Texto puro no stdout, exit 0.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

LER_ESTADO="$DIR/lib/ler-estado.py"

resolver_arvore() {
  # $1 = campo `tree` da lane, $2 = arvore principal.
  # `main-tree` e o sentinela que as skills revisar-sprint e fechar-sprint
  # documentam para dizer "o repositorio principal". Sem traduzi-lo o caminho
  # virava "$principal/main-tree", que nao existe no disco: a comparacao de
  # estado daquela lane era pulada EM SILENCIO e uma lane em ready_for_closure
  # ganhava um FECHAMENTO INTERROMPIDO falso.
  local t=$1 p=$2
  [[ -z $t ]] && return 0
  [[ $t == main-tree ]] && { printf '%s' "$p"; return 0; }
  [[ $t == /* ]] && { printf '%s' "$t"; return 0; }
  printf '%s' "$p/$t"
}

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

  local -a linhas=() vencidas=() interrompidas=() reclamadas=() ajustadas=()
  linhas+=('Harness de blocos. Lanes:')
  linhas+=('')

  # O separador e o Unit Separator (0x1F), nao TAB: TAB e espaco em branco
  # para o IFS e uma sequencia de TABs COLAPSA, entao um campo vazio no meio
  # empurra todos os seguintes uma casa para a esquerda. Ver o docstring do
  # ler-estado.py.
  local id ws item br_lane tree na marca outro estado_outro ws2 item2
  while IFS=$'\x1f' read -r _ id ws item br_lane tree na; do
    outro=$(resolver_arvore "$tree" "$principal")
    # A lane e reclamada pela ARVORE, nao pela branch: `branch` descreve a
    # branch de quando aquele state.md foi escrito e envelhece assim que a
    # outra sessao troca de branch; `tree` e estavel. Com a comparacao por
    # branch, tres das quatro arvores do repositorio real apareciam como
    # orfas — e a lane da propria sessao podia perder o `*`.
    reclamadas+=("$outro")
    marca='  '
    [[ -n $outro && $(realpath -m "$outro") == "$(realpath -m "$raiz")" ]] && marca='* '

    estado_outro="$outro/docs/superpowers/state.md"
    ws2=''; item2=''
    if [[ -n $outro && -d $outro ]]; then
      if [[ $(realpath -m "$outro") != "$(realpath -m "$principal")" && -f $estado_outro ]]; then
        # Compara o que a main diz da lane com o que a arvore da lane diz de
        # si mesma. Foi esta divergencia — a main dizendo lane-c idle enquanto
        # a arvore dizia executing — que custou duas paradas no planejamento
        # deste bloco.
        IFS=$'\x1f' read -r _ _ ws2 item2 _ < <(python3 "$LER_ESTADO" "$estado_outro" | awk -F$'\x1f' -v k="$id" '$2==k')
      fi
    elif [[ $ws == ready_for_closure ]]; then
      interrompidas+=("$id em ready_for_closure, e a arvore $tree nao existe no disco")
    fi

    if [[ -n $ws2 ]]; then
      if [[ $item2 != "$item" ]]; then
        vencidas+=("$id: a main diz [$ws / ${item:-sem-item}], a arvore $tree diz [$ws2 / ${item2:-sem-item}]")
      elif [[ $ws == idle && $ws2 != idle ]]; then
        vencidas+=("$id: a main diz $ws, mas a arvore $tree esta em $ws2 — a lane parece livre e nao esta")
      elif [[ $ws2 != "$ws" ]]; then
        # Mesmo item, estado diferente: e o ciclo andando dentro da branch,
        # que e o caminho feliz — a main so e reescrita em fronteira duravel,
        # como a propria saida avisa duas linhas abaixo. Gritar aqui acusava
        # TODA lane em trabalho e treinava o leitor a ignorar o alarme. Quem
        # manda e a arvore, entao exibe o estado dela e segue sem alarme.
        ws=$ws2
        ajustadas+=("$id")
      fi
    fi

    linhas+=("${marca}${id} [${ws:-sem-estado}] ${item:-sem-item} em ${tree:-sem-arvore} (${br_lane:-sem-branch}) -> ${na:-sem-proxima-acao}")
  done < <(python3 "$LER_ESTADO" "$estado_principal")

  # Arvore no disco que nenhuma lane reclama.
  local orfas=() j reclamada alvo
  for i in "${!arv_caminho[@]}"; do
    reclamada=0
    alvo=$(realpath -m "${arv_caminho[$i]}")
    for j in "${reclamadas[@]}"; do
      [[ -n $j && $(realpath -m "$j") == "$alvo" ]] && reclamada=1
    done
    (( reclamada == 0 )) && [[ ${arv_branch[$i]} != main ]] \
      && orfas+=("${arv_caminho[$i]} em ${arv_branch[$i]}")
  done

  linhas+=('')
  linhas+=("Git agora: branch=$branch_atual HEAD=$head arquivos-modificados=$sujos")
  linhas+=('A lane marcada com * e a desta sessao. As demais pertencem a outras sessoes: nao mexa nelas.')
  linhas+=('HEAD a frente do campo commit e NORMAL: o estado so e reescrito em fronteira duravel.')
  linhas+=('Divergencia entre o estado, o plano, a spec e o git bloqueia a sessao: pare e relate.')
  if (( ${#ajustadas[@]} > 0 )); then
    linhas+=("Estado entre colchetes lido da arvore da lane (a main ficou na fronteira anterior): ${ajustadas[*]}")
  fi

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
