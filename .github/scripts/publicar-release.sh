#!/usr/bin/env bash
#
# Publica a tag `vX.Y.Z` (anotada) e a release da versao promovida (bloco 45).
#
# Roda no RUNNER, no fim do deploy.yml, depois do deploy.sh no host. A producao
# ja subiu quando este script roda: ele NUNCA reprova a promocao (sai sempre 0) e
# cada falha vira `::warning::`. Por isso nao ha `set -e`.
#
# A versao vem do `version.txt` do SHA ALVO; as notas, da secao dessa versao no
# `CHANGELOG.md` do mesmo checkout (formato do release-please). A tag e' ANOTADA:
# primeiro o objeto de tag (api git/tags), depois o ref que aponta para ele (api
# git/refs). Uma tag que ja existe NUNCA e' movida: no mesmo SHA e' repromocao
# (nada a fazer), em outro SHA e' aviso.
#
# Uso:   publicar-release.sh <dir-alvo>
# Env:   SHA (40 hex promovido), GITHUB_REPOSITORY, GH_TOKEN
# Saida: 0 sempre. A ultima linha do stdout e' uma de
#        `release: criada vX.Y.Z`, `release: ja publicada vX.Y.Z`,
#        `release: pulada` (precedida de `::warning::<motivo>`).
set -u

pular() {  # <motivo>
  echo "::warning::$1"
  echo "release: pulada"
  exit 0
}

[ $# -eq 1 ] || pular "publicar-release.sh sem o diretorio do alvo"
ALVO=$1
SHA=${SHA:-}
REPO=${GITHUB_REPOSITORY:-}

printf '%s' "$SHA" | grep -qE '^[0-9a-f]{40}$' || pular "SHA invalido ou ausente; release nao publicada"
[ -n "$REPO" ] || pular "GITHUB_REPOSITORY ausente; release nao publicada"
[ -f "$ALVO/version.txt" ] || pular "$ALVO/version.txt ausente; release nao publicada"

VERSAO=$(tr -d '[:space:]' < "$ALVO/version.txt")
printf '%s' "$VERSAO" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' \
  || pular "version.txt nao e X.Y.Z ('$VERSAO'); release nao publicada"
TAG="v$VERSAO"

# Corpo da secao `## [X.Y.Z]...` (ou `## X.Y.Z ...`, a primeira do release-please
# vem sem link) ate o proximo `## `, sem linhas em branco nas pontas. `index`
# compara literal: o ponto da versao nao vale curinga.
NOTAS=""
if [ -f "$ALVO/CHANGELOG.md" ]; then
  NOTAS=$(awk -v v="$VERSAO" '
    /^## / {
      if (dentro) exit
      if (index($0, "## [" v "]") == 1 || index($0, "## " v " ") == 1) dentro = 1
      next
    }
    dentro { linhas[++n] = $0 }
    END {
      i = 1; while (i <= n && linhas[i] ~ /^[[:space:]]*$/) i++
      while (n >= i && linhas[n] ~ /^[[:space:]]*$/) n--
      for (; i <= n; i++) print linhas[i]
    }
  ' "$ALVO/CHANGELOG.md")
fi
if [ -z "$NOTAS" ]; then
  echo "::warning::secao $VERSAO ausente ou vazia em CHANGELOG.md; release com a nota de reserva"
  NOTAS="Notas em CHANGELOG.md."
fi

# A tag ja existe? 404 e' "nao", e so ele. Qualquer outra falha da consulta nao
# prova que a tag e' nova, e criar por cima de uma que existe seria o erro caro.
# A logica de estado da tag e' espelhada em scripts/backfill-releases.sh (estado_tag) e nao e'
# compartilhada de proposito: este script atravessa para o espelho, aquele nao.
# stdout do gh vai para a variavel; stderr, para um arquivo temporario lido logo depois, para que
# um aviso do gh numa consulta bem-sucedida nao suje o parse. O 404 chega pelo stderr.
ERRO_GH=$(mktemp) || pular "mktemp falhou; release nao publicada"
EXISTENTE=$(gh api "repos/$REPO/git/ref/tags/$TAG" --jq '.object.type + " " + .object.sha' 2>"$ERRO_GH")
CONSULTA=$?
DETALHE=$(cat "$ERRO_GH" 2>/dev/null)
rm -f "$ERRO_GH"
if [ "$CONSULTA" -eq 0 ]; then
  TIPO=${EXISTENTE%% *}
  OBJETO=${EXISTENTE#* }
  if [ "$TIPO" = tag ]; then
    # Tag anotada: o ref guarda o objeto de tag, nao o commit.
    COMMIT=$(gh api "repos/$REPO/git/tags/$OBJETO" --jq .object.sha 2>/dev/null) \
      || pular "nao consegui ler o objeto de tag $OBJETO de $TAG; release nao publicada"
  else
    COMMIT=$OBJETO
  fi
  if [ "$COMMIT" = "$SHA" ]; then
    echo "release: ja publicada $TAG"
    exit 0
  fi
  pular "$TAG ja existe em $COMMIT e este deploy promoveu $SHA; a tag nao e movida"
fi
case "$DETALHE" in
  *"HTTP 404"*) ;;
  *) pular "consulta da tag $TAG falhou ($DETALHE); release nao publicada" ;;
esac

OBJETO_NOVO=$(gh api "repos/$REPO/git/tags" \
  -f tag="$TAG" -f message="Release $TAG" -f object="$SHA" -f type=commit \
  --jq .sha) \
  || pular "nao consegui criar o objeto da tag $TAG; release nao publicada"

gh api "repos/$REPO/git/refs" -f ref="refs/tags/$TAG" -f sha="$OBJETO_NOVO" >/dev/null \
  || pular "nao consegui criar o ref da tag $TAG; release nao publicada"

# A saida do gh vai para o stderr: a ultima linha do stdout e' o veredito.
printf '%s\n' "$NOTAS" \
  | gh release create "$TAG" --repo "$REPO" --verify-tag --title "$TAG" --notes-file - >&2 \
  || pular "tag $TAG criada, mas a release falhou; crie-a a mao"

echo "release: criada $TAG"
exit 0
