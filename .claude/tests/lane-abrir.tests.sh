# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"

BACKLOG_PY_TESTE="$DIR_TESTES/../scripts/lib/backlog.py"
_ab33=chore/33-harness-sinal-de-contexto-cheio

nada_criado() {
  # $1 = main tree, $2 = titulo. Nem a branch nem a arvore da 33 existem.
  assert_igual '' "$(git -C "$1" branch --list "$_ab33")" "$2: nenhuma branch criada"
  if [[ -e "$(dirname "$1")/lotus-33-harness-sinal-de-contexto-cheio" ]]; then
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA %s: a arvore foi criada\n' "$2"
  else
    printf '  ok    %s: nenhuma arvore criada\n' "$2"
  fi
}

# --- backlog.py direto
_abl=$(criar_main_lane); registrar_descarte "$(dirname "$_abl")"
_ablb="$_abl/docs/superpowers/backlog.md"
bl() { python3 "$BACKLOG_PY_TESTE" "$@"; }
assert_igual "harness-estado-por-bloco${US}" "$(bl ficha "$_ablb" 30)" \
  'Depende — : sem dependencia, e o Escopo que cita **Depende:** nao conta'
assert_igual "harness-commands-de-bloco${US}30" "$(bl ficha "$_ablb" 31)" 'Depende 30'
assert_igual "ficha-sem-depende${US}SEM-DEPENDE" "$(bl ficha "$_ablb" 40)" 'ficha sem a declaracao'
assert_igual '' "$(bl ficha "$_ablb" 99)" 'ficha inexistente: nada'
assert_igual "harness-commands-de-bloco${US}30" "$(bl ficha "$_ablb" 031)" 'zero a esquerda acha a ficha'
assert_contem "$(bl conflito "$_ablb" 32 30)" '32 depende de 30' \
  'conflito transitivo, de quem abre para a lane viva'
assert_contem "$(bl conflito "$_ablb" 30 32)" 'a lane viva 32 depende de 30' \
  'conflito transitivo, da lane viva para quem abre'
assert_igual '' "$(bl conflito "$_ablb" 33 30 31)" 'fichas independentes: sem conflito'
assert_igual '' "$(bl conflito "$_ablb" 30 33)" 'citacao no Escopo nao cria dependencia'
assert_contem "$(bl conflito "$_ablb" 33 33)" 'ja tem lane viva' 'a propria ficha viva e conflito'

# --- argumentos
_ab1=$(criar_main_lane); registrar_descarte "$(dirname "$_ab1")"
rodar_lane "$_ab1" abrir 33 chore
assert_recusa 'uso' 'argumentos de menos'
rodar_lane "$_ab1" abrir 33 chore harness-sinal-de-contexto-cheio --modelo
assert_recusa 'uso' '--modelo sem alias'
rodar_lane "$_ab1" abrir 33 chore harness-sinal-de-contexto-cheio --outra opus
assert_recusa 'uso' 'flag desconhecida'
rodar_lane "$_ab1" abrir 3x chore harness-sinal-de-contexto-cheio
assert_recusa 'numero' 'NN nao numerico'
rodar_lane "$_ab1" abrir 033 chore harness-sinal-de-contexto-cheio
assert_recusa 'numero' 'NN com zero a esquerda'
rodar_lane "$_ab1" abrir 33 hotfix harness-sinal-de-contexto-cheio
assert_recusa 'tipo' 'tipo fora da D5'
rodar_lane "$_ab1" abrir 33 chore Harness_Sinal
assert_recusa 'slug' 'slug fora do padrao'
rodar_lane "$_ab1" abrir 33 chore harness-sinal-de-contexto-cheio --modelo OPUS
assert_recusa 'alias' 'alias de modelo fora do padrao'
nada_criado "$_ab1" 'argumentos invalidos'

# --- 1. main tree, na main
_ab1l=$(lane_manual "$_ab1" feat/41-livre-a)
rodar_lane "$_ab1l" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'main tree' 'abrir de dentro de uma lane'
git -C "$_ab1" checkout -q -b outra
rodar_lane "$_ab1" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'na main' 'main tree fora da main'
git -C "$_ab1" checkout -q main
nada_criado "$_ab1" 'recusa 1'

# --- 2. a ficha existe e o slug e o dela
rodar_lane "$_ab1" abrir 99 chore qualquer-coisa
assert_recusa 'nao existe' 'ficha inexistente'
rodar_lane "$_ab1" abrir 33 chore outro-slug
assert_recusa 'nao bate' 'slug diferente do da ficha'
nada_criado "$_ab1" 'recusa 2'

# --- 3. falha fechada sem **Depende:**
rodar_lane "$_ab1" abrir 40 feat ficha-sem-depende
assert_recusa 'Depende' 'ficha sem a linha Depende'
assert_igual '' "$(git -C "$_ab1" branch --list 'feat/40-*')" 'ficha sem Depende: nenhuma branch'

# --- 4. teto de tres lanes
_ab4=$(criar_main_lane); registrar_descarte "$(dirname "$_ab4")"
lane_manual "$_ab4" feat/41-livre-a >/dev/null
lane_manual "$_ab4" fix/42-livre-b >/dev/null
lane_manual "$_ab4" infra/43-livre-c >/dev/null
rodar_lane "$_ab4" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'lanes vivas' 'quarta lane'
nada_criado "$_ab4" 'quarta lane'

# --- 5. dependencia cruzando lane viva, nos dois sentidos
_ab5=$(criar_main_lane); registrar_descarte "$(dirname "$_ab5")"
lane_manual "$_ab5" chore/31-harness-commands-de-bloco >/dev/null
rodar_lane "$_ab5" abrir 32 chore harness-aceitacao-externa
assert_recusa '32 depende de 31' 'abrir o dependente direto de uma lane viva'
rodar_lane "$_ab5" abrir 30 chore harness-estado-por-bloco
assert_recusa 'a lane viva 31 depende de 30' 'abrir a dependencia direta de uma lane viva'

_ab5b=$(criar_main_lane); registrar_descarte "$(dirname "$_ab5b")"
lane_manual "$_ab5b" chore/32-harness-aceitacao-externa >/dev/null
rodar_lane "$_ab5b" abrir 30 chore harness-estado-por-bloco
assert_recusa 'a lane viva 32 depende de 30' 'transitiva, da lane viva para quem abre'

_ab5c=$(criar_main_lane); registrar_descarte "$(dirname "$_ab5c")"
lane_manual "$_ab5c" chore/30-harness-estado-por-bloco >/dev/null
rodar_lane "$_ab5c" abrir 32 chore harness-aceitacao-externa
assert_recusa '32 depende de 30' 'transitiva, de quem abre para a lane viva'

_ab5d=$(criar_main_lane); registrar_descarte "$(dirname "$_ab5d")"
lane_manual "$_ab5d" feat/33-harness-sinal-de-contexto-cheio >/dev/null
rodar_lane "$_ab5d" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'ja tem lane viva' 'a mesma ficha com outra lane viva'
# O sentido negativo: citar **Depende:** no Escopo nao e declarar.
rodar_lane "$_ab5d" abrir 30 chore harness-estado-por-bloco
assert_igual 0 "$CODIGO_LANE" 'citacao no Escopo nao bloqueia'
assert_contem "$SAIDA_LANE" 'PORTAO OK' 'citacao no Escopo: o portao passa'

# --- 6. branch ou caminho ja existem
_ab6=$(criar_main_lane); registrar_descarte "$(dirname "$_ab6")"
git -C "$_ab6" branch -q "$_ab33"
rodar_lane "$_ab6" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'ja existe' 'a branch da lane ja existe'
_ab6b=$(criar_main_lane); registrar_descarte "$(dirname "$_ab6b")"
mkdir "$(dirname "$_ab6b")/lotus-33-harness-sinal-de-contexto-cheio"
rodar_lane "$_ab6b" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'ja existe' 'o caminho da arvore ja existe'
assert_igual '' "$(git -C "$_ab6b" branch --list "$_ab33")" 'caminho ocupado: nenhuma branch criada'

# --- 7. offset livre: o .env de TODA arvore conta, main e orfas incluidos
_ab7=$(criar_main_lane); registrar_descarte "$(dirname "$_ab7")"
printf 'LOTUS_DEV_HTTP_PORT=8081\n' > "$_ab7/.env"
_ab7a=$(lane_manual "$_ab7" preview/a); printf 'LOTUS_DEV_HTTP_PORT=8082\n' > "$_ab7a/.env"
_ab7b=$(lane_manual "$_ab7" preview/b); printf 'LOTUS_DEV_HTTP_PORT="8083"\n' > "$_ab7b/.env"
rodar_lane "$_ab7" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'offset livre' 'offsets 1 a 3 ocupados pelo main e por orfas'
nada_criado "$_ab7" 'sem offset livre'

# --- portao limpo
_abok=$(criar_main_lane); registrar_descarte "$(dirname "$_abok")"
rodar_lane "$_abok" abrir 33 chore harness-sinal-de-contexto-cheio
assert_igual 0 "$CODIGO_LANE" 'portao limpo sai 0'
assert_contem "$SAIDA_LANE" \
  "PORTAO OK: $_ab33 pode abrir em $(dirname "$_abok")/lotus-33-harness-sinal-de-contexto-cheio, offset +1" \
  'portao limpo: branch, arvore irma e offset +1'
