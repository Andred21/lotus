# Unitario puro: o classificador nao toca git nem stdin.
CLASSIF="$DIR_HOOKS/lib/classificar-comando.py"

classificar() { LOTUS_RAIZ=/repo python3 "$CLASSIF" "$1" 2>&1; }

assert_libera() {
  # $2 e opcional: titulo de exibicao, para os casos com newline literal em
  # $1, que quebrariam a linha do relatorio se ecoados crus.
  local saida; saida=$(classificar "$1")
  local titulo=${2:-$1}
  assert_igual '' "$saida" "libera: $titulo"
}
assert_nega() {
  # $2 e opcional: mesma razao do assert_libera acima.
  local saida; saida=$(classificar "$1")
  local titulo=${2:-$1}
  if [[ -n $saida ]]; then
    printf '  ok    nega: %s\n' "$titulo"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA nega: %s\n          liberou em vez de negar\n' "$titulo"
  fi
}

# --- varredura: redirecionamento
assert_nega   'echo oi > arquivo.txt'
assert_nega   'cat a >> b'
assert_nega   'pnpm build &> saida.log'

# --- varredura: aspas e substituicao
assert_libera 'cat "arquivo com espaco.txt"'
assert_libera 'echo ">"'
assert_libera "echo '\$(rm -rf /)'"
assert_nega   'diff <(ls) <(ls -a)'
assert_nega   "echo 'aspas abertas"

# --- varredura: atribuicao e nome nao literal
assert_nega   'GIT_EXTERNAL_DIFF=/tmp/x git diff'
assert_nega   '$CMD --tudo'

# --- familia de leitura
assert_libera 'ls -la docs'
assert_libera 'grep -rn "padrao" backend/app'
assert_libera 'sed -n "1,20p" README.md'
assert_libera 'cat a.txt | grep -n foo | wc -l'
assert_nega   'sed -i "s/a/b/" README.md'
assert_nega   'find . -name "*.tmp" -delete'
assert_nega   'find . -name x -exec rm {} ;'
assert_nega   'tee saida.txt'
assert_nega   'ls | xargs rm'
assert_nega   'bash script.sh'
assert_nega   'python3 -c "print(1)"'
assert_nega   'node -e "process.exit(0)"'
assert_nega   'npx eslint .'
assert_nega   'comandoquenaoexiste --flag'
assert_nega   './vendor/bin/pint app/Models'

# --- quebra de linha: newline separa comandos como ';', mas so fora de aspas
assert_nega   $'ls docs\ngit push --force origin main' \
              'newline fora de aspas: segunda linha perigosa'
assert_libera $'ls docs\ncat README.md' \
              'newline fora de aspas: as duas linhas sao leitura'
assert_libera $'echo "linha1\nlinha2"' \
              'newline dentro de aspas: e dado, nao separador'

# --- # no meio da palavra: shlex tem `#` como comentario, bash nao tem
assert_nega   'echo x#y; rm -rf /' \
              '# no meio da palavra esconde um segundo comando'
assert_nega   'find . -name a#b -delete' \
              '# no meio da palavra esconde a flag -delete'
assert_libera 'echo a#b' \
              '# no meio da palavra em comando de leitura legitimo'

# --- familia git: o par que decide e -C contra -c
assert_libera 'git status --porcelain'
assert_libera 'git -C ../lotus-infra log --oneline -5'
assert_nega   'git -c core.pager=sh log'
assert_nega   'git --config-env=core.pager=X log'
assert_nega   'git --exec-path=/tmp status'

assert_libera 'git log --oneline -10'
assert_libera 'git diff --stat'
assert_libera 'git add docs/superpowers/state.md'
assert_libera 'git commit -m "docs: nota"'
assert_libera 'git branch --list'
assert_libera 'git worktree list --porcelain'
assert_libera 'git push origin HEAD'

assert_nega   'git rebase -i HEAD~3'
assert_nega   'git checkout -b nova'
assert_nega   'git switch outra'
assert_nega   'git restore .'
assert_nega   'git stash pop'
assert_nega   'git log -o saida.txt'
assert_nega   'git branch -D antiga'
assert_nega   'git branch -m velho novo'
assert_nega   'git tag -d v1'
assert_nega   'git push --force origin main'
assert_nega   'git push origin :refs/heads/antiga'
assert_nega   'git push origin +main'
assert_nega   'git worktree remove ../fix-frontend'
assert_nega   'git worktree add --force ../x branch'
assert_nega   'git remote set-url origin https://exemplo.invalido/x.git'
assert_nega   'git pull https://exemplo.invalido/x.git main'

assert_libera 'git log -1 $(git rev-parse HEAD)'
assert_nega   'git log -1 $(rm -rf /)'
