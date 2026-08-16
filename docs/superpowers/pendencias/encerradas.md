# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## P-38 — a rule afirma que teste PrimeReact/jsdom está fora do corte, e o corte já tem três

**Bloco:** BD-12 · **Gatilho:** fecha no próximo bloco que tocar `frontend-fsliced.md` por qualquer
motivo, trocando a frase pelo corte medido (rodar o runner e contar, não citar de memória — é a
catraca do parágrafo "mede a própria população com o seletor dela"). Enquanto não fechar, **a rule
vale pelo que o `pnpm test` faz, não pelo que ela diz**.

Divergência medida no review de sprint do BD-6 (2026-08-14). O próprio bloco criou
`frontend/src/shared/ui/InlineLoadState/InlineLoadState.test.tsx`,
`frontend/src/features/commercial/components/Budget/CourseStep.test.tsx` e
`frontend/src/features/commercial/components/Budget/QuotesList.test.tsx` — os três renderizam
componente que monta wrapper PrimeReact no jsdom, e os três passam. A §10 da spec
`docs/superpowers/specs/archive/2026-08-14-falha-vs-lista-vazia-design.md` repete a mesma frase,
herdada da rule.

É a **lição 13 no mesmo arquivo pela terceira vez**: a rule já afirmou "sem test runner ainda" um
bloco inteiro depois de o runner existir, e depois afirmou por quatro dias que o corte era só
`shared/`. Não é bug de código: o corte real é maior que o documentado, então o texto **subestima**
a cobertura — quem lê a rule pode deixar de escrever um teste que o projeto já sabe rodar.

**Encerrada em 2026-08-16, no bloco `meu-perfil-frontend`, pelo gatilho literal.** O bloco tocou
`.claude/rules/frontend-fsliced.md` por outro motivo (a linha de derivação de status documental, que
o contrato de perfil tinha tornado meia-verdade) e absorveu esta junto, como a ficha mandava. A frase
foi trocada pelo **corte medido com o runner**, não citado: 13 arquivos renderizam componente, **9
montam wrapper PrimeReact** (`ValidationPage`, `BudgetDetailPage`, `CourseStep`, `QuotesList`,
`TurmaDetailPage`, `ProfileDocumentSlot`, `DetailHeader`, `IdentityCell`, `InlineLoadState`) e 4 são
DOM puro (`AppFileRow`, `PageHeader`, `FormField`, `Clock`). A spec arquivada
`2026-08-14-falha-vs-lista-vazia-design.md` §10 continua repetindo a frase vencida **de propósito**:
spec arquivada é snapshot datado, não doc normativo — quem manda é a rule.

