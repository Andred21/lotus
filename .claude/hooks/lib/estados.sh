# Mapa estado -> token do next_action e coerencia de um estado.md
# (spec 2026-09-26-harness-paridade-eladecora-design.md, 3.4 e 4.3).
# O mapa vive UMA vez aqui. A tabela "Estados validos" do state.md o espelha,
# e o estados.tests.sh reprova a divergencia nos dois sentidos (licao 19).

declare -gA TOKEN_DO_ESTADO=(
  [idle]=select_backlog_item
  [context_required]=generate_context_packet
  [ready_for_planning]=plan_active_work_item
  [planning]=continue_active_planning
  [ready_for_execution]=execute_active_plan
  [executing]=continue_active_plan
  [ready_for_review]=request_code_review
  [reviewing]=approve_review_findings
  [ready_for_closure]=close_active_work_item
  [closing]=answer_integration_menu
  [blocked]=resolve_blocker
  [closed]=none
)

# Ordem de fase para as regras "a partir de". `blocked` fica fora: nele a
# regua e o resume_state.
ORDEM_DE_FASE=(idle context_required ready_for_planning planning
               ready_for_execution executing ready_for_review reviewing
               ready_for_closure closing closed)

_ESTADOS_LER_FM="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/ler-frontmatter.py"

posicao_de_fase() {
  local i
  for i in "${!ORDEM_DE_FASE[@]}"; do
    [[ ${ORDEM_DE_FASE[$i]} == "$1" ]] && { printf '%s' "$i"; return 0; }
  done
  printf '%s' -1
}

coerencia_da_lane() {
  # $1 = estado.md, $2 = branch que o git da para a arvore, $3 = raiz da
  # arvore (os ponteiros active_* sao relativos a ela). Um problema por linha
  # no stdout; nada quando coerente.
  local estado=$1 branch_git=$2 raiz=$3
  if [[ ! -f $estado ]]; then
    printf 'sem estado.md em %s\n' "$estado"
    return 0
  fi
  local ws='' na='' br='' resume='' plano='' review='' efeito=''
  IFS=$'\x1f' read -r ws na br resume plano review efeito < <(python3 "$_ESTADOS_LER_FM" \
    "$estado" workflow_state next_action branch resume_state active_plan active_review efeito_externo)
  [[ $br == "$branch_git" ]] \
    || printf 'branch: o estado.md diz %s, o git diz %s\n' "${br:-vazio}" "$branch_git"
  local token=${TOKEN_DO_ESTADO[$ws]:-}
  if [[ -z $ws || -z $token ]]; then
    printf 'workflow_state desconhecido: %s\n' "${ws:-vazio}"
    return 0
  fi
  [[ ${na%% *} == "$token" ]] \
    || printf 'next_action: %s pede o token %s, e o estado.md diz %s\n' "$ws" "$token" "${na:-vazio}"
  local regua=$ws
  if [[ $ws == blocked ]]; then
    if [[ -z $resume ]]; then
      printf 'blocked sem resume_state\n'
      return 0
    fi
    regua=$resume
  fi
  local pos
  pos=$(posicao_de_fase "$regua")
  if (( pos < 0 )); then
    printf 'resume_state desconhecido: %s\n' "$regua"
    return 0
  fi
  if (( pos >= $(posicao_de_fase ready_for_execution) )); then
    if [[ -z $plano ]]; then
      printf 'active_plan vazio a partir de ready_for_execution\n'
    elif [[ ! -f $raiz/$plano ]]; then
      printf 'active_plan aponta para %s, que nao existe\n' "$plano"
    fi
    [[ $efeito == sim || $efeito == nao ]] \
      || printf 'efeito_externo %s a partir de ready_for_execution; vale sim ou nao, e null nunca vale nao\n' "${efeito:-null}"
  fi
  if (( pos >= $(posicao_de_fase ready_for_closure) )); then
    if [[ -z $review ]]; then
      printf 'active_review vazio a partir de ready_for_closure\n'
    elif [[ ! -f $raiz/$review ]]; then
      printf 'active_review aponta para %s, que nao existe\n' "$review"
    fi
  fi
  return 0
}
