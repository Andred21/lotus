# Design — BD-17 · a superfície de arquivados, medida depois de pronta

> Spec do `active_work_item` `bd17-superficie-de-arquivados`. Escrita em 2026-08-20, sobre a árvore
> da branch `feat/bd17-superficie-de-arquivados`, a partir de `main@0fe30b13`. Sem Context Packet:
> os três débitos nasceram de medição local no `/revisar-frontend` de 2026-08-19 contra `0c8db94`,
> com arquivo e linha conferidos um a um — não há fonte canônica externa a recuperar.

## 1. Fronteira do bloco

Três débitos, **frontend puro**: D-51, D-52 e D-53.

`git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` deve devolver **zero
arquivo** no fechamento. É isso que mantém suíte de backend, Pint e `typescript:transform` N/A por
escopo medido — mesmo precedente do BD-13.

**A P-03 não dispara.** A ficha exige mais de um `active_work_item` de backend; este bloco não
escreve uma linha em `backend/`.

**O kit de arquivados não está em questão.** `useArchivedPage`, `useArchiveAction`,
`useArchiveToasts`, `ArchiveRowActions`, `ArchiveConfirmDialog` e `ArchiveSwitch` saíram aderentes na
revisão, e os 8 hooks de feature são as 12–15 linhas que a rule pede. O que este bloco trata é o que
ficou **do lado de fora** do kit: a coluna, o tipo da linha e a escolha da fonte.

**O que este bloco NÃO faz.** Os 6 `*RowActions` (~217 linhas quase idênticas) ficam de pé. Não é
esquecimento: o mesmo bullet da rule sanciona o adaptador (*"o `*RowActions` da feature é adaptador —
chama `can()` e passa booleanos"*) e condena a cópia (*"copiar um `*RowActions` de outro root para
trocar duas strings de permissão é o sinal de que faltou prop"*). Resolver isso é escolher qual das
duas frases vale, e isso é decisão do João, não emenda de bloco.

## 2. A sonda que descartou o desenho intuitivo

O D-53 pede "extrair as duas colunas repetidas". A forma óbvia — um componente `<ArchivedColumns />`
— **não funciona**, e falha em silêncio. Medido antes de desenhar, não depois.

`AppColumn` é reexport direto do `Column` do PrimeReact (`AppDataTable.tsx:125`), e o DataTable
resolve colunas assim (`primereact/datatable/datatable.cjs.js:5973`):

```js
var getColumns = function getColumns(ignoreReorderable) {
  var columns = React__namespace.Children.toArray(props.children);
```

Ele lê o **filho direto** e trata cada um como coluna, buscando `field`, `header` e `body` nas props
dele. Uma sonda de 5 asserções mediu o que cada forma produz:

| Forma | O que `Children.toArray` devolve |
|---|---|
| `<ArchivedColumns />` (componente) | **1 elemento**, `field` indefinido → coluna lixo |
| `<><Col/><Col/></>` (Fragment literal) | **1 elemento** → coluna lixo |
| `archivedColumns(t)` (função → array) | **2 elementos**, `field` correto ✅ |
| `[<Col/>, archivedColumns(t)]` | **3 elementos** — array aninhado se achata ✅ |
| `[<Col/>, false, null]` | **1 elemento** — o `archived &&` atual é seguro ✅ |

**O componente não estoura: renderiza uma coluna sem cabeçalho e sem conteúdo.** Build passa, lint
passa, suíte passa. É por isso que a forma escolhida é função, e é por isso que a decisão vira
catraca na §7 — sem ela, a primeira pessoa que "melhorar" a função para componente reintroduz o
defeito sem nada reprovando.

## 3. Decisões

**D1 · `formatDate`, não `formatDateTime`.** A coluna passa a exibir a data no idioma da interface e
**nada mais**. Decisão do João em 2026-08-20. Acrescentar a hora é defensável num campo de auditoria
— `archived_at` carrega o timestamp completo —, mas é informação nova na tela, e este bloco corrige
um defeito de idioma. A hora fica como pedido separado, se vier.

**D2 · A peça do D-52 é função pura, não hook.** Não tem estado nem efeito; nomeá-la `use*` mentiria
sobre o que ela é e a submeteria às regras de hooks sem motivo.

**D3 · `useArchivedPage` NÃO ganha a fonte ativa por parâmetro.** Era o desenho que mais colapsaria
código, e foi recusado pela razão que o próprio kit já escreveu no docblock do `useArchiveAction`:
as 2 telas de detalhe (`QuotesList`, `EnrollmentSection`) usam `useArchivedPage` sem fonte ativa
nessa forma, então o parâmetro teria de ser opcional — e *"um parâmetro opcional deixaria `archive`
chamável onde não há mutation nenhuma por trás"*. Repetir a forma que o kit rejeitou, no mesmo kit,
seria contrariar a razão escrita dele.

**D4 · `useLoadState` não serve para normalizar turmas.** Medido: o `refetch` dele engole a promise
(`useLoadState.ts:51-53`, `void query.refetch()`), e o `onRetry` das tabelas é tipado
`() => void | Promise<unknown>` exatamente para o `AppErrorState` aguardá-la e manter o Reintentar em
`loading` (Q-14). Usá-lo aqui regrediria o Q-14 **sem quebrar tipo nem teste** — TS aceita descartar
retorno. Turmas ganha um alias `useTurmasPage` no molde dos 7 que já existem.

**D5 · `mode` chega por dentro do lado arquivado, não como argumento solto.** `archivableSource` lê
`archived.mode` em vez de receber o modo — assim é impossível passar o modo de uma tabela e as
fontes de outra.

**D6 · O tipo estrutural do `mode` em `shared/lib`.** `archivableSource` declara
`mode: 'active' | 'archived'` estruturalmente, sem importar `ArchiveMode` de `shared/hooks` — mesmo
mecanismo e mesmo motivo que o `Mode` do `ArchiveSwitch` já usa para não importar `shared/hooks`.

## 4. D-51 — a data cai no idioma do navegador

`new Date(x.archived_at).toLocaleDateString()`, sem argumento, resolve pelo locale do **navegador**,
não pelo idioma ativo da interface. Com a UI em `es-CL` e o browser em `en-US`, a coluna "Archivado
el" imprime `8/19/2026` enquanto o resto da tela imprime `19-08-2026`.

**É o defeito que o projeto já achou, corrigiu e blindou.** `shared/lib/datetime.ts:3-10` existe por
causa dele (*"fixar um locale fazia a tela em pt-BR ou en exibir mês em espanhol"*),
`AppFileRow.tsx:42-46` carrega o comentário do **D-18** do review de 2026-08-17, e
`AppFileRow.test.tsx:26` já tem teste de regressão. A superfície de arquivados é hoje **o único lugar
do frontend** com a grafia crua.

**Sem a complicação de fuso.** Os 8 controllers preenchem `archived_at` com `->toIso8601String()` —
data-hora completa, igual ao `created_at` do `AppFileRow` —, então a âncora de meio-dia do
`formatIsoDate` não se aplica. A correção é a do precedente: `formatDate(new Date(x))`.

Os 8 sítios, medidos contra `0c8db94`:

| Arquivo | Linha |
|---|---|
| `features/catalog/components/Course/CoursesTable.tsx` | 91 |
| `features/commercial/components/Client/ClientsTable.tsx` | 112 |
| `features/commercial/components/Budget/BudgetsTable.tsx` | 125 |
| `features/identity/components/Admin/UsersTable.tsx` | 87 |
| `features/identity/components/Redator/RedatoresTable.tsx` | 105 |
| `features/operation/components/Turma/TurmasTable.tsx` | 117 |
| `features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx` | 67 |
| `features/commercial/components/Budget/ArchivedQuotesList.tsx` | 81 |

**Onde o `formatDate` pousa depois do D-53:** 7 dos 8 desaparecem numa peça só. A
`ArchivedEnrollmentsList` também é `AppDataTable` com as duas colunas **idênticas**, então entra no
mesmo `archivedColumns(t)`. Sobra **um** sítio direto — a `ArchivedQuotesList`, que é layout flex e
não tabela.

## 5. D-52 — a fonte derivada dentro do JSX

Seis páginas repetem o mesmo quarteto de ternários sobre a mesma condição, dentro das props. É a
rule §1: derivação computada dentro do `return` mora acima dele.

| Arquivo | Linhas |
|---|---|
| `features/catalog/components/CatalogPage.tsx` | 23-26 |
| `features/commercial/components/CommercialPage.tsx` | 35-38 e 54-57 |
| `features/identity/components/AdministracionPage.tsx` | 31-34 |
| `features/identity/components/Redator/RedatoresTab.tsx` | 56-59 |
| `features/operation/components/OperationPage.tsx` | 39 (pior caso) e 31 |

**Por que a resolução é trivial em cinco delas e torta na sexta.** `useCrudPage` devolve
`{items, loading, error, refetch}` já normalizado (`useCrudPage.ts:51-61`), com `error` sendo
`isError ? (error ?? {}) : null` e `refetch` devolvendo a promise — e `useArchivedPage` devolve
**exatamente a mesma forma**. Os dois lados já casam. A exceção é `useTurmas()`, que devolve
`UseQueryResult` cru (`useTurmas.ts:24-29`), e é por isso que só a `OperationPage` deriva o
`loadError` à mão, em ternário aninhado dentro da prop:

```tsx
error={archived ? turmasArchived.error : turmas.isError ? (turmas.error ?? {}) : null}
```

Esse `isError ? (error ?? {}) : null` é literalmente o `loadError` do `useLoadState.ts:39`, e a rule
é explícita em que estado de carga de lista **não se deriva à mão na feature** (Q-1/Q-2 do review de
2026-08-14).

**`OperationPage:31` entra pelo mesmo motivo.** O `pending` tem a mesma grafia crua, no mesmo
arquivo, e a ficha do D-52 o nomeia. Alcance declarado: ele alimenta o `PendingQuotesPanel`, que não
é superfície de arquivados — entra porque é o mesmo defeito no mesmo arquivo, não por afinidade de
tela.

**O molde certo já existe no repo:** `QuotesList.tsx:40` resolve a fonte acima do `return`
(`const visiveis = mode === 'archived' ? archived.items : quotes`). As 6 tabelas é que são a exceção.

## 6. Desenho — três peças, nenhuma camada nova

### 6.1 `shared/lib` · `ArchivableRow<T>`

O tipo que hoje é declarado **8 vezes** (6 tabelas + 2 listas):

```ts
export type ArchiveTrail = { archived_at?: string; archived_by?: string | null }
export type ArchivableRow<T> = T & ArchiveTrail
```

**O nome é deliberadamente distinto do `ArchivedRow` privado do `useArchivedPage`.** Aquele é o DTO
do backend, com os dois campos **obrigatórios**; este é a linha da tabela, onde eles são opcionais
porque no modo ativo não existem. São dois tipos com duas verdades — colidir o nome é o que faria
alguém trocar um pelo outro num refactor futuro.

### 6.2 `shared/ui/archivedColumns.tsx` · o par de colunas

Função pura que recebe `t` e devolve um **array** de `AppColumn` — pela §2, nunca componente.
Arquivo plano em `shared/ui`, ao lado do precedente `mergePt.ts`. Importa `formatDate` de
`@shared/lib`, na mesma direção que o `AppFileRow` já usa (ui → lib).

Uso nas tabelas, substituindo os dois blocos `{archived && (<AppColumn .../>)}`:

```tsx
{archived && archivedColumns(t)}
```

Na `ArchivedEnrollmentsList`, onde as colunas não são condicionais, `{archivedColumns(t)}`.

**Comportamento preservado literalmente:** mesmo `field`, mesma chave de header, mesmo fallback
`?? t('archive.unknownAuthor')`, e **sem `sortable`** — nenhuma das 6 tabelas o tinha.

### 6.3 `shared/lib` · `archivableSource(active, archived)`

```ts
interface ListSource<T> {
  items: T[]
  loading: boolean
  error: ProblemDetails | null
  refetch: () => Promise<unknown>
}

interface ArchivedSource<T> extends ListSource<ArchivableRow<T>> {
  /** Estrutural de propósito: `shared/lib` não importa `shared/hooks`.
   *  Mesmo motivo do `Mode` do `ArchiveSwitch` (D6). */
  mode: 'active' | 'archived'
}

export function archivableSource<T>(
  active: ListSource<T>,
  archived: ArchivedSource<T>,
): ListSource<ArchivableRow<T>> {
  return archived.mode === 'archived' ? archived : active
}
```

Na página, os 4 ternários viram uma linha:

```tsx
const fonte = archivableSource(page, archivedPage)
// fonte.items · fonte.loading · fonte.error · fonte.refetch
```

`mode` e `onModeChange` continuam vindo de `archivedPage` direto: a função é sobre a **fonte de
dados**, não sobre o interruptor.

### 6.4 `features/operation/hooks/useTurmasPage.ts`

Normaliza `useTurmas()` para `{items, loading, error, refetch}`, espelhando os 7 aliases `useXPage`
que já existem — inclusive o `refetch` que **devolve a promise** (D4). Mata a derivação à mão da
`OperationPage` na raiz, em vez de mudá-la de lugar, e tira a query de dentro da página, que é o que
a rule quer dos aliases.

## 7. Testes

- **`archivedColumns`** — as duas colunas com `field`/`header` certos, e os `body` exercitados
  diretamente pelas props do elemento devolvido (são funções puras; não precisa de renderer).
- **Regressão do idioma (D-51)**, no molde do `AppFileRow.test.tsx:26`. A asserção **fixa
  `i18n.language`** e mede contra o `Intl` daquela tag. Um teste que só comparasse com `formatDate`
  passaria por acaso quando o locale da máquina coincidisse com o da interface — que é justamente a
  condição em que o defeito é invisível.
- **Catraca da forma (§2)** — teste que prova que `archivedColumns(t)` achata para **2** elementos
  sob `Children.toArray`, e que um componente equivalente achataria para 1. É o que impede a
  "melhoria" para componente, que não quebra build, lint nem suíte e rende coluna lixo.
- **`archivableSource`** — devolve o lado certo em cada modo e **preserva a promise** do `refetch`
  (a guarda do D4).
- **`useTurmasPage`** — `renderHook` com `QueryClientProvider`, no molde dos hooks de feature já
  cobertos: forma normalizada e `refetch` devolvendo promise.

## 8. Definition of done

**Comportamento idêntico nas 8 telas, exceto a grafia da data.** Refatoração que muda o que a tela
renderiza não é refatoração — e aqui a única mudança pretendida é o idioma da data.

Prova no navegador, contra a API real, com **browser em `en-US` e interface em `es-CL`**: a coluna
"Archivado el" mostra `19-08-2026`. É a medição que reproduz o defeito; rodar com browser e interface
no mesmo idioma provaria nada.

Nas 6 tabelas mais as 2 listas: modo ativo e modo arquivado renderizando as mesmas colunas, mesma
contagem de rodapé, mesmos botões de linha, e o Reintentar do `AppErrorState` ainda em `loading`
enquanto o GET está em voo (a prova do Q-14, que o D4 protege).

`pnpm build` + `pnpm lint` + `pnpm test` verdes são **pré-requisito, não aceite** (lei §8).
Baseline da branch: lint 0, **77 arquivos / 435 testes**.

## 9. Alcance declarado para o review

- **Frontend puro.** Zero `backend/`, zero `generated.ts`.
- **`shared/lib` e `shared/ui` são tocados**, então o alcance passa da superfície de arquivados:
  `ArchivableRow` e `archivableSource` entram no barrel de `lib`, `archivedColumns` no de `ui`.
  Nenhum consumidor existente muda de comportamento — as peças nascem sem chamador fora deste bloco.
- **`OperationPage:31` (o `pending`)** entra por estar no mesmo arquivo e ser o mesmo defeito, ainda
  que alimente painel que não é de arquivados.
- **Os 6 `*RowActions` ficam de pé**, pela §1.

## 10. Limitação declarada

O `formatDate` resolve pelo `i18n.language` ativo. Se a interface estiver num idioma e o dado tiver
sido arquivado sob outro, a coluna mostra a grafia do idioma **atual** — que é o comportamento
correto e o mesmo do resto da aplicação, mas vale registrar que a data exibida não é um carimbo
imutável: o carimbo é o `archived_at` ISO no payload, e é ele que tem peso de auditoria.
