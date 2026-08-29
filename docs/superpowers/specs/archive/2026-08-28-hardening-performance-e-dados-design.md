# Design — `hardening-performance-e-dados`

> Item 6 da fila (`docs/superpowers/backlog.md`), `lane-a`, main tree, branch
> `feat/hardening-performance-e-dados`. Context Packet:
> [`context-packets/2026-08-28-hardening-performance-e-dados.md`](../context-packets/2026-08-28-hardening-performance-e-dados.md)
> (`status: ready`, quatro fontes recuperadas, nenhuma `unavailable`).
> Base de medição: `main@f584432b` — os commits posteriores da branch são só `docs(state)`.

## 1. Problema

O backlog pede "otimizar o que for medido". A medição contra `main@f584432b` — dois levantamentos,
backend e frontend, em 2026-08-28 — mostra o que existe e o que não existe:

- **Nenhum endpoint de lista pagina.** `paginate`/`per_page` aparecem zero vezes em `app/`. Todo
  `index` devolve a coleção inteira por `get()`. Nenhum filtro ou ordenação vem do request — a
  ordenação é toda hardcoded, e por isso a "allowlist de filtro/ordenação" do backlog é hoje vazia
  por construção.
- **Quatro superfícies crescem sem teto:** `GET /api/certificates` (arquivo legal, append-only —
  `CertificateData.php:55` documenta que "a listagem não pagina"), `GET /api/students` (ordena em
  PHP por `user->name`, `StudentController.php:40`), `GET /api/certificates/emission-panel` (turmas
  concluídas × matrículas × certificados numa resposta) e `GET /api/turmas` para admin, mais as oito
  listas `/archived`, que só crescem porque soft delete não se purga.
- **Eager loading é centralizado e correto** nos `QueryBuilders` (`LISTING` por agregado) e nenhum
  N+1 vivo foi medido. O que existe é risco latente: `StudentData::fromModel` faz fallback lazy
  (`$student->enrollments_count ?? $student->enrollments()->count()`), `UserController` repete o
  mesmo `with()` três vezes, e nada impede o próximo `fromModel` de atravessar relação não
  carregada — `Model::preventLazyLoading()` não está ligado globalmente, só em cinco testes.
- **O Dashboard do admin custa ~30 queries** sem catraca de contagem por papel. O
  `RedatorLoadQuery` que o levantamento apontou como "2 `count()` por redator" é `count()` de
  Collection já carregada, não query — lição para o plano: N+1 se prova por contagem, não por
  leitura.
- **Índices:** as tabelas do Spatie são a migration stock, completa. Faltam índices para o que o
  Dashboard e o painel de emissão filtram e ordenam: `turmas.end_date`/`start_date`,
  `files.valid_until`, `certificates(status, valido_ate)`. A **P-66** registra que `login_logs`
  ficou sem índice em `created_at` e tem gatilho "bloco que tocar o schema" — este bloco toca.
- **D-15** são três trintas, não dois: `DocumentValidityStatus::DIAS_AVISO` (Identity),
  `DashboardWindows::EXPIRY_WINDOW_DAYS` (Dashboard, usado para documento **e** certificado) e
  `CertificateDisplayStatus::POR_VENCER_DIAS` (Certification).
- **O frontend é client-side por desenho.** `AppDataTable` diz no docblock que "o index devolve
  array puro"; `useTableFilter` busca e filtra sobre o array inteiro; `SearchableTableFrame` é o
  gargalo único de seis das oito tabelas. Não existe `PaginatedResponse` nem endpoint com envelope.
  Paginar no servidor exige modo `lazy` no kit compartilhado e busca/filtro/ordenação no backend,
  porque a busca client-side morre junto.
- **O painel de emissão não cabe em paginação:** `useBatchIssue` e o dropdown de turma precisam da
  turma inteira em memória (`useEmissionPanelState.ts:49-64`, `useBatchIssue.ts:56-60`).

Banco de dev: 66 alunos, 76 matrículas, 15 certificados. Não serve de cenário.

## 2. O que a fonte canônica exige

Do packet (`[DRIVE-RNF]`, `[NOTION-913]`, `[REPO-BACKLOG]`):

- **RNF-DES-01** pede resposta "quase instantânea"; não fixa milissegundos nem percentil.
  **RNF-DES-02** fixa o único número: até 10 usuários simultâneos, sem arquitetura distribuída.
  **RNF-DES-03** pede documento postado acessível ao admin "imediatamente", sem prazo.
- **Notion 9.1.3**: "Revisão de índices compostos (Spatie, FKs)", aceite único "Sem N+1 nas
  consultas RBAC/FK principais".
- Nenhuma fonte fixa teto de `per_page`, orçamento de queries, latência ou Redis. "Redis não é
  requisito" do backlog fica de pé. Cache só depois de query, índice e paginação, com invalidação
  definida.
- Nenhuma fonte escolhe o dono dos 30 dias da D-15; nenhuma pede mudar o número.

Decisões do João Victor no brainstorming de 2026-08-28, todas de engenharia (o packet as deixou
para cá de propósito): escopo da paginação, ordem de grandeza do cenário, tratamento do painel de
emissão, contrato de página, dono da D-15.

## 3. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Paginam no servidor só as listas que crescem sem teto:** `students`, `certificates`, `turmas` (ativo **e** arquivado). As demais (courses, users, redatores, clients, quotes por budget, alunos por turma e as cinco `/archived` delas) **não mudam** — são bounded por construção. | Custo do kit lazy é fixo; pagá-lo para lista de 4 cursos é sobre-engenharia. `archivableSource` funde ativo e arquivado numa fonte só, então uma raiz pagina os dois ou nenhum. |
| D2 | **Contrato próprio em `App\Shared\Pagination`** (`PageRequest` + `PageData<T>`), não o `LengthAwarePaginator` do Laravel. | Envelope pequeno, sem `links/path/from/to` que ninguém lê; o alias TS que o transformer emite para `PaginatedDataCollection` aponta para `LengthAwarePaginator` sem tipo — o front tiparia à mão igual. Cursor foi descartado: sem `total`, o paginador e o rodapé de contagem morrem. |
| D3 | **`per_page` default 25, teto 100**; acima do teto é 422, não clamp silencioso. `page` ≥ 1. `q` ≤ 100 caracteres. `sort` só da allowlist, `campo` ou `-campo`; fora dela 422. | Nenhuma fonte fixa número; o teto existe para a API não voltar a devolver tudo por um parâmetro. Recusar em vez de clampar é o padrão do projeto (RFC 7807, nunca silêncio). |
| D4 | **Busca e filtro vão para o SQL, com paridade provada por teste** contra a derivação que o front fazia: `display_status` (`CertificateDisplayStatus::for()`) e o status de turma (`turmaDisplayStatus`: `concluida` / `habilitada` = `em_andamento` com os três `TurmaDocumentType` presentes / `em_andamento`). | Paginar no servidor e filtrar no cliente é contradição: a página filtrada não é a página. A paridade por teste é o que impede as duas classificações de divergir. |
| D5 | **`total_unfiltered` no `meta`**: contagem do mesmo escopo (`visibleTo`) sem `q`/filtro. | O `useTableFilter` mede o **efeito** do filtro, não a presença (regra do review de 2026-08-04, Q-6). O hook server-side mede igual: `filteredByScope = meta.total !== meta.total_unfiltered`. |
| D6 | **Historial mantém o resumo por status** via `meta.summary` (`CertificatePageMetaData extends PageMetaData`), calculado sobre o escopo de `q` com o mesmo `CASE` do filtro. | O rodapé existe hoje e conta sobre a lista inteira; sem ele a tela regride. Extensão tipada, não campo solto. |
| D7 | **Painel de emissão ganha janela por data, não página:** `?concluidas_desde=YYYY-MM-DD`, **default = hoje − 12 meses** (`America/Santiago`). Forma do payload intacta. | Lote e dropdown dependem da turma inteira em memória. Emissão acontece logo depois da conclusão; turma mais antiga continua alcançável pela data. |
| D8 | **`Model::preventLazyLoading(! app()->isProduction())`** no `AppServiceProvider`; em produção a violação vira `warning` no log padrão em vez de exceção. `StudentData::fromModel` perde o fallback lazy. | Mecanismo vence instrução (lição 14). Em produção, um lazy load que escapou custa uma query, não um 500. |
| D9 | **`ListQueryBudgetTest`**, ratchet por rota: toda rota `GET` de lista descoberta no router semeia N=2 e N=20 e exige a mesma contagem de queries; `dashboard/metricas` entra com número fixo por papel. Rota fora precisa de motivo declarado. | Silêncio reprova, como `ThrottledRouteRatchetTest`. `preventLazyLoading` não enxerga query feita **na** relação (`TurmaQueryBuilderTest:96`); só contagem pega. |
| D10 | **Índice só entra com `EXPLAIN` antes/depois** no MySQL de dev sobre o cenário semeado, registrado em `audits/`. Candidatos: `turmas(status, end_date)`, `turmas(start_date)`, `enrollments(student_id)`, `certificates(status, valido_ate)`, `certificates(created_at)`, `files(valid_until)`, `users(name)`, `login_logs(created_at)` (**P-66**). Candidato que o EXPLAIN não usa não entra e fica registrado como recusado. | A Notion 9.1.3 pede revisão de índices; revisão sem medição é chute. Migration verde em sqlite não prova índice (lição 15). |
| D11 | **Cenário de medição = `PerformanceScenarioSeeder`**, dev-only, mesmo gate do `OperationDemoSeeder`: ~5.000 alunos, ~200 clientes, ~50 redatores, ~500 turmas, ~8.000 matrículas, ~6.000 certificados, cinco anos. Insert em lote com hash de senha fixo, não Actions. Só para `EXPLAIN` e latência; a suíte segue com N pequeno. | Ordem de grandeza acima do plausível, para a medição não mentir para baixo (decisão do João: "não sei ao certo — use ordem segura"). 5k bcrypt por Action inviabiliza. |
| D12 | **Sem cache, sem Redis.** Registrado como decisão, não como adiamento. | 10 usuários; nenhuma medição vai justificar cache antes de query, índice e página. |
| D13 | **D-15: dono único em `App\Shared\Support\JanelaDeAviso::DIAS = 30`.** Os três sítios referenciam; comportamento idêntico. | Três domínios consomem; Shared é o único lugar que não abre aresta na matriz. Se certificado e documento um dia quiserem janelas diferentes, a separação nasce aí, com regra explícita. |
| D14 | **`useCrudPage` ganha fallback `resource.useOne(id)`** quando a entidade do dialog não está na página carregada. | Com página, a entidade do `openViewById` (deep link) e a do dialog aberto pode estar fora de `items`; hoje o hook deriva da lista viva e devolveria `null`. |
| D15 | **`SignedUrlTransformer` fica fora.** | Uma assinatura S3 por foto por linha deixa de escalar com a lista quando a página tem 10-25 linhas. |

## 4. Arquitetura

### 4.1 Contrato de página (`App\Shared\Pagination`)

- `PageRequest` (spatie/laravel-data, entrada): `page` (int, ≥1, default 1), `per_page` (int,
  1..100, default 25), `q` (string, ≤100, opcional), `sort` (string, opcional). Validação por
  `rules()`; a allowlist de `sort` é injetada pela lista (ver `Paginates`), não hardcoded aqui. Os
  DTOs de request de cada lista **estendem** `PageRequest` e acrescentam os filtros nomeados.
- `PageMetaData` (`#[TypeScript]`): `page`, `per_page`, `total`, `last_page`, `total_unfiltered`.
- `PageData` (`#[TypeScript]`): `data: array`, `meta: PageMetaData`. O item da coleção é tipado
  pelo docblock (`@var array<StudentData>`) — o transformer não emite genérico, então o front
  declara `Page<T>` à mão em `shared/api/page.ts` (§4.5) e casa `data` com o tipo gerado do item.
- `Paginates` (trait para `QueryBuilder`): `public const SORTABLE = ['campo' => 'coluna.sql']`,
  `public const DEFAULT_SORT = '-created_at'`, `searchable(string $q): static` (cada builder
  implementa), `page(PageRequest $r): PageData` — aplica `searchable` quando `q`, resolve `sort`
  pela allowlist (fora dela lança `ValidationException`), roda `count()` do escopo com e sem
  filtro, e `forPage()`. `total_unfiltered` é medido **antes** de `searchable`/filtro e **depois**
  de `visibleTo`.
- Controller: `index(StudentPageRequest $request)` → `Student::query()->...->page($request)`.
  Continua fino; quem sabe filtrar é o builder.

### 4.2 As três listas

| Endpoint | `q` varre | `SORTABLE` (default) | filtro nomeado |
|---|---|---|---|
| `GET /api/students` | `users.name`, `users.rut` | `name` (asc), `rut` | — |
| `GET /api/certificates` | `codigo`, `snapshot->aluno.name`, `snapshot->aluno.rut` | `created_at` (desc), `codigo`, `valido_ate` | `display_status` |
| `GET /api/turmas`, `GET /api/turmas/archived` | `courses.name`, `users.name` do contratante, `quotes.code`, `budgets.code` | `created_at` (desc), `start_date`, `end_date` | `status` |

`students` deixa de ordenar em PHP: `orderBy` por join em `users.name` (o `StudentQueryBuilder`
nasce aqui — é o único dos três agregados sem builder).

`display_status` em SQL, com `hoje` em `America/Santiago` calculado uma vez por request:
`revocado` = `status = 'revocado'`; `vencido` = `valido_ate < hoje`; `por_vencer` =
`valido_ate > hoje AND valido_ate <= hoje + 30`; `vigente` = `valido_ate IS NULL OR valido_ate >
hoje + 30`. Os 30 vêm de `JanelaDeAviso::DIAS` (D13). A busca em `snapshot` usa JSON path
(`snapshot->'$.aluno.name'`); a task mede com `EXPLAIN` a 6k linhas e, se degradar, promove a
coluna gerada indexada — a decisão é da task, com o número na `audits/`.

`status` de turma em SQL: `concluida` = `status = 'concluida'`; `habilitada` = `status =
'em_andamento'` **e** `whereHas('documentacaoObrigatoria')` para cada um dos três
`TurmaDocumentType`; `em_andamento` = `status = 'em_andamento'` e não habilitada.

`meta.summary` de certificates: um `SELECT ... GROUP BY` com o mesmo `CASE` do filtro sobre o
escopo de `q` (sem o filtro de status — o resumo é o que o usuário escolhe a partir dele).

### 4.3 Paridade e catracas de N+1

- `CertificateDisplayStatusParityTest`: fixture com certificado em cada ramo (inclusive nas bordas
  `hoje`, `hoje + 30`, `hoje + 31`, `valido_ate` nulo, revogado com data futura); classifica por
  `CertificateDisplayStatus::for()` e pelo filtro SQL; os conjuntos têm de ser iguais.
- `TurmaStatusParityTest`: mesma forma para `turmaDisplayStatus` — turma concluída, em andamento
  com três documentos, com dois, com nenhum, e com documento arquivado (que não conta).
- `ListQueryBudgetTest` (D9): descobre no router toda rota `GET` sem parâmetro de rota cujo
  controller devolve lista; semeia N=2 e N=20 do agregado; a contagem de queries (`DB::listen`) tem
  de ser igual. Rotas com parâmetro (`turmas/{turma}/alunos`, `budgets/{budget}/quotes`) entram
  por lista explícita com o pai semeado. Isentas declaradas com motivo. `dashboard/metricas` entra
  como admin e como redator com número fixo cada.
- `preventLazyLoading` (D8) ligado no `AppServiceProvider`; os cinco testes que o ligavam à mão
  deixam de precisar.

### 4.4 Índices, cenário e Dashboard

- `PerformanceScenarioSeeder` (D11) em `database/seeders/`, chamado só por comando explícito
  (`db:seed --class=PerformanceScenarioSeeder`), com o mesmo gate de ambiente do
  `OperationDemoSeeder` e abortando se já houver mais de 1.000 alunos. Não entra no
  `DatabaseSeeder`.
- Uma migration `2026_08_28_000001_add_performance_indexes.php` com **só** os índices que o
  `EXPLAIN` aprovou (D10), cada um com o motivo no docblock apontando para a medição em
  `audits/2026-08-28-hardening-performance-e-dados-medicoes.md`. A P-66 fecha nessa migration se
  `login_logs(created_at)` for aprovado — e é esperado que seja: a poda é `WHERE created_at <`.
- Dashboard: medido pela catraca (D9). Correção só do que a contagem provar. As três leituras do
  `DashboardWindows::expiryHorizon()` passam a vir de `JanelaDeAviso::DIAS` (D13).

### 4.5 Frontend — kit lazy

- `shared/api/page.ts`: `PageMeta` (espelho de `PageMetaData` gerado), `Page<T, M extends
  PageMeta = PageMeta>`, `PageQuery` (`page`, `per_page`, `q?`, `sort?`, `[filtro]?`),
  `pageEndpoint<T, M>(url)`. Só aqui se conhece o envelope; `shared/lib` continua sem importar de
  `shared/api`.
- `shared/hooks/useServerTable<T, M>(fetch, { filters, rows = 10, key })`: estado de
  `first`/página, termo com debounce de 300 ms, `sort`, filtros; monta a `PageQuery`; roda
  `useQuery` com `placeholderData: keepPreviousData`; devolve `SearchableTableState<T>` (mesma
  forma do `useTableFilter` — a moldura não distingue) mais `totalRecords`, `meta`, `onSort`,
  `sortField`, `sortOrder`, `loading`, `error`, `refetch`. `filtering = term !== '' ||
  meta.total !== meta.total_unfiltered`; `filteredByScope` só pela segunda metade. Trocar termo,
  filtro ou sort volta à primeira página.
- `SearchableTableFrame` ganha `totalRecords?`, `onSort?`, `sortField?`, `sortOrder?` e repassa ao
  `AppDataTable` com `lazy` quando `totalRecords` vem. `AppDataTable`: `paginated` e a faixa de
  controles usam `totalRecords ?? value.length`; `hasRows` continua por página.
- `useCrudPage` (D14): `ListableResource<T>` ganha `useOne?`; a entidade do dialog vem de `items`
  ou, ausente, de `useOne(id)`.
- `archivableSource`/`ListSource<T>` ganham `totalRecords?: number` — opcional, para as cinco
  raízes que não paginam continuarem iguais.

### 4.6 Frontend — as três telas e o painel

- **Students**: `useStudentsPage` troca `useCrudPage(studentsApi)` por `useServerTable` sobre
  `pageEndpoint<StudentData>('/api/students')`; `StudentsTable` recebe `table` pronto; a coluna
  `name` `sortable` vira `onSort` server. `PeoplePage.test.tsx` (D-04, aba lazy) continua valendo.
- **Historial**: `useHistorial` usa `useServerTable` com filtro `display_status`; `statusSummary`
  lê `meta.summary`; `findReissueTarget` segue no painel. `refetchOnWindowFocus: true` continua
  (catraca em `certificatesApi.test.tsx`).
- **Turmas**: `TurmasTable` recebe `table` de `useServerTable` com filtro `status`; `useTurmas` e
  `useTurmasArchivedList` recebem a `PageQuery`; `OperationPage` compõe ativo/arquivado pela mesma
  `archivableSource`, agora com `totalRecords`.
- **Painel de emissão**: `useEmissionPanel(enabled, concluidasDesde)`; `EmissionPanel` ganha um
  `AppDatePicker` (já existe em `shared/ui`) preenchido com o default do servidor e rótulo
  "turmas concluídas desde".
- `generated.ts` regenerado; consumidores ajustados no mesmo commit (lição 11).

## 5. Catracas

| Catraca | O que reprova |
|---|---|
| `ListQueryBudgetTest` | rota de lista cuja contagem de queries cresce com N; rota nova sem declaração |
| `preventLazyLoading` (não-prod) | qualquer `fromModel` atravessando relação não carregada |
| `CertificateDisplayStatusParityTest` / `TurmaStatusParityTest` | SQL de filtro divergindo da classificação do domínio |
| `PageRequestTest` | `per_page` > 100 aceito; `sort` fora da allowlist aceito; `page` 0 |
| `AppDataTable.test.tsx` / `SearchableTableFrame.test.tsx` | modo lazy sem controles de página quando `totalRecords > rows` |
| `useServerTable.test.ts` | termo sem debounce; página não voltando a 0 ao filtrar; `filtering` por presença em vez de efeito |
| `DomainDependencyTest` | aresta nova não declarada (se `JanelaDeAviso` for referenciada por domínio — Shared não é aresta) |

## 6. Fora de escopo

- Paginar courses, users, redatores, clients, quotes por budget, alunos por turma e as cinco
  `/archived` dessas raízes (D1).
- Cache de qualquer forma; Redis (D12).
- `SignedUrlTransformer` por linha (D15).
- Endpoint de listagem de `audits` ou `login_logs` — não existem e não nascem aqui.
- Índice de `audits.event` para o `ArchiveTrailQuery` — lista arquivada é bounded pelas raízes
  que não paginam; se o EXPLAIN das `/turmas/archived` mostrar o join degradado, entra pela D10.
- Refatorar os `with()` repetidos do `UserController` para um `UserQueryBuilder` — `users` não
  pagina e não tem N+1; fica como observação, não como task.
- D-34 (visibilidade do Dashboard no payload) — outra frente.

## 7. Definition of Done

Provado contra a API real (`:8080`) e o MySQL de dev com o `PerformanceScenarioSeeder` aplicado,
registrado em `audits/2026-08-28-hardening-performance-e-dados-medicoes.md`:

1. `GET /api/students?per_page=10&q=<nome>&sort=-name` devolve `data` com 10 linhas, `meta.total`
   do escopo filtrado e `meta.total_unfiltered` = 5.000; `per_page=101` devolve 422
   `application/problem+json`; `sort=email` devolve 422.
2. `GET /api/certificates?display_status=por_vencer` devolve só linhas cujo `display_status` é
   `por_vencer`, e `meta.summary` soma `meta.total_unfiltered`.
3. `GET /api/turmas?status=habilitada` para admin devolve só turmas com os três documentos; o mesmo
   request como redator devolve só as dele (`visibleTo` antes da contagem).
4. `GET /api/certificates/emission-panel` sem parâmetro devolve só turmas concluídas nos últimos 12
   meses; com `concluidas_desde=2021-01-01` devolve as cinco safras.
5. `ListQueryBudgetTest` verde com todas as rotas de lista cobertas; ao menos uma sonda (remover um
   `with()` de um `LISTING`) vista reprovar e revertida.
6. `EXPLAIN` de cada índice aprovado mostrando `key` usado e `rows` menor que antes; latência de
   `GET /api/students?per_page=25`, `GET /api/certificates?per_page=25` e
   `GET /api/dashboard/metricas` medida com `curl -w` antes e depois, a 5k/6k linhas.
7. No navegador (Chromium, `es-CL`): busca, filtro, ordenação e troca de página em Students,
   Historial e Turmas disparam requests com os parâmetros na URL (aba Network) e o rodapé conta
   `meta.total`; "Ver" num aluno da página 3 abre o dialog; o painel de emissão mostra a data
   default e recarrega ao mudar.
8. `JanelaDeAviso::DIAS` é o único `30` de aviso no backend (`grep` por `= 30` nos três sítios
   antigos vazio).
9. Gate: backend verde pelo comando do `CLAUDE.md` §6; `pnpm lint` 0, `pnpm build` verde, `pnpm
   test` verde; Pint nos arquivos tocados; `typescript:transform` sem diff residual.

## 8. Riscos

- **Busca em `snapshot` JSON** pode virar full scan a 6k linhas. Mitigação: medição na task; a
  coluna gerada é o plano B já desenhado.
- **`preventLazyLoading` global** pode reprovar caminhos que a suíte não cobria (testes que
  hidratam um model e leem relação). Mitigação: rodar a suíte inteira na task que liga; cada
  reprovação é um eager-load faltando, corrigido no mesmo commit.
- **Colisão com a `lane-c`** (item 18): `HistorialTable.tsx` é o único arquivo que as duas lanes
  editam — corpo de célula lá, props de tabela aqui. Este bloco não toca `style.ts`/`pt` do
  `AppDataTable` nem `AppButton`. Conflito de merge esperado, pequeno.
- **`keepPreviousData`** mostra a página anterior durante o fetch da próxima; com `loading` da
  moldura ligado no `isFetching`, o usuário vê a faixa "carregando" sobre dados válidos — é o
  comportamento desejado, mas a catraca do `AppDataTable` para erro (linhas vazias) tem de
  continuar valendo só em erro.
