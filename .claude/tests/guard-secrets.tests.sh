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

# --- Item 1: alvo tambem vem de notebook_path (NotebookEdit)
payload_notebook_edit() {
  # $1 = cwd, $2 = notebook_path, $3 = new_source (pode ser vazio)
  jq -nc --arg cwd "$1" --arg np "$2" --arg ns "$3" \
    '{session_id:"teste", cwd:$cwd, tool_name:"NotebookEdit",
      tool_input:({notebook_path:$np} + (if $ns=="" then {} else {new_source:$ns} end))}'
}

acionar_hook "$SEGREDOS" "$(payload_notebook_edit "$_s" "$_s/.env" '')"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'NotebookEdit: nega pelo nome quando notebook_path e .env'

acionar_hook "$SEGREDOS" "$(payload_notebook_edit "$_s" "$_s/.env.example" '')"
assert_igual '' "$SAIDA_HOOK" 'NotebookEdit: libera pelo nome quando notebook_path e .env.example'

# --- Item 2: conteudo tambem vem de edits[].new_string (MultiEdit) e new_source (NotebookEdit)
payload_multiedit() {
  # $1 = cwd, $2 = file_path, $3.. = new_string de cada edit (1 ou 2 entradas)
  local cwd=$1 fp=$2; shift 2
  local edits='[]'
  local ns
  for ns in "$@"; do
    edits=$(jq -c --arg ns "$ns" '. + [{old_string:"x", new_string:$ns}]' <<<"$edits")
  done
  jq -nc --arg cwd "$cwd" --arg fp "$fp" --argjson edits "$edits" \
    '{session_id:"teste", cwd:$cwd, tool_name:"MultiEdit",
      tool_input:{file_path:$fp, edits:$edits}}'
}

acionar_hook "$SEGREDOS" "$(payload_multiedit "$_s" "$_s/docs/nota.md" "$_akid")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'MultiEdit: nega marca em edits[0].new_string'

acionar_hook "$SEGREDOS" "$(payload_multiedit "$_s" "$_s/docs/nota.md" 'nada aqui' "$_akid")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'MultiEdit: nega marca na SEGUNDA entrada de edits[]'

acionar_hook "$SEGREDOS" "$(payload_multiedit "$_s" "$_s/docs/nota.md" 'nada aqui' 'nem aqui')"
assert_igual '' "$SAIDA_HOOK" 'MultiEdit: libera quando nenhuma entrada tem marca'

acionar_hook "$SEGREDOS" "$(payload_notebook_edit "$_s" "$_s/docs/nota.ipynb" "$_akid")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'NotebookEdit: nega marca em new_source'

_meio1=${_akid:0:10}
_meio2=${_akid:10}
acionar_hook "$SEGREDOS" "$(jq -nc --arg cwd "$_s" --arg fp "$_s/docs/nota.md" --arg ct "$_meio1" --arg ns "$_meio2" \
  '{session_id:"teste", cwd:$cwd, tool_name:"Edit", tool_input:{file_path:$fp, content:$ct, new_string:$ns}}')"
assert_igual '' "$SAIDA_HOOK" 'concatenacao de content e new_string por quebra de linha nao fabrica marca falsa'

# --- Item 3: peneira de nome insensivel a maiusculas
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.ENV" '')"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega pelo nome: .ENV'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.Env.local" '')"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega pelo nome: .Env.local'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.ENV.EXAMPLE" 'APP_ENV=local')"
assert_igual '' "$SAIDA_HOOK" 'libera pelo nome: .ENV.EXAMPLE'
