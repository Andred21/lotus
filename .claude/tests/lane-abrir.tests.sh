[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
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

# --- caminho feliz: cria tudo, e so o que deve
_hm=$(criar_main_lane); registrar_descarte "$(dirname "$_hm")"
_hpai=$(dirname "$_hm")
_hbase=$(git -C "$_hm" rev-parse --short main)
_hpnpm=$(criar_falso "$_hpai" pnpm)
_hdocker=$(criar_falso "$_hpai" docker)
_harv="$_hpai/lotus-33-harness-sinal-de-contexto-cheio"
_hest="$_harv/docs/superpowers/blocos/33-harness-sinal-de-contexto-cheio/estado.md"
FAKE_PNPM=$_hpnpm FAKE_DOCKER=$_hdocker \
  rodar_lane "$_hm" abrir 33 chore harness-sinal-de-contexto-cheio --modelo opus
assert_igual 0 "$CODIGO_LANE" 'abrir feliz sai 0'
assert_contem "$SAIDA_LANE" "LANE ABERTA: $_ab33 em $_harv" 'anuncia a lane aberta'
assert_contem "$SAIDA_LANE" 'HTTP 8081' 'anuncia as portas'
assert_contem "$SAIDA_LANE" "(cd $_harv && docker compose up -d)" 'da o proximo passo sem subir o stack'
assert_igual "$_ab33" "$(git -C "$_harv" rev-parse --abbrev-ref HEAD)" 'a arvore esta na branch da lane'
assert_igual '8081 / 3308 / 8026 / 9002 / 9003 / 5174' "$(portas_do_env "$_harv/.env")" \
  '.env da raiz com as seis portas do offset +1'
assert_igual "$(linha_da_tabela 1)" "$(portas_do_env "$_harv/.env")" \
  'as portas batem com a linha +1 da tabela do .env.example'
assert_igual "$(cat "$_hm/backend/.env")" "$(cat "$_harv/backend/.env")" 'backend/.env copiado do main tree'
assert_contem "$(cat "$_harv/frontend/.env")" '# VITE_API_URL=http://localhost:8080' \
  'VITE_API_URL ativa sai comentada'
assert_igual 0 "$(grep -c '^VITE_API_URL=' "$_harv/frontend/.env")" 'nenhuma VITE_API_URL ativa na lane'
assert_contem "$(cat "$_harv/frontend/.env")" 'VITE_ALGO=1' 'o resto do frontend/.env fica'
assert_igual "$_harv/frontend|install --frozen-lockfile" "$(cat "$_hpnpm.log")" \
  'pnpm install --frozen-lockfile em frontend/ da lane'
assert_igual '' "$(cat "$_hdocker.log")" 'abrir nao chama o docker'
assert_igual \
  "3${US}33${US}33-harness-sinal-de-contexto-cheio${US}planning${US}claude${US}continue_active_planning${US}${US}${US}${_ab33}${US}../lotus-33-harness-sinal-de-contexto-cheio${US}1${US}${_hbase}${US}${_hbase}${US}$(id -un)@$(hostname -s) / opus" \
  "$(python3 "$LER_FM_TESTE" "$_hest" schema_version id slug workflow_state next_owner next_action \
      efeito_externo executor branch worktree offset lane_base commit updated_by)" \
  'estado.md semeado com os campos da secao 3.3'
if [[ $(python3 "$LER_FM_TESTE" "$_hest" updated_at) =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]+[-+][0-9:]+$ ]]; then
  printf '  ok    updated_at em ISO-8601 com offset\n'
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA updated_at em ISO-8601 com offset\n'
fi
assert_igual 'chore(33): abre a lane harness-sinal-de-contexto-cheio' "$(git -C "$_harv" log -1 --format=%s)" \
  'a semente e commitada na branch da lane'
assert_igual '' "$(git -C "$_harv" status --porcelain)" 'a arvore da lane fica limpa'
assert_igual "$_hbase" "$(git -C "$_hm" rev-parse --short main)" 'a main nao anda'
assert_igual '' "$(git -C "$_hm" status --porcelain)" 'o main tree fica limpo'

# --- +3: orfas em +1 e +2; a linha +3 da tabela e a catraca da formula
_tm=$(criar_main_lane); registrar_descarte "$(dirname "$_tm")"
_t1=$(lane_manual "$_tm" infra/antiga-1); printf 'LOTUS_DEV_HTTP_PORT=8081\n' > "$_t1/.env"
_t2=$(lane_manual "$_tm" refactor/antiga-2); printf 'LOTUS_DEV_HTTP_PORT=8082\n' > "$_t2/.env"
rodar_lane "$_tm" abrir 33 chore harness-sinal-de-contexto-cheio
_t3="$(dirname "$_tm")/lotus-33-harness-sinal-de-contexto-cheio"
assert_contem "$SAIDA_LANE" 'offset +3' 'orfas em +1 e +2: reserva +3'
assert_igual '8083 / 3310 / 8028 / 9006 / 9007 / 5176' "$(portas_do_env "$_t3/.env")" \
  'o +3 e 8083 / 3310 / 8028 / 9006 / 9007 / 5176'
assert_igual "$(linha_da_tabela 3)" "$(portas_do_env "$_t3/.env")" \
  'as portas do +3 batem com a linha +3 da tabela do .env.example'
assert_contem "$(python3 "$LER_FM_TESTE" "$_t3/docs/superpowers/blocos/33-harness-sinal-de-contexto-cheio/estado.md" updated_by)" \
  '/ terminal' 'sem --modelo, updated_by diz terminal'

# --- falha no meio: diz o que ja existe e manda fechar
_fm=$(criar_main_lane); registrar_descarte "$(dirname "$_fm")"
_fpnpm=$(criar_falso "$(dirname "$_fm")" pnpm 1)
FAKE_PNPM=$_fpnpm rodar_lane "$_fm" abrir 33 chore harness-sinal-de-contexto-cheio
assert_igual 1 "$CODIGO_LANE" 'pnpm falhando: sai 1'
assert_contem "$SAIDA_LANE" 'LANE PELA METADE' 'diz que ficou pela metade'
assert_contem "$SAIDA_LANE" "a branch $_ab33" 'nomeia a branch criada'
assert_contem "$SAIDA_LANE" "a arvore $(dirname "$_fm")/lotus-33-harness-sinal-de-contexto-cheio" 'nomeia a arvore criada'
assert_contem "$SAIDA_LANE" 'lane.sh fechar 33' 'manda fechar'
