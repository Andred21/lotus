# 36 — Revisão

## Em aberto

- **Q-1 da Rodada 2 — Importante, CONFIRMED.** O descarte do PENDENTE na lane de aceitação não tem
  saída quando o `aceitacao.md` não é versionado. Falta a aprovação do João.

## Rodada 2 — `20aa04ef..bbdc58f0` — 2026-10-04 · Lente 1: opus · Lente 2: sonnet

A Rodada 1 terminou com o Q-1 dela promovido a correção pelo João. A correção entrou em `bbdc58f0`
(emenda E8 da spec): o conf perdeu o `local`, e o caso novo está em `aceitacao.tests.sh:313-315`.
A lente 1 conferiu que a correção está completa no código. A suíte, rodada fresca, deu
`OK: 17 arquivo(s) de teste, nenhuma falha`.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | O descarte do PENDENTE na lane de aceitação (`git restore <aceitacao.md>` e depois `lane.sh fechar <NN> --force`) não tem saída quando o bloco chega sem `aceitacao.md` versionado (`active_acceptance: null`, que é o caso do 33 hoje). O `conferir` cria o arquivo sem versioná-lo, o `git restore` falha com `pathspec`, e o `fechar --force` recusa por causa do `??`. A lane fica viva e ocupa uma vaga do teto | CONFIRMED | `.claude/commands/finalizar-bloco.md:272-275`, `.claude/scripts/lane.sh:542-543`, `.claude/scripts/lib/aceitacao.py:310`, espelho em `spec.md` §2.4 | aguarda a aprovação do João |
| Q-2 | Menor | `docs/estrutura-monolito.md` ainda lista o alias `local` que a E8 removeu | CONFIRMED | `docs/estrutura-monolito.md:230`, `.claude/aceitacao-aliases.conf:5-7` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0 plausíveis,
0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

## Rodada 1 — `20aa04ef..07c9b33b` — 2026-10-04 · Lente 1: opus · Lente 2: sonnet

Bloco classificado como baixo risco: só harness (`.claude/`) e docs, nenhum domínio das leis §5,
`executor: claude`. Por isso a lente Codex não rodou. A suíte `bash .claude/tests/run-all.sh` rodou
fresca na lente 1: `OK: 17 arquivo(s) de teste, nenhuma falha`.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | O alias `local` é aceito pelo `gerar`, mas a lane de aceitação não sobe stack. Toda prova `local ... -> 200` mediria `000` no `conferir`, e um bloco com `efeito_externo: sim` ficaria preso em `blocked`, sem caminho documentado até `closed` | PLAUSIBLE | `.claude/aceitacao-aliases.conf:6`, `.claude/scripts/aceitacao.sh:101-103`, `.claude/scripts/lane.sh:457-458`, `.claude/commands/planejar-bloco.md:168` | observação, não bloqueia. O defeito depende de nada responder na porta da lane de aceitação. `.claude/scripts/lib/aceitacao.py:280-289` exige medição de toda prova automática, sem exceção para `local`. |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 1 plausível,
0 refutados · Menor: 0 confirmados, 0 plausíveis, 0 refutados
