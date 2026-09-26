#!/usr/bin/env bash
# Nega gravacao de arquivo de ambiente e de conteudo com marca de credencial
# de servidor. Contrato: exit 0 sempre, JSON no stdout. Falha aberta.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

# So formas inconfundiveis. Nenhuma regra generica de PASSWORD=: o
# docker-compose.yml versionado tem MYSQL_ROOT_PASSWORD e
# MINIO_ROOT_PASSWORD de desenvolvimento, e uma regra generica impediria
# editar o compose, que e trabalho normal. A senha do RDS nao tem forma
# distinguivel — quem a cobre e a peneira de NOME, porque ela so vive em
# backend/.env.production.
MARCAS=(
  'APP_KEY[[:space:]]*=[[:space:]]*base64:[A-Za-z0-9+/]{43}='
  'AKIA[0-9A-Z]{16}'
  "(AWS|MINIO|S3)[A-Z_]*(SECRET|PASSWORD)[A-Z_]*[[:space:]]*[:=][[:space:]]*[\"']?[A-Za-z0-9/+=]{24,}"
  'gh[pousr]_[A-Za-z0-9]{36}'
)
DESCRICOES=(
  'a chave de aplicacao do Laravel (APP_KEY) com valor'
  'um access key id da AWS'
  'uma chave secreta de AWS, MinIO ou S3 com valor'
  'um token do GitHub'
)

dentro_de() { [[ $1 == "$2" || $1 == "$2"/* ]]; }

corpo() {
  ler_payload
  local alvo cwd nome nome_lc raiz conteudo i
  alvo=$(campo '.tool_input.file_path')
  # MultiEdit e Edit gravam em file_path; NotebookEdit grava em
  # notebook_path. Cai para notebook_path so quando file_path vier vazio.
  [[ -z $alvo ]] && alvo=$(campo '.tool_input.notebook_path')
  cwd=$(campo '.cwd')
  [[ -z $alvo ]] && return 0
  [[ $alvo != /* ]] && alvo="$cwd/$alvo"
  alvo=$(realpath -m "$alvo")
  nome=$(basename "$alvo")
  nome_lc=${nome,,}

  # Peneira de nome. A excecao e por SUFIXO, nao por nome exato: o harness de
  # origem isentava literalmente '.env.example', e o Lotus versiona
  # .env.example, backend/.env.example, backend/.env.production.example e
  # frontend/.env.example — a regra nominal negaria tres dos quatro.
  # 'docker/probe.env' nao casa o padrao (termina em .env, nao comeca), e
  # isso esta certo: e fixture versionada, e o conteudo dela continua
  # inspecionado abaixo. Comparacao em minusculas: '.ENV' e '.Env.local'
  # tem que negar igual a '.env', sem mexer nos padroes.
  if [[ ( $nome_lc == .env || $nome_lc == .env.* ) && $nome_lc != *.example ]]; then
    negar_pretooluse "Bloqueado pelo harness: \`$nome\` guarda segredo e e \
gitignored. Edite o arquivo a mao, fora do agente."
    return 0
  fi

  # Isencoes da peneira de conteudo.
  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0
  dentro_de "$alvo" "$raiz" || return 0
  dentro_de "$alvo" "$raiz/.claude/hooks" && return 0
  dentro_de "$alvo" "$raiz/.claude/tests" && return 0

  # Quatro campos possiveis carregam conteudo escrito: Write/Edit usam
  # content/new_string; MultiEdit usa um ARRAY em edits[].new_string;
  # NotebookEdit usa new_source. Junta tudo com quebra de linha — colar sem
  # separador fabricava marca falsa quando metade dela vinha de um campo e
  # metade de outro (ex.: content com "AKIAQQQQQQ" + new_string com
  # "QQQQQQQQQQ" formava um AKIA... valido que nenhum dos dois contem).
  conteudo=$(campo '[.tool_input.content, .tool_input.new_string,
    (.tool_input.edits // [] | map(.new_string // empty))[],
    .tool_input.new_source] | map(select(. != null and . != "")) | join("\n")')
  [[ -z $conteudo ]] && return 0

  for i in "${!MARCAS[@]}"; do
    if printf '%s' "$conteudo" | grep -Eq "${MARCAS[$i]}"; then
      negar_pretooluse "Bloqueado pelo harness: o conteudo contem \
${DESCRICOES[$i]}, que e marca de credencial de servidor. Segredo de \
producao vive no .env da maquina e no Secrets Manager, nunca no \
repositorio."
      return 0
    fi
  done
  return 0
}

corpo || true
exit 0
