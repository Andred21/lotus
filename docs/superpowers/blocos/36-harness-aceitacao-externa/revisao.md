# 36 — Revisão

## Em aberto

## Rodada 3 — `20aa04ef..f4a25c1c` — 2026-10-04 · Lente 1: opus · Lente 2: sonnet

As correções aprovadas na Rodada 2 entraram em `f4a25c1c`:
- **Q-1:** o descarte do PENDENTE usa `git restore --` quando o arquivo é versionado e
  `git clean -f --` quando não é (emenda E12). O trecho entrou na catraca com a sonda `sem-clean`,
  e `lane-aceitar.tests.sh:202-226` percorre os dois descartes até o `fechar --force`.
- **Q-2:** corrigido em `docs/estrutura-monolito.md:230`.

A lente 1 conferiu as duas correções e as achou completas. A suíte, rodada fresca, deu
`OK: 17 arquivo(s) de teste, nenhuma falha`.

**Errata das Rodadas 1 e 2.** O `f4a25c1c` renumerou as emendas próprias desta spec para E11 (sem
alias `local`) e E12 (o descarte), porque "E8" sem sufixo, no harness, é a E8 do 35. Onde as
Rodadas 1 e 2 dizem "E8", leia E11. É o Q-3 abaixo, e esta errata o resolve sem editar rodada
antiga.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | O `reaproveitar` casa o resultado gravado pela posição do item, não pela identidade (texto mais prova) em qualquer posição. Um item inserido no topo da seção descarta o manual já escrito de um item que ficou idêntico, e o aviso diz "mudou". A §1.3 da spec promete preservar "todo resultado cuja identidade bate" | CONFIRMED | `.claude/scripts/lib/aceitacao.py:247-253`, `spec.md:141-146` | registrado, não bloqueia. Só acontece quando a spec muda depois de um manual escrito: isso não ocorre na lane de aceitação, e o git guarda a versão anterior |
| Q-2 | Menor | A §6 da spec ("Aviso à lane 33") está desatualizada. O 33 já mesclou em `blocked`, a spec dele tem a `## Verificação externa`, ele chega com `active_acceptance: null` e sem `aceitacao.md`, e o `progress.md` promete acréscimos ao `backlog.md` por uma "PR de docs da aceitação" que a E2 extinguiu | CONFIRMED | `spec.md:414-418`; no main tree, `blocos/33-infra-producao-email-ses/spec.md:527` e `estado.md:7,12,21` | registrado, não bloqueia. O aviso atualizado vai ao João no relatório desta rodada |
| Q-3 | Menor | As Rodadas 1 e 2 citam "E8" para a remoção do `local`, que agora é a E11 | CONFIRMED | `revisao.md:14,21` (na Rodada 2), `spec.md:67` | resolvido pela errata acima |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis,
0 refutados · Menor: 3 confirmados, 0 plausíveis, 0 refutados

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
