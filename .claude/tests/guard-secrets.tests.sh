SEGREDOS="$DIR_HOOKS/guard-secrets.sh"

decisao_seg() { campo_json "$1" '.hookSpecificOutput.permissionDecision'; }

# Valores com o tamanho provado pela propria construcao, para nao depender de
# eu contar caracteres certo.
_appkey="APP_KEY=base64:$(printf 'A%.0s' {1..43})="
_akid="AKIA$(printf 'Q%.0s' {1..16})"
_awssec="AWS_SECRET_ACCESS_KEY=$(printf 'z%.0s' {1..40})"
_ghtoken="ghp_$(printf 'a%.0s' {1..36})"

_s=$(criar_repo); registrar_descarte "$_s"
mkdir -p "$_s/.claude/tests" "$_s/docker"

# --- peneira de nome
for _neg in .env .env.local backend/.env.production frontend/.env; do
  acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/$_neg" '')"
  assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" "nega pelo nome: $_neg"
done

for _lib in .env.example backend/.env.example backend/.env.production.example frontend/.env.example docker/probe.env; do
  acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/$_lib" 'APP_ENV=local')"
  assert_igual '' "$SAIDA_HOOK" "libera pelo nome: $_lib"
done

# --- peneira de conteudo
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docs/nota.md" "$_appkey")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega APP_KEY com valor'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docs/nota.md" "$_akid")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega access key id da AWS'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docs/nota.md" "$_awssec")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega chave secreta da AWS'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docs/nota.md" "$_ghtoken")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega token do GitHub'

# --- o que NAO pode ser negado: as senhas de desenvolvimento do compose
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docker-compose.yml" 'MYSQL_ROOT_PASSWORD: secret')"
assert_igual '' "$SAIDA_HOOK" 'libera MYSQL_ROOT_PASSWORD do compose'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docker-compose.yml" 'MINIO_ROOT_PASSWORD: lotus-secret')"
assert_igual '' "$SAIDA_HOOK" 'libera MINIO_ROOT_PASSWORD do compose'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/backend/.env.example" 'APP_KEY=')"
assert_igual '' "$SAIDA_HOOK" 'libera APP_KEY sem valor no .env.example'

# --- nome liberado NAO e conteudo liberado
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.env.example" "$_appkey")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" '.env.example com APP_KEY real e negado'

# --- isencoes de conteudo
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.claude/hooks/guard-secrets.sh" "$_akid")"
assert_igual '' "$SAIDA_HOOK" 'isenta .claude/hooks/ — e o fonte do proprio guarda'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.claude/tests/guard-secrets.tests.sh" "$_akid")"
assert_igual '' "$SAIDA_HOOK" 'isenta .claude/tests/ — as marcas sao a carga dos testes'

_forasec=$(mktemp -d); registrar_descarte "$_forasec"
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_forasec/rascunho.txt" "$_akid")"
assert_igual '' "$SAIDA_HOOK" 'isenta alvo fora do repositorio'

# --- contrato
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.env" '')"
assert_igual 0 "$CODIGO_HOOK" 'guard-secrets sai 0 ao negar'
acionar_hook "$SEGREDOS" ''
assert_igual 0 "$CODIGO_HOOK" 'payload vazio sai 0'
assert_igual '' "$SAIDA_HOOK" 'payload vazio nao emite decisao'
