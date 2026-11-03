# Bloco 49 — rulings da execução

Decisões tomadas durante o `/executar-bloco 49` (SDD, Tasks 1 a 6 e revisão final da branch). Todas
são do controlador ou do implementador; nenhuma veio do João. Cada linha diz quanto custa se a
decisão estiver errada.

## Do controlador e dos implementadores

- **Task 1: `frontend/scripts/generate-brand-theme.d.mts` entra no escopo.** É o par de tipos do
  `.mjs`, e sem ele o export `SEVERIDADES_CLARAS` não tipa (o `tsc -b` quebrava). **Se estiver
  errado:** um arquivo a mais no diff da Task 1.
- **Tasks 1 e 2: o `tsc` e o lint quebrados vão numa rodada única, pelo implementador da Task 1.**
  Ele já conhecia o `tone-ink.test.ts`. **Se estiver errado:** a rodada fica contada na Task 1 em
  vez da 2.
- **Task 5: o teste do RUT da tabela ativa vai para `EnrollmentTable.rut.test.tsx`, um arquivo
  novo fora de Files.** Estender o `EnrollmentTable.test.tsx` estouraria o `max-lines` 150. O brief
  dizia "criar ou estender", e há o precedente `ImportTriageTable.refused.test.tsx`. **Se estiver
  errado:** um arquivo de teste a consolidar.
- **Task 6, P-108: a correção mora no `DetailHeader` (`shared/ui`), não no `BudgetDetailPage`.** A
  causa medida era o bloco do título espremido pela base zero do `flex-1`. O `TurmaDetailHeader` e
  o `TurmaCreatePage` mediram idênticos antes e depois, a 768 e a 1024. **Se estiver errado:** um
  consumidor futuro com ações largas passa a quebrar a linha em vez de sobrepor, o que é o
  comportamento desejado.
- **Task 6, P-101: a coluna RUT das matrículas sobe para peso local 14 (`RUT_MATRICULA`).** A
  medida a 390 mostrou o RUT vazando: a célula tinha 95 e 106 px contra os 133 necessários.
  `min-width` é ignorado com `table-layout: fixed`. O peso fica local, e não no `COL.rut`, pela spec
  §4.6. **Se estiver errado:** outras tabelas com `COL.rut` podem vazar igual, a começar pela
  `StudentsTable` (ver a última ruling).
- **Revisão final: os minors 1 a 5 vão numa rodada única.** São os docblocks do `brand-theme.css`,
  o `sm:ml-auto` das ações, a prova a 768, o piso do paginador e o docblock da fatia do RUT.
  **Se estiver errado:** uma rodada a mais, de diff pequeno, na branch.
- **Revisão final, P-108: na quebra, as ações alinham à direita (`sm:ml-auto`).** O docblock do
  `DetailHeader` já dizia "empurra os dois para a direita", e a quebra à esquerda contradizia o
  desenho de 1280. Pede o olho do João na captura do orçamento em 1024. **Se estiver errado:** o
  João prefere à esquerda, e é uma classe a reverter.
- **Revisão final, P-109: o piso do paginador é garantido pela posição depois do spread, sem `Omit`
  no tipo.** `DataTableProps` é uma união discriminada: o `Omit` a achata e quebra o `tsc`. **Se
  estiver errado:** um `paginatorTemplate` passado pelo chamador é ignorado em silêncio, e só o
  teste prende o comportamento.
- **Revisão final, minor 6 (uma lista com duas severidades sai sem receita, sem falhar alto):
  adiado para a próxima atualização do Lara, junto com o minor da mensagem imprecisa da lista
  mista.** Não ocorre no Lara 10.9.8 instalado. **Se estiver errado:** um Lara novo com uma lista
  dessas passa pelo gerador sem falhar alto.
- **Revisão final, minor residual da re-revisão (a linha de 768 do `prova.md` não distingue o
  alinhamento): estacionado.** A prova de alinhamento está nas linhas de 1024. **Se estiver
  errado:** nenhum, além de uma linha de prova pouco informativa.
- **Revisão final, minor 7 (o `COL.rut` da `StudentsTable` dá cerca de 110 a 123 px, menos que os
  133 px do RUT em mono): vira pendência nova no `/finalizar-bloco`, fora deste bloco.** **Se
  estiver errado:** o vazamento segue na tela de alunos até outro bloco pegá-lo.
