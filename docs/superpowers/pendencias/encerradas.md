# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## P-26 — `->scopeBindings()` mudou 403 → 404 sem permissão

**Fechada em 2026-08-14.** Sai no próximo `/fechar-sprint`.

A spec e os commits de `hardening-guardrails-e-transportes` (2026-08-04) afirmam "nenhum
comportamento observável muda"; a troca de `abort_unless` por `->scopeBindings()` mudou **403 → 404**
para usuário autenticado **sem** a permissão da rota.

Provado por sonda no review de 2026-08-04 (Q-3): `SubstituteBindings` roda antes do middleware
`permission:`, então o binding escopado responde primeiro. Sem `commercial.budget.update`, arquivo do
próprio pai dá 403 e arquivo de outro pai dá 404 — antes os dois davam 403, porque o `abort_unless`
vivia depois do middleware. **Deferido pelo João** na época: dano prático baixo — ~10 usuários
internos, todos staff, e 404 vaza menos que 403.

**Como fechou:** varredura de pendências pós-BD-6, por gatilho **já cumprido e não notado no dia**.
O gatilho pedia a nota "na spec arquivada do bloco **ou** no `progress.md` da entrega", e ela está no
segundo: `docs/superpowers/historico/progress-archive.md:24` (a linha do próprio bloco, descida do
`progress.md` no arquivamento) escreve *"Q-3 → **P-26** (403 virou 404 sem permissão, porque
`SubstituteBindings` roda antes do `permission:` — a spec afirma o contrário)"*.

O comportamento **não** mudou e não precisava mudar: o que a pendência protegia era a rastreabilidade
da afirmação falsa, não o par de status. A spec §4 (invariante 1) **não** foi retro-editada, pela
mesma regra que a P-39 aplica: história de bloco fechado não se reescreve. Se o 403 uniforme voltar a
ser exigido por decisão de segurança, isso é bloco novo, não reabertura desta linha.
