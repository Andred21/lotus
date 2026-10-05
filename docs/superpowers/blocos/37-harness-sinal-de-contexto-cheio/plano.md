# Bloco 37 — `harness-sinal-de-contexto-cheio` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** um hook que mede o contexto real da sessão e, ao passar de 150 mil tokens, avisa o
modelo e o João uma vez por travessia, sem compactar nada.

**Architecture:** `.claude/hooks/sinal-contexto.sh` roda no `PostToolUse` (sem matcher) e no
`UserPromptSubmit`. Ele lê a cauda de 200 linhas do transcript, e a medição é a soma do `usage`
da última chamada do fio principal à API. Uma marca por sessão no `TMPDIR` cala o aviso até a
medição voltar para baixo do limiar. O emissor do JSON (`injetar_contexto`) entra no
`.claude/hooks/lib/comum.sh`, ao lado dos outros emissores, e a ligação vai no
`.claude/settings.json`.

**Tech Stack:** bash 5, `jq` 1.8, python3 da biblioteca padrão (só na bancada de mutantes, fora do
repositório), a suíte `.claude/tests/run-all.sh`.

**Spec:** [`spec.md`](./spec.md) (decisões D1–D2, emendas E1–E3).

**Código validado.** Todo arquivo deste plano foi montado e rodado no planejamento, numa cópia do
`HEAD` da lane (`75fb07bc`). Cada vermelho e cada verde dos passos abaixo é o que se mediu ali, e as
edições, aplicadas em ordem, chegam byte a byte ao estado que deu
`OK: 18 arquivo(s) de teste, nenhuma falha` e `mutantes sem teste que reprove: 0 de 22`. Copie os
blocos como estão. Saída diferente da que o passo espera é achado: pare e relate, não ajuste o
teste para passar.

## Global Constraints

- **Limiar** (spec §1.3): `150000` tokens. `LOTUS_CONTEXTO_LIMIAR` sobrescreve quando casa
  `^[1-9][0-9]*$`; qualquer outro valor cai no padrão.
- **Medição** (spec §1.2): só as últimas 200 linhas do transcript, cada uma por `fromjson?`. Vale
  a última entrada com `type == "assistant"`, `isSidechain != true`, `message` e `message.usage`
  objetos e soma de `input_tokens + cache_read_input_tokens + cache_creation_input_tokens` maior
  que zero, contando como 0 o campo que não é número. Uma entrada
  `{"type":"system","subtype":"compact_boundary"}` zera a medição (E1). **Falta de medição nunca
  rearma.**
- **Guardas de saída silenciosa, nesta ordem:** evento fora de `PostToolUse` e
  `UserPromptSubmit`; payload com `agent_id`; `transcript_path` vazio ou ilegível; sem medição.
- **Marca** (spec §1.4): `${TMPDIR:-/tmp}/lotus-contexto-<sid>.marca`, com `<sid>` o `session_id`
  (vazio vira `sem-sessao`) e todo caractere fora de `[A-Za-z0-9_-]` trocado por `_` (E2). Medição
  ≤ limiar apaga a marca; acima com marca, silêncio; acima sem marca, cria e avisa. Marca que não
  pode ser criada → silêncio.
- **Saída** (spec §1.5): um JSON só, por `jq -n --arg`:
  `{"systemMessage":T,"hookSpecificOutput":{"hookEventName":<evento do payload>,"additionalContext":T}}`,
  com `T` exatamente
  `Contexto em ~<N> mil tokens, acima de <L> mil. Nao abra unidade nova: feche a task atual, grave em fronteira duravel (commit, estado.md) e peca ao Joao /compact ou /clear. Este aviso nao repete ate o contexto cair abaixo do limiar.`,
  `<N>` e `<L>` divididos por 1000 e arredondados para baixo.
- **Contrato** (spec §1.6): `exit 0` sempre, falha aberta; o corpo é a função `corpo`, chamada com
  `|| true`, como no `stop-verify.sh`. Payload só por `ler_payload` e `campo`.
- **Ligação** (spec §1.1): uma entrada em `PostToolUse`, sem `matcher`, e uma em
  `UserPromptSubmit`, ambas com
  `"command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/sinal-contexto.sh\""` e
  `"timeout": 15`, **sem `statusMessage`**.
- **Texto.** Comentários e mensagens de scripts e testes em ASCII, sem acento, como os
  existentes. Docs em português com acento, com a prosa quebrada em até 100 colunas.
- **Modos.** O hook novo é `100755`, como os outros hooks; o arquivo de teste é `100644`, como os
  outros testes.
- **Trava de avulso.** Todo `*.tests.sh` abre com a linha que recusa rodar fora do `run-all.sh`, e
  o `avulso.tests.sh` a cobra. O arquivo novo já a traz.
- **Git.** `git add` nomeia cada caminho, nunca `-A`, `.` ou diretório. Nunca `git stash`: a pilha
  é compartilhada entre as árvores. Commits em Conventional Commits, em português, terminando com
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` — ou o modelo que de fato escreveu
  o commit (com `--max`, os implementadores são Opus).
- **Suíte.** `bash .claude/tests/run-all.sh` leva ~30 s; o veredito é a última linha e o código de
  saída. Os passos usam o **placar**: uma rodada só, que imprime as três primeiras `FALHA` do
  `sinal-contexto.tests.sh` (cada uma com as duas linhas seguintes), o placar
  `sinal-contexto.tests.sh: ok=<n> falha=<n>` e a última linha da suíte:

  ```bash
  bash .claude/tests/run-all.sh | awk -v a=sinal-contexto. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
  ```

## Review Focus

1. **`UserPromptSubmit` logo depois de um `/compact`** — o transcript ainda tem como última
   entrada `assistant` a de antes da compactação (num transcript real: 157459 → fronteira →
   63109). Esperado: silêncio até a primeira resposta nova, que passa a contar. Testes:
   `medicao anterior ao compact_boundary nao conta` e
   `a medicao depois do compact_boundary conta` (Task 1).
2. **`session_id` com caractere de caminho** — o nome da marca vem do payload. Esperado: avisa, e
   a marca fica no `TMPDIR` com `_` no lugar de cada caractere fora de `[A-Za-z0-9_-]`. Testes:
   `session_id com barra ainda avisa` e
   `a marca troca o que nao e nome por _ e fica no TMPDIR` (Task 1).
3. **`TMPDIR` sem escrita** — disco cheio, diretório apagado. Esperado: silêncio, nunca o aviso a
   cada ferramenta. Teste: `sem onde gravar a marca, cala em vez de avisar a cada ferramenta`
   (Task 1).
4. **`usage` com campo nulo ou que não é número, `message` que não é objeto** — formato que o
   Claude Code muda sem aviso. Esperado: soma só os números, e a entrada estranha não derruba a
   leitura. Teste: `campo nulo ou que nao e numero conta 0, e message estranha nao derruba`
   (Task 1).
5. **`transcript_path` com espaço** — diretório de projeto com espaço no nome. Esperado: lê e
   avisa. Teste: `transcript_path com espaco e lido` (Task 1).

---

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `.claude/hooks/sinal-contexto.sh` | guardas, medição pela cauda do transcript, travessia pela marca, aviso | 1 |
| `.claude/hooks/lib/comum.sh` | emissor `injetar_contexto <evento> <texto>` | 1 |
| `.claude/tests/sinal-contexto.tests.sh` | casos 1–13, 10b e RF1–RF5 (Task 1); caso 14, a ligação real (Task 2) | 1, 2 |
| `.claude/settings.json` | liga o hook no `PostToolUse` e no `UserPromptSubmit` | 2 |
| `docs/estrutura-monolito.md` | mapa do harness com o hook novo | 2 |
| `docs/superpowers/blocos/37-harness-sinal-de-contexto-cheio/prova-catraca.md` | evidência do DoD 1 | 3 |
| `docs/superpowers/blocos/37-harness-sinal-de-contexto-cheio/prova-disparo.md` | evidência do DoD 2 | 4 |

---

### Task 1: o hook `sinal-contexto.sh` e o emissor `injetar_contexto`

**Files:**
- Create: `.claude/hooks/sinal-contexto.sh`
- Modify: `.claude/hooks/lib/comum.sh` (acrescenta ao fim, depois de `bloquear_stop`)
- Create: `.claude/tests/sinal-contexto.tests.sh`

**Interfaces:**
- Consumes:
  - `.claude/hooks/lib/comum.sh`: `ler_payload` (lê o stdin em `PAYLOAD`) e
    `campo <filtro jq>` (ecoa o campo, ou vazio quando falta ou o payload não é JSON).
  - `.claude/tests/_assert.sh`: `DIR_TESTES`, `DIR_HOOKS`, `SAIDA_HOOK`,
    `acionar_hook <hook> <payload>` (roda o hook com o payload no stdin, seta `SAIDA_HOOK` e
    reprova saída ≠ 0), `campo_json <json> <filtro>`, `assert_igual <esperado> <obtido> <título>`,
    `assert_contem <texto> <trecho> <título>` e `registrar_descarte <caminho>`.
- Produces:
  - `bash .claude/hooks/sinal-contexto.sh`, com o contrato do Global Constraints.
  - `injetar_contexto <evento> <texto>` no `comum.sh`.
  - No `sinal-contexto.tests.sh`, o que a Task 2 usa: `_sc_t` (o transcript da fixture) e a
    chamada final `sc_limpar`, antes da qual o caso 14 entra.

- [ ] **Step 1: Conferir que os nomes não colidem.** A suíte faz `source` de todos os arquivos no
  mesmo shell.

```bash
grep -rnE '\b_?(sc|SC)_[A-Za-z]|\bSINAL=|injetar_contexto|lotus-contexto-' .claude/tests/ .claude/hooks/ || echo livre
```

Expected: `livre`.

- [ ] **Step 2: Escrever o teste** — `.claude/tests/sinal-contexto.tests.sh`, conteúdo exato:

```bash
[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
# Sinal de contexto cheio (spec do bloco 37, secao 2): o sinal-contexto.sh
# contra transcripts JSONL gerados aqui, com usage controlado. As marcas das
# sessoes de teste se chamam lotus-contexto-teste-* e saem no comeco e no fim.
SINAL="$DIR_HOOKS/sinal-contexto.sh"

# Fixtures de transcript. A soma do usage se reparte em 2 de input, 2000 de
# cache_creation e o resto em cache_read: em 151234 so a soma dos tres passa de
# 150000, entao um hook que leia um campo so fica calado e reprova.
sc_assistant() {
  # $1 = soma do usage (0 = mensagem sintetica), $2 = isSidechain (padrao false)
  local total=$1 lado=${2:-false}
  if (( total == 0 )); then
    jq -nc --argjson sc "$lado" \
      '{type:"assistant", isSidechain:$sc, message:{model:"<synthetic>",
        usage:{input_tokens:0, cache_creation_input_tokens:0, cache_read_input_tokens:0}}}'
  else
    jq -nc --argjson t "$total" --argjson sc "$lado" \
      '{type:"assistant", isSidechain:$sc, message:{model:"claude-teste",
        usage:{input_tokens:2, cache_creation_input_tokens:2000, cache_read_input_tokens:($t - 2002)}}}'
  fi
}
sc_user() { printf '%s\n' '{"type":"user","isSidechain":false,"message":{"role":"user","content":"oi"}}'; }
sc_compactacao() {
  # O que o /compact grava antes da primeira resposta nova: a fronteira e o resumo.
  printf '%s\n' '{"type":"system","subtype":"compact_boundary","isSidechain":false}' \
    '{"type":"user","isSidechain":false,"isCompactSummary":true,"message":{"role":"user","content":"resumo"}}'
}
sc_payload() {
  # $1 = evento, $2 = session_id, $3 = transcript_path, $4 = agent_id (opcional)
  jq -nc --arg ev "$1" --arg sid "$2" --arg tp "$3" --arg ag "${4:-}" \
    '{session_id:$sid, transcript_path:$tp, cwd:"/tmp", hook_event_name:$ev}
     + (if $ag == "" then {} else {agent_id:$ag, agent_type:"Explore"} end)'
}
sc_marca() { if [[ -e "${TMPDIR:-/tmp}/lotus-contexto-$1.marca" ]]; then printf sim; else printf nao; fi; }
sc_evento() { campo_json "$SAIDA_HOOK" '.hookSpecificOutput.hookEventName'; }
sc_aviso() { campo_json "$SAIDA_HOOK" '.systemMessage'; }
sc_limpar() { rm -f "${TMPDIR:-/tmp}"/lotus-contexto-teste-*.marca; }

sc_limpar
_sc_d=$(mktemp -d "${TMPDIR:-/tmp}/lotus-sinal.XXXXXX") || _sc_d=''
[[ -n $_sc_d && -d $_sc_d ]] || { printf 'ABORTADO: sem diretorio descartavel para o transcript\n' >&2; exit 1; }
registrar_descarte "$_sc_d"
_sc_t="$_sc_d/transcript.jsonl"

# --- 1. abaixo do limiar
{ sc_user; sc_assistant 90000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-abaixo "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'abaixo do limiar nao avisa'
assert_igual nao "$(sc_marca teste-abaixo)" 'abaixo do limiar nao cria marca'

# --- 2. acima, PostToolUse: so a soma dos tres campos passa do limiar
{ sc_user; sc_assistant 151234; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-post "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'acima avisa no PostToolUse, com o evento do payload'
_sc_ctx=$(campo_json "$SAIDA_HOOK" '.hookSpecificOutput.additionalContext')
assert_contem "$_sc_ctx" 'Contexto em ~151 mil tokens, acima de 150 mil' 'o aviso traz a soma dos tres campos e o limiar'
assert_contem "$_sc_ctx" '/compact' 'o aviso diz o que pedir ao Joao'
assert_igual "$_sc_ctx" "$(sc_aviso)" 'systemMessage leva ao Joao o mesmo texto do additionalContext'
assert_igual sim "$(sc_marca teste-post)" 'o aviso cria a marca da sessao'

# --- 3. acima, UserPromptSubmit
acionar_hook "$SINAL" "$(sc_payload UserPromptSubmit teste-prompt "$_sc_t")"
assert_igual UserPromptSubmit "$(sc_evento)" 'acima avisa no UserPromptSubmit, com o evento do payload'

# --- 4. mesma sessao, ainda acima
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-post "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'a marca cala o aviso ate o fim da travessia'

# --- 5. cai abaixo (o caminho do /compact) e volta acima
{ sc_user; sc_assistant 40000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-post "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'abaixo do limiar, depois do aviso, fica calado'
assert_igual nao "$(sc_marca teste-post)" 'abaixo do limiar apaga a marca e rearma'
{ sc_user; sc_assistant 160000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-post "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~160 mil' 'a travessia seguinte avisa de novo'

# --- 6. a marca e por sessao
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-outra "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'outra sessao acima avisa: a marca e por sessao'

# --- 7. a sidechain grande nao mede o fio principal pequeno
{ sc_user; sc_assistant 30000; sc_assistant 190000 true; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-lado "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'entrada de sidechain nao mede o fio principal'

# --- 8. dentro de subagente
{ sc_user; sc_assistant 200000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-agente "$_sc_t" agente-1)"
assert_igual '' "$SAIDA_HOOK" 'payload com agent_id (dentro de subagente) nao avisa'
assert_igual nao "$(sc_marca teste-agente)" 'dentro de subagente nao cria marca'

# --- 9. evento fora dos dois
acionar_hook "$SINAL" "$(sc_payload Stop teste-stop "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'evento fora de PostToolUse e UserPromptSubmit nao avisa'

# --- 10. transcript ausente, transcript vazio, payload que nao e JSON
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-ausente "$_sc_d/nao-existe.jsonl")"
assert_igual '' "$SAIDA_HOOK" 'transcript ausente nao avisa'
: > "$_sc_d/vazio.jsonl"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-vazio "$_sc_d/vazio.jsonl")"
assert_igual '' "$SAIDA_HOOK" 'transcript vazio nao avisa'
acionar_hook "$SINAL" 'isto nao e json'
assert_igual '' "$SAIDA_HOOK" 'payload que nao e JSON nao avisa'

# --- 10b. linha pela metade no fim, como a gravacao assincrona deixa
{ sc_user; sc_assistant 170000; printf '%s' '{"type":"assistant","message":{"usage":{"input_tok'; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-quebrada "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~170 mil' 'linha pela metade no fim e ignorada; vale a ultima entrada valida'

# --- 11. mensagem sintetica de soma zero
{ sc_user; sc_assistant 180000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-sintetica "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'preparo da sintetica: acima avisa e cria a marca'
sc_assistant 0 >> "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-sintetica "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'entrada sintetica de soma zero nao e medicao'
assert_igual sim "$(sc_marca teste-sintetica)" 'a sintetica nao rearma: a marca continua'

# --- 12. cauda sem medicao: a entrada assistant ficou alem das 200 linhas
{ sc_user; sc_assistant 180000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-semmedida "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'preparo da cauda: acima avisa e cria a marca'
_sc_u=$(sc_user)
for _sc_i in {1..200}; do printf '%s\n' "$_sc_u"; done >> "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-semmedida "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'cauda de 200 linhas sem entrada assistant nao avisa'
assert_igual sim "$(sc_marca teste-semmedida)" 'falta de medicao nao rearma: a marca continua'
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-semmedida-nova "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'a leitura e so da cauda: a entrada alem de 200 linhas nao conta'

# --- 13. LOTUS_CONTEXTO_LIMIAR
{ sc_user; sc_assistant 25000; } > "$_sc_t"
LOTUS_CONTEXTO_LIMIAR=20000 acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-limiar "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~25 mil tokens, acima de 20 mil' 'LOTUS_CONTEXTO_LIMIAR troca o limiar'
LOTUS_CONTEXTO_LIMIAR=abc acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-limiar-texto "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'limiar que nao e numero cai no padrao de 150 mil'
LOTUS_CONTEXTO_LIMIAR=0 acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-limiar-zero "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'limiar zero cai no padrao de 150 mil'

# --- RF1. depois do /compact a medicao anterior nao vale
{ sc_user; sc_assistant 170000; sc_compactacao; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload UserPromptSubmit teste-compactou "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'medicao anterior ao compact_boundary nao conta'
sc_assistant 155000 >> "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-compactou "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~155 mil' 'a medicao depois do compact_boundary conta'

# --- RF2. session_id com caractere de caminho
{ sc_user; sc_assistant 200000; } > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse 'teste-../../fuga' "$_sc_t")"
assert_igual PostToolUse "$(sc_evento)" 'session_id com barra ainda avisa'
assert_igual sim "$(sc_marca 'teste-______fuga')" 'a marca troca o que nao e nome por _ e fica no TMPDIR'

# --- RF3. TMPDIR sem escrita
TMPDIR="$_sc_d/nao-existe" acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-semtmp "$_sc_t")"
assert_igual '' "$SAIDA_HOOK" 'sem onde gravar a marca, cala em vez de avisar a cada ferramenta'

# --- RF4. usage com campo nulo, campo que nao e numero e message que nao e objeto
printf '%s\n' '{"type":"assistant","isSidechain":false,"message":{"usage":{"input_tokens":"x","cache_read_input_tokens":null,"cache_creation_input_tokens":155000}}}' \
  '{"type":"assistant","isSidechain":false,"message":"texto"}' > "$_sc_t"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-campos "$_sc_t")"
assert_contem "$(sc_aviso)" 'Contexto em ~155 mil' 'campo nulo ou que nao e numero conta 0, e message estranha nao derruba'

# --- RF5. transcript_path com espaco
mkdir -p "$_sc_d/com espaco"
{ sc_user; sc_assistant 200000; } > "$_sc_d/com espaco/t.jsonl"
acionar_hook "$SINAL" "$(sc_payload PostToolUse teste-espaco "$_sc_d/com espaco/t.jsonl")"
assert_igual PostToolUse "$(sc_evento)" 'transcript_path com espaco e lido'

sc_limpar
```

- [ ] **Step 3: Rodar e ver reprovar.** Guarde a saída: ela vai no relatório da task e, pela
  Task 3, no `prova-catraca.md`.

```bash
bash .claude/tests/run-all.sh | awk -v a=sinal-contexto. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
bash .claude/tests/run-all.sh | grep -c 'saiu com codigo 127'
```

Expected:
- a primeira `FALHA` é `<lane>/.claude/hooks/sinal-contexto.sh saiu com codigo 127 (contrato exige 0)`,
  com `<lane>` o caminho absoluto da árvore: o hook ainda não existe;
- a terceira é `FALHA acima avisa no PostToolUse, com o evento do payload`, com
  `esperado: [PostToolUse]` e `obtido:   []`;
- `sinal-contexto.tests.sh: ok=20 falha=46` e `FALHOU: 46 asercao(oes)`;
- o `grep -c` sai `28`.

Os 20 `ok` são asserções de silêncio, que um hook ausente cumpre de graça. A Task 3 prova, com a
bancada de mutantes, que cada uma delas reprova quando a guarda dela some.

- [ ] **Step 4: Escrever o hook** — `.claude/hooks/sinal-contexto.sh`, conteúdo exato:

```bash
#!/usr/bin/env bash
# Avisa quando o contexto da sessao passa do limiar absoluto: 150000 tokens, o
# mesmo em qualquer modelo (LOTUS_CONTEXTO_LIMIAR troca, para teste e prova ao
# vivo). Nao compacta: nenhum hook dispara compactacao. O aviso manda fechar a
# unidade atual e pedir /compact ao Joao.
# A medicao e o usage da ultima chamada a API gravada no transcript: numero
# real, com atraso de uma chamada, porque o transcript e gravado de forma
# assincrona.
# Uma vez por travessia: a marca em TMPDIR cala o aviso ate a medicao voltar
# para baixo do limiar, o caminho depois de um /compact. Sem medicao nao
# rearma: falta de numero nao e "abaixo".
# Contrato: hookSpecificOutput.additionalContext para o modelo, systemMessage
# para o Joao. exit 0 sempre. Falha aberta.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

LIMIAR_PADRAO=150000

medir() {
  # $1 = transcript. Ecoa o contexto da ultima chamada do fio principal, ou
  # nada. So a cauda: o PostToolUse roda a cada ferramenta e o transcript
  # cresce sem teto. fromjson? descarta a linha que a gravacao assincrona
  # deixou pela metade. A soma pega so numeros; soma zero e mensagem sintetica
  # do Claude Code, nao chamada a API. O compact_boundary zera a medicao: ate
  # a primeira resposta depois de um /compact, a ultima entrada e a de antes.
  tail -n 200 -- "$1" 2>/dev/null | jq -R -n -r '
    def soma: [.message.usage | .input_tokens, .cache_read_input_tokens,
               .cache_creation_input_tokens] | map(numbers) | add // 0;
    reduce (inputs | fromjson? | objects) as $e (null;
      if $e.type == "system" and $e.subtype == "compact_boundary" then null
      elif $e.type == "assistant" and $e.isSidechain != true
           and ($e.message | type) == "object"
           and ($e.message.usage | type) == "object"
           and ($e | soma) > 0
      then $e | soma
      else . end)
    | values' 2>/dev/null
}

corpo() {
  ler_payload
  local evento transcript medida limiar sid marca

  evento=$(campo '.hook_event_name')
  [[ $evento == PostToolUse || $evento == UserPromptSubmit ]] || return 0
  # Dentro de subagente o aviso iria para ele e morreria com ele.
  [[ -n $(campo '.agent_id') ]] && return 0
  transcript=$(campo '.transcript_path')
  [[ -n $transcript && -f $transcript && -r $transcript ]] || return 0

  medida=$(medir "$transcript")
  [[ $medida =~ ^[0-9]+$ ]] || return 0

  limiar=${LOTUS_CONTEXTO_LIMIAR:-}
  [[ $limiar =~ ^[1-9][0-9]*$ ]] || limiar=$LIMIAR_PADRAO

  # O nome da marca vem do payload: so caractere de nome entra no caminho.
  sid=$(campo '.session_id'); [[ -z $sid ]] && sid=sem-sessao
  sid=${sid//[^A-Za-z0-9_-]/_}
  marca="${TMPDIR:-/tmp}/lotus-contexto-${sid}.marca"

  if (( medida <= limiar )); then
    rm -f -- "$marca" 2>/dev/null
    return 0
  fi
  [[ -e $marca ]] && return 0
  # Sem marca o aviso sairia a cada ferramenta: o silencio vence o spam.
  { : > "$marca"; } 2>/dev/null || return 0

  injetar_contexto "$evento" "Contexto em ~$((medida / 1000)) mil tokens, acima de \
$((limiar / 1000)) mil. Nao abra unidade nova: feche a task atual, grave em \
fronteira duravel (commit, estado.md) e peca ao Joao /compact ou /clear. Este \
aviso nao repete ate o contexto cair abaixo do limiar."
  return 0
}

corpo || true
exit 0
```

E o modo, como os outros hooks:

```bash
chmod +x .claude/hooks/sinal-contexto.sh
```

- [ ] **Step 5: Escrever o emissor.** Acrescente ao fim de `.claude/hooks/lib/comum.sh`, depois do
  `}` que fecha `bloquear_stop`, uma linha em branco e:

```bash
injetar_contexto() {
  # PostToolUse e UserPromptSubmit: o texto vai ao modelo em
  # hookSpecificOutput.additionalContext e ao usuario em systemMessage, que
  # fica na RAIZ do JSON. $1 = evento do payload, $2 = texto.
  jq -n --arg evento "$1" --arg texto "$2" \
    '{systemMessage:$texto,
      hookSpecificOutput:{hookEventName:$evento, additionalContext:$texto}}'
}
```

O arquivo continua terminando em `}` seguido de uma quebra de linha só.

- [ ] **Step 6: Rodar e ver passar.** Guarde a saída, como no Step 3.

```bash
bash .claude/tests/run-all.sh | awk -v a=sinal-contexto. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected: nenhuma linha `FALHA`; `sinal-contexto.tests.sh: ok=38 falha=0` e
`OK: 18 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 7: Commit.** Quando o despacho mandar, o `git add` leva também
  `docs/superpowers/blocos/37-harness-sinal-de-contexto-cheio/estado.md` (Passo 4 do
  `/executar-bloco`).

```bash
git add .claude/hooks/sinal-contexto.sh .claude/hooks/lib/comum.sh .claude/tests/sinal-contexto.tests.sh
git diff --cached --summary
git commit -m "feat(37): sinal-contexto mede o contexto pelo usage do transcript e avisa uma vez por travessia

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Expected do `--summary`: `create mode 100755 .claude/hooks/sinal-contexto.sh` e
`create mode 100644 .claude/tests/sinal-contexto.tests.sh`.

---

### Task 2: a ligação no `settings.json` e o mapa do harness

**Files:**
- Modify: `.claude/tests/sinal-contexto.tests.sh` (caso 14, antes do `sc_limpar` final)
- Modify: `.claude/settings.json` (entre o fim do `PreToolUse` e o `Stop`)
- Modify: `docs/estrutura-monolito.md` (seção `.claude/`, árvore de `hooks/` e `tests/`)

**Interfaces:**
- Consumes: `.claude/hooks/sinal-contexto.sh` e `.claude/tests/sinal-contexto.tests.sh` da Task 1
  (`_sc_t` e o `sc_limpar` final); `DIR_TESTES` e `assert_igual` do `_assert.sh`.
- Produces: o `settings.json` com o hook ligado nos dois eventos, que a Task 3 (mutantes
  `sem-PostToolUse` e `sem-UserPromptSubmit`) e a Task 4 (sessão ao vivo) leem.

- [ ] **Step 1: Escrever o teste da ligação.** No `.claude/tests/sinal-contexto.tests.sh`, troque
  o trecho

```bash
assert_igual PostToolUse "$(sc_evento)" 'transcript_path com espaco e lido'

sc_limpar
```

  por

```bash
assert_igual PostToolUse "$(sc_evento)" 'transcript_path com espaco e lido'

# --- 14. o settings.json real liga o hook nos dois eventos, sem filtro de ferramenta
for _sc_ev in PostToolUse UserPromptSubmit; do
  _sc_n=$(jq --arg ev "$_sc_ev" \
    '[.hooks[$ev][]? | select((.matcher // "") == "" or .matcher == "*")
      | .hooks[]? | select(.type == "command"
                           and (.command | test("/\\.claude/hooks/sinal-contexto\\.sh")))] | length' \
    "$DIR_TESTES/../settings.json" 2>/dev/null)
  assert_igual 1 "$_sc_n" "settings.json liga o sinal-contexto.sh em $_sc_ev, uma vez e sem filtro de ferramenta"
done

sc_limpar
```

- [ ] **Step 2: Rodar e ver reprovar.** Guarde a saída, como na Task 1.

```bash
bash .claude/tests/run-all.sh | awk -v a=sinal-contexto. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected:
- `FALHA settings.json liga o sinal-contexto.sh em PostToolUse, uma vez e sem filtro de ferramenta`,
  com `esperado: [1]` e `obtido:   [0]`;
- a mesma `FALHA` para `UserPromptSubmit`;
- `sinal-contexto.tests.sh: ok=38 falha=2` e `FALHOU: 2 asercao(oes)`.

- [ ] **Step 3: Ligar o hook.** No `.claude/settings.json`, troque o trecho

```json
            "statusMessage": "Verificando comando na main..."
          }
        ]
      }
    ],
    "Stop": [
```

  por

```json
            "statusMessage": "Verificando comando na main..."
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/sinal-contexto.sh\"",
            "timeout": 15
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/sinal-contexto.sh\"",
            "timeout": 15
          }
        ]
      }
    ],
    "Stop": [
```

- [ ] **Step 4: Rodar e ver passar.**

```bash
jq empty .claude/settings.json && echo valido
bash .claude/tests/run-all.sh | awk -v a=sinal-contexto. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected: `valido`; nenhuma linha `FALHA`; `sinal-contexto.tests.sh: ok=40 falha=0` e
`OK: 18 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 5: O mapa.** Quatro trocas em `docs/estrutura-monolito.md`, cada trecho antigo
  aparece uma vez só no arquivo.

  1. O cabeçalho de `hooks/`. Troque

```text
├── hooks/                      # SessionStart/PreToolUse/Stop; `exit 0` sempre — JSON no stdout,
│                               #   exceto `session-start.sh` (texto puro)
```

  por

```text
├── hooks/                      # SessionStart/PreToolUse/PostToolUse/UserPromptSubmit/Stop; `exit 0`
│                               #   sempre — JSON no stdout, exceto `session-start.sh` (texto puro)
```

  2. A linha do hook novo, entre `session-start.sh` e `stop-verify.sh`. Troque

```text
│   ├── session-start.sh        # injeta `lane.sh descobrir` no início da sessão; nunca bloqueia
```

  por

```text
│   ├── session-start.sh        # injeta `lane.sh descobrir` no início da sessão; nunca bloqueia
│   ├── sinal-contexto.sh       # avisa modelo e João ao passar de 150k tokens de contexto, uma vez por
│   │                           #   travessia; mede o `usage` do transcript e nunca compacta
```

  3. Em `tests/`, troque `(17 hoje)` por `(18 hoje)`.
  4. Na linha do `settings.json`, troque `os 5 hooks acima` por `os 6 hooks acima`.

```bash
git diff --stat docs/estrutura-monolito.md
```

Expected: a última linha é `1 file changed, 6 insertions(+), 4 deletions(-)`.

- [ ] **Step 6: Commit**

```bash
git add .claude/tests/sinal-contexto.tests.sh .claude/settings.json docs/estrutura-monolito.md
git commit -m "feat(37): settings.json liga o sinal-contexto no PostToolUse e no UserPromptSubmit

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

> A partir deste commit, toda sessão **nascida** na lane carrega o hook, com o limiar padrão. A
> sessão que já estava aberta segue com os hooks que leu ao começar.

---

### Task 3: DoD 1 — suíte verde e nenhum mutante vivo

**Files:**
- Create: `docs/superpowers/blocos/37-harness-sinal-de-contexto-cheio/prova-catraca.md`

**Interfaces:**
- Consumes: o estado final das Tasks 1 e 2. O controlador entrega ao implementador o placar
  vermelho e o verde que os relatórios das Tasks 1 e 2 trouxeram (Steps 3 e 6 da Task 1; Steps 2
  e 4 da Task 2).
- Produces: nenhuma interface; só a evidência.

`<scratchpad>` abaixo é o caminho absoluto do scratchpad da sessão, escrito por extenso em cada
comando: cada chamada de Bash é um shell novo, e variável não atravessa. A bancada nunca escreve
na árvore: copia o `.claude` para o scratchpad e muta a cópia.

- [ ] **Step 1: Gravar a bancada** em `<scratchpad>/mutantes.py`, conteúdo exato. Ela não entra no
  repositório.

```python
#!/usr/bin/env python3
"""Bancada de mutantes do sinal-contexto (bloco 37).

Uso: python3 mutantes.py <raiz da arvore> <diretorio descartavel>

Cada mutante copia o .claude da arvore para o diretorio descartavel, troca um
trecho literal que precisa aparecer exatamente uma vez, roda so o
sinal-contexto.tests.sh e lista as asercoes que reprovaram. Mutante que nao
reprova nada e guarda sem teste: a bancada sai 1. A arvore nunca e escrita.
"""
import pathlib
import shutil
import subprocess
import sys

HOOK = ".claude/hooks/sinal-contexto.sh"
COMUM = ".claude/hooks/lib/comum.sh"
RUNNER = """source .claude/tests/_assert.sh
trap limpar_descartes EXIT
source .claude/tests/sinal-contexto.tests.sh
printf 'falhas: %s\\n' "$FALHAS_TESTE"
"""

MUTANTES = [
    ("evento", HOOK, "  [[ $evento == PostToolUse || $evento == UserPromptSubmit ]] || return 0\n", ""),
    ("agent_id", HOOK, "  [[ -n $(campo '.agent_id') ]] && return 0\n", ""),
    ("sidechain", HOOK, " and $e.isSidechain != true", ""),
    ("soma-zero", HOOK, "           and ($e | soma) > 0\n", ""),
    ("compact", HOOK, '"compact_boundary"', '"nunca"'),
    ("sem-medicao", HOOK, "  [[ $medida =~ ^[0-9]+$ ]] || return 0\n", ""),
    ("marca-existe", HOOK, "  [[ -e $marca ]] && return 0\n", ""),
    ("rearme", HOOK, '    rm -f -- "$marca" 2>/dev/null\n', ""),
    ("marca-por-sessao", HOOK, "lotus-contexto-${sid}.marca", "lotus-contexto-teste-unica.marca"),
    ("env-limiar", HOOK, "  limiar=${LOTUS_CONTEXTO_LIMIAR:-}\n", "  limiar=\n"),
    ("limiar-zero", HOOK, "^[1-9][0-9]*$", "^[0-9]+$"),
    ("sem-tmp", HOOK, '{ : > "$marca"; } 2>/dev/null || return 0', '{ : > "$marca"; } 2>/dev/null || true'),
    ("sanitiza", HOOK, "  sid=${sid//[^A-Za-z0-9_-]/_}\n", ""),
    ("numbers", HOOK, "map(numbers) | add // 0", "add // 0"),
    ("message-objeto", HOOK, '           and ($e.message | type) == "object"\n', ""),
    ("fromjson", HOOK, "inputs | fromjson? | objects", "inputs | fromjson | objects"),
    ("um-campo", HOOK, ".cache_creation_input_tokens]", "]"),
    ("cauda", HOOK, "tail -n 200 -- ", "cat -- "),
    ("evento-fixo", COMUM, "hookEventName:$evento", 'hookEventName:"PostToolUse"'),
    ("sem-systemMessage", COMUM, "'{systemMessage:$texto,\n", "'{\n"),
    ("sem-PostToolUse", ".claude/settings.json", '"PostToolUse": [', '"PostToolUseX": ['),
    ("sem-UserPromptSubmit", ".claude/settings.json", '"UserPromptSubmit": [', '"UserPromptSubmitX": ['),
]


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    raiz = pathlib.Path(sys.argv[1]).resolve()
    mut = pathlib.Path(sys.argv[2]).resolve() / "mutantes-37"
    if mut.exists():
        shutil.rmtree(mut)
    sem_teste = 0
    for nome, arq, velho, novo in MUTANTES:
        d = mut / nome
        shutil.copytree(raiz / ".claude", d / ".claude")
        (d / "so-um.sh").write_text(RUNNER)
        alvo = d / arq
        texto = alvo.read_text()
        n = texto.count(velho)
        if n != 1:
            print(f"{nome}: TRECHO APARECE {n} VEZES, mutante invalido")
            sem_teste += 1
            continue
        alvo.write_text(texto.replace(velho, novo))
        r = subprocess.run(["bash", "so-um.sh"], cwd=d, capture_output=True, text=True)
        linhas = r.stdout.splitlines()
        falhas = [l[len("  FALHA "):] for l in linhas if l.startswith("  FALHA ")]
        if not falhas:
            sem_teste += 1
        print(f"{nome}: {linhas[-1] if linhas else '(sem saida)'} | " + "; ".join(falhas))
    shutil.rmtree(mut)
    print(f"mutantes sem teste que reprove: {sem_teste} de {len(MUTANTES)}")
    return 1 if sem_teste else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Suíte verde, fresca.**

```bash
bash .claude/tests/run-all.sh | tail -1
```

Expected: `OK: 18 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 3: Rodar a bancada** contra a árvore da lane.

```bash
python3 <scratchpad>/mutantes.py /home/jvbat/projetos/lotus-37-harness-sinal-de-contexto-cheio <scratchpad>
git status --short
```

Expected: 22 linhas `<nome>: falhas: <n> | <títulos que reprovaram>`, com `<n>` igual a:

| Mutante | n | Mutante | n | Mutante | n |
|---|---|---|---|---|---|
| `evento` | 1 | `rearme` | 2 | `numbers` | 1 |
| `agent_id` | 2 | `marca-por-sessao` | 12 | `message-objeto` | 1 |
| `sidechain` | 1 | `env-limiar` | 1 | `fromjson` | 1 |
| `soma-zero` | 1 | `limiar-zero` | 1 | `um-campo` | 18 |
| `compact` | 2 | `sem-tmp` | 1 | `cauda` | 1 |
| `sem-medicao` | 1 | `sanitiza` | 2 | `evento-fixo` | 1 |
| `marca-existe` | 2 | | | `sem-systemMessage` | 6 |
| | | | | `sem-PostToolUse` | 1 |
| | | | | `sem-UserPromptSubmit` | 1 |

e a última linha `mutantes sem teste que reprove: 0 de 22`, com exit 0. O `git status --short` sai
vazio: a bancada não tocou a árvore. Linha com `TRECHO APARECE` é mutante inválido, porque o
código da árvore divergiu do plano: pare e relate.

- [ ] **Step 4: Registrar.** O `prova-catraca.md` traz, em prosa curta e blocos de saída:
  - a data e o SHA do `HEAD`;
  - o vermelho e o verde das Tasks 1 e 2, com o placar que o controlador entregou;
  - os comandos dos Steps 2 e 3 desta task e a saída real deles, as 22 linhas e a última;
  - uma linha dizendo que o script da bancada é o do Step 1 da Task 3 deste plano.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/blocos/37-harness-sinal-de-contexto-cheio/prova-catraca.md
git commit -m "test(37): suíte verde e bancada de mutantes sem mutante vivo

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: DoD 2 — visto disparar numa sessão da lane

**Files:**
- Create: `docs/superpowers/blocos/37-harness-sinal-de-contexto-cheio/prova-disparo.md`

**Interfaces:** nenhuma. Usa o `settings.json` e o hook da ponta da branch.

> **Task com o João.** O disparo só se vê numa sessão interativa que **nasce** no diretório da
> lane: o `settings.json` e o `${CLAUDE_PROJECT_DIR}` vêm de onde a sessão começa, e uma sessão
> aberta na `main` rodaria a `main`, que não tem o hook. O controlador entrega os passos abaixo, o
> João roda a sessão e devolve o que viu, e o controlador grava o registro. A sessão da prova não
> escreve nada: só roda `pwd` e `date`.

- [ ] **Step 1: Abrir a sessão**, pelo João, num terminal novo:

```bash
cd /home/jvbat/projetos/lotus-37-harness-sinal-de-contexto-cheio && LOTUS_CONTEXTO_LIMIAR=20000 claude
```

  O limiar de 20 mil é para disparar logo: em sessões reais do Lotus medidas no planejamento, a
  primeira chamada à API já leva de 43 a 71 mil tokens.

- [ ] **Step 2: Fazer o modelo chamar ferramentas.** Primeiro prompt do João:

```text
Rode `pwd` e depois `date`, uma chamada de Bash para cada. Não escreva nada.
```

  Expected: depois de uma das duas chamadas, o terminal mostra uma vez a mensagem do hook,
  começando por `Contexto em ~` e com `acima de 20 mil`. O número fica entre ~40 e ~75 mil. A
  outra chamada não repete o aviso. Pelo atraso da gravação do transcript, o aviso pode sair só
  na segunda.

- [ ] **Step 3: Ver o canal do modelo e o silêncio do prompt.** Segundo prompt do João:

```text
Algum hook te mandou aviso de contexto nesta sessão? Cite o texto exato.
```

  Expected: o modelo cita o aviso, a prova de que o `additionalContext` chegou a ele. O hook não
  repete o aviso neste prompt: o `UserPromptSubmit` encontra a marca da sessão. O João sai com
  `/exit`.

- [ ] **Step 4: Registrar.** O controlador grava o `prova-disparo.md` com:
  - a data e o SHA do `HEAD` da lane;
  - o comando do Step 1 e os dois prompts;
  - o texto do aviso que o João viu, e depois de qual chamada ele saiu;
  - a resposta do modelo ao Step 3;
  - a constatação de que o aviso não se repetiu, nem na outra chamada nem no segundo prompt.

  Aviso que não sai, ou que sai mais de uma vez, é achado: pare e relate, sem registrar como
  prova.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/blocos/37-harness-sinal-de-contexto-cheio/prova-disparo.md
git commit -m "test(37): sinal de contexto visto disparar numa sessão nascida na lane

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Depois do plano (fora das tasks)

Com o 37 em `ready_for_review`, o João abre uma sessão na lane e roda `/revisar-bloco 37` e depois
`/finalizar-bloco 37`. O bloco tem `efeito_externo: nao`. No fechamento, a ficha 37 sai do
backlog. As saídas 1 e 3 dela, que a D1 deixou fora, só voltam como ficha nova se o João quiser.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| — | — | — | — |

Nenhum grupo. As Tasks 1 e 2 editam o mesmo `sinal-contexto.tests.sh`, e a 2 consome o hook da 1.
A 3 consome o estado final das duas. A 3 e a 4 passariam no par (Files disjuntos, sem aresta
entre elas), mas a 4 não é despacho: é o controlador com o João, numa sessão à parte. Ordem, uma a
uma: 1 → 2 → 3 → 4.

## Handoff de execução

```yaml
executor: claude
sessao: sonnet / medium   # o frontmatter do /executar-bloco
skill: superpowers:subagent-driven-development   # 4 tasks, 7 arquivos
```

- **Despachos**, pelo `subagent_type` da tabela de `.claude/papeis.md`:
  - `implementador-integracao` (sonnet / high): Tasks 1 e 2, que tocam três arquivos cada, e a 2
    casa o teste com a ligação real;
  - `implementador-mecanico` (sonnet / medium): Task 3, com a bancada pronta e um arquivo de
    evidência;
  - `revisor-task` nas Tasks 1, 2 e 3; `re-revisor` e `corretor-tardio` nas rodadas de correção;
    `revisor-branch` no fim.
- **Task 4:** controlador e João, sem subagente.
- **`paths_autorizados`:** não se aplica (`executor: claude`).
- **Efeito externo:** nenhum (`efeito_externo: nao`).
- **Stack:** não sobe. O bloco não toca `backend/` nem `frontend/`.
