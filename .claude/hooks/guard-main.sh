#!/usr/bin/env bash
# Nega escrita cruzada entre arvores, e escrita na main fora da allowlist.
# Contrato: exit 0 sempre, JSON no stdout. Falha aberta.
# Sem `set -e`: o corpo e chamado com `|| true` e o arquivo termina em exit 0.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

PREFIXOS_LIBERADOS=(docs/ .claude/ .agents/)
NOMES_LIBERADOS=(CLAUDE.md INSTRUÇÕES-DO-PROJETO.md CONTRIBUINDO.md AGENTS.md README.md)
# A lista de prefixos PROIBIDOS do harness de origem (.worktrees/,
# .claude/worktrees/) nao e portada: nenhuma arvore do Lotus mora dentro do
# repositorio, e a regra de escrita cruzada ja cobre o caso.

liberado_na_main() {
  local rel=$1 p n
  for p in "${PREFIXOS_LIBERADOS[@]}"; do
    [[ $rel == "$p"* ]] && return 0
  done
  for n in "${NOMES_LIBERADOS[@]}"; do
    [[ $rel == "$n" ]] && return 0
  done
  return 1
}

ancestral_existente() {
  # O alvo em geral AINDA NAO EXISTE — e o caso do Write —, entao sobe pelos
  # diretorios ate achar um que exista, e pergunta a branch ali.
  local d=$1
  while [[ -n $d && $d != / && ! -d $d ]]; do d=$(dirname "$d"); done
  printf '%s' "$d"
}

corpo() {
  ler_payload
  local alvo cwd raiz_sessao dir_alvo raiz_alvo branch rel
  alvo=$(campo '.tool_input.file_path')
  cwd=$(campo '.cwd')
  [[ -z $alvo ]] && return 0

  raiz_sessao=$(raiz_de "$cwd")
  [[ -z $raiz_sessao ]] && return 0

  [[ $alvo != /* ]] && alvo="$cwd/$alvo"
  alvo=$(realpath -m "$alvo")
  dir_alvo=$(ancestral_existente "$(dirname "$alvo")")
  raiz_alvo=$(raiz_de "$dir_alvo")
  [[ -z $raiz_alvo ]] && return 0

  if [[ $raiz_alvo != "$raiz_sessao" ]]; then
    negar_pretooluse "Bloqueado pelo harness: o alvo esta em outra arvore de \
trabalho ($raiz_alvo), e esta sessao trabalha em $raiz_sessao. Cada lane \
escreve so na propria arvore. Nenhum caminho isenta desta regra."
    return 0
  fi

  branch=$(branch_de "$dir_alvo")
  [[ $branch != main ]] && return 0

  rel=${alvo#"$raiz_alvo"/}
  liberado_na_main "$rel" && return 0
  negar_pretooluse "Bloqueado pelo harness: a branch desta arvore e \`main\`, \
onde so se escreve em docs/, .claude/, .agents/ e nos cinco arquivos de raiz \
(CLAUDE.md, INSTRUÇÕES-DO-PROJETO.md, CONTRIBUINDO.md, AGENTS.md, README.md). \
O alvo e \`$rel\`. Abra a worktree do bloco e escreva la."
}

corpo || true
exit 0
