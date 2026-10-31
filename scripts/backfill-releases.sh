#!/usr/bin/env bash
#
# Backfill das versoes desde o go-live (bloco 45, spec §4.4): para cada linha da
# tabela scripts/backfill-releases.tsv cria a tag anotada `vX.Y.Z` (com a data da
# promocao) e a Release, nos DOIS repositorios -- origem (Andred21/lotus, SHA de
# origem) e espelho (Gatika-CL/lotus, SHA promovido). Gera tambem o CHANGELOG.md
# inicial. As notas das Releases e as secoes do CHANGELOG saem da mesma geracao.
#
# E' ferramenta de desenvolvimento, roda UMA vez na maquina do joao (listada no
# .espelho-exclusoes). Escrita remota nao sai de sessao de agente: `--simular`
# mostra tudo e nao escreve; sem a flag, escreve.
#
# O que a tabela afirma e' conferido, nunca presumido. Nada e' escrito antes de
# TUDO abaixo passar (ou o script para com exit 1):
#  - o repositorio nao e' raso (um clone raso calcularia o bump errado);
#  - o bump calculado por D2 entre duas linhas e' o da tabela. D2: so conta commit
#    que toca backend/ frontend/ docker/ deploy/ .github/; `fix`/`perf` -> PATCH,
#    `feat` -> MINOR, `!`/BREAKING CHANGE -> MAJOR; demais tipos nunca sobem. A
#    tabela e' autoritativa: o script jamais a ajusta para o bump bater;
#  - sem --simular: o commit espelho carrega `Source-Commit: <origem>` (remoto
#    `upstream`), o SHA do espelho consta no log de uma execucao `success` do
#    deploy.yml do espelho, e nenhuma tag existente aponta para outro SHA.
#
# Uma tag que ja existe no mesmo SHA e' pulada (anotada ou leve); a release que ja
# existe tambem. Rodar de novo apos uma falha no meio e' seguro.
#
# Uso:   scripts/backfill-releases.sh [--simular] [--changelog <arquivo>]
# Env:   LOTUS_BACKFILL_TABELA   tabela TSV (default: backfill-releases.tsv ao lado)
#        LOTUS_BACKFILL_ORIGEM   default Andred21/lotus
#        LOTUS_BACKFILL_ESPELHO  default Gatika-CL/lotus
# Saida: stdout = uma linha `vX.Y.Z  AAAA-MM-DD  <origem7>  <espelho7>` por versao,
#        com as notas; diagnostico em stderr. Exit 1 em qualquer divergencia, 2 em
#        erro de uso.
set -u

erro() {
  echo "erro: $*" >&2
  exit 1
}

SIMULAR=0
CHANGELOG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --simular) SIMULAR=1 ;;
    --changelog)
      [ $# -ge 2 ] || { echo "uso: --changelog exige um arquivo" >&2; exit 2; }
      CHANGELOG=$2
      shift
      ;;
    *)
      echo "uso: backfill-releases.sh [--simular] [--changelog <arquivo>]" >&2
      exit 2
      ;;
  esac
  shift
done

TABELA=${LOTUS_BACKFILL_TABELA:-$(dirname "$0")/backfill-releases.tsv}
ORIGEM=${LOTUS_BACKFILL_ORIGEM:-Andred21/lotus}
ESPELHO=${LOTUS_BACKFILL_ESPELHO:-Gatika-CL/lotus}
CAMINHOS=(backend frontend docker deploy .github)
GOLIVE="Primeira versão em produção (go-live)."

git rev-parse --git-dir >/dev/null 2>&1 || erro "fora de um repositorio git"
[ "$(git rev-parse --is-shallow-repository)" = false ] \
  || erro "clone raso: o bump seria calculado sobre historico incompleto. Rode 'git fetch --unshallow origin' e tente de novo"
[ -f "$TABELA" ] || erro "tabela $TABELA nao encontrada"

# ---------------------------------------------------------------- tabela
VERS=(); DATAS=(); ORIG=(); ESPE=(); LINHA=()
n=0
while IFS=$'\t' read -r versao data origem espelho resto || [ -n "${versao:-}" ]; do
  n=$((n + 1))
  case "${versao:-}" in ''|'#'*) continue ;; esac
  [ -z "${resto:-}" ] && [ -n "${espelho:-}" ] || erro "tabela linha $n: esperava 4 campos separados por TAB"
  printf '%s' "$versao" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' || erro "tabela linha $n: versao '$versao' nao e X.Y.Z"
  printf '%s' "$data" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' || erro "tabela linha $n: data '$data' nao e AAAA-MM-DD"
  printf '%s' "$origem" | grep -qE '^[0-9a-f]{40}$' || erro "tabela linha $n: SHA de origem invalido"
  printf '%s' "$espelho" | grep -qE '^[0-9a-f]{40}$' || erro "tabela linha $n: SHA do espelho invalido"
  VERS+=("$versao"); DATAS+=("$data"); ORIG+=("$origem"); ESPE+=("$espelho"); LINHA+=("$n")
done < "$TABELA"
N=${#VERS[@]}
[ "$N" -gt 0 ] || erro "tabela $TABELA sem nenhuma versao"

# ---------------------------------------------------------------- bump (D2)
rank_de() {  # nenhum|patch|minor|major -> 0..3
  case "$1" in nenhum) echo 0 ;; patch) echo 1 ;; minor) echo 2 ;; major) echo 3 ;; esac
}
nome_de() { case "$1" in 0) echo nenhum ;; 1) echo patch ;; 2) echo minor ;; 3) echo major ;; esac; }

# bump que a tabela declara entre duas versoes consecutivas
bump_da_tabela() {  # <anterior> <atual>
  local a1 a2 a3 b1 b2 b3
  IFS=. read -r a1 a2 a3 <<< "$1"
  IFS=. read -r b1 b2 b3 <<< "$2"
  if [ "$b1" -gt "$a1" ]; then echo major
  elif [ "$b1" -lt "$a1" ]; then echo invalido
  elif [ "$b2" -gt "$a2" ]; then echo minor
  elif [ "$b2" -lt "$a2" ]; then echo invalido
  elif [ "$b3" -gt "$a3" ]; then echo patch
  else echo invalido
  fi
}

RE_CC='^([a-z]+)(\(([^)]*)\))?(!)?: (.*)$'
NOTAS=()
DIVERGENCIAS=()
NOTAS[0]=$GOLIVE
git cat-file -e "${ORIG[0]}^{commit}" 2>/dev/null || erro "linha ${LINHA[0]} (v${VERS[0]}): commit de origem ${ORIG[0]:0:7} nao existe neste repositorio"

for ((i = 1; i < N; i++)); do
  v=${VERS[i]}
  atual=${ORIG[i]}
  anterior=${ORIG[i-1]}
  git cat-file -e "$atual^{commit}" 2>/dev/null || erro "linha ${LINHA[i]} (v$v): commit de origem ${atual:0:7} nao existe neste repositorio"
  git merge-base --is-ancestor "$anterior" "$atual" \
    || erro "linha ${LINHA[i]} (v$v): ${anterior:0:7} (v${VERS[i-1]}) nao e ancestral de ${atual:0:7}"
  esperado=$(bump_da_tabela "${VERS[i-1]}" "$v")
  [ "$esperado" != invalido ] || erro "linha ${LINHA[i]}: v$v nao e maior que v${VERS[i-1]}"

  maior=0
  feats=""; fixes=""; perfs=""; lista=""
  while read -r sha; do
    [ -n "$sha" ] || continue
    msg=$(git show -s --format=%B "$sha")
    assunto=${msg%%$'\n'*}
    lista+="    ${sha:0:7} $assunto"$'\n'
    tipo=""; escopo=""; desc=$assunto; quebra=0
    if [[ $assunto =~ $RE_CC ]]; then
      tipo=${BASH_REMATCH[1]}
      escopo=${BASH_REMATCH[3]}
      [ -n "${BASH_REMATCH[4]}" ] && quebra=1
      desc=${BASH_REMATCH[5]}
    fi
    printf '%s\n' "$msg" | tail -n +2 | grep -qE '^BREAKING[ -]CHANGE' && quebra=1
    r=0
    if [ "$quebra" = 1 ]; then r=3
    else
      case "$tipo" in feat) r=2 ;; fix|perf) r=1 ;; esac
    fi
    [ "$r" -gt "$maior" ] && maior=$r
    item="* ${escopo:+**$escopo:** }$desc (${sha:0:7})"
    case "$tipo" in
      feat) feats+="$item"$'\n' ;;
      fix) fixes+="$item"$'\n' ;;
      perf) perfs+="$item"$'\n' ;;
    esac
  done < <(git rev-list --no-merges "$anterior..$atual" -- "${CAMINHOS[@]}")

  calculado=$(nome_de "$maior")
  echo "  v$v: bump $calculado (tabela: $esperado)" >&2
  if [ "$maior" != "$(rank_de "$esperado")" ]; then
    DIVERGENCIAS+=("linha ${LINHA[i]} (v$v, v${VERS[i-1]} -> v$v): bump calculado por D2 e' $calculado, a tabela exige $esperado. Commits de produto ${anterior:0:7}..${atual:0:7}:"$'\n'"${lista:-    (nenhum)}")
  fi

  nota=""
  for par in "Funcionalidades:$feats" "Correções:$fixes" "Desempenho:$perfs"; do
    titulo=${par%%:*}
    itens=${par#*:}
    [ -n "$itens" ] || continue
    [ -z "$nota" ] || nota+=$'\n\n'
    nota+="### $titulo"$'\n\n'"${itens%$'\n'}"
  done
  NOTAS[i]=${nota:-Sem alterações listadas.}
done

if [ "${#DIVERGENCIAS[@]}" -gt 0 ]; then
  echo "erro: o bump calculado diverge da tabela; nada foi escrito. A tabela e' autoritativa e so o joao a corrige." >&2
  for d in "${DIVERGENCIAS[@]}"; do printf '%s\n' "$d" >&2; done
  exit 1
fi

# ---------------------------------------------------------------- conferencias remotas (sem --simular)
estado_tag() {  # <repo> <tag> <sha> -> novo | ok | outro:<commit>
  local repo=$1 tag=$2 sha=$3 existente tipo objeto commit
  if existente=$(gh api "repos/$repo/git/ref/tags/$tag" --jq '.object.type + " " + .object.sha' 2>&1); then
    tipo=${existente%% *}
    objeto=${existente#* }
    if [ "$tipo" = tag ]; then
      commit=$(gh api "repos/$repo/git/tags/$objeto" --jq .object.sha 2>/dev/null) \
        && [ -n "$commit" ] || { echo "erro: nao consegui ler o objeto de tag $objeto de $tag em $repo" >&2; return 1; }
    else
      commit=$objeto
    fi
    if [ "$commit" = "$sha" ]; then echo ok; else echo "outro:$commit"; fi
    return 0
  fi
  case "$existente" in
    *"HTTP 404"*) echo novo ;;
    *) echo "erro: consulta da tag $tag em $repo falhou ($existente)" >&2; return 1 ;;
  esac
}

ESTADO_O=(); ESTADO_E=()
if [ "$SIMULAR" = 0 ]; then
  NOME=$(git config user.name || true)
  EMAIL=$(git config user.email || true)
  [ -n "$NOME" ] && [ -n "$EMAIL" ] || erro "git config user.name/user.email ausentes: o tagger da tag anotada precisa dos dois"

  URL_UPSTREAM=$(git remote get-url upstream 2>/dev/null) \
    || erro "remoto 'upstream' (o espelho $ESPELHO) ausente: nao ha como conferir o Source-Commit"
  # O Source-Commit so prova algo se o `upstream` for mesmo o espelho. Substring literal (aspas no padrao do case).
  case "$URL_UPSTREAM" in
    *"$ESPELHO"*) ;;
    *) erro "o remoto 'upstream' ($URL_UPSTREAM) nao aponta para $ESPELHO; o Source-Commit seria conferido no repositorio errado" ;;
  esac
  git fetch --quiet upstream || erro "git fetch upstream falhou"

  for ((i = 0; i < N; i++)); do
    git cat-file -e "${ESPE[i]}^{commit}" 2>/dev/null \
      || erro "linha ${LINHA[i]} (v${VERS[i]}): commit do espelho ${ESPE[i]:0:7} nao existe em upstream"
    fonte=$(git log -1 --format='%(trailers:key=Source-Commit,valueonly)' "${ESPE[i]}" | head -n 1 | tr -d '[:space:]')
    [ "$fonte" = "${ORIG[i]}" ] \
      || erro "linha ${LINHA[i]} (v${VERS[i]}): Source-Commit do espelho ${ESPE[i]:0:7} e' '${fonte:-ausente}', a tabela diz ${ORIG[i]}"
  done

  ids=$(gh run list --repo "$ESPELHO" --workflow deploy.yml --status success --limit 200 --json databaseId --jq '.[].databaseId') \
    || erro "gh run list de deploy.yml em $ESPELHO falhou"
  PROMOVIDOS=""
  for id in $ids; do
    log=$(gh run view "$id" --repo "$ESPELHO" --log) || erro "gh run view $id em $ESPELHO falhou"
    PROMOVIDOS+=$(printf '%s\n' "$log" | grep -oE '(^|[[:space:]])SHA: [0-9a-f]{40}' | grep -oE '[0-9a-f]{40}')$'\n'
  done
  for ((i = 0; i < N; i++)); do
    printf '%s' "$PROMOVIDOS" | grep -qx "${ESPE[i]}" \
      || erro "linha ${LINHA[i]} (v${VERS[i]}): o SHA ${ESPE[i]} nao consta no log de nenhuma execucao success do deploy.yml de $ESPELHO"
  done

  conflito=0
  for ((i = 0; i < N; i++)); do
    tag="v${VERS[i]}"
    ESTADO_O[i]=$(estado_tag "$ORIGEM" "$tag" "${ORIG[i]}") || exit 1
    ESTADO_E[i]=$(estado_tag "$ESPELHO" "$tag" "${ESPE[i]}") || exit 1
    case "${ESTADO_O[i]}" in outro:*) echo "erro: $tag ja existe em $ORIGEM em ${ESTADO_O[i]#outro:}, a tabela diz ${ORIG[i]}" >&2; conflito=1 ;; esac
    case "${ESTADO_E[i]}" in outro:*) echo "erro: $tag ja existe em $ESPELHO em ${ESTADO_E[i]#outro:}, a tabela diz ${ESPE[i]}" >&2; conflito=1 ;; esac
  done
  [ "$conflito" = 0 ] || erro "tag existente em outro SHA; a tag nao e movida e nada foi escrito"
fi

# ---------------------------------------------------------------- saida e CHANGELOG
for ((i = 0; i < N; i++)); do
  printf 'v%s  %s  %s  %s\n\n%s\n\n' "${VERS[i]}" "${DATAS[i]}" "${ORIG[i]:0:7}" "${ESPE[i]:0:7}" "${NOTAS[i]}"
done

if [ -n "$CHANGELOG" ]; then
  {
    printf '# Changelog\n'
    for ((i = N - 1; i >= 0; i--)); do
      if [ "$i" -eq 0 ]; then
        link="https://github.com/$ORIGEM/releases/tag/v${VERS[i]}"
      else
        link="https://github.com/$ORIGEM/compare/v${VERS[i-1]}...v${VERS[i]}"
      fi
      printf '\n## [%s](%s) (%s)\n\n%s\n' "${VERS[i]}" "$link" "${DATAS[i]}" "${NOTAS[i]}"
    done
  } > "$CHANGELOG" || erro "nao consegui gravar $CHANGELOG"
  echo "CHANGELOG gravado em $CHANGELOG" >&2
fi

[ "$SIMULAR" = 0 ] || exit 0

# ---------------------------------------------------------------- escrita
publicar() {  # <repo> <tag> <sha> <data> <estado-da-tag> <flag --latest> <notas>
  local repo=$1 tag=$2 sha=$3 data=$4 estado=$5 latest=$6 notas=$7 objeto
  if [ "$estado" = novo ]; then
    objeto=$(gh api "repos/$repo/git/tags" \
      -f tag="$tag" -f message="Release $tag" -f object="$sha" -f type=commit \
      -f "tagger[name]=$NOME" -f "tagger[email]=$EMAIL" -f "tagger[date]=${data}T12:00:00Z" \
      --jq .sha) || erro "nao consegui criar o objeto da tag $tag em $repo"
    gh api "repos/$repo/git/refs" -f ref="refs/tags/$tag" -f sha="$objeto" >/dev/null \
      || erro "objeto de $tag criado, mas o ref falhou em $repo; rode de novo"
    echo "tag $tag criada em $repo" >&2
  else
    echo "tag $tag ja existe em $repo no mesmo SHA; pulada" >&2
  fi
  if gh release view "$tag" --repo "$repo" >/dev/null 2>&1; then
    echo "release $tag ja existe em $repo; pulada" >&2
  else
    printf '%s\n' "$notas" \
      | gh release create "$tag" --repo "$repo" --verify-tag --title "$tag" "$latest" --notes-file - >/dev/null \
      || erro "tag $tag criada, mas a release falhou em $repo; rode de novo"
    echo "release $tag criada em $repo" >&2
  fi
}

for ((i = 0; i < N; i++)); do
  latest=--latest=false
  [ "$i" -eq $((N - 1)) ] && latest=--latest
  publicar "$ORIGEM" "v${VERS[i]}" "${ORIG[i]}" "${DATAS[i]}" "${ESTADO_O[i]}" "$latest" "${NOTAS[i]}"
  publicar "$ESPELHO" "v${VERS[i]}" "${ESPE[i]}" "${DATAS[i]}" "${ESTADO_E[i]}" "$latest" "${NOTAS[i]}"
done
echo "backfill concluido: $N versoes em $ORIGEM e $ESPELHO" >&2
