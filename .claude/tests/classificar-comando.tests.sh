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

# --- familia git: escapes achados no review (flags curtas agrupadas,
# --upload-pack/--receive-pack/--exec e --no-verify). Cada regra abaixo prova
# os dois lados: o comando perigoso nega, o comando legitimo vizinho libera —
# senao a cobertura e fantasma.

# flags curtas agrupadas: -Dq e -qD sao a mesma coisa para o parse-options
assert_nega   'git branch -Dq b1'
assert_nega   'git branch -qD b1'
assert_nega   'git branch -qM b2 b2x'
assert_nega   'git push -fq origin main'
assert_nega   'git tag -df v1'
assert_libera 'git push -n origin main'
assert_libera 'git push -u origin main'
assert_libera 'git branch -a'
assert_libera 'git branch -v'
assert_libera 'git branch -r'
assert_libera 'git log -1'

# --upload-pack / --receive-pack / --exec: execucao arbitraria por transporte local
assert_nega   'git fetch --upload-pack=/tmp/evil /tmp/repo'
assert_nega   'git push --receive-pack=sh origin main'
assert_nega   'git push --exec=sh origin main'

# URL_REMOTA nao cobria caminho local nem file://
assert_nega   'git pull file:///tmp/evil main'
assert_nega   'git pull ../evil main'
assert_nega   'git pull /tmp/evil main'
assert_libera 'git pull --rebase origin main'
assert_libera 'git fetch --all'
assert_libera 'git fetch origin main'

# --no-verify desarma o pre-push do proprio projeto
assert_nega   'git push --no-verify origin main'
assert_nega   'git commit --no-verify -m x'
assert_nega   'git commit -n -m x'
assert_libera 'git commit -m "docs: nota"'

# --- docker
assert_libera 'docker compose up -d'
assert_libera 'docker compose ps'
assert_libera 'docker compose logs -n 50 app'
assert_libera 'docker compose exec -T app php artisan test'
assert_libera 'docker compose exec -T app php artisan test --filter=CotacaoTest'
assert_nega   'docker compose exec -T app sh -c "rm -rf /"'
assert_nega   'docker compose exec -T app bash -c "ls"'
assert_nega   'docker compose exec -T app php artisan migrate'
assert_nega   'docker compose exec -T app php artisan db:seed'
assert_nega   'docker compose exec -T app php artisan typescript:transform'
assert_nega   'docker compose exec -T mysql php artisan test'
assert_nega   'docker compose exec -T app php artisan test --coverage-html=cov'
assert_nega   'docker compose down -v'
assert_nega   'docker run --rm -v /:/host alpine ls'

# --- pnpm
assert_libera 'pnpm test'
assert_libera 'pnpm build'
assert_libera 'pnpm lint'
assert_libera 'pnpm run test'
assert_nega   'pnpm lint -- --fix'
assert_nega   'pnpm dev'
assert_nega   'pnpm add lodash'
assert_nega   'pnpm install'
assert_nega   'pnpm -C ../fix-frontend test'
assert_nega   'pnpm --filter web build'

# --- gh
assert_libera 'gh pr list --state open'
assert_libera 'gh pr view 104'
assert_libera 'gh pr diff 104'
assert_libera 'gh api repos/Andred21/lotus/pulls/104'
assert_nega   'gh api -X POST repos/x/y/issues'
assert_nega   'gh api repos/x/y/issues -f title=oi'
assert_nega   'gh pr merge 104'
assert_nega   'gh pr create --fill'

# --- poppler
assert_libera 'pdfinfo /repo/backend/storage/doc.pdf'
assert_libera 'pdftoppm -png -r 144 -f 1 -l 1 /repo/doc.pdf /tmp/pdf-page'
assert_nega   'pdftoppm -png /repo/doc.pdf /repo/pagina'
assert_nega   'pdftoppm -png /repo/doc.pdf'

# --- reinstatadas da Task 2: provam a varredura de redirecionamento fim a fim
# agora que docker/pnpm reais existem (os stubs provisorios negariam sempre)
assert_libera 'pnpm test 2>/dev/null'
assert_libera 'pnpm test 2>&1'
assert_libera 'docker compose logs app 2>&1 | tail -20'

# --- endurecimento pos-review: flags curtas agrupadas escaparam da
# comparacao por igualdade exata, mesmo padrao ja corrigido em familia_git.
# `docker compose down -vt5` = -v (bool) seguido de -t com valor "5" —
# confirmado com `docker compose -f /dev/null down -vt5` (chega a "empty
# compose file", ou seja, passou pelo parse de flags do proprio docker).
assert_nega   'docker compose down -vt5'
# `gh api -iX POST ...` = -i (bool) seguido de -X com valor "POST" —
# confirmado com `gh api -iX GET rate_limit`, que respondeu de verdade.
assert_nega   'gh api -iX POST repos/x/y/issues'

# --- fix pos-review (item 4): tres escapes reais achados na revisao da task 4

# item 1 — pnpm: pass-through sem `--` reescreve frontend/src/
assert_nega   'pnpm lint --fix'
assert_nega   'pnpm test --reporter=junit --outputFile=/repo/x.json'
assert_nega   'pnpm test -F web'
assert_libera 'pnpm test'
assert_libera 'pnpm build'
assert_libera 'pnpm lint'
assert_libera 'pnpm test 2>/dev/null'
assert_libera 'pnpm test 2>&1'

# item 2 — gh api --input carrega corpo de requisicao (inclusive mutation graphql)
assert_nega   'gh api --input /tmp/body.json repos/x/y/issues'
assert_nega   'gh api graphql --input /tmp/m.json'
assert_nega   'gh api graphql --input=/tmp/m.json'
assert_libera 'gh api repos/Andred21/lotus/pulls/104'
assert_libera 'gh api -i rate_limit'
assert_libera 'gh pr view 104'

# item 3 — docker exec php artisan test: allowlist de flags, sem posicional
assert_nega   'docker compose exec -T app php artisan test /repo/evil.php'
assert_nega   'docker compose exec -T app php artisan test --env=production'
assert_nega   'docker compose exec -T app php artisan test --configuration=/tmp/x.xml'
assert_nega   'docker compose exec -T app php artisan test --coverage-html=cov'
assert_libera 'docker compose exec -T app php artisan test'
assert_libera 'docker compose exec -T app php artisan test --filter=CotacaoTest'
assert_libera 'docker compose exec -T app php artisan test --filter CotacaoTest'

# --- fix final de review (fix 1): aspas e barra invertida em posicao de FLAG
# O classificador compara o token como o agente o escreveu; o bash compara
# depois de expandir. `--forc\e` nao e `--force` aqui e E `--force` la. A
# regra fecha a CLASSE: token que vira flag depois da expansao nega, sem
# tentar adivinhar em que flag ele vai dar.

# os cinco escapes reproduzidos no review, agora negados
assert_nega   'git push --forc\e origin main'
assert_nega   'find . -name x -exe\c rm {} ;'
assert_nega   'sed --in-plac\e s/a/b/ README.md'
assert_nega   'git branch --delet\e antiga'
assert_nega   'git worktree remov\e ../outra'

# a forma por aspas desvia identico, entao cai junto
assert_nega   'git push --forc"e" origin main'
assert_nega   "git push --forc'e' origin main"
assert_nega   'git branch --delet"e" antiga'
assert_nega   'git remote set-ur\l origin https://exemplo.invalido/x.git'
assert_nega   'sed -i"" "s/a/b/" README.md'

# o outro lado: as flags literais continuam negando pelo motivo de sempre,
# e nao pela regra nova de ambiguidade
assert_contem "$(classificar 'git push --force origin main')" \
              'reescreve o remoto' 'git push --force nega pelo motivo original'
assert_contem "$(classificar 'git branch --delete antiga')" \
              'altera branch' 'git branch --delete nega pelo motivo original'
assert_contem "$(classificar 'git worktree remove ../outra')" \
              'arvore de outra lane' 'git worktree remove nega pelo motivo original'
assert_contem "$(classificar 'sed --in-place s/a/b/ README.md')" \
              'reescreve o arquivo' 'sed --in-place nega pelo motivo original'
assert_contem "$(classificar 'find . -name x -exec rm {} ;')" \
              'executa comando ou escreve' 'find -exec nega pelo motivo original'

# o outro lado do escopo: barra invertida e aspas dentro de ARGUMENTO sao
# normais e continuam passando — a regra so olha posicao de flag
assert_libera 'grep -rn "padrao\.txt" backend/app'
assert_libera 'cat "arquivo com espaco.txt"'
assert_libera 'grep -rn "a\.b\.c" backend/app'
assert_libera 'find . -name "*.log" -type f'
assert_libera 'git commit -m "docs: nota com \"aspas\" dentro"'

# --- fix final de review (fix 2): porta de escrita dentro da familia de
# LEITURA. `sort`, `uniq`, `tree` e `sed` seguem liberados; o que nega e a
# forma que grava — mesma regua que a spec ja aplica a `sed -i`.
assert_nega   'sort -o backend/Evil.php /etc/hostname'
assert_nega   'sort --output=backend/Evil.php a.txt'
assert_nega   'sort --output backend/Evil.php a.txt'
assert_nega   'sort -uo backend/Evil.php a.txt'
assert_libera 'sort a.txt'
assert_libera 'sort -u a.txt'
assert_libera 'sort -k1,1 -t: /etc/passwd'

assert_nega   'uniq a.txt out.txt'
assert_libera 'uniq a.txt'
assert_libera 'uniq -c a.txt'
assert_libera 'uniq -f 2 a.txt'

assert_nega   'tree -o saida.txt'
assert_nega   'tree --output=saida.txt'
assert_libera 'tree'
assert_libera 'tree -L 2 backend'

assert_nega   'sed -n "w backend/X.php" a.txt'
assert_nega   'sed -e "w backend/X.php" a.txt'
assert_nega   'sed "s/a/b/w backend/X.php" a.txt'
assert_nega   'sed -n "1,20{w backend/X.php}" a.txt'
assert_libera 'sed -n "1,20p" README.md'
assert_libera 'sed -n "/warning/p" app.log'
assert_libera 'sed "s/a/b/g" README.md'
assert_libera 'sed -n "/switch/d;/warn/p" a.txt'
assert_libera 'sort a.txt | uniq -c | sort -rn'

# --- Q-1: separador em allowlist. `|&` nao quebrava o comando, entao o lado
# direito inteiro entrava como argumento de um comando de leitura inofensivo.
# Cobre os dois lados: o que separa continua separando, o que nao se reconhece
# nega em vez de virar argumento.
assert_nega   'ls |& rm -rf /tmp/x'
assert_nega   'cat a.txt |& tee saida.txt'
assert_nega   'ls |& python3 -c "import os"'
assert_nega   'ls ;& rm x'
assert_nega   'ls ;;& rm x'
assert_nega   'ls; (rm -rf /)'
assert_contem "$(classificar 'ls |& rm -rf /tmp/x')" \
              'executa codigo arbitrario' '|& quebra o comando e o rm e classificado'
assert_contem "$(classificar 'ls; (rm -rf /)')" \
              'pontuacao de shell' 'pontuacao nao reconhecida nega em vez de passar'
assert_libera 'cat a.txt | grep foo'
assert_libera 'ls docs && git status'
assert_libera 'ls docs; git status'
assert_libera 'docker compose logs app & '

# --- Q-2: -C/--git-dir/--work-tree para fora da raiz so leem. A spec 5.3
# autorizou `-C` para leitura; somado a add/commit/push virava escrita cruzada.
# LOTUS_RAIZ do arquivo e /repo, entao `..` cai fora e `backend` cai dentro.
assert_nega   'git -C ../lotus-infra commit -m x'
assert_nega   'git -C ../lotus-infra add .'
assert_nega   'git -C /home/jvbat/projetos/fix-frontend push origin HEAD'
assert_nega   'git -C ../outra merge origin/main'
assert_nega   'git --git-dir=../lotus-infra/.git add .'
assert_nega   'git --work-tree=/tmp/x commit -m y'
assert_nega   'git --git-dir ../lotus-infra/.git commit -m z'
assert_nega   'git -C'
assert_contem "$(classificar 'git -C ../lotus-infra commit -m x')" \
              'arvore de outra lane' 'escrita cruzada nega pelo motivo certo'
assert_libera 'git -C ../lotus-infra log --oneline -5'
assert_libera 'git -C ../lotus-infra status --porcelain'
assert_libera 'git --git-dir=../lotus-infra/.git log -1'
assert_libera 'git -C backend log -1'
assert_libera 'git -C . commit -m "docs: nota"'
assert_libera 'git commit -m "docs: nota"'
# Sem LOTUS_RAIZ nao da para provar que o destino e interno: nega (fecha).
assert_igual  '' "$(LOTUS_RAIZ= python3 "$CLASSIF" 'git -C qualquer log -1' 2>&1)" \
              'sem LOTUS_RAIZ: leitura cruzada ainda passa'
if [[ -n $(LOTUS_RAIZ= python3 "$CLASSIF" 'git -C qualquer commit -m x' 2>&1) ]]; then
  printf '  ok    nega: sem LOTUS_RAIZ, escrita com -C falha fechada\n'
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1))
  printf '  FALHA nega: sem LOTUS_RAIZ, escrita com -C falha fechada\n'
fi
