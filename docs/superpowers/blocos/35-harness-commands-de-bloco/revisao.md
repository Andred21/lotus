# 35 — Revisão

## Em aberto

## Rodada 4 — `42a50a4d..232faedd` — 2026-10-02 · Lente 1: opus · Lente 2: sonnet

Risco: baixo. Esta rodada revisa a correção `232faedd` do Q-9. A lente 1 dá o Q-9 como fechado: o
6d reconhece a declaração no formato real (``Paga a **`D-65`**``); o `git add` do 6f e o modo
Aceitação acompanham a mudança; e a invariante 10, o `CLAUDE.md`, o `AGENTS.md` e o `backlog.md`
estão alinhados. Os três achados novos vêm da própria correção, e todos são Menores. Q-7, Q-8 e
Q-10, das rodadas anteriores, são Menores que o João decidiu não corrigir.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-11 | Menor | O 6d prescreve a linha da tabela de saídas sem o prefixo `> `, mas a tabela vive dentro de um blockquote. E o corte da ficha `D-*` não para no `---`: cortar a última, a `D-37`, apagaria o separador da seção | CONFIRMED | `.claude/commands/finalizar-bloco.md:272-275`; `docs/superpowers/backlog.md:500-509`, `:629-637` | registrado, não bloqueia |
| Q-12 | Menor | A invariante 10 ainda diz que a regra "mantém o arquivo livre de conflito", mas com a E10 toda lane que paga um `D-*` acrescenta uma linha no fim da mesma tabela. Duas lanes em paralelo dão conflito no segundo PR | CONFIRMED | `docs/superpowers/state.md:121-122`; `.claude/commands/finalizar-bloco.md:274-275` | registrado, não bloqueia |
| Q-13 | Menor | A exceção de aguardando aceitação na invariante 10 não cita os `D-*` pagos. E nesse caminho o 6d é pulado e a linha do 6c não nomeia quais `D-*` o Passo 3 deu como pagos, então o julgamento não fica registrado para a PR de docs | CONFIRMED | `docs/superpowers/state.md:118-121`; `.claude/commands/finalizar-bloco.md:258-259`, `:281-282`; `spec.md:147-148` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 3 confirmados, 0 plausíveis, 0 refutados

Correção da rodada 3: o João aprovou o Q-9 em 2026-10-02, pela opção "lane tira o `D-*` pago"
(emenda E10). A correção entrou em `232faedd`. Q-10 ficou registrado, sem correção.

## Rodada 3 — `42a50a4d..58244621` — 2026-10-01 · Lente 1: opus · Lente 2: sonnet

Risco: baixo. Esta rodada revisa a correção `58244621` do Q-6. A lente 1 dá o Q-6 como fechado
(contrato, `CLAUDE.md`, `AGENTS.md` e o YAML do modo Aceitação) e sem problema novo. Q-7 e Q-8, da
rodada 2, são Menores que o João decidiu não corrigir.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-9 | Importante | O 6d manda remover "só a própria ficha", e a invariante 10 diz o mesmo. Mas o `backlog.md` diz que o débito `D-*` sai do registro canônico no fechamento do bloco que o paga, e a tabela "Fichas que saíram desta fila" tem sete linhas assim. O fluxo novo proíbe essa edição e não diz o que fazer com o débito pago. O item 23 declara pagar a `D-65` e fecharia com ela ainda listada | CONFIRMED | `.claude/commands/finalizar-bloco.md:261-270`; `docs/superpowers/state.md:115-121`; `docs/superpowers/backlog.md:33-35`, `:488-490`, `:499-509`, `:227` | em aberto, espera a aprovação do João |
| Q-10 | Menor | O `AGENTS.md` manda ler o `backlog.md` "somente no main tree", inclusive no fechamento. Mas o fechamento roda na lane (6d), como o `CLAUDE.md` §3 diz | CONFIRMED | `AGENTS.md:56-57`; `.claude/commands/finalizar-bloco.md:261`; `CLAUDE.md:41-44` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

Correção da rodada 2: o João aprovou corrigir só o Q-6, em 2026-10-01, e a correção entrou em
`58244621`. Q-7 e Q-8 ficaram registrados, sem correção.

## Rodada 2 — `42a50a4d..0b073752` — 2026-10-01 · Lente 1: opus · Lente 2: sonnet

Risco: baixo, como na rodada 1. A rodada revisa o bloco inteiro, com a correção `0b073752` dos
achados da rodada 1. Na lente 1, Q-2 a Q-5 da rodada 1 saem fechados. O Q-1 fecha nos commands, e
o que faltou dele no contrato virou o Q-6. Os achados desta rodada continuam a numeração da
rodada 1.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-6 | Importante | A E9 não chegou ao contrato. A seção "Entrar e sair de `blocked`" manda copiar o `resume_state` de volta, mas o modo Aceitação vai direto de `blocked` a `closed`. A invariante 10 diz que é a lane que remove a ficha junto com o `closed`, mas na E9 quem remove é a PR de docs do João. O `CLAUDE.md` e o `AGENTS.md` repetem a regra antiga. A saída do modo Aceitação não diz o que gravar em `next_owner`/`next_action`, nem pede `commit`/`updated_at`/`updated_by` (invariante 9). Uma sessão que siga o contrato grava `ready_for_closure` na `main`, e o bloco cai em "Nada casa" | CONFIRMED | `docs/superpowers/state.md:49-51`, `:112-114`; `.claude/commands/finalizar-bloco.md:122-126`; `CLAUDE.md:42-43`; `AGENTS.md:29-30` | em aberto, espera a aprovação do João |
| Q-7 | Menor | O modo Pós-PR não confere o `workflow_state` antes do `lane.sh fechar`. O único teste é o `merge-base --is-ancestor`, e uma lane viva com PR intermediária já mesclada seria fechada | CONFIRMED | `.claude/commands/finalizar-bloco.md:82-93`, `:368-372`; `.claude/scripts/lane.sh:391-396` | registrado, não bloqueia |
| Q-8 | Menor | O resumo em negrito do Passo 2 manda à retomada no Passo 7 só o `closed`, e omite o `blocked` aguardando aceitação que o ramo Retomada trata igual | CONFIRMED | `.claude/commands/finalizar-bloco.md:131`, contra `:56-61` e `:77-78` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0
plausíveis, 0 refutados · Menor: 2 confirmados, 0 plausíveis, 0 refutados

Correção da rodada 1: o João mandou corrigir Q-1 a Q-5 em 2026-10-01. O Q-1 seguiu a opção "espera
em `blocked`" (emenda E9 da spec), e tudo foi aplicado em `0b073752`.

## Rodada 1 — `42a50a4d..7804f706` — 2026-10-01 · Lente 1: opus · Lente 2: sonnet

Risco: baixo — só harness (commands, agentes, prompts, docs de processo); nenhum domínio das
leis §5; `executor: claude`. Sem lente Codex.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | Bloco com `efeito_externo: sim` cuja prova só existe depois do merge não chega a `closed`: o 6a exige a prova antes do `closed`, o Passo 6 roda antes do push/PR (Passo 7), e o modo Aceitação é só aviso até o item 36 | PLAUSIBLE | `.claude/commands/finalizar-bloco.md:219-221`, `:115-119`; `docs/superpowers/state.md:114-116` | observação, não bloqueia. Nota: a condição de que o veredito dependia existe — a lane 33 tem `efeito_externo: sim` e a spec dela põe merge e espelho (passo 3) antes do `.env`, do deploy e das provas (passos 4–9). Decisão do João antes de a 33 chegar ao `/finalizar-bloco` |
| Q-2 | Menor | 6d remove só a seção `## <NN>.` e proíbe tocar outra linha: a linha do bloco na tabela `# Ordem de execução` fica órfã e sobram dois `---` seguidos | CONFIRMED | `.claude/commands/finalizar-bloco.md:233-234`; `docs/superpowers/backlog.md:119-126` | registrado, não bloqueia |
| Q-3 | Menor | 6f ("Commit") não lista os paths do `git add`; na prova em clone o fechamento usou `git add -A docs`, contra a disciplina de paths exatos do `/executar-bloco` | CONFIRMED | `.claude/commands/finalizar-bloco.md:251-257`; `prova-clone.md:100-101`; `.claude/commands/executar-bloco.md:199` | registrado, não bloqueia |
| Q-4 | Menor | Ficha proposta numerada por "maior `## NN.` + 1" sem a conferência contra `git branch -a` e `blocos/` que o `/planejar-bloco` faz; com a ficha removida no fechamento, a conta pode reusar número queimado | CONFIRMED | `.claude/commands/revisar-bloco.md:155`; `.claude/commands/planejar-bloco.md:60` | registrado, não bloqueia |
| Q-5 | Menor | `AGENTS.md` autoriza o Codex a alterar `estado.md`/`progress.md` e commitar a transição; a skill `lotus-execute-block` (editada neste bloco) diz que estado, transições e commits são do Claude | CONFIRMED | `AGENTS.md:17-22`; `.agents/skills/lotus-execute-block/SKILL.md:47-48` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 1
plausível, 0 refutados · Menor: 4 confirmados, 0 plausíveis, 0 refutados

Fora desta rodada, por já constarem em "Para o fechamento" do `rulings.md`: `context_required` e
invariante 5, `closing` órfão, `lotus-ui-review:36`, `backlog.md:34,43-44`, semente do `lane.sh`,
catraca sem prompts nem agentes, artefato do `blocked` na rota codex.

Nenhum achado é divergência de documentação contra código (Q-2 a Q-5 são defeitos internos dos
textos de contrato deste bloco): nenhuma pendência aberta.
