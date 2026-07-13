# Spec — Frontend do Comercial: Orçamentos & Cotações (Sprint 2 · Notion 6.2.1–6.2.4)

> O backend do Comercial (6.1.1–6.1.7) está fechado e mergeado: 110 testes, tipos
> `BudgetData`/`QuoteData`/`QuoteStatus`/`FileData` já em `shared/types/generated.ts`.
> Este ciclo é **frontend**, com um **delta de backend pequeno e fechado** (§ Delta de backend),
> exigido pelo protótipo e aprovado pelo João.

## Propósito

Dar interface ao núcleo comercial: listar orçamentos com status agregado e totais, abrir um
orçamento numa página de detalhe, criar cotação por wizard, aprovar/recusar cotação (superadmin) e
anexar documentos.

## Fonte de verdade

- Spec do backend: `docs/superpowers/specs/2026-07-10-sprint2-commercial-backend-design.md`.
- Contrato: `frontend/src/shared/types/generated.ts` (ADR-04 — gerado, nunca editado à mão).
- Protótipo Figma (prints de 2026-07-13): lista de orçamentos e detalhe do orçamento.
- Padrões vivos no repo: `CatalogPage`/`CourseDialog`, `CommercialPage`/`ClientDialog`.
- ADR-05 (feature não importa PrimeReact nem outra feature), ADR-18 (`createCrudResource` só em
  `shared/api`), ADR-15 (i18n nos 3 locales), ADR-17 (código de rastreio), ADR-02 (Actions/Services).

## Reconciliação protótipo × backend (decisões do João)

O protótipo é anterior ao backend e diverge dele em cinco pontos. Decidido:

| # | Protótipo | Decisão |
|---|---|---|
| 1 | Código `PRE-2026-018` | **Vence o backend:** `Scap {id}` / `Scap N - Cot M` (ADR-17, já commitado e testado). O protótipo era mock. |
| 2 | Estado "En ejecución" | **Cortado.** É estado de *turma* — nasce quando a Operação existir. A UI mostra os 3 estados reais: pendiente/aprobada/rechazada. |
| 3 | Cards "Total aprobado" / "Total rechazado" | **Entram** — somados no **backend** (delta abaixo). Somar UF em JS violaria a invariante do decimal (commit `1bcef7c`). |
| 4 | Modalidade (Presencial/Online) | **Cortada** desta sprint. Exige coluna nova em `quotes`. Backlog. |
| 5 | "Aceptación del cliente: registrada" | **Cortada.** O aceite já é `approved_at` + `purchase_order` (a OC é a referência formal). Backlog. |

## Delta de backend (pré-requisito da UI)

Escopo fechado, sem migration, sem mudança de rota:

1. `BudgetSummaryService` ganha `totalApprovedUf(Budget)` e `totalRejectedUf(Budget)` — mesma soma
   em **decimal (bcmath)** já usada por `totalValueUf`, filtrando por `QuoteStatus`. Somas sobre
   quotes ativas (soft-deletadas fora).
2. `BudgetData` expõe `total_approved_uf` e `total_rejected_uf` (strings, como os demais valores UF).
3. `FileData` ganha `created_at` (o protótipo mostra a data do documento na lista de anexos).
4. `typescript:transform` regenera `generated.ts` (ADR-04 — nunca à mão).
5. Testes: soma por status com mix de pendente/aprovada/recusada, e cotação soft-deletada fora de
   todas as somas.

Sem isso, os três cards e a data do anexo não têm de onde sair.

## Camada de dados (6.2.1)

### Leitura: uma fonte só

`BudgetData` **embute** `quotes: QuoteData[]` e `files: FileData[]` (o backend eager-loada
`['quotes.files', 'files']` em todos os call sites). Portanto:

- Lista = `budgetsApi.useList()` (`GET /budgets`). Detalhe = `budgetsApi.useOne(id)` (`GET /budgets/{id}`).
- **NÃO existe** hook de leitura de cotações. Um `useQuotes` que buscasse `GET /budgets/{b}/quotes`
  seria uma segunda cópia da verdade — e o `QuoteData` já vem dentro do `BudgetData`.

### Arquivos e responsabilidades

| Arquivo | Papel |
|---|---|
| `shared/api/budgetsApi.ts` | `createCrudResource<BudgetData>('budgets')` (ADR-18). |
| `features/commercial/api/useQuotes.ts` | **Só mutações** de cotação (padrão do `useCourseRedatores`). |
| `features/commercial/api/useCommercialFiles.ts` | Upload/remoção de anexo de orçamento e de cotação (multipart). |
| `features/commercial/lib/quoteStatus.ts` | `QuoteStatus` → severidade da `AppTag` + chave i18n. Espelha `identity/lib/redatorStatus.ts`. |

### Mutações de cotação (`useQuotes.ts`)

| Hook | Rota | Variáveis |
|---|---|---|
| `useCreateQuote` | `POST /api/budgets/{budgetId}/quotes` | `{ budgetId, payload }` |
| `useUpdateQuote` | `PUT /api/quotes/{quoteId}` | `{ quoteId, payload }` |
| `useRemoveQuote` | `DELETE /api/quotes/{quoteId}` | `quoteId` |
| `useApproveQuote` | `POST /api/quotes/{quoteId}/approve` | `quoteId` |
| `useRejectQuote` | `POST /api/quotes/{quoteId}/reject` | `quoteId` |

**Toda** mutação invalida `budgetsApi.keys.all` — o que repinta lista, detalhe, totais e status
agregado de uma vez, porque tudo desce do mesmo `BudgetData`.

### Anexos (`useCommercialFiles.ts`)

| Hook | Rota | `type` aceito |
|---|---|---|
| `useUploadBudgetFile` | `POST /api/budgets/{budgetId}/files` | `invoice`, `receipt` |
| `useRemoveBudgetFile` | `DELETE /api/budgets/{budgetId}/files/{fileId}` | — |
| `useUploadQuoteFile` | `POST /api/quotes/{quoteId}/files` | `quote_document` |
| `useRemoveQuoteFile` | `DELETE /api/quotes/{quoteId}/files/{fileId}` | — |

Payload = `FormData` com `type` e `file`. **Nunca** fixar `Content-Type`: o default foi removido de
`axios.ts` porque transformava todo `FormData` em JSON e o arquivo chegava vazio ao backend, com
201 silencioso (bug 3 da Sprint 1). Invalida `budgetsApi.keys.all`.

## Telas

### Aba "Orçamentos" na `CommercialPage` (6.2.2)

Substitui o `client.budgetsPlaceholder`. O botão do header passa a depender da aba ativa: Clientes →
"Nuevo cliente"; Orçamentos → "Nuevo presupuesto".

`Budget/BudgetsTable.tsx`, colunas conforme o protótipo: **código** (`Scap N`), **cliente** (nome
resolvido por `clientsApi.useList()` — já em `shared/api`, sem import cross-feature),
**cotizaciones** (contagem), **valor total** (`total_value_uf` + " UF"), **estado** (`AppTag`), e o
botão de olho que navega para o detalhe. Acima da tabela: busca por código/cliente + filtro de
status (`AppDropdown`, "Todos" + os 3 estados), ambos client-side. Rodapé: "N presupuestos".

`Budget/BudgetDialog.tsx` — dialog de **create/edit** apenas (form plano, como o do cliente):
cliente (`AppDropdown`) + forma de pagamento. Em edit, cliente e código são leitura (o backend só
deixa `payment_terms` mudar).

### Página de detalhe `/comercial/presupuestos/:id` (6.2.2 + 6.2.4)

Decisão do João: o detalhe é **página**, não dialog — o protótipo já o desenhou com "← Volver a
Comercial", e de dentro dele abrem outros dois overlays (wizard e confirmação), que empilhados sobre
um dialog quebram foco e acessibilidade.

`Budget/BudgetDetailPage.tsx`, alimentada por `budgetsApi.useOne(id)`:

- **Header:** voltar · código (`Scap N`) · cliente + RUT · `AppTag` do status agregado · botão
  "Agregar cotización".
- **Três cards:** Total cotizado (`total_value_uf`) · Total aprobado (`total_approved_uf`) · Total
  rechazado (`total_rejected_uf`). Todos vindos do servidor; a UI nunca soma UF.
- **Cotizaciones:** `Budget/QuotesList.tsx`.
- **Documentos:** `Budget/BudgetFiles.tsx` — upload (`AppFileUpload`) + lista (nome, data, tamanho,
  download via `download_url`, remover).

### `Budget/QuotesList.tsx` (6.2.2 + 6.2.4)

Um cartão por cotação, como no protótipo: nome do curso (via `coursesApi.useList()`), `AppTag` de
status, nº de alunos, período planejado, valor UF. Ações por linha, derivadas do estado real:

| Status | Ações oferecidas |
|---|---|
| `pending` | Aprobar · Rechazar · Editar · Eliminar |
| `rejected` | Aprobar · Editar (reabre como `pending`) · Eliminar |
| `approved` | Rechazar |

Cotação aprovada é **imutável** no backend (update e delete devolvem 422): a UI não oferece o
caminho morto — recusar é o único retorno, e fica auditado. A cotação recusada exibe a nota "no se
generará turma" do protótipo.

Aprobar/Rechazar só renderizam com `usePermissions().can('commercial.quote.approve')` (superadmin).
Isto é conveniência de interface, **não** segurança — a fronteira é o backend (ADR-07).

### `shared/ui/ConfirmDialog` (6.2.4)

Wrapper novo sobre `AppDialog`: título, mensagem, cancelar/confirmar com `loading`. Aprovar tem peso
legal (libera a turma na Operação) — não é clique de uma via só. Recusar também confirma (desfaz uma
aprovação).

### `Budget/QuoteWizard.tsx` (6.2.3)

Dialog próprio, 2 passos:

1. **Curso** — busca + seleção sobre `coursesApi.useList()`.
2. **Dados** — alunos, valor UF, ordem de compra, datas planejadas de início/fim.

Serve também a edição: abre no passo 2, com opção de voltar e trocar o curso (o backend aceita
`course_id` no update). `client_id` **não** entra no payload — vem do orçamento pai.

### Hooks

| Hook | Base |
|---|---|
| `useBudgetsPage` | `useCrudPage(budgetsApi)` — só a lista + o dialog de create/edit. |
| `useBudgetForm` | `useEntityForm` + `useMutationErrors`. |
| `useQuoteForm` | `useEntityForm` + estado do passo do wizard. |

## Invariantes

- **UF é string decimal ponta a ponta.** `value_uf`, `total_value_uf`, `total_approved_uf`,
  `total_rejected_uf` são `string`. A UI **nunca** faz `Number()` sobre eles e **nunca** soma —
  as somas vêm do `BudgetSummaryService` (bcmath). Dinheiro com peso legal não trafega por float.
- **Status do orçamento é derivado**, nunca editável.
- **ADR-05:** zero `primereact` fora de `shared/ui`; zero import cross-feature (inclusive de tipo).
- **ADR-04:** `generated.ts` só muda por `typescript:transform`.
- **RN-14 (financeiro não bloqueia):** anexo ausente nunca impede aprovar.
- **Nada falha em silêncio:** `useMutationErrors` + `UnmappedErrors` em todo formulário.

## Testes / DoD

Backend (delta): `docker compose exec -T app php artisan test` verde, incluindo os testes novos das
somas por status.

Frontend: sem test runner (CLAUDE.md §8) — por task, `pnpm build` + `pnpm lint` limpos.

**DoD real = comportamento provado contra a API real, no navegador:**

1. Criar orçamento → aparece na lista com `Scap N`, estado pendiente, totais zerados.
2. Criar cotação pelo wizard → contagem e totais do orçamento atualizam sem reload.
3. Aprovar como **superadmin** → tag muda, "Total aprobado" sobe, status agregado do orçamento vira
   aprobado, editar/eliminar somem da linha.
4. Como **admin**, aprobar/rechazar não existem na tela.
5. Recusar uma aprovada → volta a editável e "Total rechazado" sobe; editar uma recusada a reabre
   como pendiente.
6. Excluir orçamento com cotação aprovada → 422 **visível** na tela.
7. Anexar documento ao orçamento e à cotação → aparece com nome/data/tamanho e link de download;
   remover funciona. (O arquivo chega **não-vazio** — regressão do bug 3.)
8. Filtro de estado e busca da lista funcionam; troca de idioma traduz a tela inteira.

## Fora de escopo

- **Módulo Administração (2.4.2 / 2.4.3) — BLOQUEADO no backend.** Existe só o `SystemRoleGuard`
  (imutabilidade de role de sistema, task 2.3.3) e a permissão `identity.access.manage` semeada.
  Falta a API inteira: CRUD de usuário administrativo (com role e ativo/inativo), listagem de roles
  com suas permissions, catálogo de permissions e criação de role customizada. Os prints do
  protótipo (Usuarios / Roles y permisos) estão validados e servem ao ciclo seguinte, que precisa
  ser **backend primeiro**.
- Modalidade da cotação, campo de aceite do cliente, estado "En ejecución" (depende de Operação).
- Sequência anual `PRE-{ano}-{n}` no código do orçamento.
