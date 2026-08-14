# Spec — Falha que se disfarça de lista vazia (BD-6)

- **Work item:** `falha-vs-lista-vazia`
- **Origem:** `backlog.md` §"BD-6 · Falha que se disfarça de lista vazia", cobrindo o débito **B-7**
- **Data:** 2026-08-14
- **Branch:** `feat/falha-vs-lista-vazia`, criada de `0a1439f` (main), main tree
  `/home/jvbat/projetos/lotus`
- **Context Packet:** `null` — ausência de fonte externa **medida**, não presumida (§1.1)
- **Risco de review:** BAIXO (§9)

## 1. Problema

Um GET que falha e é absorvido por `?? []` ou `?? '—'` faz a tela **afirmar algo falso**: "não há
cursos" onde houve 403, "sem nome de curso" onde houve queda de rede. É a D16/D11 outra vez, agora em
`commercial`. O bloco **muda comportamento de propósito** — nenhum DoD de "comportamento idêntico"
cabe aqui, que é exatamente por que o João o manteve fora do bloco de origem.

### 1.1 Ausência de fonte externa, medida

Grep por `drive.google`, `notion.so`, `figma.com`, `docs.google` e `http` nas 15 linhas do BD-6
(`backlog.md:73-87`) devolve **zero ocorrência**. As fontes são o repositório e o texto do backlog,
que já traz os paths e a atualização de referência de 2026-08-10. Por isso o `context_packet` fica
`null` e a rota foi direto a `ready_for_planning` — decisão do João no gate.

### 1.2 O que a medição achou que o backlog não tinha

Quatro fatos, e dois deles mudam o que o bloco é:

1. **O terceiro sítio escrito no backlog está vencido.** `useCommercialClients.clientName`
   (`useCommercialClients.ts:19`) tem **um** consumidor: `BudgetsTable`, que já agrega
   `clients.loadError` e onde **erro vence vazio** (`BudgetsTable.tsx:35`, `AppDataTable` D16). Com o
   GET falho o `'—'` **não chega a renderizar**. Ele só aparece com GET bem-sucedido e id fora da
   lista — isso é dado, não falha.
2. **O disfarce vivo daquele hook é outro:** `clientOptions` no `BudgetDialog.tsx:22` — GET de
   clientes falho rende dropdown **vazio**, sem motivo e sem Reintentar, na criação de orçamento.
3. **O molde pronto existe, um módulo ao lado, sobre a mesma query.** `useRedatorCourses` +
   `RedatorCourseSelector` fazem os cinco estados sobre `coursesApi.useList()` e citam a **D11**
   nominalmente; `useStudentClients` + `StudentClientField` fazem a versão de dropdown de form. Nada
   aqui é padrão novo — é padrão já decidido, aplicado onde faltou.
4. **O runner cobre `features`, não só `shared/`.** `vite.config.ts:26` inclui
   `src/**/*.test.{ts,tsx}`, e `BudgetDetailPage.test.tsx` já testa **ramo a ramo** com o hook
   mockado. Um bloco que muda comportamento de propósito pode — e vai — provar o comportamento em
   teste, não só no navegador.

## 2. Escopo

Três sítios, um retrofit, e um caso medido como inalcançável.

| Sítio | Defeito hoje | Arquivo |
|---|---|---|
| A · passo 1 do wizard de cotação | `?? []`: GET falho = passo sem curso, sem mensagem, `canAdvance` nunca liga | `useQuoteCourseSearch.ts:14`, `CourseStep.tsx` |
| B · nomes de curso da lista de cotações | `?? '—'`: GET falho = todo nome vira `—`, em silêncio | `useQuotesListCourses.ts:10`, `QuotesList.tsx` |
| C · dropdown de cliente do orçamento | GET falho = dropdown vazio, sem motivo | `useCommercialClients.ts:20`, `BudgetDialog.tsx:22` |

**Retrofit:** `StudentClientField` passa a consumir o componente extraído (§4).

**Fora, por medição (D1):** o `?? '—'` de `clientName` fica como está — sob falha ele é inalcançável
(§1.2.1). O `backlog.md` recebe a correção da redação vencida no fechamento, não agora (regra: não
remover nem promover item do backlog durante planejamento).

**Fora, por inalcançabilidade medida:** `BudgetDialog` em `edit` mostra o cliente por
`clientOptions.find(...)?.label ?? ''`, que ficaria **vazio** sob falha. O único caminho até lá é
`BudgetOverlays`, dentro do `BudgetDetailPage`, cujo `useBudgetDetail.ts:89-92` já reprova a página
inteira quando `clients` falha. Sem trabalho; fica declarado para não parecer esquecimento.

## 3. Decisões

Todas escolhidas pelo João entre alternativas com o custo medido, exceto onde marcado.

- **D1 — o sítio vencido sai, o dropdown entra.** Escopo vira A, B e C acima.
- **D2 — a falha de cursos na `QuotesList` é local no card**, não promovida ao `loadError` da página.
  Diverge da D16 (`BudgetsTable`) **por motivo medido**: lá o nome do cliente é campo de busca e o
  filtro devolvia vazio em silêncio; aqui não há busca, e as cotações vêm do próprio GET do
  orçamento, que carregou bem. Esconder valor UF, status e arquivos por falha de **nome** seria o
  erro inverso.
- **D3 — `canAdvance` fica `course_id > 0`.** Quem edita e já tem curso escolhido avança mesmo com o
  GET falho; quem cria segue travado por **ausência de seleção**, não por regra nova. Mesmo critério
  do `unusable` do `useStudentClients`, e evita repetir o `03280c6` (travar submit por `isError`,
  revertido por bloquear com lista utilizável em cache).
- **D4 — o par erro/dica sob campo vira componente de `shared/ui`**, consumido pelos sítios novos e
  pelo `StudentClientField`, que perde a cópia local. Precedente exato do `mergePt` (BD-5): duplicar
  ao lado da versão existente é o padrão que o próprio review reprova.
- **D5 (derivada, minha) — o nome é `InlineLoadState`, não `FieldLoadState`:** são três call sites e
  um deles (o card de cotações) não é campo de formulário.
- **D6 (derivada) — o `'—'` de `courseName` fica.** Numa lista carregada, id ausente é dado. Quem
  desambigua a falha é o aviso do card.
- **D7 (derivada) — o early return de `quotes.length === 0` não recebe aviso:** sem cotação não há
  nome de curso a resolver.
- **D8 (derivada) — o ramo de erro ganha `role="alert"`**, que a cópia atual do `StudentClientField`
  (`StudentClientField.tsx:54-68`) não tem. Mudança de comportamento no retrofit, deliberada e
  declarada.
- **D9 (derivada) — uma chave nova só:** `budget.noClientsAvailable`, nos três locales. O resto
  reaproveita `common.loadError`, `common.loadErrorHint`, `common.retry`, `common.noResults` e
  `course.empty`, todas existentes.

## 4. Mecanismo — `InlineLoadState`

Novo em `shared/ui/InlineLoadState/`, exportado pelo barrel.

```tsx
<InlineLoadState
  error={clients.isError ? (clients.errorDetail ?? t('common.loadErrorHint')) : null}
  emptyHint={clients.showEmptyHint ? t('budget.noClientsAvailable') : null}
  retryLabel={t('common.retry')}
  onRetry={clients.refetch}
/>
```

Dois ramos independentes, mesma linha compacta (texto à esquerda, botão `text` à direita): erro em
`dangerText` com `role="alert"` (D8), dica de vazio em `--text-color-secondary` sem `role`. Ambos
`null` → renderiza nada. Apresentacional puro, sem query própria — quem decide o estado é o hook do
sítio.

Distinção mantida do que já existe: `AppErrorState` é o bloco centrado de **estado de tela ou
lista**; `InlineLoadState` é a **linha sob um controle** que continua utilizável ao lado dela.

## 5. Sítio a sítio

### 5.1 A — passo 1 do wizard (cinco estados)

`useQuoteCourseSearch` passa a expor `isLoading`, `isError`, `errorDetail`, `refetch`, `isEmpty`
(catálogo vazio de verdade: sucesso com zero item) e `noResults` (termo sem correspondência), além
do que já devolve. **O docblock que hoje diz "o hook NÃO expõe `isError` de propósito" é reescrito** —
ele documenta o B-7 como débito aberto, e este bloco o paga; deixá-lo lá faria o arquivo mentir.

`CourseStep` vira guardas sequenciais, molde `RedatorCourseSelector`:

1. **carregando** → dois `AppSkeleton`, `aria-busy="true"`, sem campo de busca;
2. **erro** → `AppErrorState` (`common.loadError` / `errorDetail ?? common.loadErrorHint` /
   `common.retry`), sem campo de busca;
3. **catálogo vazio** → `course.empty`, sem campo de busca;
4. **termo sem match** → busca visível + `common.noResults` com o termo;
5. **lista** → busca + rádios, como hoje.

Busca escondida nos ramos 1–3 porque filtrar coisa nenhuma é controle morto. Rodapé do wizard
intocado (D3).

### 5.2 B — `QuotesList`

`useQuotesListCourses` expõe `isError`, `errorDetail`, `refetch`; `courseName` mantém o `'—'` (D6).
`QuotesList` renderiza `InlineLoadState` acima das linhas quando o GET de cursos falhou, dentro do
card, sem tocar as linhas. O bloco de erro de arquivo que já existe ali (`files.fileError`) continua
onde está — são erros de mutação, categoria distinta.

### 5.3 C — dropdown de cliente do `BudgetDialog`

`useCommercialClients` ganha `isError`, `errorDetail`, `showEmptyHint` e `unusable`, derivados no
molde do `useStudentClients`. **Aditivo:** `BudgetsTable` continua lendo `isLoading`/`loadError`/
`refetch`/`clientName`/`clientOptions` e não muda de comportamento.

`BudgetDialog`: dropdown com `disabled={unusable}` no create, `InlineLoadState` sob o campo. Mesmo
desenho do dropdown de Alunos, que é o "menos ruim" já decidido no débito de RBAC — falha
**visível**, não escondida.

## 6. Testes

Três arquivos novos, molde `BudgetDetailPage.test.tsx` (hook mockado, asserção por ramo):

- `InlineLoadState.test.tsx` — erro sozinho, dica sozinha, ambos, ambos nulos (não renderiza),
  `onRetry` chamado; `role="alert"` presente só no ramo de erro.
- `CourseStep.test.tsx` — os cinco ramos, cada um pela chave que o titula, e a busca ausente em 1–3.
- `QuotesList.test.tsx` — aviso presente sob `isError` e ausente sem erro, **com as linhas de cotação
  renderizando nos dois casos** (é o que prova a D2).

Baseline medido nesta branch, não herdado: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**32 arquivos / 163 testes**. Projeção: **35 arquivos**, ~**177** testes. Nenhum teste existente muda
de resultado; se mudar, é regressão, não ajuste.

## 7. Critério de aceite

Comportamento provado, não pacote instalado.

### 7.1 Nos dois sentidos, no navegador (Playwright, rota abortada)

1. `**/api/courses` abortado: passo 1 do wizard mostra erro **com Reintentar** — não lista vazia;
   a `QuotesList` mostra o aviso **e continua mostrando as cotações**;
2. rota liberada + Reintentar: erro some, lista de cursos aparece, aviso do card some;
3. `**/api/clients` abortado no create de orçamento: dropdown **desabilitado**, motivo na tela,
   Reintentar presente;
4. catálogo vazio (lista respondendo `[]`, sem erro): passo 1 mostra `course.empty`, **não** a
   mensagem de falha — vazio de verdade e falha continuam distinguíveis.

### 7.2 Suíte

`pnpm lint` exit 0, `pnpm build` verde, `pnpm test` nos números da §6, e os três arquivos novos
falhando por nome quando o ramo correspondente é removido (prova de que o teste vê o ramo).

### 7.3 Não-regressão medida

`BudgetsTable` e `StudentDialog` (o retrofit) continuam com o comportamento atual: tabela reprovando
por `loadError` como hoje, dropdown de aluno com motivo e Reintentar como hoje.

## 8. Superfície medida

```
frontend/src/shared/ui/InlineLoadState/InlineLoadState.tsx        (novo)
frontend/src/shared/ui/InlineLoadState/index.ts                   (novo)
frontend/src/shared/ui/index.ts                                   (barrel)
frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts
frontend/src/features/commercial/hooks/useQuotesListCourses.ts
frontend/src/features/commercial/hooks/useCommercialClients.ts
frontend/src/features/commercial/components/Budget/CourseStep.tsx
frontend/src/features/commercial/components/Budget/QuotesList.tsx
frontend/src/features/commercial/components/Budget/BudgetDialog.tsx
frontend/src/features/identity/components/Student/StudentClientField.tsx   (retrofit)
frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json                   (1 chave)
+ 3 arquivos de teste (§6)
```

**Frontend puro: a P-03 não dispara** — `git diff main...HEAD -- backend/` deve terminar vazio, e o
`:8080` do main tree serve o backend desta mesma branch. `generated.ts` **não** é tocado (§5.3 da
lei): nenhum DTO muda.

## 9. Risco

**BAIXO** pelo gate binário: zero schema, `generated.ts`, Sanctum, auditoria, RBAC, dinheiro escrito
ou documento legal gerado. `executor: claude`.

**O risco próprio é de alcance, e está declarado:** `useCommercialClients` tem dois consumidores e o
retrofit da D4 toca `identity`, fora do módulo do bloco — as adições são aditivas por desenho, mas
"aditivo" é premissa a provar (§7.3), não a assumir. E `CourseStep` passa de um caminho a cinco: o
que garante que os quatro novos não se canibalizem é a ordem das guardas, testada ramo a ramo.

## 10. O que este bloco não faz

- Não mexe no `?? '—'` de `clientName` (D1) nem no `FormField` (P-37, aberta).
- Não unifica idioma de `ValidationException` (Q-6) nem decide o acoplamento RBAC do dropdown de
  Alunos — os dois seguem travados em decisão do João.
- Não cobre a aparência dos estados novos com teste automatizado de estilo: PrimeReact no jsdom
  continua fora do corte, e a guarda de cor segue sendo a catraca, que não enxerga `style={{…}}`
  (P-36).
