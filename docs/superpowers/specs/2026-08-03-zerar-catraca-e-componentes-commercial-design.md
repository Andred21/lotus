# Spec — Zerar a catraca de query-em-componente + abstração de `commercial`

- **Work item:** `zerar-catraca-e-componentes-commercial` (item 4 do `backlog.md`)
- **Data:** 2026-08-03
- **Feature:** `commercial` (mais 1 arquivo de `catalog` e 2 de `identity`)
- **Context packet:** nenhum. A fonte é o código de `frontend/src/features/`, o
  `frontend/eslint.config.js` e o relatório do `/revisar-frontend` de `features/commercial`
  da sessão de 2026-08-03. Sem Drive/Notion/Figma.

## 1. Problema

Duas dívidas que se provam na mesma tela.

**A catraca.** O bloco `abstracao-componentes-operation` transformou "componente de feature é
declarativo" em mecanismo: `no-restricted-syntax` no `eslint.config.js` reprova `xxxApi.useAlgo()`
e `useQuery`/`useMutation` diretos sob `src/features/*/components/**`. A regra entrou com uma lista
de `ignores` com os 7 componentes legados que já a violavam, para o `pnpm lint` não quebrar na hora.
Enquanto a lista existir, a lei está desligada nesses 7 arquivos — e o lint verde afirma menos do
que parece.

**A estrutura de `commercial`.** O `/revisar-frontend` da feature devolveu, além dos 4 achados de
query-em-componente (C-1 a C-4), 6 achados estruturais (B-1 a B-6): uma constante duplicada entre
componente e hook, um diálogo de 199 linhas, e quatro blocos coesos presos dentro de `.map` ou de
ternário.

As duas metades tocam os mesmos 4 arquivos de `commercial`. Fazê-las em blocos separados
significaria provar as mesmas telas duas vezes.

## 2. Escopo

**Dentro:**

- Os 7 arquivos da lista de `ignores` saem dela, cada um no mesmo commit que move sua query para um
  hook da feature.
- O bloco `ignores` do `eslint.config.js` desaparece.
- As 6 extrações estruturais de `commercial` (B-1 a B-6).

**Fora:**

- **B-7** — `courses.data ?? []` no `QuoteWizard` faz um GET falho virar lista vazia sem mensagem, e
  `canAdvance` nunca liga. Corrigir **muda comportamento de propósito** e sairia do DoD "idêntico";
  registrado em §Débitos técnicos do `backlog.md` por decisão do João em 2026-08-03.
- Qualquer arquivo de `backend/`. Qualquer chave i18n nova. Qualquer mudança de schema, auth, RBAC,
  `generated.ts` ou cálculo de dinheiro.
- Reformatação do estilo divergente do `ClientDialog.tsx` (aspas duplas + `;`) fora dos trechos que
  o bloco reescreve.

## 3. Decisões

### D1 — Bloco 100% frontend, branch no main tree, sem worktree

`git diff --name-only main...HEAD -- backend/` vazio é critério de gate. Sem worktree: o DoD se
prova na tela contra o `docker compose` do main tree, e o bloco toca `eslint.config.js`, que vale
para o repositório inteiro. Mesmo molde dos dois blocos anteriores.

### D2 — Um hook por consumidor, exceto clientes em `commercial`

Em `commercial`, `clientsApi.useList` tem dois consumidores (`BudgetsTable`, `BudgetDialog`) cuja
derivação é o mesmo lookup sobre a mesma lista: vira **um** `useCommercialClients`. `coursesApi`
também tem dois (`QuoteWizard`, `QuotesList`), mas um precisa de estado de busca e o outro só de
lookup por id: ficam **separados**. Nas outras features cada query tem um único consumidor.

Molde do formato de retorno: `useRedatorCourses` (`identity`) — o hook não devolve o objeto de
query cru; devolve os campos derivados mais `isLoading`/`isError`/`errorDetail`/`refetch` conforme
o componente precise. Devolver a query inteira passaria o lint e desrespeitaria a razão dele.

### D3 — Hook expõe só o que o componente consome hoje

Nenhum campo que consumidor nenhum use. (`useCommercialClients` devolve `clientName` **e**
`clientOptions` porque cada um tem seu consumidor — D2; o proibido é campo que nenhuma tela lê.)
`useQuoteCourseSearch` e `useQuotesListCourses` **não** expõem `isError`: distinguir erro de vazio
ali é exatamente o B-7, que está fora do corte. API morta em hook novo é órfão parcial e mente
sobre o que a tela trata.

### D4 — `QuotesList` fatiado por responsabilidade, em dois hooks

`useQuoteFiles` (as duas mutations, `sizeError`, `upload`, `isUploading`) e `useQuotesListCourses`
(só `courseName`). Cada um tem uma razão de mudar; só o primeiro sabe de mutation. A alternativa de
subir os arquivos de cotação para `useBudgetDetail` foi descartada: engordaria um hook de 125 linhas
e faria a lista depender de quem a monta.

### D5 — Extrações de `commercial` são componentes locais da feature

`ClientGeneralFields`, `ContactCard`, `QuoteRow`, `CourseStep`, `DataStep` e `BudgetDocumentsCard`
nascem em `features/commercial/components/`, não em `shared/ui`: têm vocabulário de domínio
(cotação, contato, giro). Mesmo critério que manteve `RedatorIdentityFields` dentro de `identity`.

### D6 — Zerada a catraca, o bloco `ignores` sai do config

O bloco de regra fica com `files` + `rules`. Sai junto o comentário que explica a catraca ("a lista
só encolhe, não acrescente arquivo aqui"), porque não há mais lista; fica o comentário da lição 14,
que explica por que a regra existe. Um `ignores: []` inerte seria convite a repovoar.

### D7 — Checkpoints por feature, não por metade

CP-1 cobre as 4 telas de `commercial` **já com catraca e estrutura aplicadas**; CP-2 cobre os 3
diálogos de fora, que só recebem catraca. Provar a catraca de `commercial` antes de a metade 2
reescrever o markup dessas mesmas telas invalidaria a aprovação — foi o que aconteceu no bloco do
redator, onde a prova teve de ser refeita.

### D8 — Sem baseline de screenshot

A sessão não tem ferramenta de browser/screenshot, mesma limitação declarada nos dois blocos
anteriores. A prova visual é comparação ao vivo feita pelo João nos dois checkpoints, sem baseline
capturada. Limitação declarada, não escolhida por heurística do executor.

### D9 — Arquivos novos seguem o estilo dominante do repo

Aspas simples, sem ponto e vírgula. O `ClientDialog.tsx` hoje diverge (aspas duplas + `;`); o que
sobra dele depois do corte fica como está. Reformatar o arquivo inteiro esconderia o refactor dentro
de um diff de estilo.

## 4. Metade 1 — a catraca

Cada linha da tabela é um arquivo que sai de `ignores` no **mesmo commit** do hook que o liberta.

| Hook novo | Consumidor | Contrato |
|---|---|---|
| `commercial/hooks/useCommercialClients.ts` | `BudgetsTable`, `BudgetDialog` | `clientName(id)`, `clientOptions`, `isLoading`, `loadError`, `refetch` |
| `commercial/hooks/useQuoteCourseSearch.ts` | `QuoteWizard` | `list`, `search`, `setSearch` |
| `commercial/hooks/useQuotesListCourses.ts` | `QuotesList` | `courseName(id)` |
| `commercial/hooks/useQuoteFiles.ts` | `QuotesList` | `upload(quoteId, e)`, `remove(quoteId, fileId)`, `isUploading(quoteId)`, `fileError`, `sizeError`, `setSizeError` |
| `catalog/hooks/useCourseRedatores.ts` | `CourseDialog` | `isLoading`, `isError`, `errorDetail`, `refetch`, `allRedatores`, `enabledRedatores` |
| `identity/hooks/useStaffRoleOptions.ts` | `StaffUserDialog` | `roleOptions` |
| `identity/hooks/useStudentClients.ts` | `StudentDialog` | `options`, `unusable`, `isError`, `errorDetail`, `showEmptyHint`, `refetch` |

**Invariantes de comportamento** — cada uma nasceu de uma decisão anterior registrada no código, e
quebrá-la é regressão silenciosa:

1. `useStudentClients(mode)` mantém `clientsApi.useList({ enabled: mode === 'create' })`. View/edit
   continuam sem chamada extra (leem `current_client_name`).
2. `unusable` continua `mode === 'create' && !clients.data?.length` — `[]` é truthy, checar só
   `!data` deixaria passar "nenhum cliente para escolher".
3. `showEmptyHint` continua `!isError && isSuccess && data.length === 0`; a mensagem de erro e a de
   lista vazia são distintas e ambas têm botão Reintentar.
4. `useCommercialClients.loadError` devolve `isError ? (error ?? {}) : null`. O merge com o erro que
   chega por prop fica no `BudgetsTable` (`error ?? clients.loadError`) — derivação pura, sem query.
   O `retry` da tabela continua chamando `onRetry?.()` **e** o `refetch` de clientes.
5. `useQuoteFiles.upload` zera `sizeError` antes de disparar a mutation (molde
   `useImportStudentsFlow`), e mantém `onSuccess: () => e.options.clear()`.
6. `isUploading(quoteId)` é o `uploadFile.isPending && uploadFile.variables?.quoteId === quoteId` de
   hoje — o `disabled` é por linha, não global.
7. `useCourseRedatores` preserva os 3 estados distintos do `CourseDialog` (loading, erro com
   Reintentar, lista) — a decisão D11 do bloco de cards existe porque `?? []` fazia um 403 virar
   "curso sem redatores".
8. `useStaffRoleOptions` mantém o filtro `r.name !== 'redator'` (RN-01: redator tem tela própria).
9. `useQuoteCourseSearch` mantém o filtro case-insensitive com `search.trim()` e o `?? []` de hoje.

## 5. Metade 2 — a estrutura de `commercial`

| # | Achado | Entrega |
|---|---|---|
| B-1 | `EMPTY_ADDRESS` duplicado entre `ClientDialog.tsx:24` e `useClientForm.ts:8` | A constante do componente morre; `useClientForm` passa a devolver `addr` já resolvido (`form.addresses[0] ?? EMPTY_ADDRESS`) |
| B-2 | `ClientDialog` com 199 linhas | `ClientGeneralFields` (razón social, RUT, email, tipo, giro) — o diálogo cai para ~110 linhas |
| B-3 | Corpo do `.map` de `ContactFields` | `ContactCard` |
| B-4 | Corpo do `.map` de `QuotesList` | `QuoteRow` |
| B-5 | Ternário de passo do `QuoteWizard` | `CourseStep` + `DataStep` |
| B-6 | Card de documentos dentro do `BudgetDetailPage` | `BudgetDocumentsCard` |

O `AppPhotoField` continua no `ClientDialog`: quem o alimenta é o `useEntityPhoto` do próprio
diálogo, e empurrá-lo para dentro de `ClientGeneralFields` obrigaria a repassar 8 props de foto por
um componente que é sobre campos de texto.

Extração é movimento literal de markup: nenhuma condicional muda de forma, nenhum `key` muda de
critério (as listas nested continuam com `key={i}` — replace-total do backend, rule
`frontend-fsliced.md`).

## 6. Plano de execução (11 tasks, 2 checkpoints)

```
T1  useCommercialClients + BudgetsTable + BudgetDialog      2 arquivos fora de ignores
T2  useQuoteCourseSearch + QuoteWizard                      3 fora
T3  useQuoteFiles + useQuotesListCourses + QuotesList       4 fora
T4  useClientForm devolve addr; EMPTY_ADDRESS do componente morre
T5  ClientGeneralFields + ContactCard
T6  QuoteRow + CourseStep/DataStep + BudgetDocumentsCard
    >>> CP-1 — 4 telas de commercial, estado final
T7  useCourseRedatores + CourseDialog                       5 fora
T8  useStaffRoleOptions + StaffUserDialog                   6 fora
T9  useStudentClients + StudentDialog                       7 fora
    >>> CP-2 — 3 diálogos
T10 bloco `ignores` removido do eslint.config.js + texto correspondente na rule
T11 gate
```

## 7. Critérios de aceite (DoD)

**Comportamento — provado na tela pelo João, não por build verde.**

CP-1, `commercial`:

1. **Presupuestos (lista)** — busca por código e por nome de cliente; filtro de estado; contagem no
   rodapé; empty state de busca vs. empty state de lista vazia; com a API de clientes derrubada, a
   tabela mostra erro com Reintentar (não `—` silencioso na coluna Cliente).
2. **Diálogo de orçamento** — create com dropdown de cliente populado; edit com cliente travado e
   só `payment_terms` editável.
3. **Detalhe do orçamento** — cotações listadas com nome do curso, estado, valor UF; aprovar/
   rejeitar/editar/excluir; upload de documento por cotação com o botão desabilitado só na linha em
   voo; arquivo acima do teto mostra o erro de tamanho; card de documentos do orçamento com tipo,
   upload e remoção.
4. **Diálogo de cliente** — create, view e edit; endereço; contatos (adicionar, remover, marcar
   principal, último contato com lixeira desabilitada); foto.

CP-2, fora de `commercial`:

5. **Diálogo de curso** — os 3 estados da seção de redatores (loading, erro com Reintentar, lista);
   create com cards selecionáveis; view/edit somente leitura com o botão-olho.
6. **Diálogo de admin** — dropdown de rol sem `redator` na lista.
7. **Diálogo de aluno** — create com dropdown de clientes; erro de GET de clientes com Reintentar;
   lista vazia com a mensagem própria; view/edit sem chamada de clientes e com
   `current_client_name`.

**Gate automatizado:**

8. `pnpm build` e `pnpm lint` verdes.
9. `grep -n "ignores" frontend/eslint.config.js` devolve **apenas** o `globalIgnores` de
   `dist`/`generated.ts`.
10. `grep -rE "use(Query|Mutation)\b|Api\.use" frontend/src/features/*/components/` sem saída. O `\b`
    é deliberado e espelha o `$` da regex do lint: `useMutationErrors` **continua permitido** em
    componente (é consumo de erro, não busca de dado), e um grep que o reprovasse seria mais
    estrito que a lei que ele existe para provar. Hoje esse grep devolve exatamente as 7 linhas da
    catraca — ao fim do bloco, nenhuma.
11. `git diff --name-only main...HEAD -- backend/` vazio.
12. `git diff --name-only main...HEAD -- frontend/src/shared/config/locales/` vazio (zero chave
    i18n nova) e `frontend/src/shared/types/generated.ts` sem diff.
13. Nenhum hook novo órfão: cada um com pelo menos um consumidor.
14. Suíte backend como regressão: **372 passed (1360 assertions)**, igual à baseline.
15. Pint: n/a se o diff não tiver arquivo de `backend/` (esperado, D1).

## 8. Riscos

- **Extração que muda comportamento sem parecer.** Foi o Q-2 do bloco do redator: recortar markup
  para outro arquivo e deixar a condicional pela metade. Mitigação: cada task de extração compara o
  markup movido linha a linha com o original antes do commit, e o CP-1 cobre as 4 telas no estado
  final.
- **Hook que "melhora" o que devia só mudar de lugar.** A tentação em `useQuoteCourseSearch` e
  `useQuotesListCourses` é expor `isError` e tratar o vazio — isso é o B-7, fora do corte (D3).
- **Prova visual sem baseline** (D8): a comparação depende da memória da tela anterior. Mitigação
  parcial: os dois checkpoints acontecem com as telas em estado final, sem reescrita posterior de
  markup — se algo mudar depois de um CP, esse CP é refeito.
