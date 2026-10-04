#!/usr/bin/env bash
# Avisa quando o contexto da sessao passa do limiar absoluto: 150000 tokens, o
# mesmo em qualquer modelo (LOTUS_CONTEXTO_LIMIAR troca, para teste e prova ao
# vivo). Nao compacta: nenhum hook dispara compactacao. O aviso manda fechar a
# unidade atual e pedir /compact ao Joao.
# A medicao e o usage da ultima chamada a API gravada no transcript: numero
# real, com atraso de uma chamada: a resposta e o resultado da ferramenta so
# entram no prompt da chamada seguinte.
# Uma vez por travessia: a marca em TMPDIR cala o aviso ate a medicao voltar
# para baixo do limiar, o caminho depois de um /compact. Sem medicao nao
# rearma: falta de numero nao e "abaixo".
# Contrato: hookSpecificOutput.additionalContext para o modelo, systemMessage
# para o Joao. exit 0 sempre. Falha aberta.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

LIMIAR_PADRAO=150000

medir() {
  # $1 = transcript. Ecoa o contexto da ultima chamada do fio principal, ou
  # nada. So a cauda: o PostToolUse roda a cada ferramenta e o transcript
  # cresce sem teto. fromjson? descarta a linha que a gravacao assincrona
  # deixou pela metade. A soma pega so numeros; soma zero e mensagem sintetica
  # do Claude Code, nao chamada a API. O compact_boundary zera a medicao: ate
  # a primeira resposta depois de um /compact, a ultima entrada e a de antes.
  tail -n 200 -- "$1" 2>/dev/null | jq -R -n -r '
    def soma: [.message.usage | .input_tokens, .cache_read_input_tokens,
               .cache_creation_input_tokens] | map(numbers) | add // 0;
    reduce (inputs | fromjson? | objects) as $e (null;
      if $e.type == "system" and $e.subtype == "compact_boundary" then null
      elif $e.type == "assistant" and $e.isSidechain != true
           and ($e.message | type) == "object"
           and ($e.message.usage | type) == "object"
           and ($e | soma) > 0
      then $e | soma
      else . end)
    | values' 2>/dev/null
}

corpo() {
  ler_payload
  local evento transcript medida limiar sid marca

  evento=$(campo '.hook_event_name')
  [[ $evento == PostToolUse || $evento == UserPromptSubmit ]] || return 0
  # Dentro de subagente o aviso iria para ele e morreria com ele.
  [[ -n $(campo '.agent_id') ]] && return 0
  transcript=$(campo '.transcript_path')
  [[ -n $transcript && -f $transcript && -r $transcript ]] || return 0

  medida=$(medir "$transcript")
  [[ $medida =~ ^[0-9]+$ ]] || return 0

  limiar=${LOTUS_CONTEXTO_LIMIAR:-}
  [[ $limiar =~ ^[1-9][0-9]*$ ]] || limiar=$LIMIAR_PADRAO

  # O nome da marca vem do payload: so caractere de nome entra no caminho.
  sid=$(campo '.session_id'); [[ -z $sid ]] && sid=sem-sessao
  sid=${sid//[^A-Za-z0-9_-]/_}
  marca="${TMPDIR:-/tmp}/lotus-contexto-${sid}.marca"

  if (( medida <= limiar )); then
    rm -f -- "$marca" 2>/dev/null
    return 0
  fi
  [[ -e $marca ]] && return 0
  # Sem marca o aviso sairia a cada ferramenta: o silencio vence o spam.
  { : > "$marca"; } 2>/dev/null || return 0

  injetar_contexto "$evento" "Contexto em ~$((medida / 1000)) mil tokens, acima de \
$((limiar / 1000)) mil. Nao abra unidade nova: feche a task atual, grave em \
fronteira duravel (commit, estado.md) e peca ao Joao /compact ou /clear. Este \
aviso nao repete ate o contexto cair abaixo do limiar."
  return 0
}

corpo || true
exit 0
