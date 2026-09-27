#!/usr/bin/env bash
#
# Confere se o host tem o que o SHA alvo pressupoe (item 31, P-87).
#
# Roda no RUNNER, nao no host: o host so devolve a listagem (hashes e nomes de
# chave, por um SSM de leitura), e quem decide e' este script versionado. Se ele
# morasse no host, seria mais um arquivo copiado a mao, sujeito ao mesmo
# defeito que mede.
#
# Duas classes, duas referencias (D2 da spec):
#   runtime   os dois composes e o nginx/tls.conf  -> arvore do SHA ALVO
#   ferramenta bin/*.sh                            -> arvore da MAIN
#   chaves    nomes do .env                        -> env.prod.example do ALVO
# Um rollback nao pode exigir o deploy.sh antigo de volta; e o compose novo nao
# pode rodar calado sobre a imagem velha.
#
# Script e chave a MAIS no host nao reprovam: nao quebram o SHA.
#
# Uso:   conferir-alinhamento.sh <listagem> <arvore-alvo> <arvore-main>
# Saida: 0 alinhado; 1 divergencia (uma linha por item) ou listagem sem o
#        marcador; 2 uso.
set -euo pipefail

if [ $# -ne 3 ]; then
  echo "uso: conferir-alinhamento.sh <listagem> <arvore-alvo> <arvore-main>" >&2
  exit 2
fi
LISTAGEM=$1
ALVO=$2
MAIN=$3

# SSM que devolveu nada nao prova alinhamento.
if ! grep -qxF -- '--- chaves' "$LISTAGEM"; then
  echo "erro: a listagem do host nao tem o marcador '--- chaves'; a leitura nao prova alinhamento" >&2
  exit 1
fi
HASHES=$(awk '$0 == "--- chaves" { exit } { print }' "$LISTAGEM")
CHAVES=$(awk 'marcador { print } $0 == "--- chaves" { marcador = 1 }' "$LISTAGEM")

DIVERGENCIAS=()

conferir() {  # <caminho no host> <referencia no checkout>
  local no_host referencia
  if [ ! -f "$2" ]; then
    DIVERGENCIAS+=("$1 sem referencia em $2")
    return
  fi
  no_host=$(awk -v c="$1" '$2 == c { print $1; exit }' <<<"$HASHES")
  referencia=$(sha256sum "$2" | cut -d' ' -f1)
  if [ -z "$no_host" ] || [ "$no_host" = AUSENTE ]; then
    DIVERGENCIAS+=("$1 ausente")
  elif [ "$no_host" != "$referencia" ]; then
    DIVERGENCIAS+=("$1 diferente")
  fi
}

conferir docker-compose.prod.yml "$ALVO/docker-compose.prod.yml"
conferir docker-compose.prod-tls.yml "$ALVO/docker-compose.prod-tls.yml"
conferir nginx/tls.conf "$ALVO/deploy/nginx/tls.conf"

for SCRIPT in "$MAIN"/deploy/bin/*.sh; do
  conferir "bin/$(basename "$SCRIPT")" "$SCRIPT"
done

MOLDE="$ALVO/deploy/aws/env.prod.example"
if [ ! -f "$MOLDE" ]; then
  DIVERGENCIAS+=(".env sem referencia em $MOLDE")
else
  while IFS= read -r CHAVE; do
    grep -qxF -- "$CHAVE" <<<"$CHAVES" || DIVERGENCIAS+=("chave faltando: $CHAVE")
  done < <(grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' "$MOLDE" | tr -d '=')
fi

if [ ${#DIVERGENCIAS[@]} -gt 0 ]; then
  printf '%s\n' "${DIVERGENCIAS[@]}"
  echo "erro: o host diverge do que o SHA alvo pressupoe. Instale pelo runbook (deploy/aws/README.md, secao 7) e promova de novo." >&2
  exit 1
fi
echo "host alinhado ao SHA alvo"
