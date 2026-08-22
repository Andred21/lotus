# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-40 — o ramo "catálogo genuinamente vazio" não foi remedido contra HEAD

**Bloco:** BD-12 · **Gatilho:** fecha quando um bloco puder esvaziar o catálogo de dev sem tinker
bloqueado — seeder de cenário, endpoint de teste ou o João rodando o comando —, ou quando o
ambiente nascer com catálogo vazio por outro motivo e a tela puder ser medida de graça. Revisar em
**2026-10-31**.

O ramo foi medido ao vivo **em `d20bebc`** e não depois dos cinco commits de correção que fecharam o
review do BD-6.

A Prova B (Task 6, passo 7 do plano) rodou na execução: soft-delete dos 4 cursos, tela dizendo "No
hay cursos." **e não** a mensagem de falha, restauração conferida (`vivos=4 trashed=0` antes e
depois). No `/fechar-sprint` (2026-08-14) as outras provas foram **refeitas** contra HEAD, porque
`501d98c`, `08cb01a`, `baf08e9`, `1ba7dbb` e `4c7b61b` mexeram exatamente no ramo de falha — e esta
não pôde: o `php artisan tinker --execute` foi recusado pelo classificador de auto mode, e **não há
substituto pela API** (o índice de cursos não aceita filtro e o wizard filtra client-side,
`frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts:15`, então 200 vazio legítimo não se
produz sem fabricar resposta). Decisão do João no fechamento: fechar com a pendência em vez de
segurar o bloco.

**O que substitui a remedição é leitura de código, não outra medição:** o predicado mudou de casa
sem mudar de forma (`!isError && isSuccess && data.length === 0`, hoje em
`frontend/src/shared/hooks/useLoadState.ts:32`) e o ramo `if (courses.isEmpty)` do `CourseStep` está
byte a byte igual ao que foi medido — o que os commits trocaram foi o gate ANTERIOR (`isError` →
`failedWithoutData`), que não dispara quando não há erro. Mais os dois testes que afirmam a
separação (`CourseStep.test.tsx:76` e `:51`). É argumento, e argumento é o que o item 0 do gate não
aceita no lugar de prova.

**ENCERRADA em 2026-08-22, no `bd12-load-state-e-listas`.** O gatilho venceu pela porta que não
existia em 2026-08-14: `DELETE /api/courses/{course}` e `POST /api/courses/{course}/restore` nasceram
em 2026-08-18, no `arquivados-e-restauracao`, e arquivam curso de forma reversível — o catálogo de
dev se esvazia e volta sem tinker e sem fabricar resposta.

**Remedido contra HEAD, com o BD-18 dentro da árvore** (o merge de 2026-08-22 trouxe o
`ca096650`, que reescreveu a mensagem de falha que este ramo tem de NÃO mostrar): com
`GET /api/courses` devolvendo **200 e `[]`**, o passo 1 do wizard mostrou o título `Curso` e
**`No hay cursos.`**; `No se pudieron cargar los datos` e `Reintentar` não apareceram na tela, o
campo de busca não nasceu e `Siguiente` ficou desabilitado. Controles positivos nos dois lados: o
mesmo wizard listando os cursos antes de esvaziar e depois de restaurar.

**Catálogo devolvido:** ids `[1,2,3]` antes e depois, `IDENTICO`; o único arquivado que sobra é o
`GATE T7` de 2026-08-18, anterior ao bloco. Os três `DELETE` saíram pela ação `Archivar` da linha,
no navegador, porque o classificador de auto mode recusou o laço de `curl -X DELETE` — a mesma
recusa que congelou a ficha em 2026-08-14, agora contornada pelo caminho que o usuário usa.

---

## Rastro anterior, já removido

A **P-29** (corrida de unicidade entre transações subindo 500) e a **P-35** (o ADR-17 defendido em
duas profundidades) foram encerradas em 2026-08-20, no `bd14-contrato-de-entrada`, e saíram aqui, no
fechamento do `bd12-load-state-e-listas` (2026-08-22) — o primeiro **posterior** ao do BD-14, que é o
que a linha do índice pedia. A **P-36** (catraca `COR_HARDCODED` cega para `style={{ }}`) e a
**P-37** (`FormField` sem `htmlFor`) foram encerradas em 2026-08-18 e saíram no fechamento do
`bd13-listagens-e-abas`. A **P-45** (o `TestCase` lendo `FRONTEND_URL` cru) saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19). O rastro durável de todas está nos commits (`8ffdefa`,
`efd5bfe`, `0672019`, `2ad35d7` e `6fd0ad8`) e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
