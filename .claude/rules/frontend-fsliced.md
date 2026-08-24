---
paths:
  - "frontend/src/**"
  - "frontend/vite.config.ts"
  - "frontend/tsconfig.app.json"
---

# Frontend — feature-sliced (ADR-05)

`frontend/src/` em 3 camadas por alcance:
- **`app/`** — shell: `router/` (rotas + guards por role), `layouts/`, `providers/` (QueryClient,
  tema, i18n, stores raiz), `App.tsx`.
- **`features/<dominio>/`** — 1:1 com o backend (`identity` cobre auth **e** redator/pessoas;
  `commercial`; `catalog`; etc.). Cada uma: `api/` (hooks TanStack Query), `components/` (sub-pasta
  por entidade quando passa de ~3 arquivos: `Login/`, `Redator/`, `Client/`), `hooks/`, `lib/`.
- **`shared/`** — `api/` (axios + csrf + `createCrudResource`), `stores/` (Zustand transversal:
  `uiStore` tema/idioma, `sessionStore` usuário), `types/` (GERADO), `ui/` (wrappers PrimeReact +
  moldes `ModulePage`/`CrudDialog` + barrel), `hooks/` (`useCrudPage`, `useEntityForm`,
  `usePermissions`, `useClock`), `lib/` (`CHILE_REGIONS`, datetime, roles, `DialogMode`), `config/`
  (tema em runtime — ADR-16, i18n — ADR-15), `testing/` (kit de teste — mocks de biblioteca externa).

Aliases (`@`, `@app`, `@features`, `@shared`) em `vite.config.ts` **e** `tsconfig.app.json` —
sincronizados. 

**Regra de dependência:** só aponta para baixo. Feature usa shared; shared NUNCA usa feature;
feature NÃO importa outra feature — **nem para tipo** (union compartilhado vai para `shared/lib`).
Composição cruzada acontece na camada `app`/rota ou via API (ex.: `coursesApi` read-only em
`shared/api` para o redator consumir sem importar `catalog`). **Validação QR pública** é a rota
`/validar/:uuid` desta SPA, fora do ramo protegido e do `SessionBootstrap` (spec D14/D19 da
certificação); a API pública `/api/publico/certificados/{uuid}` responde sem cookie.

**server vs client state (ADR-05):** dado de servidor → TanStack Query; UI/sessão → Zustand.
Não misturar. **Onde mora o dado de servidor (ADR-18):** o cliente REST (`createCrudResource`)
nasce SEMPRE em `shared/api`; `features/<x>/api/` fica só com hooks de sub-recurso acoplados a uma
tela (`useQuotes`, `useCommercialFiles`, `useRedatorDocuments`). Estado que **cruza componentes**
(tema, sessão, wizard multi-tela compartilhado) → Zustand; estado local de um form/passo que vive
num só componente fica em `useState` (ref.: passo do `QuoteWizard` em `useQuoteForm`). Não promover
a Zustand o que não cruza fronteira — é over-engineering.

## Padrões de código (crystalizados — desviar só conforme Parte 0 do INSTRUÇÕES)

- **Fábrica CRUD:** `createCrudResource<T>(resource)` = os 5 verbos REST (`api.post<T>` etc.,
  **sempre com generic**, senão `r.data` vira `any`). Sub-recursos nested (contatos, endereços,
  documentos, sync de cursos) = hooks pequenos por feature, **fora** da fábrica, invalidando a key
  do pai.
- **Axios (`shared/api/axios.ts`):** a instância **não** fixa `Content-Type` (exporta `api` com
  `withCredentials`/`withXSRFToken`; interceptor normaliza todo erro para `ProblemDetails`). Deixe o
  axios derivar: objeto → JSON; `FormData` → multipart+boundary. Fixar json faz todo `FormData`
  virar JSON e cada `File` virar `{}` — upload chega vazio, 201 silencioso (peso legal). `initCsrf()`
  (`shared/api/csrf.ts`) roda uma vez antes da 1ª mutação.
- **Upload: `postMultipart` (`shared/api/postMultipart.ts`), nunca `new FormData()` na feature.**
  `postMultipart<T>(url, fields)` sobre `Record<string, string | File | undefined>` é o único ponto
  que monta multipart: chave `undefined` é **omitida** (não vira a string `"undefined"` numa coluna
  de data) e a chamada ao axios não tem terceiro argumento — não há onde encaixar o `Content-Type`
  do parágrafo acima. A mutation continua sendo da feature (query keys e invalidação próprias); só o
  transporte é que mora num lugar. Mecanismo, não pedido: `no-restricted-syntax` reprova
  `new FormData()` em `src/features/**`. Exceção única e declarada — `useRedatorForm`, que monta
  array e chave polimórfica. Mutation de `delete` não entra em helper: é `api.delete(url)` de uma
  linha, sem transporte a centralizar.
- **Wrappers `shared/ui`:** features importam `AppButton`, nunca `Button` do pacote.
  Pasta-por-componente (`AppButton/AppButton.tsx` + `index.ts`), reexporta `AppXProps`
  (fecha a fronteira de tipo — a feature importa `AppButtonProps`, nunca `ButtonProps`). Barrel raiz
  `shared/ui/index.ts` é a única porta. Customização de componente Prime vive aqui, nunca com Tailwind
  na feature. Em wrappers com handler embutido (upload), **pine o override após o spread**
  (`customUpload` não pode ser desligado pelo caller).
- **`forwardRef` no wrapper é condicional, não cerimônia.** Leva quem embrulha componente de função
  com ref de DOM útil — foco, seleção, medida: `AppInputText`, `AppPassword`, `AppTextarea`,
  `AppMenu`. **Não leva** quem embrulha *class component* do Prime (`RadioButton`, `Dropdown` — o
  ref não é DOM e `forwardRef` só mente sobre o tipo) nem wrapper apresentacional sem ref
  (`AppButton`, `AppTag`, `AppDivider`). Hoje: 4 dos 34 wrappers — a minoria é o normal, não a
exceção. Na dúvida, siga o vizinho da mesma
  categoria (`AppRadioButton` segue o `AppDropdown`, não o `AppInputText`).
- **`shared/testing/` é o kit de teste, e só ele mocka biblioteca externa.** `mockUseTranslation`
  (`shared/testing/i18n.ts`) é a forma real de `useTranslation` — `{ t, i18n, ready }`. Mock parcial
  escrito à mão no arquivo de teste está proibido: foi assim que 17 arquivos ficaram com a forma
  errada e o primeiro `AppDropdown` renderizado estourou com
  `Cannot read properties of undefined (reading 'language')` (D-39). Campo novo que a API do hook
  exigir entra na fábrica, não nos consumidores.
- **Tailwind = layout** (grid/espaçamento); cor via variável CSS do tema (ADR-16). Utility não vence
  a especificidade do tema — ao depurar estilo, cheque o **seletor completo do markup**, não a classe
  isolada.
- **Componente de feature = declarativo.** Estado, mutations/queries, navegação e derivação vão para
  um hook da feature (`features/<x>/hooks/useAlgo.ts`, ex. `useLoginForm`); o componente só consome e
  renderiza JSX. Wrappers `shared/ui` são a exceção (puro apresentacional).
  **Isto é lint, não conselho:** `no-restricted-syntax` em `eslint.config.js` reprova
  `xxxApi.useAlgo()` e `useQuery`/`useMutation` diretos sob `src/features/*/components/**`.
  `useMutationErrors` continua liberado — é consumo de erro, não busca de dado.
  O seletor casa também o **argumento, em qualquer posição**: `useCrudPage(budgetsApi)` e
  `useEntityForm(mode, clientsApi)` reprovam dentro de um componente, porque a query mora dentro do
  hook chamado do mesmo jeito. Nasceu casando só `arguments.0` e isso reproduzia o próprio buraco que
  ele fecha — corrigido no review de 2026-08-04 (Q-2). É por isso que os 7 aliases
  `useXPage` existem em `features/<x>/hooks/` — eles não são delegação vazia, são o que mantém a
  query fora da página; eliminá-los regrediria a fronteira e o lint antigo não veria (2026-08-04).
  A regra nasceu de
  reincidência medida: o MESMO achado (query + derivação dentro do componente) custou um bloco de
  refactor em duas sprints seguidas — Q-4 do `abstracao-componentes-redator`
  (`RedatorCourseSelector`) e C-1 do `abstracao-componentes-operation` (`TurmaConfigCard`) — porque
  a regra era parágrafo e o gate era grep por-pasta, que só prova a feature recém-limpa (lição 14).
  A regra nasceu com uma **catraca**: 7 componentes legados em `ignores`, lista que só encolhia.
  **Zerada em 2026-08-03** — o bloco `ignores` não existe mais e a regra vale sem exceção. Não
  reintroduza o campo para calar um arquivo: componente que precisa de query ganha um hook em
  `features/<x>/hooks/`.
- **Componente de feature acima de ~150 linhas quer extração, não rolagem.** Passou da régua, procure
  o bloco coeso preso lá dentro — quadro de itens de uma coleção, seção de um formulário, ramo de
  estado com markup próprio — e tire-o para um componente irmão em `features/<x>/components/`.
  Moldes já provados: `ContactFields`/`ContactCard` (`ClientDialog` 199 → 132) e
  `ModuleFields`/`ModuleCard` (`CourseDialog` 251 → 96). Extração é **movimento literal**: nenhuma
  condicional muda de forma, nenhum `key` muda de critério, e quem tinha irmãos diretos devolve
  `Fragment`, não `<div>` — um nó novo muda o espaçamento do `space-y-*` do pai.
  **Isto é lint, não conselho:** `max-lines` (150) em `eslint.config.js` sobre
  `src/features/*/components/**`. Vale só para `components/` — hook longo é legítimo, componente
  inchado não. A régua nasceu com uma **catraca**: 4 legados em `ignores` (`StudentDialog`,
  `RedatorDialog`, `RedatorDocumentSlot`, `BudgetDetailPage`), lista que só encolhia.
  **Zerada em 2026-08-13** — o bloco `ignores` não existe mais e a régua vale sem exceção. Não
  reintroduza o campo para calar um arquivo: componente que passar dela extrai o bloco coeso.
  Ela nasceu de reincidência medida — o mesmo achado custou **três blocos consecutivos**
  (`abstracao-componentes-operation` 2026-08-02, `zerar-catraca-e-componentes-commercial` e
  `abstracao-componentes-catalog` 2026-08-03) — e de uma lição mais cara: a régua era **citada** pelas
  specs e pelo `state.md` como se estivesse escrita aqui, e não estava em lugar nenhum (lição 13).
- **Kit de arquivados: um só, em `shared/`, parametrizado — root novo não copia o trio.** Um
  agregado que ganha arquivar/restaurar entra pelas três peças que já existem: `useArchivedPage`
  (modo, lista, restore **com os dois toasts** dentro) e `useArchiveAction` (arquivar com os
  toasts e o `onSuccess` que fecha o diálogo) em `shared/hooks/`; `ArchiveRowActions` e
  `ArchiveConfirmDialog` em `shared/ui/`. O hook da feature só diz QUAL recurso e QUAL agregado
  (`useCoursesArchived` são 13 linhas); o `*RowActions` da feature é adaptador — chama `can()` e
  passa **booleanos**, porque `shared/ui` não importa `shared/hooks`. Copiar um `*RowActions` de
  outro root para trocar duas strings de permissão é o sinal de que faltou prop, não de que o root
  é diferente. Diferença legítima é de COMPORTAMENTO e mora na prop: `Budget`, `Quote` e
  `Enrollment` não têm botão de arquivar na lista (o deles vive no detalhe do pai), e o staff usa a
  MESMA permissão nas duas ações (`identity.access.manage`, SEGREGADA — spec D7 do bloco
  `arquivados-roots-restantes`). **Reincidência medida:** o molde nasceu em `arquivados-e-restauracao`
  com 2 roots e o bloco seguinte o replicou à mão para 6 — 397 linhas de `*RowActions` quase
  idênticas, 6 invólucros de toast e 5 blocos de `ConfirmDialog` (Q-3 do review de 2026-08-19). O
  custo não é o volume: é que o `busy` do clique duplo, o `onError` que dá corpo ao 403 e aos 422
  dos gates, e o "só fecha no sucesso" do diálogo precisariam ser corrigidos em seis sítios, sem
  nada que reprovasse o esquecimento no sétimo.
- **Catraca nova mede a própria população com o seletor dela, nunca com o grep que originou o
  débito.** Grep acha a **grafia**; o seletor acha o **defeito**. Antes de declarar a lista de
  sítios de uma regra nova, rode o seletor dela e conte — se o número não bater com o do grep, o
  grep é que está errado. Reincidência medida, duas vezes no mesmo `eslint.config.js`: a regra de
  query-em-componente nasceu casando só `arguments.0` e reproduzia o buraco que fechava (Q-2 de
  2026-08-04), e a de modo leitura do BD-3 nasceu de um `grep disabled={readOnly}` que achou 41
  sítios — o seletor por forma achou **17 a mais** (`disabled={f.readOnly}`,
  `disabled={readOnly || !isCreate}` e o par estático `<AppInputText disabled readOnly />`, este
  último com dado de peso legal truncado em input cinza). Uma catraca que enumera em vez de medir
  nasce com a exceção embutida e ninguém a vê, porque ela fica **verde**.
- **O que ramifica a tela é o DADO que falta, não o `status` da query.** `isError` cru substituindo
  a lista apaga cache utilizável: com `staleTime` 0 toda montagem refaz o GET, e um refetch falho
  mantém `data` populado enquanto `status` vira `error` (medido por sonda no review do BD-6). Por
  isso `useLoadState` (`shared/hooks/useLoadState.ts`) expõe `failedWithoutData` — falhou **e** não
  há nada em cache — e é **ele** que autoriza trocar a tela pelo `AppErrorState`. Com cache em mão,
  a falha vira aviso AO LADO da lista (`InlineLoadState`), que continua utilizável e preserva o que
  o usuário já digitou. O simétrico vale para o aviso: só anuncie a falha que **custou** alguma
  coisa na tela — a `QuotesList` avisava com `isError` cru e anunciava falha invisível quando o
  cache resolvia todos os nomes. Estado de carga de lista **não se deriva à mão na feature**: vem do
  `useLoadState`, que é onde a política "falhou" vs. "veio vazia" mora — seis hooks a repetiam e ela
  já tinha divergido (Q-1, Q-1b e Q-2 do review de 2026-08-14).
  A forma normalizada de lista é `ListSource<T>` e nasce num lugar só
  (`shared/hooks/listSource.ts`). Hook que monta `isError ? (error ?? {}) : null` à mão está
  recriando a política — o alias espalha, não deriva. **Duas exceções deliberadas:**
  `useHistorial` e `useEmissionPanelState` devolvem `null` onde esta devolve `{}` — é outra
  política, e normalizá-las muda o que a tela mostra; não as unifique sem DoD que cubra a mudança. E **retry devolve a promise**: é ela que
  mantém o "Reintentar" em `loading` enquanto o GET está em voo (Q-14), e `void query.refetch()`
  a engole **sem quebrar tipo nem teste** — TypeScript aceita descartar retorno, então quem
  guarda são as catracas de `listSource.test.ts`, `useLoadState.test.ts` e `useResourceState.test.ts`.
  A **mensagem** que a falha imprime é `loadMessage(estado, t)`
  (`shared/lib/screenDetail.ts`), não o par `errorDetail ?? t(errorHint)` escrito à mão — ele estava
  em 13 sítios de 8 componentes (Q-3 do review do BD-18), e é ali que a política some quando alguém
  troca a ordem ou esquece o `??`: a tela mostra erro sem texto, proibido por peso legal. **QUANDO**
  imprimir segue sendo de quem imprime — o gate é `isError`, `loadError`, `failedWithoutData` ou
  `nameLost`, conforme o que a falha custou NAQUELA tela.
- **Reset de form = "adjust state during render"** (compara `id+mode` em `useState` + `setForm`
  condicional no corpo do render), **não** `useEffect` (lint `react-hooks/set-state-in-effect`).
  Referência: `useClientForm`.
- **Kit de form em `shared/ui/FormField/`:** `FormField` (campo + label + erro), `NestedField`
  (campo de item de coleção), `FormErrorSummary`/`FormErrorBanner` (erros sem campo onde pendurar).
  Todo diálogo usa o kit — **não reintroduzir `Field`/`UnmappedErrors` local** (era a duplicação nos
  6 diálogos que o Bloco 1 matou).
  - **Grupo de campos coeso = subcomponente da feature.** Um bloco de campos que representa uma
  entidade/conceito único (endereço, contato, período de vigência) e reaparece em mais de um
  diálogo, ou passa de ~4 campos irmãos, vira componente próprio (`AddressFields`, `ContactFields`)
  em `features/<x>/components/`, recebendo `value`/`onChange`/`readOnly`. Não é o kit `FormField`
  (átomo genérico) nem molde `shared/ui` (não tem regra de negócio de domínio) — é composição de
  feature. Contra-exemplo a eliminar: os 6 `<FormField>` de endereço repetidos inline no diálogo.
- **Lista de coleção nested com replace-total usa `key={i}`, nunca `key={item.id}`.** O replace
  recria as linhas a cada save, então o `id` **muda** — keyar por ele remonta a lista inteira e
  derruba foco/estado. O índice É a identidade estável aqui (a ordem do array é o `sort_order`).
  Ref.: lista de módulos do `CourseDialog`.
- **Manipulação de array nested vive no hook, não solta no JSX:** o hook expõe `add/remove/patch/move`
  (ref.: `useCourseForm`). Não vazar `setForm` para o componente via helper solto — o
  `patchContact(setForm, i, ...)` do `ClientDialog` é o contra-exemplo, não o molde.
- **Página CRUD:** `useCrudPage` guarda o ID e deriva a entidade da **lista viva** (não congela
  objeto); `useEntityForm` cuida de form + reset por prop + erros de mutação; moldes
  `ModulePage`/`CrudDialog`. Dialog unificado view=edit=create (campos vazios = cadastro); prop
  `onEdit` abre a edição a partir do view.
- **Tabela em card = `useTableFilter` + `AppCardToolbar` + `footerCount`.** Busca, `first` controlado,
  `clear()` **e `filtering`** vêm do hook (`shared/hooks/useTableFilter.ts`); a feature só declara
  `searchable` e, quando tem filtro próprio, `where`. **Não recalcule "estou filtrando?" na tela:**
  `TurmasTable` e `BudgetsTable` faziam isso com `status === null` e erravam o empty state juntas,
  porque o Dropdown do PrimeReact devolve o OBJETO da opção quando `option.value` é vazio
  (`dropdown.cjs.js:1441`; use `optionValue="value"` sempre que uma opção valer `null`/`''`).
  **Filtro próprio entra pelo par `filterSlot` + `onClearFilter`, e o par é obrigatório por tipo:**
  quem passa o slot passa o callback, porque o "Limpar filtros" do vazio promete os dois e o
  `table.clear()` do `useTableFilter` limpa só a busca. A composição é da moldura, não do chamador —
  o contrato era prosa, três telas remontavam o mesmo `clearAll` à mão e esquecê-lo devolvia um botão
  que não devolve a lista (mesma classe de falha silenciosa do parágrafo acima). Instrução repetida
  três vezes quer mecanismo (lição 14): virou união discriminada em `SearchableTableFrameProps`, e o
  esquecimento agora não compila (review do BD-4, 2026-08-13).
  **O rodapé é o paginador:** passe `footerCount` ao
  `AppDataTable` e não renderize `AppCardFooter` junto de tabela — o wrapper exibe a faixa sempre e
  os controles de página só quando passa de `rows` (spec D12). Reescrever o bloco na feature foi o
  que rendeu, em 6 cópias, um `RolesTable` com o paginador default ligado (duas faixas, contra a spec
  D6) e um empty state falso durante o loading. A supressão do vazio durante `loading` é do
  `AppDataTable`, não do chamador — **não** reintroduzir `emptyMessage={loading ? undefined : empty}`,
  que cai no default inglês do PrimeReact (`No available options`). Nunca fatiar a página fora do
  `DataTable`: com coluna `sortable`, ordenar a página em vez do conjunto é regressão silenciosa.
  **A memoização de célula fica DESLIGADA no wrapper (`cellMemo={false}`), e isso é correção, não
  ajuste de performance.** O comparador do `BodyCell` compara dado e não função — `keysToCompare`
  lista `rowData` e `field` e **não** lista `body` (`primereact/datatable/datatable.cjs.js:1795-1808`)
  —, então a closure nova que a troca de idioma produz nunca chega à célula: o cabeçalho repintava e
  o VALOR congelava até a recarga (D-55, medido no navegador no BD-17, pago no BD-12). O rekey em
  `i18n.language` foi recusado com o custo medido: remontar zera ordenação, página e filtro, que aqui
  são client-side. A prop entra **antes** do spread, então é sobrescrevível de propósito — uma tabela
  que um dia cresça a ponto de sentir o custo religa o memo. Mas religar **reintroduz o D-55 naquela
  tabela**, e nada reprova o esquecimento: a catraca (`AppDataTable.test.tsx`) monta o wrapper com os
  defaults e não vê o que o chamador sobrescreve. Hoje ninguém passa `cellMemo` (medido no review de
  2026-08-21: zero ocorrências fora do wrapper), então isto é linha de rule e não regra de lint —
  quem passar a prop assume o débito e declara onde.
- **Hook genérico não importa tipo de `shared/ui`.** `shared/hooks/` é lógica; `shared/ui/` é
  apresentação, e a seta aponta de `ui` para `hooks`, nunca ao contrário. Dois casos medidos:
  `useFilePreview` (que serve o `AppPhotoField` sem conhecê-lo) e `SearchableTableFrame` (que
  consome `useTableFilter` sem que o hook saiba da moldura). Hook que precisa do tipo de um
  componente está desenhado ao contrário — quem depende é o componente.
- **Quem deriva status de documento depende do CONTRATO, não do lado.** Onde o DTO **não** traz
  `status`, o front deriva: `RedatorDocumentData` (tela administrativa) só tem `valid_until`, e ali
  valem as regras conservadoras — `valid_until` inparseável → **vencido** (peso legal); sem documento
  obrigatório → `no_idoneo`. Onde o DTO **traz** `status`, o front **não recalcula**:
  `RedatorProfileDocumentData` (Meu Perfil) projeta `DocumentValidityStatus` já decidido em Identity,
  porque o Drive §5 fecha que *"o React não calcula compliance a partir de datas cruas quando o
  contrato puder fornecer o estado semântico"*. Esta linha já foi uma frase só ("status de documento
  e idoneidade se calculam no front"), verdadeira só na primeira metade desde que o contrato de
  perfil existe (bloco `meu-perfil-backend-self-service`, 2026-08-14) — lição 13 em doc normativo
  vivo. É também por isso que `ProfileDocumentSlot` é **irmão** do `RedatorDocumentSlot`, não reuso
  (spec D3 de `meu-perfil-frontend`): duas fontes de verdade para a mesma pergunta dentro do mesmo
  componente é o que faz a tela mentir sob refactor. **Divergência declarada, não resolvida:** o
  mesmo REUF pode ler `sin_venc` na tela administrativa e `vigente` no perfil — a raiz é
  `RedatorDocumentData` não ter `status`, correção de backend fora de escopo dos dois blocos.
- **i18n:** 3 locales (`pt-BR`, `es-CL`, `en`) com chaves **idênticas**; `es-CL` é a referência de
  rótulo (cliente chileno). `generated.ts` fica no `globalIgnores` do eslint.
- **Vocabulário de domínio é o do backend.** `Redator`, não `Writer`. Nome de tela pode ser em inglês
  (`PeoplePage`); a rota fica em espanhol (`/personas`) — é interface de usuário.
- **`can()` é conveniência de interface, não segurança.** A autorização é da API (ADR-07).

## Comandos

De `frontend/` (nativo no WSL — Node 22/pnpm):
`pnpm dev` · `pnpm build` (tsc -b && vite build) · `pnpm lint` · `pnpm test` (vitest run, jsdom;
`pnpm test:watch` para iterar).
Gate de verificação = `pnpm build` + `pnpm lint` + `pnpm test`.

**O runner existe desde 2026-08-03** (bloco `hardening-estrutural-pre-sprint-4`) e o corte cresceu:
cobre os hooks de `shared/hooks/` — os de maior fan-out do projeto — **e** hooks de feature, por
`renderHook` + `QueryClientProvider`, com o teste morando na própria feature (teste em `shared/`
importando `features/` quebraria a lei §5.6). Desde 2026-08-11 cobre também o **repositório**, em
`frontend/tests/`: `repo-docs-refs.test.ts` confere que todo path citado em doc normativo existe, e
mora aqui porque o container `app` monta só `./backend` e `./frontend`, então PHPUnit não lê a raiz.
Teste de componente **está** no corte, PrimeReact incluído. Medido com o runner em 2026-08-16, não
citado de memória: dos **13** arquivos que renderizam componente, **9 montam wrapper PrimeReact** no
jsdom (`ValidationPage`, `BudgetDetailPage`, `CourseStep`, `QuotesList`, `TurmaDetailPage`,
`ProfileDocumentSlot`, `DetailHeader`, `IdentityCell`, `InlineLoadState`) e os outros 4 são DOM puro
(`AppFileRow`, `PageHeader`, `FormField`, `Clock`). Sem `globals`: cada teste importa
`describe`/`it`/`expect` de `vitest`, para os arquivos de teste seguirem type-checados pelo `tsc -b`.
Este parágrafo dizia "sem test runner ainda" por um bloco inteiro depois de o runner existir (review
de 2026-08-04, Q-3); depois afirmou por mais quatro dias que o corte era só `shared/` quando já havia
oito testes de hook de feature; e afirmou "componente PrimeReact fora do corte" desde o BD-6, com
três testes desse tipo já verdes no mesmo repo (P-38, encerrada aqui). Mesma lição 13, no mesmo
arquivo, **três vezes** — quem lia a rule deixava de escrever teste que o projeto já sabia rodar.
