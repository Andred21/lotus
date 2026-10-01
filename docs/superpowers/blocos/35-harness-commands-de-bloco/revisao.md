# 35 — Revisão

## Em aberto

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
