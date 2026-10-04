# 36 — Revisão

## Em aberto

- **Q-1 — Importante.** Saiu PLAUSIBLE da lente 2, mas o mecanismo existe:
  `.claude/scripts/lib/aceitacao.py:280-289` exige medição de toda prova automática. O João
  aprovou corrigir em 2026-10-04 (o `gerar` recusa `local`, uma frase no Passo 7 do
  `/planejar-bloco`, um caso na suíte). Falta aplicar a correção, e o `/revisar-bloco` roda de novo
  como Rodada 2.

## Rodada 1 — `20aa04ef..07c9b33b` — 2026-10-04 · Lente 1: opus · Lente 2: sonnet

Bloco classificado como baixo risco: só harness (`.claude/`) e docs, nenhum domínio das leis §5,
`executor: claude`. Por isso a lente Codex não rodou. A suíte `bash .claude/tests/run-all.sh` rodou
fresca na lente 1: `OK: 17 arquivo(s) de teste, nenhuma falha`.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | O alias `local` é aceito pelo `gerar`, mas a lane de aceitação não sobe stack. Toda prova `local ... -> 200` mediria `000` no `conferir`, e um bloco com `efeito_externo: sim` ficaria preso em `blocked`, sem caminho documentado até `closed` | PLAUSIBLE | `.claude/aceitacao-aliases.conf:6`, `.claude/scripts/aceitacao.sh:101-103`, `.claude/scripts/lane.sh:457-458`, `.claude/commands/planejar-bloco.md:168` | observação, não bloqueia. O defeito depende de nada responder na porta da lane de aceitação. `.claude/scripts/lib/aceitacao.py:280-289` exige medição de toda prova automática, sem exceção para `local`. |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 1 plausível,
0 refutados · Menor: 0 confirmados, 0 plausíveis, 0 refutados
