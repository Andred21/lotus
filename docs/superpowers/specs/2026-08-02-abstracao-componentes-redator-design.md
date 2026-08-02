# Spec — Abstração de componentes do Redator

- **Work item:** `abstracao-componentes-redator`
- **Data:** 2026-08-02
- **Origem:** item 4 de `docs/superpowers/backlog.md`, aberto pelo `/revisar-frontend` de
  `features/identity` em 2026-08-02
- **Context packet:** nenhum — a fonte é o código do repositório e o relatório do
  `/revisar-frontend` da mesma sessão. Sem dependência de Drive, Notion ou Figma.

## 1. Problema

`RedatorDialog.tsx` tem **448 linhas** e quatro responsabilidades no mesmo arquivo: formulário de
usuário, foto, gestão de documentos (3 modos × 4 tipos) e seleção de cursos (5 estados). A régua da
`.claude/rules/frontend-fsliced.md` é ~150 linhas e "componente de feature = declarativo".

Dois pontos concentram o problema, e nos dois a lógica está **dentro do `return`**:

- O corpo do `.map` de documento (linhas 215-386) deriva `doc`/`staged`/`st` no JSX e desce em três
  ternários de modo aninhados, cada um com sub-ternário documento-existe/não-existe: **seis caminhos
  de render numa expressão**.
- O bloco de cursos (linhas 393-444) é uma cadeia de **cinco ramos** aninhados
  (`isLoading : isError : vazio : readOnly ? (vazio : lista) : lista`).

Em volta disso há duplicação medida em três arquivos de três features:

| Duplicação | Ocorrências | Onde |
|---|---|---|
| `useState` de preview + montagem do `AppFilePreviewDialog` | 3 idênticas | `RedatorDialog:85,387` · `DocumentTypeCard:27,104` · `FileList:8,57` |
| Bloco de ações olho + baixar (+ lixeira condicional) | 4 blocos, 3 arquivos | `RedatorDialog:284-299` e `:319-361` · `DocumentTypeCard:72-94` · `FileList:30-49` |
| Mapa de severidade da idoneidade | 3 cópias | `RedatoresTable:11` · ternário inline em `RedatorDialog:138-142` · `catalog/RedatorCard:8` |

A terceira é a mais perigosa das três: o comentário do próprio `RedatorCard.tsx:6` pede que não se
invente uma segunda convenção de cor para o mesmo conceito (spec D5 do bloco de cards) — e já
existem três.

## 2. Escopo

Bloco **100% frontend**. Nenhuma migration, nenhum DTO, nenhuma rota, nenhuma mudança de regra de
negócio, nenhum arquivo de `backend/`. `generated.ts` não é tocado.

Refatoração: o comportamento observável permanece o mesmo, com **uma** exceção declarada em D7.

**Fora de escopo, declarado:**

- `AppFileList` / `AppDocumentSlot` — avaliados e recusados, ver D1.
- Os outros cinco diálogos do débito "Cor fora do corte do D18"; só o slot de documento do redator
  muda de cor, por consequência de D7.
- `PersonFields` (extrair `name`/`rut`/`email`/`phone` dos três diálogos) — analisado e descartado no
  `/revisar-frontend`: os grids de Redator, Aluno e Staff divergem de propósito, e um componente
  único mudaria o que três telas renderizam. Não reabrir sem motivo novo.
- Introduzir test runner no frontend (Vitest) — decisão de stack, exige ADR e backlog próprio.
- A **estrutura** das telas de `operation` e `commercial`: elas trocam o bloco de ações e o estado de
  preview, nada mais.

## 3. Restrições que moldam o desenho

| # | Restrição | Origem |
|---|---|---|
| R1 | Feature não importa outra feature, nem para tipo | `CLAUDE.md` §5.6 · ADR-05 |
| R2 | Feature não importa PrimeReact direto — só via `shared/ui` | `CLAUDE.md` §5.6 |
| R3 | `shared/ui` não carrega regra de domínio | `.claude/rules/frontend-fsliced.md` |
| R4 | Tailwind é layout; cor vem de variável CSS do tema | ADR-16 |
| R5 | Componente de feature é declarativo; estado e derivação vão para hook da feature | `.claude/rules/frontend-fsliced.md` |
| R6 | `forwardRef` no wrapper é condicional, não cerimônia | `.claude/rules/frontend-fsliced.md` |
| R7 | Não criar estrutura especulativa; criar quando o uso chega | Lição 3 (`docs/README.md`) |
| R8 | DoD é critério de aceite provado, não build verde | `CLAUDE.md` §5.8 · Lição 1 |

R1 é o que impede a saída óbvia: `operation/Document/DocumentTypeCard.tsx` já resolve um problema
quase igual ao slot do redator, e `identity` **não pode importá-lo**.

## 4. A decisão anterior que este bloco não revoga

> **Convenção de numeração desta seção:** as decisões da spec de upload
> (`2026-07-31-hardening-upload-visualizacao-arquivos-design.md`) são citadas como **`D8-upload`** e
> **`D9-upload`** para não colidirem com o `D8` e o `D9` **desta** spec, que são outra coisa. Toda
> referência sem sufixo é decisão deste bloco.

A spec de upload já enfrentou esta questão:

> **D8-upload — Compartilhar a linha e o viewer, não a lista inteira.** As três telas não são a mesma
> lista: a turma é checklist por tipo de documento, o redator é slot por tipo com upload em stage, o
> comercial é lista plana. Um `AppFileList` que absorvesse as três viraria configurável demais, que é
> o oposto de compartilhado. Vão para `shared/ui` a linha (`AppFileRow`) e o diálogo de
> pré-visualização (`AppFilePreviewDialog`); a estrutura de cada tela permanece.

O `/revisar-frontend` de 2026-08-02 propôs exatamente o `AppFileList` que o `D8-upload` rejeitou,
**sem ter lido o `D8-upload`**. Ao desenhar o contrato, a previsão dele se cumpriu: o
`AppDocumentSlot` precisaria de catorze props (`title`, `status`, `files`, `emptyLabel`, `onUpload?`,
`uploading?`, `uploadDisabled?`, `accept?`, `chooseOptions?`, `onRemove?`, `removing?`,
`onSizeReject`, `hint?`, `extraActions?`), das quais cerca de seis existiriam só para um consumidor
diferir do outro.

Nada mudou no código desde 2026-07-31 que justifique revogar o `D8-upload`. **Ele permanece em
vigor**, e este bloco se desenha dentro dele.

## 5. Decisões

- **D1 — Não nasce `AppFileList` nem `AppDocumentSlot`; o `D8-upload` é honrado.** A estrutura de cada
  uma das três telas continua na tela. O que sobe para `shared/` é o que o `D8-upload` já autorizava
  como família — a linha e o viewer — na fatia que ficou repetida depois dele: as **ações** da linha
  e o **estado** do preview.

- **D2 — `useFilePreview` em `shared/hooks/`.** Hook genérico em `T extends PreviewableFile`,
  devolvendo `{ file, visible, open, close }`. Mata as três cópias idênticas de
  `useState<T | null>` + `visible={preview !== null}` + `onHide={() => setPreview(null)}`. Fica em
  `shared/hooks/` junto de `useCrudPage`/`useEntityForm`/`useTableFilter`, não em `shared/ui`, porque
  é estado, não apresentação.

- **D3 — `AppFileActions` em `shared/ui/`, com ordem fixa e `children` no meio.** Genérico em
  `T extends PreviewableFile`. Renderiza olho → baixar → `children` → lixeira. `onRemove` ausente
  significa sem lixeira. Sem `forwardRef` (R6): é apresentacional sem ref de DOM útil, mesma
  categoria de `AppButton`/`AppTag`.

  O `children` existe por **um** caso concreto, não por generalidade especulativa (R7): o modo `edit`
  do redator tem um botão de *substituir* entre baixar e excluir. Sem o slot, o redator não caberia
  no componente.

- **D4 — `AppFileActions` padroniza o conjunto sem tirar a escolha do chamador.** `AppFileRow.actions`
  é `ReactNode` de propósito — *"O chamador decide quais existem"* (`AppFileRow.tsx:32`). Continua
  verdade: quem monta `AppFileActions` é o chamador, e o `create` do redator **não** o usa. Arquivo
  em stage é um `File` do browser, sem `download_url`: não há o que pré-visualizar nem baixar, então
  aquela linha renderiza só a lixeira de *unstage*, como hoje. Registrado explicitamente para que
  esta decisão não repita, em escala menor, o erro que o `D8-upload` já tinha antecipado: subir para
  `shared/ui` algo que só serve configurando-o consumidor a consumidor.

- **D5 — O `RedatorDialog` é cortado em três subcomponentes locais de `identity`, não em
  `shared/ui`.** `RedatorDocumentSlot` (um tipo, três modos), `RedatorCourseSelector` (os cinco
  estados) e `RedatorIdentityFields` (o grid 2×2). São composição de feature com vocabulário de
  domínio — não cabem em `shared/ui` por R3. Nos três, o ternário aninhado vira guarda sequencial
  acima do `return`.

- **D6 — `sizeError` e `preview` continuam elevados no `RedatorDialog`.** Hoje há **uma** mensagem de
  erro de tamanho acima da lista dos quatro tipos e **um** `AppFilePreviewDialog`. Descer qualquer um
  dos dois para dentro do slot moveria a mensagem de lugar e montaria quatro diálogos. O slot recebe
  `onSizeReject` e `onPreview` por prop.

- **D7 — A borda do slot do redator passa a usar `var(--surface-border)`. É a única mudança de pixel
  do bloco.** Hoje é `border-slate-200 dark:border-slate-700`, cor Tailwind hardcoded, que é o débito
  "Cor fora do corte do D18" registrado no backlog; `operation` já usa a variável do tema. Adotar a
  variável fecha uma fatia do débito e alinha com R4. Muda o tom da borda no diálogo do redator —
  **mudança declarada e provada na tela, não regressão silenciosa.**

- **D8 — Os mapas de severidade sobem para `shared/lib/redatorStatus.ts`.** `IDONEIDADE_SEVERITY` e
  `DOC_STATUS_SEVERITY` passam a morar ao lado de `idoneidade()` e `docStatus()`, que já estão lá.
  Três chamadores atualizados. É o lugar que o comentário do `RedatorCard.tsx:6` já pedia.

- **D9 — `DOC_TYPES` e `DocType` sobem para `shared/lib`; `stagedDocs` fecha o tipo.**
  `Record<string, File>` vira `Partial<Record<DocType, File>>` em `useRedatorForm`. Os tipos de
  documento são vocabulário do backend, não constante de componente.

- **D10 — `aria-label` nos botões de download deixa de ser opcional.** Hoje `operation` e
  `commercial` põem, o redator não. Como o `AppFileActions` passa a renderizar os três botões, o
  rótulo acessível vem junto e a inconsistência morre nos três consumidores de uma vez.

- **D11 — Baseline de screenshots antes de qualquer corte.** É a Task 1 do plano. Refatoração cujo
  critério é "nada mudou" não se prova de memória: sem referência capturada antes, a comparação final
  é contra a lembrança da tela de ontem, e diferença sutil de espaçamento ou de ordem de botão passa.

- **D12 — Branch no main tree, sem worktree.** Decisão do João em 2026-08-02, **divergindo do
  precedente** de `cards-relacao-curso-redator` (que foi em worktree). O motivo é o DoD: este bloco se
  prova exclusivamente na tela, e o worktree custaria `pnpm install` próprio mais um segundo dev
  server, enquanto o compose (`nginx`/`app`/`minio`) e a URL de trabalho apontam para o main tree.
  Isolar sairia mais caro que o benefício num refactor que não toca `backend/`.

  **Consequência que o plano tem que carregar:** sem o isolamento do worktree, a disciplina git do
  `/executar-bloco` no main tree passa a valer integralmente — `git status` antes de cada task,
  `git add` só nos paths exatos da task, e `git diff <arquivo>` antes de editar arquivo sujo. A
  lição 9 é explícita: o João edita o working tree **ao vivo** durante a execução, e o WIP dele é
  intocável. Branch dedicada a partir do `main`, nunca commit direto no `main`.

## 6. Arquivos

**Novos**

| Path | Conteúdo |
|---|---|
| `frontend/src/shared/hooks/useFilePreview.ts` | D2 |
| `frontend/src/shared/ui/AppFileActions/AppFileActions.tsx` + `index.ts` | D3 |
| `frontend/src/features/identity/components/Redator/RedatorDocumentSlot.tsx` | D5 |
| `frontend/src/features/identity/components/Redator/RedatorCourseSelector.tsx` | D5 |
| `frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx` | D5 |

**Modificados**

| Path | Mudança |
|---|---|
| `frontend/src/shared/ui/index.ts` | barrel: exporta `AppFileActions` + `AppFileActionsProps` |
| `frontend/src/shared/hooks/index.ts` | barrel: exporta `useFilePreview` |
| `frontend/src/shared/lib/redatorStatus.ts` | D8, D9 |
| `frontend/src/features/identity/components/Redator/RedatorDialog.tsx` | 448 → ~185 linhas |
| `frontend/src/features/identity/components/Redator/RedatoresTable.tsx` | usa `IDONEIDADE_SEVERITY` |
| `frontend/src/features/identity/hooks/useRedatorForm.ts` | `stagedDocs` fecha o tipo (D9) |
| `frontend/src/features/catalog/components/Course/RedatorCard.tsx` | usa `IDONEIDADE_SEVERITY` |
| `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx` | adota `AppFileActions` + `useFilePreview` |
| `frontend/src/features/commercial/components/Budget/FileList.tsx` | adota `AppFileActions` + `useFilePreview` |

O `RedatorDialog` fica em **~185 linhas**, não nas ~110 estimadas no relatório do `/revisar-frontend`
— aquela conta não somou o JSX de chamada que volta. O resto é irredutível sem inventar abstração
nova: `CrudDialog`, `headerExtra` de idoneidade, campo de foto, quatro `FormSection` e os banners de
erro.

## 7. Definition of Done

Comportamento idêntico ao de hoje em tudo, exceto D7 e D10. Build verde **não** é aceite (R8).

1. **Baseline capturada antes do corte** (D11) e comparação lado a lado no fim, nos dois temas:
   redator `create` / `view` / `edit`, cada um com e sem documento carregado; aba de documentos de
   turma (`operation`); lista de arquivos de orçamento (`commercial`).
2. **Redator `create`:** escolher arquivo em cada um dos 4 tipos mantém o arquivo em stage (sem
   requisição), a lixeira remove do stage, e o submit sobe tudo num único POST multipart.
3. **Redator `edit`:** upload substitui o documento pelo endpoint aninhado; a lixeira remove; o botão
   de substituir continua **entre** baixar e excluir.
4. **Redator `view`:** só olho e baixar; nenhuma ação de escrita aparece.
5. **Preview:** abre imagem e PDF inline nos três consumidores; formato sem preview mostra o fallback
   com o botão de baixar (`D9-upload`, preservado).
6. **Erro de tamanho** continua aparecendo numa única mensagem **acima** da lista dos quatro tipos
   (D6), não dentro do slot.
7. **Cursos:** os cinco estados seguem distinguíveis — carregando, erro com "Reintentar", vazio de
   verdade, `readOnly` sem cursos, e seleção com a ordem congelada na abertura.
8. **D7 provado na tela:** a borda do slot do redator acompanha o tema nos dois modos.
9. `pnpm build` + `pnpm lint` verdes.
10. Greps da lei §5.6 sem saída: nenhum import cruzado entre features, nenhum `primereact` direto em
    `features/`.
11. Se alguma chave i18n for acrescentada, paridade nas três locales. As usadas por `AppFileActions`
    (`common.preview`, `common.download`) já existem.

## 8. Riscos

- **Refatoração sem test runner.** O único guarda-corpo é a baseline de D11 mais a prova visual. É a
  razão de D11 ser a Task 1 e não um passo do gate final.
- **Toca três features.** Um erro no `AppFileActions` aparece em `identity`, `operation` e
  `commercial` ao mesmo tempo. Mitigação: o componente é pequeno, sem estado, e a ordem dos botões é
  fixa por contrato.
- **Documento tem peso legal.** O bloco mexe no caminho de upload, substituição e exclusão de
  documento de redator. Um botão que suma ou troque de ação é falha silenciosa — daí os critérios 2,
  3 e 4 do DoD serem por modo, e não um "documentos funcionam".
- **A régua de ~150 linhas não é atingida** (~185). Aceito conscientemente: forçar o resto para baixo
  exigiria abstração sem uso repetido, contra R7.
