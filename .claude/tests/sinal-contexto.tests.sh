[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
unset LOTUS_CONTEXTO_LIMIAR  # a sessao pode herdar o limiar de prova; cada caso passa o dele por comando
# Sinal de contexto cheio (spec do bloco 37, secao 2): o sinal-contexto.sh
# contra transcripts JSONL gerados aqui, com usage controlado. As marcas das
# sessoes de teste se chamam lotus-contexto-teste-* e saem no comeco e no fim.
SINAL="$DIR_HOOKS/sinal-contexto.sh"

# Fixtures de transcript. A soma do usage se reparte em 2 de input, 2000 de
# cache_creation e o resto em cache_read: em 151234 so a soma dos tres passa de
# 150000, entao um hook que leia um campo so fica calado e reprova.
sc_assistant() {
  # $1 = soma do usage (0 = mensagem sintetica), $2 = isSidechain (padrao false)
  local total=$1 lado=${2:-false}
  if (( total == 0 )); then
    jq -nc --argjson sc "$lado" \
      '{type:"assistant", isSidechain:$sc, message:{model:"<synthetic>",
        usage:{input_tokens:0, cache_creation_input_tokens:0, cache_read_input_tokens:0}}}'
  else
    jq -nc --argjson t "$total" --argjson sc "$lado" \
      '{type:"assistant", isSidechain:$sc, message:{model:"claude-teste",
        usage:{input_tokens:2, cache_creation_input_tokens:2000, cache_read_input_tokens:($t - 2002)}}}'
  fi
}
sc_user() { printf '%s\n' '{"type":"user","isSidechain":false,"message":{"role":"user","content":"oi"}}'; }
sc_compactacao() {
  # O que o /compact grava antes da primeira resposta nova: a fronteira e o resumo.
  printf '%s\n' '{"type":"system","subtype":"compact_boundary","isSidechain":false}' \
    '{"type":"user","isSidechain":false,"isCompactSummary":true,"message":{"role":"user","content":"resumo"}}'
}
sc_payload() {
  # $1 = evento, $2 = session_id, $3 = transcript_path, $4 = agent_id (opcional)
  jq -nc --arg ev "$1" --arg sid "$2" --arg tp "$3" --arg ag "${4:-}" \
    '{session_id:$sid, transcript_path:$tp, cwd:"/tmp", hook_event_name:$ev}
     + (if $ag == "" then {} else {agent_id:$ag, agent_type:"Explore"} end)'
}
sc_marca() { if [[ -e "${TMPDIR:-/tmp}/lotus-contexto-$1.marca" ]]; then printf sim; else printf nao; fi; }
sc_evento() { campo_json "$SAIDA_HOOK" '.hookSpecificOutput.hookEventName'; }
sc_aviso() { campo_json "$SAIDA_HOOK" '.systemMessage'; }
sc_limpar() { rm -f "${TMPDIR:-/tmp}"/lotus-contexto-teste-*.marca; }

sc_limpar
_sc_d=$(mktemp -d "${TMPDIR:-/tmp}/lotus-sinal.XXXXXX") || _sc_d=''
[[ -n $_sc_d && -d $_sc_d ]] || { printf 'ABORTADO: sem diretorio descartavel para o transcript\n' >&2; exit 1; }
registrar_descarte "$_sc_d"
_sc_t="$_sc_d/transcript.jsonl"

# --- 1. abaixo do limiar
{ sc_user; sc_assistant 90000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-abaixo "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'abaixo do limiar nao avisa'
assert_igual nao "$(sc_marca teste-abaixo)" 'abaixo do limiar nao cria marca'

# --- 2. acima, PostToolUse: so a soma dos tres campos passa do limiar
{ sc_user; sc_assistant 151234; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-post "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'acima avisa no PostToolUse, com o evento do payload'
_sc_ctx=$(campo_json "$SAIDA_HOOK" '.hookSpecificOutput.additionalContext')
assert_contem "$_sc_ctx" 'Contexto em ~151 mil tokens, acima de 150 mil' 'o aviso traz a soma dos tres campos e o limiar'
assert_contem "$_sc_ctx" '/compact' 'o aviso diz o que pedir ao Joao'
assert_igual "$_sc_ctx" "$(sc_aviso)" 'systemMessage leva ao Joao o mesmo texto do additionalContext'
assert_igual sim "$(sc_marca teste-post)" 'o aviso cria a marca da sessao'

# --- 3. acima, UserPromptSubmit
acionar_hook "$SINAL" "$(sc_payload UserPromptSubmit teste-prompt "$_sc_t")"
assert_igual UserPromptSubmit "$(sc_evento)" 'acima avisa no UserPromptSubmit, com o evento do payload'

# --- 4. mesma sessao, ainda acima
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-post "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'a marca cala o aviso ate o fim da travessia'

# --- 5. cai abaixo (o caminho do /compact) e volta acima
{ sc_user; sc_assistant 40000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-post "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'abaixo do limiar, depois do aviso, fica calado'
assert_igual nao "$(sc_marca teste-post)" 'abaixo do limiar apaga a marca e rearma'
{ sc_user; sc_assistant 160000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-post "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~160 mil' 'a travessia seguinte avisa de novo'

# --- 6. a marca e por sessao
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-outra "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'outra sessao acima avisa: a marca e por sessao'

# --- 7. a sidechain grande nao mede o fio principal pequeno
{ sc_user; sc_assistant 30000; sc_assistant 190000 true; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-lado "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'entrada de sidechain nao mede o fio principal'

# --- 8. dentro de subagente
{ sc_user; sc_assistant 200000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-agente "$_sc_t" agente-1)"
assert_igual '' "$SAIDA_HOOK" 'payload com agent_id (dentro de subagente) nao avisa'
assert_igual nao "$(sc_marca teste-agente)" 'dentro de subagente nao cria marca'

# --- 9. evento fora dos dois
acionar_hook "$SINAL" "$(sc_payload Stop teste-stop "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'evento fora de PostToolUse e UserPromptSubmit nao avisa'

# --- 10. transcript ausente, transcript vazio, payload que nao e JSON
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-ausente "$_sc_d/nao-existe.jsonl")"
assert_igual '' "$SAIDA_HOOK" 'transcript ausente nao avisa'
: > "$_sc_d/vazio.jsonl"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-vazio "$_sc_d/vazio.jsonl")"
assert_igual '' "$SAIDA_HOOK" 'transcript vazio nao avisa'
acionar_hook "$SINAL" 'isto nao e json'
assert_igual '' "$SAIDA_HOOK" 'payload que nao e JSON nao avisa'

# --- 10b. linha pela metade no fim, como a gravacao assincrona deixa
{ sc_user; sc_assistant 170000; printf '%s' '{"type":"assistant","message":{"usage":{"input_tok'; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-quebrada "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~170 mil' 'linha pela metade no fim e ignorada; vale a ultima entrada valida'

# --- 11. mensagem sintetica de soma zero
{ sc_user; sc_assistant 180000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-sintetica "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'preparo da sintetica: acima avisa e cria a marca'
sc_assistant 0 >> "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-sintetica "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'entrada sintetica de soma zero nao e medicao'
assert_igual sim "$(sc_marca teste-sintetica)" 'a sintetica nao rearma: a marca continua'

# --- 12. cauda sem medicao: a entrada assistant ficou alem das 200 linhas
{ sc_user; sc_assistant 180000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-semmedida "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'preparo da cauda: acima avisa e cria a marca'
_sc_u=$(sc_user)
for _sc_i in {1..200}; do printf '%s\n' "$_sc_u"; done >> "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-semmedida "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'cauda de 200 linhas sem entrada assistant nao avisa'
assert_igual sim "$(sc_marca teste-semmedida)" 'falta de medicao nao rearma: a marca continua'
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-semmedida-nova "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'a leitura e so da cauda: a entrada alem de 200 linhas nao conta'

# --- 13. LOTUS_CONTEXTO_LIMIAR
{ sc_user; sc_assistant 25000; } > "$_sc_t"
LOTUS_CONTEXTO_LIMIAR=20000 acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-limiar "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~25 mil tokens, acima de 20 mil' 'LOTUS_CONTEXTO_LIMIAR troca o limiar'
# Limiar invalido cai no padrao, nao silencia: acima de 150 mil ainda avisa.
{ sc_user; sc_assistant 160000; } > "$_sc_t"
LOTUS_CONTEXTO_LIMIAR=abc acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-limiar-texto "$_sc_t")"
assert_contem "$(sc_aviso)" 'acima de 150 mil' 'limiar que nao e numero cai no padrao de 150 mil'
LOTUS_CONTEXTO_LIMIAR=0 acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-limiar-zero "$_sc_t")"
assert_contem "$(sc_aviso)" 'acima de 150 mil' 'limiar zero cai no padrao de 150 mil'

# --- RF1. depois do /compact a medicao anterior nao vale
{ sc_user; sc_assistant 170000; sc_compactacao; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload UserPromptSubmit teste-compactou "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'medicao anterior ao compact_boundary nao conta'
sc_assistant 155000 >> "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-compactou "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~155 mil' 'a medicao depois do compact_boundary conta'

# --- RF2. session_id com caractere de caminho
{ sc_user; sc_assistant 200000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse 'teste-../../fuga' "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'session_id com barra ainda avisa'
assert_igual sim "$(sc_marca 'teste-______fuga')" 'a marca troca o que nao e nome por _ e fica no TMPDIR'

# --- RF3. TMPDIR sem escrita
TMPDIR="$_sc_d/nao-existe" acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-semtmp "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'sem onde gravar a marca, cala em vez de avisar a cada ferramenta'

# --- RF4. usage com campo nulo, campo que nao e numero e message que nao e objeto
printf '%s\n' '{"type":"assistant","isSidechain":false,"message":{"usage":{"input_tokens":"x","cache_read_input_tokens":null,"cache_creation_input_tokens":155000}}}' \
  '{"type":"assistant","isSidechain":false,"message":"texto"}' > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-campos "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~155 mil' 'campo nulo ou que nao e numero conta 0, e message estranha nao derruba'

# --- RF5. transcript_path com espaco
mkdir -p "$_sc_d/com espaco"
{ sc_user; sc_assistant 200000; } > "$_sc_d/com espaco/t.jsonl"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-espaco "$_sc_d/com espaco/t.jsonl")"
assert_igual PostToolUse "$(sc_evento)" 'transcript_path com espaco e lido'

# --- 14. o settings.json real liga o hook nos dois eventos, sem filtro de ferramenta
for _sc_ev in PostToolUse UserPromptSubmit; do
  _sc_n=$(jq --arg ev "$_sc_ev" \
    '[.hooks[$ev][]? | select((.matcher // "") == "" or .matcher == "*")
      | .hooks[]? | select(.type == "command"
                           and (.command | test("/\\.claude/hooks/sinal-contexto\\.sh")))] | length' \
    "$DIR_TESTES/../settings.json" 2>/dev/null)
  assert_igual 1 "$_sc_n" "settings.json liga o sinal-contexto.sh em $_sc_ev, uma vez e sem filtro de ferramenta"
done

sc_limpar
