# Design — BD-18 · `useLoadState`: a promise, a forma e os dois ramos crus

> Spec do `active_work_item` `bd18-useloadstate-promise-e-forma`. Escrita em 2026-08-20, sobre a
> árvore da branch `docs/bd18-agrupamento-useloadstate`, a partir de `main@6edf1224` (`HEAD`
> `93acf6a7`, só o commit de backlog à frente). **Sem Context Packet**: os três débitos nasceram de
> medição local — D-54 e D-56 no review e no fechamento do BD-17 (2026-08-20), D-14 no review do
> BD-6 (2026-08-14) —, com arquivo e linha conferidos um a um. Não há fonte canônica externa a
> recuperar.

## 1. Fronteira do bloco

Três débitos, **frontend puro**: D-56, D-54 e D-14, nessa ordem.

`git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` deve devolver **zero
arquivo** no fechamento. É isso que mantém suíte de backend, Pint e `typescript:transform` N/A por
escopo medido — mesmo precedente do BD-13 e do BD-17.

**A P-03 não dispara.** A ficha exige mais de um `active_work_item` de *backend*; este bloco não
escreve uma linha em `backend/`. A segunda árvore viva (`/home/jvbat/projetos/lotus`, `bd14-contrato-de-entrada`,
`ready_for_review`) é backend e não colide: o único encontro possível é `docs/superpowers/**`, que
sempre colide e é merge mecânico.

**Árvore e branch, por decisão do João:** worktree `fix-frontend`, seguindo na branch atual
`docs/bd18-agrupamento-useloadstate`, que já carrega o commit de agrupamento do backlog.

## 2. O escopo medido é maior que as duas fichas registravam

A ficha do D-54 diz "**dois** hooks compartilhados engolindo a promise, e **sete** consumidores".
Medido contra `93acf6a7` por forma (`void <query>.refetch()`), e não por enumeração:

| Arquivo | Linha | O retry chega a |
|---|---|---|
| `shared/hooks/useLoadState.ts` | 51-53 | 6 consumidores de feature |
| `shared/hooks/useResourceState.ts` | 40-42 | `useProfilePage` → `ProfilePage:34` |
| `features/operation/hooks/useTurmaDetail.ts` | 18 | `AppErrorState` (`TurmaDetailPage:61`) |
| `features/operation/hooks/useTurmaDocsSection.ts` | 56 | `AppErrorState` (`TurmaDocuments:23`) |
| `features/operation/hooks/useEnrollmentSection.ts` | 27 | `AppErrorState` (`EnrollmentSection:76`) |
| `features/operation/hooks/useRedatorPicker.ts` | 34 | `AppErrorState` (`RedatorDesignation:24`) |
| `features/commercial/hooks/useBudgetDetail.ts` | 93 | `AppErrorState` (`BudgetDetailPage:48`) |
| `features/certification/hooks/useHistorial.ts` | 89, 103, 107 | painéis de histórico e reemissão |
| `features/certification/hooks/useEmissionPanelState.ts` | 82, 85 | painel de emissão |
| `features/certification/hooks/useValidationPage.ts` | 30 | ramo `kind: 'error'` |
| `app/pages/Dashboard/useDashboard.ts` | 172 | `AppErrorState` (`DashboardPage:72`) |

São **14 produtores em 12 arquivos** (2 compartilhados + 12 sítios de feature, com `useHistorial`
carregando três e `useEmissionPanelState` dois), não 2, e **seis** deles alimentam um
`AppErrorState` de tela cheia — o componente que de fato aguarda a promise (`AppErrorState.tsx:32-40`).

**Três travam a promise por TIPO, não só pelo `void`:** `useValidationPage.ts:9` e
`useDashboard.ts:48` declaram `retry: () => void` na união discriminada, e `StudentClientField.tsx:40`
declara a prop `refetch: () => void`. Nesses, trocar o corpo sem trocar a assinatura não muda nada.
O contra-exemplo já vive no repositório: `QuotesList.tsx:26` tipa `() => void | Promise<unknown>`.

**Correção da ficha do D-54 quanto aos sítios de prova.** Ela nomeia `QuotesList.tsx:60`/`:74` e
`BudgetDialog.tsx:85` como "Reintentar vivo". Medido: os três são `InlineLoadState`, cujo
`onRetry` é `() => void` e cujo botão **não tem estado de carga** (`InlineLoadState.tsx:17,44,53`).
Hoje a promise ali não muda nada — é a §5 desta spec que os torna sítios de prova.

## 3. As duas grafias, e por que a peça não é uma só

O D-56 propõe "um `listSource(query)` devolvendo `ListSource<T>`, e os seis sítios passam a
espalhá-lo". Medido, os seis não falam a mesma língua:

| Sítio | Grafia | `items`/`data` |
|---|---|---|
| `useCrudPage.ts:56` | `items` / `loading` / `error` / `refetch` | `query.data ?? []` |
| `useArchivedPage.ts:78` | idem | **mapeado** com o rastro (`:63-67`) |
| `useTurmasPage.ts:35` | idem | `query.data ?? []` |
| `usePendingQuotesPage.ts:22` | idem | `query.data ?? []` |
| `useLoadState.ts:39` | `data` / `isLoading` / `isError` / `loadError` + 5 predicados | `query.data ?? []` |
| `useResourceState.ts:35` | `data` / `isLoading` / `isError` / `loadError` | `query.data` (objeto) |

O que é **literalmente idêntico nos seis** é um par: o `isError ? (error ?? ({} as ProblemDetails)) : null`
e o retry. Nada mais. Uma peça só, no formato de página, não alcança o `useLoadState` (grafia
distinta, 6 consumidores e 2 arquivos de teste amarrados a ela) nem o `useResourceState` (recurso
único não tem `items`). Daí a D2.

## 4. Decisões

### D1 · `listSource` mora em `shared/hooks/`, apesar de ser função pura

O precedente mais próximo, `archivableSource`, é função pura e vive em `shared/lib/archivable.ts:59`
com o motivo escrito: "não tem estado nem efeito, e nomeá-la `use*` mentiria". A peça nova **não pode
segui-lo**, e o motivo é a fronteira, não a natureza: ela precisa de `UseQueryResult` (`@tanstack`)
e do cast `({} as ProblemDetails)` (`@shared/api/axios`), e `shared/lib` não importa nenhum dos dois
— fronteira registrada em `archivable.ts:18-22`, `screenDetail.ts:23-27` e `AppDataTable.tsx:16-18`,
e medida agora (`grep -rn "@tanstack" src/shared/lib` = zero).

Arquivo: `shared/hooks/listSource.ts`. **Sem prefixo `use`** — não é hook, e chamá-la de hook a
submeteria às regras de hooks sem motivo, que é a mesma frase do `archivableSource`. Sai pelo barrel
`shared/hooks/index.ts`.

O tipo `ListSource<T>` **fica onde está** (`shared/lib/archivable.ts:28`) e não se move: ele já
declara `refetch: () => Promise<unknown>`, então a peça nasce obrigada ao contrato Q-14 pelo próprio
tipo de retorno, e é `shared/lib` que os 6 componentes de tabela já consomem.

### D2 · Duas exportações, não uma: `loadFailure` e `listSource`

```ts
export function loadFailure(query: Pick<UseQueryResult<unknown, ProblemDetails>, 'isError' | 'error'>) {
  return query.isError ? (query.error ?? ({} as ProblemDetails)) : null
}

export function listSource<T>(query: UseQueryResult<T[], ProblemDetails>): ListSource<T> {
  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: loadFailure(query),
    refetch: () => query.refetch(),
  }
}
```

`listSource` serve os quatro de forma de página; `loadFailure` serve **também** o `useLoadState` e o
`useResourceState`, que mantêm a grafia própria e param de derivar. Sem a segunda, o D-56 fecharia em
4 dos 6 sítios e a linha da rule nasceria com exceção viva — que é exatamente o defeito que ela
descreve.

O parâmetro de `loadFailure` é `Pick<…, 'isError' | 'error'>` de propósito: o `useResourceState` é
`UseQueryResult<T, …>` e o `useLoadState` é `UseQueryResult<T[], …>`; a política lê dois campos e não
deve exigir a forma do dado para funcionar.

### D3 · `useArchivedPage` espalha e sobrescreve `items`

```ts
return { mode, setMode, ...listSource(query), items, restore: …, restoring: … }
```

O `items` dele é memoizado e carrega `archived_at`/`archived_by` (`:62-72`); o do `listSource` é
`query.data ?? []`. A ordem importa — o override vem **depois** do spread. Os outros três espalham
inteiro.

### D4 · O `refetch` devolve a promise nos 14 produtores

`refetch: () => query.refetch()` em `useLoadState:51-53` e `useResourceState:40-42`, e o mesmo nos
12 sítios de feature da tabela da §2. Três não são de uma linha:

- `useBudgetDetail.ts:93` dispara **dois** refetch (`query` e `clients`) — vira
  `() => Promise.all([query.refetch(), clients.refetch()])`, senão o botão para de esperar metade.
- `useValidationPage.ts:9` e `useDashboard.ts:48` mudam a assinatura da união discriminada junto com
  o corpo (`retry: () => Promise<unknown>`); `useDashboard.ts:65,73` declara `staleRetry?: () => void`
  e acompanha.
- `StudentClientField.tsx:40` muda a prop para `() => void | Promise<unknown>`, no molde de
  `QuotesList.tsx:26`.

**O tipo não obriga o call-site a mudar:** TypeScript aceita atribuir `() => Promise<T>` onde se
espera `() => void`. Isso é o que torna a regressão invisível — e é o motivo de a D7 pedir catraca.

### D5 · A espera do retry vira peça única em `shared/ui`

`AppErrorState.tsx:30-40` tem o handler (`retrying`, `try/finally`, guarda de reentrada). O
`InlineLoadState` não tem nenhum. Copiá-lo seria o D-56 outra vez, um andar acima: a mesma política
em dois arquivos, divergindo na primeira correção.

O handler sai de dentro do `AppErrorState` e vira `useRetryPending` em
`shared/ui/AppErrorState/useRetryPending.ts`, consumido pelos dois. `InlineLoadState.onRetry` passa a
`() => void | Promise<unknown>` e o `AppButton` dele ganha `loading`/`disabled`. **Os 12 usos em 9
arquivos não mudam**; muda o comportamento nos 12.

O hook mora ao lado do `AppErrorState` e **não sai pelo barrel** de `shared/ui`: é mecanismo interno
de dois componentes, consumido por caminho relativo — mesmo precedente que `useArchiveToasts` e a
guarda de classificação do `useCrudForm` registram em `shared/hooks/index.ts:4-13`.

### D6 · D-14 copia o precedente convertido, não inventa molde

`CourseStep.tsx:46-54` (substitui a tela com `failedWithoutData`) e `:76-80` (avisa ao lado com
`isError` no ramo que tem lista) são o molde. Aplicado a:

- **`RedatorCourseSelector.tsx:38`** — a guarda vira `courses.failedWithoutData`; o
  `InlineLoadState` entra acima do grid, alcançando o ramo `readOnly` e o editável.
- **`CourseRedatoresSection.tsx:28`** — idem, com o aviso nos **dois** ramos finais (`isCreate` e
  view/edit): a lista é a mesma nos dois, e cobrir só um deixa metade do defeito de pé.

O ramo `isEmpty` de cada um continua onde está e não ganha `emptyHint` — teria a mesma frase duas
vezes na tela.

### D7 · A linha da rule entra no commit que zera o último sítio

Texto já fixado na ficha do D-56, para `.claude/rules/frontend-fsliced.md`:

> "A forma normalizada de lista é `ListSource<T>` e nasce num lugar só (`shared/hooks`). Hook que
> monta `isError ? (error ?? {}) : null` à mão está recriando a política — o alias espalha, não
> deriva."

Escrevê-la antes tornaria a rule falsa nos seis sítios. Junto com ela, a frase do bullet de estado de
carga (`frontend-fsliced.md:143-150`) ganha o Q-14: **retry devolve a promise**.

### D8 · Os dois aliases do BD-17 espalham `listSource`

`useTurmasPage` e `usePendingQuotesPage` viram `return listSource(useTurmas())` /
`listSource(usePendingQuotes())`. Os docblocks deles (`useTurmasPage.ts:20-24`,
`usePendingQuotesPage.ts:13-14`) declaram por escrito que **não** usam `useLoadState` porque ele
engole a promise; pago o D-54, essa frase fica falsa e é reescrita para o motivo que sobra — manter a
query fora do componente.

Não adotam `useLoadState`: isso lhes daria `isEmpty`/`failedWithoutData`/`errorHint` que nenhum dos
consumidores pede, ao custo de mudar a grafia consumida por `OperationPage`, `TurmasTable` e
`PendingQuotesPanel`.

## 5. Superfície de prova

**Catracas de teste** (o build e o lint não veem nada disto):

1. `listSource.test.ts` — `await source.refetch()` resolve com o resultado da query; `error` é `null`
   em sucesso com lista vazia; `error` é `{}` quando `isError` sem `error`.
2. `useLoadState.test.ts` e `useResourceState.test.ts` ganham a asserção da promise. As dos dois
   aliases (`useTurmasPage.test.tsx:69`, `usePendingQuotesPage.test.tsx:53`) já existem e seguem
   valendo — são a guarda que impede a regressão de voltar por espalhamento.
3. `InlineLoadState.test.tsx` — botão em `loading` enquanto a promise está pendente, e de volta
   depois de resolvida; handler que devolve `void` continua funcionando.
4. **Dois arquivos novos** para o D-14: `RedatorCourseSelector.test.tsx` e
   `CourseRedatoresSection.test.tsx`. Nenhum dos dois componentes tem teste hoje (medido: as pastas
   só têm `RedatorRowActions.test.tsx`). O caso obrigatório é o do **ramo com cache** — `data`
   populado **e** `isError: true` —, porque forçar `list: []` no teste de falha deixa a regressão
   passar verde: foi o que o BD-6 mediu.

**Navegador**, contra a API real em `:8080`, com falha **isolada** do GET (derrubar o nginx inteiro
não serve — o `GET /api/me` morre junto e o shell redireciona para `/login`, lição do bloco de Meu
Perfil):

- um `AppErrorState` de tela cheia com o "Reintentar" **permanecendo em `loading`** enquanto o GET
  está em voo — `TurmaDetailPage` ou `BudgetDetailPage`;
- o `InlineLoadState` do `BudgetDialog:85` no mesmo comportamento;
- um dos dois sítios do D-14 com cache em mão: a lista **permanece** na tela e o aviso aparece ao
  lado, em vez de o `AppErrorState` substituir tudo.

## 6. O que este bloco NÃO faz

- **`useDashboard` continua sem `useLoadState`.** O motivo está escrito em `:124-129` e segue de pé:
  a assinatura é `UseQueryResult<T[]>`, de LISTA, e ali o dado é objeto único com seções anuláveis.
  Ele entra no bloco só pela D4 (a promise do `retry`), não pela adoção.
- **Unificar `useLoadState` e `useResourceState`** numa peça só é decisão de desenho, não
  consequência deste bloco. O `loadFailure` os aproxima sem fundi-los.
- **Os `reload`/`reloadList` não viram `useResourceState`.** Vários deles (`useTurmaDetail`,
  `useBudgetDetail`) são recurso único e poderiam adotá-lo; adoção é outro bloco. Aqui eles só param
  de engolir a promise.
- **A grafia dos seis sítios não é unificada.** Duas línguas seguem convivendo, uma por natureza de
  consumidor (página × hook de carga), e a política agora nasce num lugar só nas duas.

## 7. Limitações declaradas

- O contrato Q-14 é **invisível para TypeScript**: `() => Promise<T>` é atribuível a `() => void`.
  Nenhuma das catracas desta spec impede alguém de reintroduzir `void query.refetch()` em um
  produtor **novo** — o que as catracas cobrem são os 14 medidos. O que gera pressão no sentido certo
  é a linha da rule (D7) e o tipo de retorno do `ListSource<T>`, não o compilador.
- O botão do `InlineLoadState` é `AppButton text` numa linha compacta; o `loading` dele precisa de
  conferência visual, e é o único item desta spec cujo resultado não é binário.
- A prova de navegador exige interceptar/derrubar **uma** rota. Se o ambiente não permitir isolar o
  GET, o item cai para a catraca de teste e a limitação vai declarada no fechamento, sem maquiagem.

## 8. Handoff

Executor previsto: `claude`. A D4 toca 12 arquivos de feature em quatro módulos e três deles mudam
assinatura de tipo público; a D5 mexe em `shared/ui`, que alcança 12 sítios; a D7 escreve rule. Nada
disso é mecânico com paths fechados.
