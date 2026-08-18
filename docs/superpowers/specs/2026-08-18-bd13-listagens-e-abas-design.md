# Design — BD-13 · listagens e abas: plural, ausência e custo de montagem

> Spec do `active_work_item` `bd13-listagens-e-abas`. Escrita em 2026-08-18, sobre a árvore da
> branch `feat/bd13-listagens-e-abas`, a partir de `main@b758068`. Sem Context Packet: ausência de
> fonte externa medida na promoção (grep por `drive.google`, `notion.so`, `figma.com`, `docs.google`
> e `http` nas 100 linhas de escopo devolve zero).

## 1. Fronteira do bloco

Cinco itens, **frontend puro**: D-02, D-04, D-05, D-06 e D-31.

`git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` deve devolver **zero
arquivo** no fechamento. É isso que mantém suíte de backend, Pint e `typescript:transform` N/A por
escopo medido — mesmo precedente do bloco do login (2026-08-13).

**A P-03 não dispara.** A ficha exige mais de um `active_work_item` de backend; continua havendo um
só (`arquivados-e-restauracao`, na branch `feat/arquivados-e-restauracao`). Este bloco não escreve
uma linha em `backend/`.

**A D-31 entra pelo gatilho literal dela** — *"entra em qualquer bloco que toque os dicionários por
outro motivo"* —, disparado pela D-02, que toca os três locales.

## 2. D-05 reformulada: a ficha registrava metade do problema

A ficha da D-05 descreve "bloco de erro bilíngue com caminho de campo cru na tela" e trata o campo
cru como defeito. **Medido contra `b758068`, o campo cru é decisão tomada e documentada, e o
bilinguismo é maior do que a ficha diz.**

1. **O `detail` em espanhol citando `aluno.name` é deliberado.**
   `backend/app/Domains/Certification/Exceptions/CorruptedSnapshotException.php:31-35` documenta que
   a mensagem implementa `PublicDetail` **de propósito**, escrita em es-CL, para o suporte descobrir
   QUAIS campos faltam no `AppErrorState` do `CertificateViewDialog`. É a D8 da spec de
   certificação. Apagar o `detail` da tela desfaria uma decisão já tomada.
2. **O envelope RFC 7807 não é localizado em lugar nenhum.**
   `backend/app/Shared/Exceptions/ProblemDetails.php:22-36,68,71` tem `title` e `detail` genéricos
   **literais em português** ("Erro interno", "Ocorreu um erro inesperado. Tente novamente.",
   "Erro ao processar a requisição."), apesar de `App\Shared\Http\Middleware\SetLocale` já traduzir
   por `Accept-Language` e de existirem `backend/lang/{en,es,es_CL,pt_BR}`. O `title` nunca chega à
   tela (o front usa `t('common.loadError')`), mas o `detail` chega: num 500 o cliente chileno lê
   **português**.

**Decisão do João (2026-08-18): opção A.** O front para de repetir o servidor nos estados de carga,
com a D8 preservada como exceção declarada; a localização do envelope vira **débito novo no
backlog**, para um bloco de backend, onde o custo da P-03 já estará pago. Descartadas: fazer a
localização aqui (tornaria BD-13 o segundo `active_work_item` de backend), fazer as duas coisas, e
não fazer nada.

## 3. Decisões

| # | Decisão | Escolha | Descartado |
|---|---|---|---|
| D1 | Alcance do plural i18next (D-02) | as 3 chaves com `(s)` **mais** as 14 de plural fixo = **17 chaves** | só as 3 da ficha; as 19 incluindo as duas frases |
| D2 | Custo de montagem das abas (D-04) | extrair as duas abas em componentes **e** `staleTime` nos dois hooks da página | só extrair (paga GET a cada troca de aba); gatear por `enabled` sem mover o sítio de chamada |
| D3 | Contrato de erro na tela (D-05) | o front só imprime `detail` que **ele mesmo** escreveu; débito de backend registrado | localizar o envelope neste bloco; fazer os dois; não mexer |
| D3b | Onde a política da D3 mora | nos **3 produtores** (`useLoadState`, `useResourceState`, `useDashboard`) mais os 13 sítios que leem o `ProblemDetails` cru | helper explícito nos 25 sítios; converter os 13 sítios crus a consumirem os hooks |
| D4 | Célula do snapshot corrompido (D-06) | texto i18n de campo ausente para o nome, `'—'` para o RUT, ambos tratando string vazia | travessão nos dois; cair para o `codigo` do certificado |

**Derivadas** (consequência das quatro, não escolha nova):

| # | Derivada |
|---|---|
| D5 | O plural não precisa de configuração nova no i18next: forma JSON v4 é o default do 26.x, e `Intl.PluralRules` resolve `es-CL`→es, `pt-BR`→pt, `en`→en, todas com exatamente `one`/`other`. |
| D6 | A `parity.test.ts` prova estrutura mas **não** prova plural — daí o teste comportamental do §4. |
| D7 | O deep link `?redator=` desce inteiro para `RedatoresTab`: a aba 0 é a ativa por default, então o link chega com o componente montado. |
| D8 | `staleTime` é por observer no TanStack Query v5, então pôr o valor nos dois hooks desta página não muda nenhum outro consumidor de `useCrudPage`. |
| D9 | `ProblemDetails` é interface escrita à mão em `shared/api/axios.ts`, **não** `generated.ts`: acrescentar campo a ela não toca a lei §5.3. |
| D10 | A `ValidationPage` entra na regra da D3, e isso é ganho não pedido: é rota pública de QR e hoje imprime a lista de campos do snapshot para quem escaneou o certificado. |
| D11 | A assimetria nome × RUT da D4 tem base medida: `CertificateSnapshotData::missingRequiredFields()` exige `aluno.name`, `curso.name` e `emissor.name` — RUT ausente é dado legítimo, nome ausente é corrupção. |

## 4. D-02 — plural do i18next em 17 chaves

**Forma:** `chave_one` / `chave_other`, JSON v4. Nenhuma mudança em `shared/config/i18n.ts`.

**Escopo medido:** 19 chaves usam `{{count}}` em `es-CL.json`. Entram 17:

Com `(s)` (a D-02 como registrada): `admin.count`, `course.count`, `courseModule.countShort`.

Com plural fixo no substantivo — mesmo defeito, outra roupa (`"1 clientes"`): `role.count`,
`dashboard.compliance.count`, `dashboard.redatorLoad.count`, `client.count`, `budget.count`,
`quote.studentsShort`, `redator.count`, `student.count`, `operation.pending.students`,
`operation.table.count`, `operation.enrollment.footerCount`, `certificate.vigenciaMeses`,
`certificate.certCount`, `certificate.validation.hours`.

**Fora, com motivo:** `certificate.emitAllPending` (número entre parênteses, sem substantivo ao
lado) e `certificate.batchConfirmBody` (frase com três concordâncias por língua — é reescrita de
copy, não sufixo).

**Consumidores medidos das três chaves da ficha**, para o teste saber onde olhar:
`admin.count` → `features/identity/components/Admin/UsersTable.tsx:31` (rodapé);
`course.count` → `features/catalog/components/Course/CoursesTable.tsx:30` (rodapé);
`courseModule.countShort` → `features/identity/components/Redator/CourseCard.tsx:32` — **não é
rodapé**, é badge de card.

**Prova.** `parity.test.ts` continua valendo de graça: `_one` e `_other` achatam como folhas
distintas, então locale que ganhe só uma das formas reprova. Ela **não** prova plural — copiar
`"{{count}} clientes"` nas duas formas passa verde. Entra um teste que, para cada uma das 17 chaves
e cada um dos 3 idiomas, renderiza `count: 1` e `count: 2` e afirma que as duas saídas **diferem**.

## 5. D-04 — a `PeoplePage` vira casca de abas

**O defeito é de sítio de chamada, não de mecanismo de aba.** `ModuleTabs = AppTabView = TabView`
sem `renderActiveOnly`, logo vale o default `true` do PrimeReact e só a aba ativa monta. Quem faz 2
GETs é `PeoplePage.tsx:16-17`, que chama `useRedatoresPage()` e `useStudentsPage()` **no corpo da
página**, acima das abas, onde o `renderActiveOnly` não alcança. A `CertificatesPage` já é o padrão
certo.

**Medição que muda o desenho:** `app/providers/AppProviders.tsx:6-10` não define `staleTime`, então
vale o default `0` com `refetchOnMount` ligado. Só extrair os componentes trocaria "2 GETs na
montagem, 0 por troca de aba" por "1 GET na montagem, **+1 por visita de aba**" — ida-e-volta três
vezes sairia 4 GETs contra os 2 de hoje. Por isso a D2 leva o `staleTime` junto.

**Desenho.**

- Novos: `features/identity/components/Redator/RedatoresTab.tsx` e
  `features/identity/components/Student/StudentsTab.tsx`. Cada um chama o próprio hook, monta a
  própria tabela e renderiza o **próprio** diálogo.
- `PeoplePage` fica com `ModulePage` + `AppCard` + `ModuleTabs` + os dois `ModuleTab`, e **nenhum
  hook de dados**.
- O deep link `?redator=` desce inteiro para `RedatoresTab`: o consumo no corpo do render e o
  effect que limpa a URL vão juntos, preservados como estão (o comentário de `PeoplePage.tsx:23-24`
  e `:31-32` explica por que um é render e o outro é effect — ele vai junto).
- `useCrudPage(resource, options?)` ganha segundo parâmetro, repassado a `resource.useList(options)`
  — que já aceita `Partial<UseQueryOptions<T[], ProblemDetails>>`
  (`shared/api/createCrudResource.ts:17-19`).
- `useRedatoresPage` e `useStudentsPage` passam `staleTime: 30_000`. Trinta segundos é a janela de
  alternância de aba de um operador; criação e edição já invalidam por `queryKey`, então a janela
  nunca segura dado que a própria sessão escreveu.

**Prova.** Teste que monta a `PeoplePage` com o `list` de cada recurso instrumentado: **1** chamada
na montagem, **1** ao abrir a segunda aba, **0** ao voltar à primeira dentro da janela. O teste
reprova se os hooks voltarem para o corpo da página.

## 6. D-05 — quem escreveu o `detail` decide se ele vai à tela

**Regra:** a tela só imprime `detail` que o **front** escreveu.

### 6.1 A superfície medida é 25, não 14

O grep inicial casava `.detail ??` e perdeu os sítios que escrevem `errorDetail ??`. Remedido:

| Superfície | Nº | Onde |
|---|---|---|
| `AppErrorState detail={x.detail ?? hint}` — objeto `ProblemDetails` cru | 13 | `shared/ui/AppDataTable/AppDataTable.tsx:85`, `app/pages/Dashboard/DashboardPage.tsx:57`, `features/operation/components/Turma/PendingQuotesPanel.tsx:27`, `features/operation/components/Turma/RedatorDesignation.tsx:21`, `features/operation/components/Turma/TurmaDetailPage.tsx:58`, `features/operation/components/Document/TurmaDocuments.tsx:20`, `features/commercial/components/Budget/BudgetDetailPage.tsx:43`, `features/identity/components/Student/StudentDetailSections.tsx:39`, `features/certification/components/Emission/EmissionPanel.tsx:20`, `features/certification/components/Emission/IssuedDialog.tsx:64`, `features/certification/components/Historial/ReissueDialog.tsx:48`, `features/certification/components/Validation/ValidationPage.tsx:102`, `features/certification/components/Historial/CertificateViewDialog.tsx:57` |
| `AppErrorState detail={x.errorDetail ?? hint}` | 4 | `features/identity/components/Profile/ProfilePage.tsx:39`, `features/commercial/components/Budget/CourseStep.tsx:52`, `features/catalog/components/Course/CourseRedatoresSection.tsx:31`, `features/identity/components/Redator/RedatorCourseSelector.tsx:42` |
| `InlineLoadState error={x.errorDetail ?? hint}` | 5 | `features/commercial/components/Budget/CourseStep.tsx:79`, `features/commercial/components/Budget/QuotesList.tsx:40`, `features/commercial/components/Budget/BudgetDialog.tsx:82`, `features/identity/components/Student/StudentClientField.tsx:61`, `features/identity/components/Profile/ProfilePage.tsx:50` |
| `InlineLoadState error={staleError}` | 3 | `app/pages/Dashboard/DashboardPage.tsx:89`, `app/pages/Dashboard/admin/PeriodFilter.tsx:71`, `app/pages/Dashboard/admin/AdminView.tsx:62` |

### 6.2 A política mora nos produtores (decisão do João, 2026-08-18)

**As 12 telas da segunda metade não mudam uma linha.** Elas já escrevem `?? t('common.loadErrorHint')`
— quando `errorDetail` passar a ser `undefined` para `detail` de servidor, **esse fallback vira o
mecanismo**, não código morto.

- `ProblemDetails` (`shared/api/axios.ts:5-12`) ganha `localDetail?: true`.
- Marcam o campo os três envelopes que o front sintetiza: rede caída (`axios.ts`, ramo
  `!error.response`), corpo de erro não-objeto (`axios.ts:91-97`) e corpo não-JSON
  (`shared/api/problemFromBlob.ts:21-27`). Esses três continuam na tela porque já são i18n **e dizem
  coisa distinta**: `common.unexpectedErrorHint` é "Não foi possível processar a resposta do
  servidor", que o `common.loadErrorHint` ("Verifique sua conexão e tente de novo") não diz.
- Helper novo `screenDetail(problem)` em `shared/api`: devolve `problem.detail` quando `localDetail`,
  senão `undefined`.
- **Três produtores** passam a aplicá-lo: `shared/hooks/useLoadState.ts:25`,
  `shared/hooks/useResourceState.ts:22` e `app/pages/Dashboard/useDashboard.ts:177` (`staleError`,
  que devolve `null` em vez de `undefined` por causa do tipo declarado em `:51,58`).
- **Doze sítios** trocam `x.detail ?? t('common.loadErrorHint')` por
  `screenDetail(x) ?? t('common.loadErrorHint')` — os 13 da primeira linha da tabela menos a exceção
  abaixo.

**`errorDetail` muda de significado em `shared/`**, e isso é o custo declarado desta escolha: deixa
de ser "o `detail` do problema" e passa a ser "o `detail` que pode ir à tela". Paga-se com docblock
nos três produtores e com teste de cada um deles nos dois ramos.

### 6.3 A exceção, e é uma só

`features/certification/components/Historial/CertificateViewDialog.tsx:57` **mantém o `detail` cru**.
É a D8 da spec de certificação — o lugar desenhado para o suporte ler quais campos faltam, e o motivo
de `CorruptedSnapshotException` implementar `PublicDetail`. O sítio ganha comentário dizendo que a
exceção é deliberada, para o próximo grep não a "consertar".

**A `ValidationPage` entra na regra**, e é ganho não pedido: rota pública do QR, hoje imprimindo
`aluno.name, curso.name` para quem escaneou o certificado.

### 6.4 Fronteira verificada

Nos 25 sítios, `AppErrorState` e `InlineLoadState` são exclusivamente superfície de **falha de
carga** (query de lista, de detalhe, ou refetch falho com cache em mão). Erro de mutação e validação
sobe por `FormErrorBanner`/`useMutationErrors` e **não é tocado** — nenhuma mensagem de 422 some da
tela.

### 6.5 Prova

- Teste de `screenDetail`: envelope de servidor → `undefined`; envelope local → o `detail`.
- Teste dos três produtores nos dois ramos, provando que `errorDetail`/`staleError` some com erro de
  servidor e sobrevive com erro local.
- Teste na `ValidationPage` com um 500 `PublicDetail` real: `aluno.name` **não** aparece na tela e a
  dica genérica aparece.
- Teste no `CertificateViewDialog` com o mesmo 500: o `detail` **aparece** — a exceção da D8 é
  provada, não confiada.

## 7. D-06 — a célula de aluno do snapshot corrompido

`features/certification/components/Historial/HistorialTable.tsx:60` passa
`title={c.snapshot.aluno.name}` **sem fallback** e `description={c.snapshot.aluno.rut ?? '—'}` — e
o `??` só pega `null`/`undefined`, deixando `''` passar. `''` é exatamente o que
`CertificateSnapshotData::missingRequiredFields()` chama de corrompido (`trim($value) === ''`).

- Chave nova `certificate.snapshotMissingField` nos 3 locales ("Nombre ausente" / "Nome ausente" /
  "Name missing"), em tom mudo.
- **Nome** vazio ou nulo → texto da chave nova. Casa com a tag `certificate.snapshotCorrupted` que a
  mesma linha já carrega na coluna de estado (`HistorialTable.tsx:80`).
- **RUT** vazio ou nulo → `'—'`. A assimetria é medida: RUT não está em `missingRequiredFields`, é
  ausência legítima (aluno estrangeiro); só precisa parar de renderizar em branco.

**Prova.** Teste que renderiza a linha com `snapshot.aluno.name = ''` e afirma o texto da chave
nova na célula; e com `rut = ''`, afirmando o travessão.

## 8. D-31 — as duas chaves órfãs

Seis remoções: `profile.documents.noValidity` e `profile.identity.role` em `pt-BR.json`,
`es-CL.json` e `en.json`. Reconfirmadas órfãs: nenhum `.tsx` fora de `locales/` as consome.

`features/identity/components/Profile/ProfileDocumentSlot.test.tsx:118` cita `noValidity` numa
asserção **negativa**, com o i18n mockado devolvendo a chave — o teste continua válido e continua
guardando a decisão de não imprimir a linha. Só o comentário ganha a nota de que a chave deixou de
existir no dicionário.

## 9. DoD do bloco

- `pnpm test` verde, `pnpm lint` 0, `pnpm build` verde.
- Plural provado nas 17 chaves × 3 idiomas com `count: 1` e `count: 2`, com as duas saídas diferindo.
- Contagem de GET medida no devtools em `/pessoas` contra o backend do main tree: **1** na abertura,
  **1** na segunda aba, **0** na volta dentro da janela.
- `aluno.name` provado ausente da tela pública de validação com um 500 `PublicDetail` real.
- Backend, Pint e `typescript:transform`: **N/A por escopo medido**, provado pelo diff vazio do §1.

## 10. Alcance declarado para o review

O §6 é a única parte com alcance largo em `shared/`: 25 superfícies medidas, das quais 12 mudam de
comportamento **sem serem editadas**, mais `ProblemDetails`, `axios.ts` e os três produtores de
estado de carga (`useLoadState`, `useResourceState`, `useDashboard`).
Está declarada aqui para o `/revisar-sprint` classificar, não para a promoção classificar.

O §4 introduz plural do i18next, que é **forma nova nos três dicionários** — o repositório não usa
plural do i18next em lugar nenhum hoje.

## 11. Débito que sai deste bloco para o backlog

**Localização do envelope RFC 7807 (backend).** `ProblemDetails.php` devolve `title` e `detail`
genéricos literais em português e `CorruptedSnapshotException` devolve es-CL fixo, apesar de o
`SetLocale` já traduzir por `Accept-Language` e de as quatro `lang/` existirem. Só o `detail`
chega à tela hoje, e a D3 acabou de calá-lo nos estados de carga — mas ele continua chegando pelo
`CertificateViewDialog`, e o `title` continua errado para qualquer consumidor futuro da API.
