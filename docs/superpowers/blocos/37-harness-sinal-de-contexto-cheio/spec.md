# Bloco 37 — `harness-sinal-de-contexto-cheio` (spec)

**Data:** 2026-10-04 · **Ficha:** `backlog.md` item 37 · **Classificação:** *bounded* · **Design:**
aprovado pelo João em 2026-10-04, no chat do `/planejar-bloco`.

A ficha pedia aviso ao passar de 150k tokens de contexto, igual em qualquer modelo, e listava três
saídas que se somam. O bloco entrega uma: um hook que mede o contexto real e avisa o modelo e o
João. O hook não compacta.

## Decisões do João (2026-10-04)

| # | Decisão | Alternativa descartada |
|---|---|---|
| D1 | **Só a saída 2 da ficha**: hook de aviso com limiar absoluto | saída 1 (`autoCompactWindow`): o limiar é percentual da janela e dispara em pontos diferentes por modelo, o oposto de "independente do modelo"; saída 3 (`context: fork` nas fases pesadas): mexe nos commands do item 35, e a metade "diff por caminho" já está feita |
| D2 | **Uma vez por travessia**: avisa ao cruzar o limiar e cala até o contexto voltar para baixo dele | repetir a cada +25k; repetir em toda chamada acima, o que polui o contexto quando ele já está cheio |

## Emendas do planejamento (2026-10-04)

Saíram da bancada do plano, que montou e rodou o hook numa cópia da lane, e ficam para a revisão
do João junto com o plano. Nenhuma muda o desenho aprovado. As três fecham caminhos que ele deixava
abertos.

- **E1 — o `compact_boundary` zera a medição.** O `/compact` grava
  `{"type":"system","subtype":"compact_boundary"}` e o resumo antes da primeira resposta nova. Até
  essa resposta, a última entrada `assistant` do transcript é a de antes da compactação: num
  transcript real do Lotus, a sequência foi 157459 → fronteira → 63109. Sem a regra, o
  `UserPromptSubmit` logo depois de um `/compact` avisaria com o número velho (§1.2).
- **E2 — o `session_id` é saneado antes de virar nome de arquivo.** A marca é um caminho montado com
  dado do payload. Todo caractere fora de `[A-Za-z0-9_-]` vira `_` (§1.4).
- **E3 — a prova de que cada guarda tem teste é uma bancada de mutantes.** São 22 mutantes, cada um
  desligando uma guarda do hook, do emissor ou da ligação no `settings.json`. A bancada roda o
  arquivo de teste contra cada um e exige ao menos uma asserção vermelha por mutante (§2 e DoD 1).

## Fatos que sustentam o desenho

Conferidos na doc dos hooks (`code.claude.com/docs/en/hooks`) em 2026-10-04:

- `PostToolUse` e `UserPromptSubmit` aceitam `hookSpecificOutput.additionalContext`. No primeiro o
  texto entra ao lado do resultado da ferramenta, no segundo ao lado do prompt.
- `systemMessage`, na raiz do JSON, é universal e aparece para o usuário.
- `agent_id` só vem no payload quando o hook dispara dentro de um subagente. `PostToolUse` dispara
  dentro de subagente com os mesmos hooks configurados.
- Matcher omitido casa todas as ferramentas.
- O transcript é gravado de forma assíncrona e pode atrasar em relação à conversa.
- Nenhum campo do payload informa o tamanho do contexto.
- **Divergência com a ficha:** hoje o `PreCompact` **pode bloquear** a compactação (exit 2 ou
  `decision: "block"`), e a ficha diz que ele só observa. Não muda este bloco: continua não havendo
  hook que *dispare* compactação.

Medido num transcript real do Lotus em 2026-10-04: toda entrada `type: "assistant"` traz
`message.usage` com `input_tokens`, `cache_read_input_tokens` e `cache_creation_input_tokens`. A
soma dos três é o tamanho do prompt daquela chamada à API, isto é, o contexto **real**, sem
estimativa por bytes. O número atrasa uma chamada, porque a resposta e o resultado da ferramenta só
entram no prompt seguinte. A ficha falava em "estimar tokens pelo `transcript_path`", e com esse
campo a estimativa vira medição.

## 1. Hook `.claude/hooks/sinal-contexto.sh`

### 1.1 Ligação

O `.claude/settings.json` ganha duas entradas:

- `PostToolUse`, sem matcher. Cobre execução longa, em que o contexto cresce sem prompt do João.
- `UserPromptSubmit`. Cobre conversa que cruzou o limiar sem chamar ferramenta.

As duas usam `bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/sinal-contexto.sh"` com `timeout: 15`, igual
aos outros hooks, e nenhuma tem `statusMessage`: o `PostToolUse` dispara a cada ferramenta, e a
mensagem piscaria em toda chamada.

### 1.2 Medição

Na ordem abaixo, a primeira condição que casar encerra o hook sem saída:

1. `hook_event_name` não é `PostToolUse` nem `UserPromptSubmit`.
2. O payload tem `agent_id`. O aviso iria para o subagente e morreria com ele.
3. `transcript_path` vem vazio ou não é arquivo legível.
4. A cauda do transcript não tem medição. O hook lê as últimas 200 linhas, e cada uma passa por
   `fromjson?`: linha quebrada é ignorada e não derruba a leitura. Vale como medição a última
   entrada que tenha, ao mesmo tempo:
   - `type == "assistant"`;
   - `isSidechain` diferente de `true`;
   - `message` e `message.usage` como objetos;
   - soma dos três campos maior que zero, contando como 0 o campo ausente, nulo ou que não é
     número. Entrada de soma zero é mensagem sintética do Claude Code, não chamada à API.

   Uma entrada `{"type":"system","subtype":"compact_boundary"}` zera a medição (E1). Se ela vem
   depois da última entrada válida, não há medição.

**Falta de medição nunca rearma.** Quando não há número, o hook não sabe se o contexto está abaixo do
limiar, e por isso não apaga a marca (§1.4).

### 1.3 Limiar

O limiar padrão é `150000` tokens. `LOTUS_CONTEXTO_LIMIAR`, no ambiente, sobrescreve quando é
inteiro positivo; valor inválido cai no padrão. A variável existe para o teste e para a prova ao
vivo, e o padrão é o que a ficha pede.

### 1.4 Uma vez por travessia

A marca da sessão é `${TMPDIR:-/tmp}/lotus-contexto-<session_id>.marca`. Com `session_id` ausente o
nome usa `sem-sessao`, como no `stop-verify`. Antes de entrar no caminho, todo caractere do
`session_id` fora de `[A-Za-z0-9_-]` vira `_` (E2).

| Medição | Marca | Ação |
|---|---|---|
| ≤ limiar | qualquer | apaga a marca, que rearma, e sai sem saída; é o caminho depois de um `/compact` |
| > limiar | existe | sai sem saída |
| > limiar | não existe | cria a marca e emite o aviso (§1.5) |

Quando a marca não pode ser criada, o hook sai sem saída. Sem marca ele avisaria a cada ferramenta,
e o silêncio é preferível ao spam.

### 1.5 Saída

O hook emite um JSON só, montado por `jq -n --arg` como os outros hooks:

```json
{
  "systemMessage": "<T>",
  "hookSpecificOutput": {
    "hookEventName": "<hook_event_name do payload>",
    "additionalContext": "<T>"
  }
}
```

O `<T>` sai em ASCII, como os outros textos dos hooks:

> Contexto em ~`<N>` mil tokens, acima de `<L>` mil. Nao abra unidade nova: feche a task atual, grave
> em fronteira duravel (commit, estado.md) e peca ao Joao /compact ou /clear. Este aviso nao repete
> ate o contexto cair abaixo do limiar.

`<N>` é a medição e `<L>` o limiar, ambos divididos por 1000 e arredondados para baixo. O emissor
fica em `.claude/hooks/lib/comum.sh`, ao lado de `negar_pretooluse` e `bloquear_stop`. O
`comum.sh` não guarda política, só leitura de stdin e emissão de JSON.

### 1.6 Contrato

- `exit 0` sempre, com falha aberta. O corpo é uma função chamada com `|| true`, como no
  `stop-verify.sh`.
- Sem `jq`, o `comum.sh` já avisa no stderr e o hook sai sem saída.
- O hook lê o payload com `ler_payload` e `campo`.
- O custo por chamada é limitado: uma leitura de 200 linhas e um `jq`. O hook roda a cada
  ferramenta.

## 2. Testes — `.claude/tests/sinal-contexto.tests.sh`

O arquivo entra no `run-all.sh` pelo glob, com a trava de uma linha no topo contra rodar avulso. A
fixture é um transcript JSONL gerado no `TMPDIR`, com `usage` controlado. As marcas
`lotus-contexto-teste-*` são limpas no começo.

| # | Caso | Esperado |
|---|---|---|
| 1 | medição abaixo do limiar | sem saída |
| 2 | acima, `PostToolUse` | `hookEventName: PostToolUse`; `additionalContext` e `systemMessage` com `<N>` e `<L>` |
| 3 | acima, `UserPromptSubmit` | `hookEventName: UserPromptSubmit` |
| 4 | mesma sessão, ainda acima | sem saída |
| 5 | cai abaixo e volta acima | avisa de novo |
| 6 | outra sessão acima | avisa, porque a marca é por sessão |
| 7 | última entrada é sidechain grande, a do fio principal é pequena | mede a do fio principal |
| 8 | payload com `agent_id` | sem saída |
| 9 | evento fora dos dois, ex. `Stop` | sem saída |
| 10 | transcript ausente; transcript vazio | sem saída; nunca sai ≠ 0 |
| 10b | linha quebrada no fim, depois de uma entrada acima | avisa com a medição da última entrada válida |
| 11 | entrada sintética de soma zero depois de uma acima, com marca | sem saída, e a marca continua |
| 12 | 200 linhas `user` depois da entrada acima, com marca; e uma sessão nova sobre o mesmo transcript | sem saída nas duas, e a marca continua: a leitura é só da cauda |
| 13 | `LOTUS_CONTEXTO_LIMIAR=20000` com medição 25000; `abc`; `0` | avisa com `<L>` 20; `abc` e `0` caem em 150000 |
| 14 | o `.claude/settings.json` real | liga o hook em `PostToolUse` e em `UserPromptSubmit` |
| RF1 | `compact_boundary` depois de uma entrada acima; depois, uma entrada acima após a fronteira | sem saída no `UserPromptSubmit`; a entrada nova avisa |
| RF2 | `session_id` com `../` | avisa, e a marca fica no `TMPDIR` com `_` no lugar |
| RF3 | `TMPDIR` inexistente | sem saída |
| RF4 | `usage` com campo nulo e campo que não é número; `message` que não é objeto | soma só os números, e a entrada estranha não derruba a leitura |
| RF5 | `transcript_path` com espaço | avisa |

O caso 14 é a catraca contra um hook escrito e nunca ligado. Segundo a lição 10, cada caso precisa
ser visto reprovar antes de passar: os testes nascem antes do hook, e a bancada de mutantes (E3)
mostra que cada guarda tem asserção que a prende. O estado antigo se reproduz por cópia no
scratchpad, nunca por `git stash`, porque a pilha de stash é compartilhada entre as árvores.

## 3. Docs

Em `docs/estrutura-monolito.md`:

- o cabeçalho de `hooks/` passa a citar `PostToolUse` e `UserPromptSubmit`;
- entra uma linha para `sinal-contexto.sh`;
- a contagem de `tests/` vai de 17 para 18;
- a linha do `settings.json` vai de 5 para 6 hooks.

## 4. Definition of Done

1. `bash .claude/tests/run-all.sh` verde, e cada caso novo visto reprovar antes de passar. A
   bancada de mutantes sai sem mutante que passe, e o registro vai para
   `docs/superpowers/blocos/37-harness-sinal-de-contexto-cheio/prova-catraca.md`.
2. **Visto disparar.** O João abre uma sessão interativa nascida no diretório da lane, com
   `cd ../lotus-37-harness-sinal-de-contexto-cheio && LOTUS_CONTEXTO_LIMIAR=20000 claude`. A sessão
   precisa nascer ali: o `settings.json` e o `${CLAUDE_PROJECT_DIR}` vêm do diretório onde ela
   começa, e uma sessão aberta na `main` rodaria a `main`, que não tem o hook. Ele faz o modelo
   chamar uma ferramenta e vê o `systemMessage`. O
   registro vai para `docs/superpowers/blocos/37-harness-sinal-de-contexto-cheio/prova-disparo.md`,
   com a data, o comando e o texto visto.
3. `docs/estrutura-monolito.md` atualizado.

## 5. Fora de escopo

- `autoCompactWindow` (saída 1) e `context: fork` (saída 3), pela D1.
- Qualquer compactação automática: não há hook que a dispare.
- Aviso dentro de subagente: o contexto dele morre com ele.
- Medição por bytes do transcript: o `usage` dá o número real.
- Bloquear compactação pelo `PreCompact`.

## Verificação externa

Nenhuma. O bloco cobre um hook local do harness, provado pela suíte e por uma sessão ao vivo na lane
antes do merge. `efeito_externo: nao`.
