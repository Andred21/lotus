#!/usr/bin/env bash
# Portao de efeito externo do /finalizar-bloco (spec do bloco 36, secao 1).
# `gerar` monta o aceitacao.md do bloco a partir da secao
# `## Verificacao externa` da spec dele. Existe como script, e nao como prosa
# no command, porque portao escrito em prosa o agente executa de cabeca e
# pula (a licao do aceitacao.ps1 do ElaDecora).
#
# Contrato: recusa sai como `PORTAO RECUSOU: <motivo>` no stderr, com exit
# 2, antes de escrever qualquer coisa. A leitura e a escrita do markdown
# moram em lib/aceitacao.py; aqui ficam o argumento e a raiz da arvore. O
# arquivo de aliases entra por ACEITACAO_ALIASES, para a suite usar o dela.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/../hooks/lib/comum.sh"

LER_FM="$DIR/../hooks/lib/ler-frontmatter.py"
ACEITACAO_PY="$DIR/lib/aceitacao.py"
ALIASES=${ACEITACAO_ALIASES:-$DIR/../aceitacao-aliases.conf}
PADRAO_NN='^[1-9][0-9]*$'
# Unit Separator (0x1F), nao TAB: ver o docstring do ler-frontmatter.py.
SEP=$'\x1f'

recusar() {
  printf 'PORTAO RECUSOU: %s\n' "$1" >&2
  exit 2
}

(( $# == 2 )) || recusar 'uso: aceitacao.sh gerar <NN>'
VERBO=$1
NN=$2
[[ $VERBO == gerar ]] || recusar "verbo '$VERBO' desconhecido; use gerar"
[[ $NN =~ $PADRAO_NN ]] || recusar "NN '$NN' nao e numero de ficha"

RAIZ=$(raiz_de "$PWD")
[[ -n $RAIZ ]] || recusar "fora de um repositorio git ($PWD)"
cd "$RAIZ" || recusar "nao deu para entrar em $RAIZ"

# A pasta do bloco e a unica docs/superpowers/blocos/<NN>-*/ com estado.md.
estados=()
for e in docs/superpowers/blocos/"$NN"-*/estado.md; do
  [[ -f $e ]] && estados+=("$e")
done
(( ${#estados[@]} > 0 )) || recusar "nenhuma pasta docs/superpowers/blocos/$NN-*/ com estado.md nesta arvore"
(( ${#estados[@]} == 1 )) || recusar "mais de uma pasta do bloco $NN com estado.md: ${estados[*]}"
PASTA=${estados[0]%/estado.md}
ALVO=$PASTA/aceitacao.md

SPEC='' EFEITO=''
IFS=$SEP read -r SPEC EFEITO < <(python3 "$LER_FM" "${estados[0]}" active_spec efeito_externo)
[[ $EFEITO == sim ]] \
  || recusar "$PASTA/estado.md diz efeito_externo: ${EFEITO:-null}; o aceitacao.sh so roda com sim"
[[ -n $SPEC ]] || recusar "$PASTA/estado.md nao tem active_spec"
[[ -f $SPEC ]] || recusar "o active_spec de $PASTA/estado.md aponta para $SPEC, que nao existe"

# O valor do marcador {LOTUS_DEV_HTTP_PORT}: o .env da raiz lido como o
# offset_da_arvore do lane.sh o le (so digitos; a ultima linha vence), e
# 8080 sem .env ou sem a chave.
PORTA=$(sed -nE "s/^[[:space:]]*LOTUS_DEV_HTTP_PORT=[\"']?([0-9]+)[\"']?[[:space:]]*\$/\1/p" \
  .env 2>/dev/null | tail -n 1)
[[ -n $PORTA ]] || PORTA=8080

case $VERBO in
  gerar)
    python3 "$ACEITACAO_PY" gerar "$SPEC" "$ALVO" "$ALIASES" "$PORTA" "$NN"
    cod=$?
    (( cod == 0 || cod == 2 )) || recusar "lib/aceitacao.py saiu $cod"
    exit "$cod"
    ;;
esac
