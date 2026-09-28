[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"

_xbr=chore/33-harness-sinal-de-contexto-cheio

lane_de_pe() {
  # $1 = arvore, $2 = main tree, $3 = titulo.
  if [[ -d $1 && -n $(git -C "$2" branch --list "$_xbr") ]]; then
    printf '  ok    %s: arvore e branch continuam de pe\n' "$3"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA %s: a lane sumiu\n' "$3"
  fi
}

lane_sumiu() {
  # $1 = arvore, $2 = main tree, $3 = titulo.
  if [[ ! -e $1 && -z $(git -C "$2" branch --list "$_xbr") \
        && -z $(git -C "$2" worktree list --porcelain | grep -F "$1") ]]; then
    printf '  ok    %s: arvore, registro e branch sumiram\n' "$3"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA %s: sobrou arvore, registro ou branch\n' "$3"
  fi
}

# --- cenario: a lane 33 aberta pelo proprio abrir
_xm=$(criar_main_lane); registrar_descarte "$(dirname "$_xm")"
_xarv="$(dirname "$_xm")/lotus-33-harness-sinal-de-contexto-cheio"
_xdocker=$(criar_falso "$(dirname "$_xm")" docker)
rodar_lane "$_xm" abrir 33 chore harness-sinal-de-contexto-cheio
assert_igual 0 "$CODIGO_LANE" 'cenario: a lane 33 abre'

# --- arvore suja: recusa, e nem --force passa
: > "$_xarv/sujo.txt"
FAKE_DOCKER=$_xdocker rodar_lane "$_xm" fechar 33
assert_recusa 'nao commitada' 'arvore suja'
FAKE_DOCKER=$_xdocker rodar_lane "$_xm" fechar 33 --force
assert_recusa 'nao commitada' '--force com arvore suja'
lane_de_pe "$_xarv" "$_xm" 'arvore suja'
rm -f "$_xarv/sujo.txt"

# --- branch nao mesclada: a semente do abrir e um commit so dela
FAKE_DOCKER=$_xdocker rodar_lane "$_xm" fechar 33
assert_recusa 'nao esta mesclada' 'branch nao mesclada'
lane_de_pe "$_xarv" "$_xm" 'branch nao mesclada'
assert_igual '' "$(cat "$_xdocker.log")" 'recusa antes de chamar o docker'

# --- outras recusas
FAKE_DOCKER=$_xdocker rodar_lane "$_xarv" fechar 33
assert_recusa 'main tree' 'fechar de dentro da lane'
rodar_lane "$_xm" fechar 99
assert_recusa 'nenhuma lane viva' 'lane inexistente'
rodar_lane "$_xm" fechar 33 --forca
assert_recusa 'uso' 'flag desconhecida'
lane_de_pe "$_xarv" "$_xm" 'recusas de argumento'

# --- caminho feliz: a PR mesclou
git -C "$_xm" merge -q --no-ff "$_xbr" -m 'merge da lane 33' >/dev/null 2>&1
FAKE_DOCKER=$_xdocker rodar_lane "$_xm" fechar 33
assert_igual 0 "$CODIGO_LANE" 'mesclada e limpa: fecha'
assert_contem "$SAIDA_LANE" "LANE FECHADA: $_xbr" 'anuncia o fechamento'
assert_igual "$_xarv|compose down -v --rmi local" "$(cat "$_xdocker.log")" \
  'derruba o stack da lane, com volume e imagem local, na arvore dela'
lane_sumiu "$_xarv" "$_xm" 'fechar feliz'

# --- --force: branch nao mesclada sai com -D
_ym=$(criar_main_lane); registrar_descarte "$(dirname "$_ym")"
rodar_lane "$_ym" abrir 33 chore harness-sinal-de-contexto-cheio
rodar_lane "$_ym" fechar 33 --force
assert_igual 0 "$CODIGO_LANE" '--force fecha branch nao mesclada'
lane_sumiu "$(dirname "$_ym")/lotus-33-harness-sinal-de-contexto-cheio" "$_ym" '--force'

# --- docker ausente: fecha mesmo assim, e diz
_zm=$(criar_main_lane); registrar_descarte "$(dirname "$_zm")"
rodar_lane "$_zm" abrir 33 chore harness-sinal-de-contexto-cheio
git -C "$_zm" merge -q --no-ff "$_xbr" -m 'merge da lane 33' >/dev/null 2>&1
FAKE_DOCKER=/caminho/que/nao/existe/docker rodar_lane "$_zm" fechar 33
assert_igual 0 "$CODIGO_LANE" 'docker ausente: fecha'
assert_contem "$SAIDA_LANE" 'ausente' 'docker ausente: avisa'
lane_sumiu "$(dirname "$_zm")/lotus-33-harness-sinal-de-contexto-cheio" "$_zm" 'docker ausente'

# --- abrir pela metade: o fechar sem --force desfaz
_wm=$(criar_main_lane); registrar_descarte "$(dirname "$_wm")"
FAKE_PNPM=$(criar_falso "$(dirname "$_wm")" pnpm 1) rodar_lane "$_wm" abrir 33 chore harness-sinal-de-contexto-cheio
assert_igual 1 "$CODIGO_LANE" 'cenario: o abrir fica pela metade'
rodar_lane "$_wm" fechar 33
assert_igual 0 "$CODIGO_LANE" 'o fechar desfaz a lane pela metade, sem --force'
lane_sumiu "$(dirname "$_wm")/lotus-33-harness-sinal-de-contexto-cheio" "$_wm" 'pela metade'
