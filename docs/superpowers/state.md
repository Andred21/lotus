# Estado — contrato

Este arquivo é o **contrato** dos estados válidos, dos campos e das invariantes do `estado.md` de
cada bloco. Ele não guarda o estado de bloco nenhum: o de cada um vive em
`docs/superpowers/blocos/<NN>-<slug>/estado.md`, na pasta do bloco, na árvore da lane. A lista de
lanes vivas agora mesmo sai de `bash .claude/scripts/lane.sh descobrir` — que é o que o
`SessionStart` mostra no início de toda sessão.

## Lane

Uma lane é uma worktree irmã, `../lotus-<NN>-<slug>`, numa branch que casa
`^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$`. O número é o da ficha do
`backlog.md`; a pasta do bloco é `blocos/<NN>-<slug>/`. Branch fora do padrão não é lane.

- **O main tree fica sempre na `main` e nunca é lane.** Ele planeja, abre e fecha lane
  (`lane.sh abrir` e `lane.sh fechar`) e escreve o `backlog.md`.
- **No máximo três lanes.** Cada uma publica as portas do offset que o `abrir` reservou no `.env`
  da raiz dela: +1, +2 ou +3, pela tabela do `.env.example`. O `abrir` conta como ocupado o
  offset de toda árvore do `git worktree list`, lane ou não.

## Estados válidos

| Estado | Token do `next_action` | Próxima ação permitida |
|---|---|---|
| `idle` | `select_backlog_item` | escolher explicitamente um item do `backlog.md` |
| `context_required` | `generate_context_packet` | gerar o Context Packet com `lotus-context-packet` |
| `ready_for_planning` | `plan_active_work_item` | executar `/planejar-bloco` para o bloco |
| `planning` | `continue_active_planning` | continuar brainstorming, spec e plano; **não implementar** |
| `ready_for_execution` | `execute_active_plan` | executar `/executar-bloco` para o bloco |
| `executing` | `continue_active_plan` | retomar a task pendente do plano; **não replanejar** |
| `ready_for_review` | `request_code_review` | pedir o code review do bloco |
| `reviewing` | `approve_review_findings` | tratar só os achados aprovados e repetir o review |
| `ready_for_closure` | `close_active_work_item` | fechar o bloco |
| `closing` | `answer_integration_menu` | responder ao menu de integração e verificar o merge |
| `blocked` | `resolve_blocker` | resolver o `blocker`; depois voltar a `resume_state` |
| `closed` | `none` | nenhuma: o bloco terminou e o `estado.md` é só o registro dele |

A **primeira palavra** do `next_action` é o token do estado; texto livre pode seguir depois de um
espaço. Texto com `#` vai entre aspas, porque o YAML lê ` #` como início de comentário:
`next_action: "close_active_work_item PR #120 aberto"`. O mapa estado → token vive uma vez em
código, em `.claude/hooks/lib/estados.sh`, e esta tabela o espelha: `.claude/tests/estados.tests.sh`
reprova a divergência nos dois sentidos.

### Entrar e sair de `blocked`

Quando um impedimento externo para o trabalho, grave `workflow_state: blocked`, `resume_state` com
o estado de onde se está saindo, `blocker` com uma linha que descreve o impedimento,
`next_owner: joao` e `next_action: resolve_blocker`, seguido do que falta. Para sair, confirme que o
`blocker` foi resolvido, copie `resume_state` de volta para `workflow_state`, zere `blocker` e
`resume_state` e troque o `next_action` pelo token do estado retomado. Nos dois sentidos vale a
invariante 9. Enquanto o bloco está em `blocked`, as regras de "a partir de" (invariantes 3, 4 e
12) usam o `resume_state` como régua. O item 36 acrescenta um caminho automático: aceitação externa
pendente depois do merge.

## Campos (`schema_version: 3`)

| Campo | Significado |
|---|---|
| `schema_version` | `3` nesta versão |
| `id` | número da ficha no `backlog.md`, como ela o escreve (`30`, sem zero à esquerda) |
| `slug` | nome da pasta do bloco, `<NN>-<resto>` (`30-harness-estado-por-bloco`); a branch é `<tipo>/<slug>` |
| `workflow_state` | um dos doze estados acima |
| `next_owner` | quem tem a bola: `joao`, `claude` ou `codex` |
| `next_action` | começa pelo token do estado; texto livre depois de um espaço |
| `resume_state` | estado para onde voltar ao sair de `blocked`; `null` fora dele |
| `active_spec` | caminho da spec, relativo à raiz da árvore |
| `active_plan` | caminho do plano; obrigatório a partir de `ready_for_execution` |
| `active_review` | caminho do `revisao.md`; obrigatório a partir de `ready_for_closure` |
| `active_acceptance` | caminho do `aceitacao.md` (item 36); `null` quando `efeito_externo` é `nao` |
| `context_packet` | caminho do Context Packet, quando o bloco exige contexto externo |
| `efeito_externo` | `sim` quando o resultado depende de ação fora do repositório, `nao` caso contrário. `null` é a semente do `lane.sh abrir` e **nunca** vale `nao` |
| `executor` | quem executa o plano, copiado do `## Handoff de execução` dele: `claude` ou `codex` |
| `branch` | branch da lane |
| `worktree` | caminho da árvore da lane, relativo ao main tree |
| `offset` | offset de porta da lane, de 1 a 3; `null` em lane aberta antes do `lane.sh` |
| `lane_base` | SHA curto da `main` de onde a lane saiu |
| `commit` | `git rev-parse --short HEAD` no momento em que o arquivo foi escrito |
| `blocker` | uma linha que descreve o impedimento; `null` fora de `blocked` |
| `updated_at` | ISO-8601 com offset |
| `updated_by` | `<usuario>@<host> / <modelo>`: `id -un`, `hostname -s` e o alias do modelo, ou `terminal` quando o João roda o script à mão |

## Invariantes

1. **No máximo três lanes vivas.** Cada lane é um bloco, uma branch `<tipo>/<NN>-<slug>` e uma
   worktree irmã, conduzida por uma sessão própria. Abrir lane passa pelo portão do
   `lane.sh abrir`: nada de quarta lane, nada de dois blocos que dependem um do outro (pela linha
   `**Depende:**` das fichas, transitivamente, nos dois sentidos) e nada de offset repetido. O
   portão compara o offset, lido do `LOTUS_DEV_HTTP_PORT` do `.env` de cada árvore; porta avulsa
   fora da tabela do `.env.example` fica com o `docker compose up`, que falha alto. O
   `lane.sh conferir` acusa dois planos vivos que tocam os mesmos arquivos, lendo o `plano.md` da
   pasta de cada bloco; a lane que não tem um sai nomeada como `NAO CONFERIDA`.
2. **`next_action` começa pelo token do `workflow_state`.** Se não começar, o arquivo está
   corrompido: pare, relate e reconstrua a partir do git e dos artefatos do bloco. O `SessionStart`
   acusa isso como `ESTADO INCOERENTE`.
3. `active_plan` é obrigatório a partir de `ready_for_execution`.
4. `active_review` é obrigatório a partir de `ready_for_closure`.
5. Quando o bloco depende de contexto externo ao repositório, ele entra em `context_required`, com
   `context_packet: null`, e o packet se torna obrigatório antes da transição para
   `ready_for_planning`.
6. **Mudanças de estado ocorrem somente em fronteiras duráveis** e entram no mesmo commit do
   artefato que prova a transição. O estado mora na pasta do bloco, e é essa localização que impede
   duas lanes de colidirem no mesmo arquivo de estado.
7. **Divergência bloqueia a sessão.** Quando o `estado.md`, o plano, a spec, o Git ou o
   `backlog.md` discordarem, pare e relate. Não escolha fonte por heurística e não "conserte" o
   arquivo para o que parece mais provável.
8. **O backlog nunca promove trabalho automaticamente.** Abrir lane para uma ficha é sempre escolha
   explícita do João.
9. Quem altera um `estado.md` atualiza, no mesmo arquivo, `updated_at`, `updated_by` e `commit`.
10. **`backlog.md` é escrito somente pelo main tree, na `main`.** É o último arquivo compartilhado
    entre lanes, e a regra o mantém livre de conflito.
11. **Bloco com `efeito_externo: sim` não vai a `closed` sem a prova do efeito externo
    registrada.** `closed` significa resultado verificado, não código na `main`. O registro é o
    `aceitacao.md` que o item 36 introduz; até ele, a prova vai no fechamento.
12. **`efeito_externo` é obrigatório a partir de `ready_for_execution`.** Quem grava `sim` ou `nao`
    é o planejamento; o `lane.sh abrir` só semeia `null`. `null` num bloco que já passou dali é
    divergência pela invariante 7, e o `SessionStart` a acusa. Ler `null` como `nao` desligaria a
    invariante 11 sem ninguém ter decidido isso.

## Histórico

Os blocos do fluxo antigo têm uma linha cada em `historico/progress.md` e a narrativa em
`historico/state-archive.md`, que recebeu o `state.md` antigo inteiro na virada do item 30 e depois
dele congela. Bloco novo: a pasta `blocos/<NN>-<slug>/` é o registro, e o `progress.md` ganha a
linha dele no fechamento.

## Transição

Até o item 35 mesclar, os commands e skills (`/planejar-bloco`, `/executar-bloco`,
`revisar-sprint`, `fechar-sprint` e `.agents/skills/`) ainda citam `state.md`, `lanes:`,
`focused_lane` e os campos singulares do topo. Leia "o `estado.md` do bloco" onde eles dizem
`state.md`, e "o bloco" onde dizem lane em foco ou `active_work_item`. O `estado.md` do 35 e o do
36 são semeados à mão, porque o `lane.sh abrir` exige o main tree na `main` (spec 2026-09-26, §7).
