#!/usr/bin/env bash
#
# Espelha `origin/main` (Andred21/lotus) em `upstream/main` (Gatika-CL/lotus)
# publicando UMA arvore filtrada por commit, sem os arquivos de desenvolvimento
# listados em `.espelho-exclusoes`.
#
# Por que um commit sintetico e nao um push direto: o corporativo recebe o
# codigo que constroi e roda o app, nao o andaime de desenvolvimento. Como a
# arvore e diferente, o SHA tambem e -- e a rastreabilidade volta pelo trailer
# `Source-Commit:`, que o job `procedencia` do CI exige e confere.
#
# O commit e criado com `commit-tree` sobre um indice temporario: a arvore de
# trabalho e o indice de quem roda o script NAO sao tocados em nenhum momento.
#
# Uso:
#   scripts/espelhar-corporativo.sh            # espelha de verdade
#   scripts/espelhar-corporativo.sh --simular  # so mostra o que entraria
set -euo pipefail

SIMULAR=0
[ "${1:-}" = "--simular" ] && SIMULAR=1

RAIZ=$(git rev-parse --show-toplevel)
cd "$RAIZ"

EXCLUSOES="$RAIZ/.espelho-exclusoes"
[ -f "$EXCLUSOES" ] || { echo "erro: $EXCLUSOES nao existe" >&2; exit 1; }

echo "==> buscando refs"
git fetch --quiet origin main
git fetch --quiet upstream main 2>/dev/null || true

FONTE=$(git rev-parse origin/main)
FONTE_CURTO=$(git rev-parse --short origin/main)
ASSUNTO=$(git log -1 --pretty=%s "$FONTE")

# Indice temporario: nada do que vem abaixo encosta no indice real.
INDICE=$(mktemp)
trap 'rm -f "$INDICE"' EXIT
export GIT_INDEX_FILE="$INDICE"

git read-tree "$FONTE"
while IFS= read -r caminho; do
  case "$caminho" in ''|\#*) continue ;; esac
  # -f porque o indice temporario vem de origin/main e diverge do HEAD desta
  # arvore; sem ele o git recusa por seguranca. --cached mantem a remocao
  # dentro do indice: nenhum arquivo do disco e tocado.
  git rm --cached -r -q -f --ignore-unmatch -- "$caminho"
done < "$EXCLUSOES"

ARVORE=$(git write-tree)

if [ "$SIMULAR" = "1" ]; then
  echo "==> arvore filtrada de $FONTE_CURTO ($ARVORE)"
  git ls-tree -r --name-only "$ARVORE" | awk -F/ '{print $1}' | sort -u
  echo "==> total de arquivos: $(git ls-tree -r --name-only "$ARVORE" | wc -l)"
  echo "==> (origem tem $(git ls-tree -r --name-only "$FONTE" | wc -l))"
  exit 0
fi

PAI=$(git rev-parse --verify --quiet upstream/main || true)

if [ -n "$PAI" ] && [ "$(git rev-parse "$PAI^{tree}")" = "$ARVORE" ]; then
  echo "==> upstream/main ja tem esta arvore. Nada a espelhar."
  exit 0
fi

MENSAGEM=$(cat <<EOF
release: espelho de $FONTE_CURTO -- $ASSUNTO

Arvore filtrada por .espelho-exclusoes: o andaime de desenvolvimento
(.claude, .agents, docs internos) fica em Andred21/lotus, que e onde a
revisao acontece. Aqui entra o que constroi, testa e roda o app.

Source-Commit: $FONTE
EOF
)

if [ -n "$PAI" ]; then
  NOVO=$(git commit-tree "$ARVORE" -p "$PAI" -m "$MENSAGEM")
else
  NOVO=$(git commit-tree "$ARVORE" -m "$MENSAGEM")
fi

echo "==> commit de espelho $NOVO (fonte $FONTE_CURTO)"
LOTUS_ESPELHO=1 git push upstream "$NOVO:refs/heads/main"
echo "==> publicado em Gatika-CL/lotus"
