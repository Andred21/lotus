#!/usr/bin/env bash
#
# Conferencia de go-live (bloco 13, spec secao 4.1). So leitura: le o banco e a
# imagem pelos conteineres vivos do projeto `lotus` (compose ps -q + docker
# exec) e o S3 pelo aws. Nunca sobe conteiner, nunca escreve no banco, nunca
# chama artisan.
#
# Uso no host: sudo /opt/lotus/bin/conferir-golive.sh [--final]
#
# Uma linha por verificacao: OK|FALHA|AVISO|INFO <nome> <detalhe>. Todas rodam,
# mesmo com outra em FALHA. Sai 1 com ao menos uma FALHA; senao 0. Leitor
# indisponivel (mysql fora, app fora, aws sem credencial) e FALHA com o motivo,
# nunca OK por omissao.
#
# Do .env saem so os NOMES das chaves e o valor de LOTUS_BACKUP_BUCKET. Nenhum
# outro valor do .env aparece na saida nem em erro: o stderr de mysql/docker/aws
# vai para /dev/null (onde reclamariam de senha ou credencial), e o script nunca
# faz `source` do .env.
#
# Sem --final, `smoke` e INFO. Com --final, e a rede do passo 8 do runbook
# secao 15: certificado SMOKE-GOLIVE revogado, cliente e curso arquivados,
# turma e aluno presentes.
set -euo pipefail
umask 077

# Mesmo gancho do verificar-backup.sh: a catraca aponta LOTUS_BASE para um
# diretorio temporario e poe docker/aws falsos no PATH.
BASE="${LOTUS_BASE:-/opt/lotus}"
FINAL=0
for arg in "$@"; do
  case "$arg" in
    --final) FINAL=1 ;;
    *) echo "uso: $0 [--final]" >&2; exit 2 ;;
  esac
done

# Chaves que o .env de producao precisa ter. Lista embutida porque o molde
# deploy/aws/env.prod.example nao vai ao host; a catraca prende os dois.
CHAVES_ESPERADAS="APP_NAME APP_ENV APP_KEY APP_DEBUG APP_URL APP_LOCALE APP_FALLBACK_LOCALE LOG_CHANNEL LOG_LEVEL DB_CONNECTION DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD MYSQL_DATABASE MYSQL_ROOT_PASSWORD SESSION_DRIVER SESSION_DOMAIN SESSION_LIFETIME SESSION_ENCRYPT SESSION_PATH SESSION_SAME_SITE SESSION_SECURE_COOKIE CACHE_STORE QUEUE_CONNECTION FRONTEND_URL SANCTUM_STATEFUL_DOMAINS CERTIFICATE_VALIDATION_URL FILESYSTEM_DISK AWS_DEFAULT_REGION AWS_BUCKET AWS_USE_PATH_STYLE_ENDPOINT LOTUS_BACKUP_BUCKET LOTUS_ALERT_TOPIC_ARN MAIL_MAILER MAIL_FROM_ADDRESS MAIL_FROM_NAME CERTIFICATE_ISSUER_NAME CERTIFICATE_ISSUER_RUT"

# D-37: a coluna archived_with_parent nasceu em 2026-08-18; registro anterior
# so pode ter vindo de importacao do dev.
LIMITE_NASCIMENTO="2026-08-18"
# Backup diario as 06:10 UTC: mais de 24 h sem objeto novo e noite falhada.
LIMITE_BACKUP_HORAS=24

FALHAS=0
# linha <ESTADO> <nome> <detalhe>: a unica porta de saida das verificacoes.
linha() {
  [ "$1" != FALHA ] || FALHAS=$((FALHAS + 1))
  printf '%s %s %s\n' "$1" "$2" "$3"
}

# Le UM valor do .env, so para LOTUS_BACKUP_BUCKET. O `|| true` e porque grep
# sem match sai 1 e o pipefail mataria o script aqui.
chave() { grep -E "^$1=" "$BASE/.env" 2>/dev/null | cut -d= -f2- || true; }

compose() {
  docker compose -p lotus --project-directory "$BASE" -f "$BASE/docker-compose.prod.yml" "$@"
}
MYSQL=$(compose ps -q mysql 2>/dev/null || true)
APP=$(compose ps -q app 2>/dev/null || true)

# sql <consulta>: roda no conteiner mysql vivo, saida -N -B (sem cabecalho,
# tab). A consulta vai por variavel de ambiente para nao passar por nenhum
# shell intermediario. stderr vai fora: e onde o mysql reclamaria da senha.
sql() {
  [ -n "$MYSQL" ] || return 1
  docker exec -e CONSULTA="$1" "$MYSQL" sh -c \
    'exec mysql -N -B -uroot -p"$MYSQL_ROOT_PASSWORD" -e "$CONSULTA" "$MYSQL_DATABASE"' 2>/dev/null
}

# no_app <comando...>: roda no conteiner app vivo (exec, nunca run).
no_app() {
  [ -n "$APP" ] || return 1
  docker exec "$APP" "$@" 2>/dev/null
}

# Tabela migrations x basenames de database/migrations/*.php na imagem viva.
conferir_migrations() {
  local banco codigo so_banco so_codigo
  if ! banco=$(sql "SELECT migration FROM migrations" | sort); then
    linha FALHA migrations "leitor indisponivel: mysql"
    return
  fi
  if ! codigo=$(no_app ls /var/www/database/migrations | sed 's/\.php$//' | sort); then
    linha FALHA migrations "leitor indisponivel: app"
    return
  fi
  so_banco=$(comm -23 <(printf '%s\n' "$banco") <(printf '%s\n' "$codigo") | paste -sd, -)
  so_codigo=$(comm -13 <(printf '%s\n' "$banco") <(printf '%s\n' "$codigo") | paste -sd, -)
  if [ -n "$so_banco" ] || [ -n "$so_codigo" ]; then
    linha FALHA migrations "so-no-banco: ${so_banco:--} so-no-codigo: ${so_codigo:--}"
  else
    linha OK migrations "banco=$(wc -l <<< "$banco" | tr -d ' ') codigo=$(wc -l <<< "$codigo" | tr -d ' ')"
  fi
}

# permissions x PermissionCatalog::descriptions(); tres roles; superadmin com todas.
# O catalogo e um array literal: o autoload do composer basta, sem boot do Laravel.
conferir_rbac() {
  local banco codigo roles n_super n_codigo so_banco so_codigo faltam
  if ! banco=$(sql "SELECT name FROM permissions WHERE guard_name = 'web'" | sort); then
    linha FALHA rbac "leitor indisponivel: mysql"
    return
  fi
  if ! codigo=$(no_app php -r 'require "/var/www/vendor/autoload.php"; foreach (array_keys(App\Domains\Identity\Support\PermissionCatalog::descriptions()) as $n) { echo $n, "\n"; }' | sort); then
    linha FALHA rbac "leitor indisponivel: app"
    return
  fi
  if ! roles=$(sql "SELECT name FROM roles WHERE guard_name = 'web' ORDER BY name" | sort); then
    linha FALHA rbac "leitor indisponivel: mysql"
    return
  fi
  if ! n_super=$(sql "SELECT COUNT(*) FROM role_has_permissions rhp JOIN roles r ON r.id = rhp.role_id WHERE r.name = 'superadmin' AND r.guard_name = 'web'"); then
    linha FALHA rbac "leitor indisponivel: mysql"
    return
  fi
  so_banco=$(comm -23 <(printf '%s\n' "$banco") <(printf '%s\n' "$codigo") | paste -sd, -)
  so_codigo=$(comm -13 <(printf '%s\n' "$banco") <(printf '%s\n' "$codigo") | paste -sd, -)
  faltam=$(comm -13 <(printf '%s\n' "$roles") <(printf 'admin\nredator\nsuperadmin\n') | paste -sd, -)
  n_codigo=$(wc -l <<< "$codigo" | tr -d ' ')
  if [ -n "$so_banco" ] || [ -n "$so_codigo" ]; then
    linha FALHA rbac "so-no-banco: ${so_banco:--} so-no-codigo: ${so_codigo:--}"
  elif [ -n "$faltam" ]; then
    linha FALHA rbac "roles ausentes: $faltam"
  elif [ "$n_super" != "$n_codigo" ]; then
    linha FALHA rbac "superadmin tem $n_super de $n_codigo permissoes"
  else
    linha OK rbac "$n_codigo permissoes; roles $(paste -sd, - <<< "$roles"); superadmin com todas"
  fi
}

# D-37: MIN(created_at) das oito tabelas de archived_with_parent. Toda tabela
# tem created_at (timestamps() nas migrations). Tabela vazia devolve '-'.
TABELAS_ARQUIVAMENTO="client_addresses client_contacts users course_modules course_certificate_templates quotes files enrollments"
conferir_dados_antigos() {
  local consulta='' t saida n antigas
  for t in $TABELAS_ARQUIVAMENTO; do
    consulta="$consulta${consulta:+ UNION ALL }SELECT '$t', IFNULL(MIN(created_at), '-') FROM $t"
  done
  if ! saida=$(sql "$consulta"); then
    linha FALHA dados-antigos "leitor indisponivel: mysql"
    return
  fi
  n=$(wc -l <<< "$saida" | tr -d ' ')
  if [ "$n" != 8 ]; then
    linha FALHA dados-antigos "esperava 8 tabelas, leu $n"
    return
  fi
  antigas=$(awk -F'\t' -v lim="$LIMITE_NASCIMENTO" '$2 != "-" && $2 < lim { printf "%s=%s,", $1, substr($2, 1, 10) }' <<< "$saida")
  if [ -n "$antigas" ]; then
    linha FALHA dados-antigos "registro anterior a $LIMITE_NASCIMENTO: ${antigas%,}"
  else
    linha OK dados-antigos "nenhum registro anterior a $LIMITE_NASCIMENTO em 8 tabelas"
  fi
}

# P-44: usuarios de sonda dos gates antigos. Conta inclusive soft-deletados.
conferir_sondas_dev() {
  local n
  if ! n=$(sql "SELECT COUNT(*) FROM users WHERE email LIKE 'e2e.gate%' OR email IN ('gate.fechamento@lotus.cl', 'gate-bd9@gate.cl')"); then
    linha FALHA sondas-dev "leitor indisponivel: mysql"
    return
  fi
  if [ "$n" != 0 ]; then
    linha FALHA sondas-dev "$n usuarios de sonda de dev no banco"
  else
    linha OK sondas-dev "nenhum usuario de sonda"
  fi
}

# Mesma medida do verificar-backup.sh: a idade do objeto mais recente em
# s3://$BUCKET/backups/. Limite 24 h, nao 48: aqui e linha de base, nao alarme.
conferir_backup() {
  local bucket quando epoch idade_s
  bucket=$(chave LOTUS_BACKUP_BUCKET)
  if [ -z "$bucket" ]; then
    linha FALHA backup "LOTUS_BACKUP_BUCKET ausente ou vazio no .env"
    return
  fi
  if ! quando=$(aws s3api list-objects-v2 --bucket "$bucket" --prefix backups/ \
      --query 'sort_by(Contents,&LastModified)[-1].LastModified' --output text 2>/dev/null); then
    linha FALHA backup "leitor indisponivel: aws s3api"
    return
  fi
  if [ -z "$quando" ] || [ "$quando" = None ]; then
    linha FALHA backup "nenhum objeto em s3://$bucket/backups/"
    return
  fi
  if ! epoch=$(date -u -d "$quando" +%s 2>/dev/null); then
    linha FALHA backup "data ilegivel: $quando"
    return
  fi
  # Compara em segundos: dividir por 86400 antes truncaria 47h59 para "1 dia" e
  # a noite falhada passaria OK (P-100).
  idade_s=$(( $(date -u +%s) - epoch ))
  if [ "$idade_s" -le $(( LIMITE_BACKUP_HORAS * 3600 )) ]; then
    linha OK backup "mais recente ha $(( idade_s / 3600 ))h: $quando"
  else
    linha FALHA backup "mais recente ha $(( idade_s / 3600 ))h (limite ${LIMITE_BACKUP_HORAS}h): $quando"
  fi
}

# Entidades SMOKE-GOLIVE (spec D5, emenda do plano). Certificado liga ao curso
# por course_id; turma nao tem nome e liga pelo curso; aluno e cliente vivem em
# users.name (cliente tambem em clients.legal_name). Turma concluida e aluno
# nao se arquivam, por isso so contam presenca. Sem --final e INFO.
CONSULTA_SMOKE="SELECT 'certificados', COUNT(*), IFNULL(SUM(c.revoked_at IS NULL), 0) FROM certificates c JOIN courses co ON co.id = c.course_id WHERE co.name LIKE 'SMOKE-GOLIVE%' UNION ALL SELECT 'clientes', COUNT(*), IFNULL(SUM(cl.deleted_at IS NULL), 0) FROM clients cl JOIN users u ON u.id = cl.user_id WHERE cl.legal_name LIKE 'SMOKE-GOLIVE%' OR u.name LIKE 'SMOKE-GOLIVE%' UNION ALL SELECT 'cursos', COUNT(*), IFNULL(SUM(deleted_at IS NULL), 0) FROM courses WHERE name LIKE 'SMOKE-GOLIVE%' UNION ALL SELECT 'turmas', COUNT(*), 0 FROM turmas t JOIN courses co ON co.id = t.course_id WHERE co.name LIKE 'SMOKE-GOLIVE%' UNION ALL SELECT 'alunos', COUNT(*), 0 FROM students s JOIN users u ON u.id = s.user_id WHERE u.name LIKE 'SMOKE-GOLIVE%'"
conferir_smoke() {
  local saida n cert cert_vivos cli cli_vivos cur cur_vivos tur alu motivo=''
  if ! saida=$(sql "$CONSULTA_SMOKE"); then
    linha FALHA smoke "leitor indisponivel: mysql"
    return
  fi
  n=$(wc -l <<< "$saida" | tr -d ' ')
  if [ "$n" != 5 ]; then
    linha FALHA smoke "esperava 5 linhas, leu $n"
    return
  fi
  cert=$(awk -F'\t' '$1 == "certificados" { print $2 }' <<< "$saida")
  cert_vivos=$(awk -F'\t' '$1 == "certificados" { print $3 }' <<< "$saida")
  cli=$(awk -F'\t' '$1 == "clientes" { print $2 }' <<< "$saida")
  cli_vivos=$(awk -F'\t' '$1 == "clientes" { print $3 }' <<< "$saida")
  cur=$(awk -F'\t' '$1 == "cursos" { print $2 }' <<< "$saida")
  cur_vivos=$(awk -F'\t' '$1 == "cursos" { print $3 }' <<< "$saida")
  tur=$(awk -F'\t' '$1 == "turmas" { print $2 }' <<< "$saida")
  alu=$(awk -F'\t' '$1 == "alunos" { print $2 }' <<< "$saida")
  if [ "$FINAL" != 1 ]; then
    linha INFO smoke "certificados=$cert (nao revogados $cert_vivos) clientes=$cli (vivos $cli_vivos) cursos=$cur (vivos $cur_vivos) turmas=$tur alunos=$alu"
    return
  fi
  [ "$cert" != 0 ] || motivo="$motivo nenhum certificado SMOKE-GOLIVE;"
  [ "$cert_vivos" = 0 ] || motivo="$motivo certificados nao revogados: $cert_vivos;"
  [ "$cli" != 0 ] || motivo="$motivo nenhum cliente SMOKE-GOLIVE;"
  [ "$cli_vivos" = 0 ] || motivo="$motivo clientes nao arquivados: $cli_vivos;"
  [ "$cur" != 0 ] || motivo="$motivo nenhum curso SMOKE-GOLIVE;"
  [ "$cur_vivos" = 0 ] || motivo="$motivo cursos nao arquivados: $cur_vivos;"
  [ "$tur" != 0 ] || motivo="$motivo nenhuma turma SMOKE-GOLIVE;"
  [ "$alu" != 0 ] || motivo="$motivo nenhum aluno SMOKE-GOLIVE;"
  if [ -n "$motivo" ]; then
    linha FALHA smoke "${motivo# }"
  else
    linha OK smoke "certificados=$cert todos revogados; clientes=$cli e cursos=$cur arquivados; turmas=$tur alunos=$alu"
  fi
}

conferir_env() {
  local presentes esperadas faltam sobram
  if [ ! -r "$BASE/.env" ]; then
    linha FALHA env "$BASE/.env ilegivel"
    return
  fi
  presentes=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$BASE/.env" | cut -d= -f1 | sort -u || true)
  esperadas=$(tr ' ' '\n' <<< "$CHAVES_ESPERADAS" | sort -u)
  faltam=$(comm -13 <(printf '%s\n' "$presentes") <(printf '%s\n' "$esperadas") | paste -sd, -)
  sobram=$(comm -23 <(printf '%s\n' "$presentes") <(printf '%s\n' "$esperadas") | paste -sd, -)
  if [ -n "$faltam" ]; then
    linha FALHA env "faltam: $faltam"
  elif [ -n "$sobram" ]; then
    linha AVISO env "chaves a mais (nao previstas no molde): $sobram"
  else
    linha OK env "$(wc -l <<< "$esperadas" | tr -d ' ') chaves presentes"
  fi
}

conferir_migrations
conferir_rbac
conferir_dados_antigos
conferir_sondas_dev
conferir_env
conferir_backup
conferir_smoke

exit $(( FALHAS > 0 ? 1 : 0 ))
