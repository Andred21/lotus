# 46 — Revisão

## Em aberto

## Rodada 2 — `b9e1e45f..69e8e5a7` — 2026-11-01 · Lente 1: opus

Rodada depois da correção do `tooltip: true`: o merge da `origin/main` (`067fb607`) trouxe a
`ImportTriageTable` do bloco 44 com o opt-in que este bloco tirou do `RowAction`, e o `69e8e5a7`
o removeu. Baixo risco (frontend visual, `executor: claude`, nenhuma lei §5), sem lente Codex. A
lente 1 rodou os gates no HEAD: `pnpm build` verde, `pnpm lint` limpo, `pnpm test` 1569/1569.
Conferiu a ordem editar → remover da triagem (sem "ver"; destrutiva por último), a ausência de
`tooltip: true|false` em `frontend/src`, os consumidores vindos da main (`ImportDialog` em
`AppDialog size="lg"`, `ImportRowEditor` com `FormField`; nenhum `FormSection`/`SectionLabel`) e o
merge do `brand-theme.css` sem sobreposição. Observações sem achado: a triagem não foi medida no
navegador (registrado em `rulings.md`); a linha de gate da `prova.md` cita os 1440 testes do
`756b00fe` e ganha os números do HEAD novo na verificação fresca do `/finalizar-bloco`.

Lente 2: não despachada — nenhum achado nesta rodada.

## Rodada 1 — `5fba081d..756b00fe` — 2026-11-01 · Lente 1: opus · Lente 2: sonnet

Classificação: baixo risco (frontend visual e ordenação client-side; nenhuma lei §5 tocada,
`executor: claude`), então a lente Codex não rodou. A lente 1 conferiu os gates no HEAD: `pnpm lint`
limpo, `pnpm build` verde e `pnpm test` com 1440/1440 em duas de três rodadas. Na terceira, um
timeout em `frontend/tests/sondar-saude.test.ts`, que é infra e fica fora do diff.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | A `prova.md` ficou atrás do `756b00fe`: diz que o título de seção tem 12px e que a suíte tem 1439 testes. Hoje são 13px (`formSectionTitleClass`), `spaced` em `pt-4` com `pb-1`, e 1440 testes, sem medição nova na tela | CONFIRMED | `prova.md:27`, `:88`; `frontend/src/shared/ui/typography.ts:35`; `frontend/src/shared/ui/FormSection/FormSection.tsx:46` | registrado; medir de novo na tela e corrigir as duas linhas na verificação fresca do `/finalizar-bloco` |
| Q-2 | Menor | A rule de estilização ainda descreve uma faixa de seção só, a `sectionLabelClass` em 12px; o título de seção de formulário em 13px, na marca, ficou só nos rulings e em docblocks | CONFIRMED | `.claude/rules/frontend-estilizacao.md:37`, `:74-78`; `frontend/src/shared/ui/typography.ts:35` | divergência de doc, registrada como **P-110** |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 2 confirmados, 0 plausíveis, 0 refutados
