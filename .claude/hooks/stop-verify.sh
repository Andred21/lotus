#!/usr/bin/env bash
# Cobra evidencia de verificacao quando a sessao mexeu em codigo.
# Duas guardas contra laco, com papeis diferentes: stop_hook_active (campo da
# API, vem true quando o Claude Code ja esta continuando por causa de um
# bloqueio anterior deste mesmo hook) corta o laco imediato; a marca em TMPDIR
# implementa o "este aviso nao repete para o mesmo commit" que o proprio texto
# promete ao leitor.
# Contrato: decision/reason na RAIZ do JSON. exit 0 sempre. Falha aberta.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

contar() { git -C "$1" status --porcelain -- "$2" 2>/dev/null | wc -l; }

corpo() {
  ler_payload
  local cwd raiz sid head marca n_back n_front n_claude motivo lista
  local -a exigencias=()

  [[ $(campo '.stop_hook_active') == true ]] && return 0
  cwd=$(campo '.cwd')
  [[ -z $cwd ]] && return 0
  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0

  # O filtro de caminho e do git, nunca um regex sobre a saida: o formato
  # porcelain poe o caminho ANTIGO primeiro numa renomeacao
  # ('R  a.ts -> src/b.ts') e envolve em aspas duplas qualquer caminho com
  # espaco. Regex ancorado depois do status erra os dois casos.
  n_back=$(contar "$raiz" backend)
  n_front=$(contar "$raiz" frontend)
  n_claude=$(contar "$raiz" .claude)
  (( n_back + n_front + n_claude == 0 )) && return 0

  sid=$(campo '.session_id'); [[ -z $sid ]] && sid=sem-sessao
  head=$(git -C "$raiz" rev-parse --short HEAD 2>/dev/null); [[ -z $head ]] && head=sem-head
  marca="${TMPDIR:-/tmp}/lotus-stopverify-${sid}-${head}.marca"
  [[ -e $marca ]] && return 0
  : > "$marca" 2>/dev/null

  # Cobra so o que foi tocado. Pedir 'pnpm build' quando so o backend mudou
  # treina o leitor a ignorar o aviso.
  (( n_back > 0 )) && exigencias+=("backend/ ($n_back arquivo(s)): 'docker compose exec -T app php artisan test' e 'cd backend && ./vendor/bin/pint <arquivos>' — o pint NUNCA sem argumento, que reformata o repo inteiro")
  (( n_front > 0 )) && exigencias+=("frontend/ ($n_front arquivo(s)): 'pnpm build', 'pnpm test' e 'pnpm lint'")
  (( n_claude > 0 )) && exigencias+=(".claude/ ($n_claude arquivo(s)): 'bash .claude/tests/run-all.sh'")

  lista=$(printf '%s | ' "${exigencias[@]}")
  lista=${lista% | }

  motivo="NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE. Este hook \
le a arvore inteira e nao sabe quais arquivos sao seus. Antes de encerrar, \
rode nesta sessao e cole a saida de: ${lista}. Se ja rodou e o resultado esta \
limpo, diga isso com a saida e encerre. Este aviso nao repete para o mesmo \
commit."

  bloquear_stop "$motivo"
  return 0
}

corpo || true
exit 0
