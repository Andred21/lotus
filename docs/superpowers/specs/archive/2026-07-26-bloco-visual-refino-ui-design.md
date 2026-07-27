# Spec de design — Bloco visual · Refinamento de UI por módulo

> Work item: `bloco-visual-refino-ui` · Data: 2026-07-26 · Estado na abertura: `ready_for_planning`
> Context packet: `docs/superpowers/context-packets/bloco-visual-refino-ui.md` (v3, `status: ready`)
> Fontes: 5 prints do protótipo anexados pelo João em 2026-07-26; Notion `H.2.1`
> (`[Template] Refinamento de UI/UX por módulo`); baseline levantado do código em `ac7b5c8`.
> Regras: ADR-05, ADR-07, ADR-16 (`docs/adrs.md`); `.claude/rules/frontend-fsliced.md`.

## 1. Objetivo

Uma passada de design que une duas frentes que o João decidiu tratar como um bloco só, com review
por partes:

1. **Composição visual** — camada compartilhada em `frontend/src/shared/ui` e migração das telas.
2. **Responsividade e estados** — o checklist `H.2.1`, oito itens por módulo.

O bloco é **100% frontend**. Nenhuma migration, nenhum DTO, nenhuma rota nova.

## 2. Divergência de fonte, resolvida

O backlog citava "Notion H.1.3" como fonte. As quatro páginas com esse EAP estão **em branco**, com
`Critério de aceite` vazio. O conteúdo real está em **H.2.1**, e o escopo dele é responsividade e
estados — não a composição visual que o backlog descreve. Decisão do João: o bloco entrega as duas
frentes.

A "auditoria de 2026-07-24" e a "baseline refinada de 2026-07-26" citadas no backlog **não existem
como arquivo**; buscas independentes do Codex e do Claude voltaram vazias. Foram substituídas por um
baseline levantado do código, versionado na seção `Baseline do código` do packet — para não sumir de
novo.

## 3. Decisões

### D1 — A ação mora no cabeçalho do container mais próximo

Não existe posição única. O protótipo mostra cinco composições:

| Contexto | Onde a ação fica |
|---|---|
| Página de módulo com busca | dentro do card, na toolbar, à direita, mesma linha da busca |
| Página de módulo sem criar | mesma toolbar, mas o slot da direita traz contagem, não botão |
| Página de detalhe | no cabeçalho da página, à direita, ao lado da tag de estado |
| Detalhe sem ação primária | cabeçalho traz só tags |
| Cabeçalho de card interno | título (+ badge de contagem) à esquerda, ação secundária à direita |
| Aba sem busca | grupo de botões à esquerda, acima da tabela |

O `PageHeader` sobrevive para título, descrição e tags. O que sai dele é a **ação primária de
módulo**, que desce para a toolbar do card.

### D2 — Composição explícita, não configuração por prop

`AppCard` expõe subcomponentes e as telas compõem. Alternativas rejeitadas:

- **`ModulePage` configurável** (props `search`, `primaryAction`, `footerCount`): quebra na primeira
  exceção. `Alumnos` tem dois botões e nenhuma busca; o detalhe de orçamento tem três cards `stat`
  antes do card de lista; Operación tem um card de alerta acima. Viraria um molde com oito props
  opcionais e ramificação interna — o oposto do apresentacional puro que o arquivo declara ser.
- **Um molde por forma** (`ModuleTablePage`, `ModuleTabbedPage`, `DetailPage`): três moldes com 80%
  em comum, divergindo com o tempo, e o detalhe de turma não cabe em nenhum (abas + tags no header +
  conteúdo heterogêneo por aba).

O protótipo mostra cinco composições em cinco telas. Configurar isso por prop é modelar variação
como exceção quando ela é a regra. Segue o padrão que `shared/ui` já usa em `FormField`/`NestedField`.

### D3 — A toolbar pertence à aba ativa, não à página

Em Comercial as abas ficam **dentro** do card e a toolbar vem **abaixo** delas. Logo a toolbar não
pode ser prop do `ModulePage`. Consequência direta: o ternário de
`CommercialPage.tsx:25-31` (`onBudgets ? budget.new : client.new`), que existe só porque a ação mora
no header da página, **desaparece**.

### D4 — Hover sim, zebra não

As três tabelas de módulo do protótipo mostram só hover; a lista de cotizaciones do detalhe mostra
alternância. Zebra e hover competem: com as duas, a linha sob o cursor fica ambígua nas linhas já
tingidas. Tabela com poucas colunas e bordas de linha não precisa de zebra para guiar o olho.

A lista de cotizaciones é lista de itens empilhados, não tabela — mantém a alternância como
separação de item. A distinção é intencional e declarada, não acidente.

### D5 — Empty state tem dois estados distintos

`AppEmptyState` com ícone, título, descrição e slot de ação. Dois usos:

- **Sem dado** — convida a criar: `Sin clientes registrados` + botão `Nuevo cliente`.
- **Busca sem resultado** — não convida a criar, oferece limpar: `Sin resultados para "zzz"` +
  `Limpiar búsqueda`.

Sem a distinção, uma busca por `zzz` num módulo cheio manda o usuário cadastrar quando o problema é
o filtro. Hoje são sete `emptyMessage` como string crua, que não distinguem nada.

### D6 — Footer: contagem sempre, paginador só quando há mais de uma página

Vai contra os prints, que se contradizem: Comercial mostra `3 clientes` sem paginador; Operación
mostra `1–4 de 4 turmas` com paginador de uma página só. Mesma situação, footers diferentes.
Adotamos uma regra única em vez de reproduzir a inconsistência.

Contagem sempre em prosa, à esquerda, esmaecida: `3 clientes`, `1–4 de 4 turmas`,
`4 alumnos matriculados`.

### D7 — `tone` semântico no `AppTag`, com estado e modalidade em escalas separadas

| `tone` | Estados no protótipo |
|---|---|
| `info` | `En curso`, `Matriculado` |
| `success` | `Concluida`, `Aprobado`, `Aprobada` |
| `warning` | `Habilitada`, `Pendiente` |
| `danger` | `Reprobado`, `Rechazada` |
| `neutral` | `Empresa`, `Presencial` |
| `accent` | `Online` |

Modalidade não é severidade: `Presencial` neutro e `Online` roxo vivem fora da escala de estado. O
mapeamento domínio → `tone` fica na feature (`operation/lib/turmaStatus.ts` já faz isso com
`turmaStatusSeverity`); `shared/ui` só conhece o `tone`. `shared` nunca importa feature (ADR-05).

### D8 — P-13: a coluna `CÓDIGO` fica como está

Correção de premissa durante o brainstorming: a coluna **já existe**. `TurmasTable.tsx:52-53`
renderiza `turma.quote_code` em monospace azul — igual ao protótipo na forma; só o valor difere
(`Scap 3 - Cot 1` em vez de `TR-45`). O filtro de busca também procura por `quote_code` e
`budget_code` (`TurmasTable.tsx:23-24`).

Remover seria perda funcional. Criar código próprio de turma exigiria coluna, sequência no padrão
ADR-17, DTO e regeneração de tipos — backend com peso legal num bloco vendido como refino visual.

Decisão: a coluna fica com `quote_code`. O bloco só troca o `text-sky-600` hardcoded por variável
CSS do tema, que é violação de ADR-16 hoje. **P-13 permanece aberta**, agora com decisão registrada
em vez de indefinição.

### D9 — Os andaimes do protótipo não são implementados

- **`Con datos` / `Sin datos`** no topo de Comercial e Operación — chave de demo do empty state.
- **`SuperAdmin` / `Administrativo`** no detalhe de orçamento, e o botão `Modo SuperAdmin` no card
  de Cotizaciones — prévia de papel. No produto quem decide é o RBAC real; `can()` é conveniência de
  interface, não segurança (ADR-07).

### D10 — `Administración` entra por força do contrato

O backlog listou quatro páginas de módulo. São cinco: os cinco consumidores de `ModulePage` passam
`actions`, incluindo `AdministracionPage.tsx:26`. Mudar o contrato quebra ela junto. Entra só o
realinhamento mecânico; o **redesenho** de Roles continua no backlog item 3.

### D11 — Coluna `ALUMNOS` de Comercial fica fora

O protótipo mostra `ALUMNOS` (12/8/15) na tabela de clientes. `ClientData` não tem contagem de
alunos — só `addresses[]` e `contacts[]`. Exigiria backend. Fica fora e vira pendência nova, mesmo
padrão do P-10.

## 4. Contrato da camada

### `ModulePage`

Perde `actions`. Fica `title` + `description` + `tags?` + `children`. O slot da direita do
`PageHeader` interno passa a ser de **tags de estado**, não de ação.

### `AppCard`

- `AppCard` — container: fundo, borda, raio, sombra sutil. Cor por variável CSS do tema (ADR-16),
  funcionando nos dois temas.
- `AppCard.Header` — título à esquerda com badge de contagem opcional; ação secundária à direita.
- `AppCard.Toolbar` — slot esquerdo (busca, filtros ou grupo de botões) e slot direito (ação
  primária ou contagem).
- `AppCard.Footer` — contagem à esquerda, paginação à direita. **Quem renderiza a paginação é o
  `AppDataTable`**, não o `AppCard.Footer`: o `DataTable` do PrimeReact já é dono do estado de
  página. O footer recebe o paginador pelo slot direito via `paginatorTemplate`, e o slot esquerdo
  leva a contagem. `AppCard.Footer` sem paginador (Comercial, `Alumnos`) rende só a contagem.
- `variant="stat"` com `tone` (`neutral | success | danger`) — número grande sobre rótulo, cor
  aplicada em texto, fundo tingido e borda. **Escala própria**, não a do `AppTag`: um card de
  estatística não tem `info`, `warning` nem `accent`, e forçar uma escala só faria o `AppTag`
  carregar tons que nunca usa ou o card aceitar tons sem significado.

### `AppEmptyState`

Ícone, título, descrição, slot de ação. Ver D5.

### `AppDataTable`

`pt` base ganha densidade e hover; sem zebra. O merge do `pt` passa a ser **profundo por chave** —
hoje `pt={{ ...appDataTablePt, ...pt }}` faz um caller que passa `root` descartar o `text-sm` da
base sem perceber.

**"Densidade" aqui é concreto:** o padding vertical da célula de corpo e da célula de cabeçalho, a
altura de linha resultante e o espaçamento do cabeçalho em caixa alta. Os valores saem da leitura
dos prints em P1, entram no `pt` base e **não** se redefinem por tela — tela que precisar de outra
densidade é sinal de que o valor base está errado, não de que precisa de exceção.

### `AppTag`

Ganha `tone`. Ver D7.

## 5. Escopo por parte

### P1 · Camada + Comercial (piloto)

Constrói a camada inteira e migra Comercial. É a tela que exercita o contrato completo: busca, ação
primária, abas e footer sem paginador.

### P2 · Operación, Cursos, Pessoas, Administración

Replicação do padrão aprovado. Correções que caem junto:

- `TurmasTable.tsx:53` — `text-sky-600` hardcoded vira variável do tema (ADR-16).
- `CatalogPage` — usa `ModuleTabs` com uma aba só, contra o contrato do próprio `ModulePage`; a
  tabela vai direto em `children`.
- Títulos derivados da entidade errada — Comercial usa `t('client.module')` e Pessoas usa
  `t('redator.module')`. Passam a `Comercial` e `Personas` (`es-CL` é a referência de rótulo).
- `AdministracionPage` — só realinhamento (D10).
- Aba Alunos de `PeoplePage` — segue o `<p>` inline (backlog item 2); só passa a viver dentro do
  card sem parecer quebrada.

### P3 · Detalhe de orçamento e detalhe de turma

Três `AppCard variant="stat"` (`450 UF` neutro, `120 UF` verde, `80 UF` vermelho); cabeçalho de card
com badge de contagem e ação secundária; lista de cotizaciones com alternância como separação de
item; lista de documentos com ícone tipado e download. No detalhe de turma, header com tags
(`En curso` + `Presencial`) e as cinco abas dentro do card.

### P4 · Checklist H.2.1

Critério de aceite externo, verbatim do Notion:

> Módulo responsivo em mobile/tablet; loading/empty/error consistentes; densidade e espaçamento
> revisados.

- [ ] Tabelas responsivas em mobile (scroll horizontal ou colunas colapsáveis)
- [ ] Dialogs adaptados a telas estreitas (grid 2-col → 1-col)
- [ ] Estados de loading consistentes (skeleton/spinner padrão)
- [ ] Estados empty com mensagem e ação clara — entregue em P1 via D5
- [ ] Estados de erro visíveis (nunca falhar em silêncio — peso legal)
- [ ] Densidade e espaçamento revisados contra o design system
- [ ] Contraste e navegação por teclado nos formulários
- [ ] Componentes de formulário vindos de `shared/ui` (sem duplicação local)

Cai junto o **P-11**, que venceu: o gatilho era "quando `shared/ui` padronizar um `ConfirmDialog`";
já padronizou, e cinco componentes consomem. `EnrollmentTable.tsx:55` é o último `window.confirm`.

## 6. Prova e DoD

Não há test runner no frontend. `pnpm lint` + `pnpm build` (que roda `tsc -b` antes de bundlar) é o
gate mecânico de toda parte — e **não prova nada visual**. Cada parte prova comportamento contra a
API real, com o `OperationDemoSeeder` carregado.

**P1** — em Comercial, com dados: card único, abas no topo, busca à esquerda e `Nuevo cliente` à
direita na mesma linha, tabela, footer `3 clientes`. Trocar para Presupuestos troca a ação para
`Nuevo presupuesto` **sem** o ternário no header. Buscar `zzz` mostra o empty de busca com
`Limpiar búsqueda`, não convite a cadastrar. Verificado nos dois temas.

**P2** — as cinco páginas com a mesma composição; `Cursos` sem aba única; títulos lendo `Comercial`
e `Personas`; código da turma sem cor hardcoded (inspetor mostra variável do tema, não
`text-sky-600`).

**P3** — detalhe de orçamento com os três stat cards nas cores certas e as ações de aprovar/rejeitar
no lugar; detalhe de turma com tags no header e as cinco abas dentro do card.

**P4** — cada item do checklist provado no módulo: janela ≤768px sem scroll horizontal na página, a
tabela rolando dentro do próprio container; diálogo em uma coluna; `Tab` percorrendo o formulário na
ordem visual; erro de mutação visível **com texto**, nunca só cor. E `EnrollmentTable` sem
`window.confirm`.

## 7. Fora de escopo

| Item | Por quê |
|---|---|
| Shell (`Sidebar`, `AppLayout`, `AppHeader`) | O João aprovou a aparência atual sobre o protótipo (2026-07-26); trocar por CSS var a mudaria |
| Tokens próprios e PrimeReact `unstyled` | Rejeitados; escopo dentro do ADR-16 (wrapper + `className` na raiz + `pt`) |
| Coluna `ALUMNOS` de Comercial | Sem dado no backend (D11) |
| Código próprio de turma | Backend com peso legal; P-13 segue aberta (D8) |
| Tela de Alunos em Pessoas | Backlog item 2 — feature, não refino |
| Redesenho de Roles e permissões | Backlog item 3 — redesenho, exige brainstorming próprio |
| `Con datos`/`Sin datos` e `SuperAdmin`/`Administrativo` | Andaimes do protótipo (D9) |

## 8. Pendências que este bloco fecha ou abre

- **Fecha P-11** — `EnrollmentTable.tsx:55` é o último `window.confirm`; `shared/ui/ConfirmDialog`
  já existe.
- **Fecha os dois débitos de UI do backlog** — `CatalogPage` com aba única e os títulos de módulo
  derivados da entidade errada.
- **Mantém P-13 aberta** — com decisão registrada (D8).
- **Abre pendência nova** — coluna `ALUMNOS` de Comercial sem dado no backend (D11).

## 9. Handoff de execução

Definido no plano, não aqui. Critério: `codex` para task mecânica com verificação executável e paths
fechados; `claude` quando toca lei do `CLAUDE.md` §5, decisão de arquitetura ou julgamento fora do
plano.

Leitura preliminar: **P1** e **P3** são `claude` — P1 define o contrato que as outras copiam, P3 tem
composição heterogênea. **P2** é candidato a `codex`: replicação de padrão já aprovado, paths
fechados em `frontend/src/features/*/components/`. **P4** é `claude`, julgamento visual em sete
telas.

## 10. Adendo da Parte 3 — decisões do gate (2026-07-26)

Quatro decisões tomadas no `/planejar-bloco` da Parte 3. Duas delas **substituem** texto das seções
acima; está marcado onde.

### D12 — A faixa do rodapé é o paginador do `DataTable` (substitui `AppCard.Footer` em §4)

§4 previa alimentar o slot `pagination` do `AppCardFooter` pelo `paginatorTemplate` do `DataTable`.
Ao planejar a Parte 3 apareceu o obstáculo que derruba a rota alternativa — fatiar a página fora da
tabela: **cinco tabelas têm coluna `sortable`** (`ClientsTable`, `CoursesTable`, `RolesTable`,
`RedatoresTable`, `UsersTable`). Com a página fatiada por um hook, o `DataTable` recebe só as linhas
visíveis e passa a ordenar **a página**, não o conjunto — regressão silenciosa numa tela com peso
de auditoria.

Decisão: o `DataTable` continua dono de página **e** ordenação, e a faixa do rodapé passa a ser o
próprio paginador dele. `AppDataTable` ganha `footerCount?: ReactNode` e internamente liga
`alwaysShowPaginator`, coloca a contagem em `paginatorLeft` e só exibe os controles de página quando
`value.length > rows`. O `pt` do paginador reproduz o visual do `AppCardFooter` (borda superior,
`px-4 py-3`, `text-sm`, `--text-color-secondary`), centralizado em `AppDataTable/style.ts`.

Consequências: `AppCardFooter` deixa de aparecer nas sete tabelas e sobrevive para card **sem**
tabela; `useTableFilter` perde o campo `paginator`, que vira detalhe interno do `AppDataTable`; a
linha de contrato de tabela-em-card na `.claude/rules/frontend-fsliced.md` muda junto.

Rejeitadas: (a) `AppPaginator` avulso com ordenação reimplementada no hook — reescreveria a
semântica de sort do PrimeReact (string vs número, locale) para ganhar nada visualmente; (b) faixa
dupla condicional (paginador quando há páginas, `AppCardFooter` quando não há) — dois donos e dois
estilos para a mesma faixa, com a contagem sumindo justo nas telas com mais dados.

### D13 — `DetailHeader` próprio em `shared/ui`

As duas telas de detalhe repetem o mesmo cabeçalho: link de voltar, título, subtítulo, tags de
estado e ações. D1 manda a ação primária de detalhe morar aí, mas a Task 17 removeu `actions` do
`PageHeader` de propósito — devolver a prop reabriria a porta que D1 fechou para página de módulo.

Decisão: componente próprio `shared/ui/DetailHeader`, com `back`, `title`, `subtitle`, `tags` e
`actions`. `PageHeader` fica intocado, exclusivo de módulo e sem ação. Cada contrato guarda uma
forma só, e as cores fixas dos dois cabeçalhos morrem numa implementação única.

### D14 — Cor: a Parte 3 corrige onde o card novo muda o fundo

O interior das abas do detalhe de turma tem cor Tailwind fixa (`text-slate-500`, `bg-emerald-500`,
`bg-slate-200`, `text-red-600`), contra ADR-16. A Parte 3 corrige o que o novo fundo do `AppCard`
afeta de fato: banners de estado e erro, barra de progresso de documentos e os textos de
`loading`/`notFound` das duas telas. O interior de `DocumentTypeCard`, `TurmaConfigCard` e
`RedatorDesignation` fica para a **Parte 4**, que já tem contraste e densidade no checklist e
revisitaria esses arquivos de qualquer jeito.

### D15 — P-11 antecipa para a Parte 3 (substitui o bullet de P-11 em §5 · P4)

§5 colocava o fim do `window.confirm` na Parte 4. A Parte 3 reescreve `EnrollmentTable` inteira
(toolbar, faixa de rodapé, paginação real) — trocar pelo `ConfirmDialog` no mesmo passo custa poucas
linhas, e adiar obrigaria a reabrir o arquivo. **P-11 fecha na Parte 3**; a Parte 4 só confere o
`grep`.

## 11. Adendo da Parte 4 — decisões do gate (2026-07-26)

Seis decisões tomadas no `/planejar-bloco` da Parte 4. As quatro primeiras são do João; as duas
últimas foram tomadas ao escrever a spec e ficam declaradas para não virarem achado de review.

### Baseline levantado do código antes de decidir

O escopo previsto em §5 · P4 supunha um checklist a conferir. O levantamento mostrou lacunas maiores
que a conferência:

| Item do checklist | Estado real no código |
|---|---|
| Erro visível | **`useCrudPage` só expõe `loading`.** GET que falha rende tabela vazia com o empty state de "sem dados", que convida a cadastrar. O sistema mente sobre a causa. |
| Responsividade | 15 usos de breakpoint no app inteiro; nenhuma tabela com scroll próprio; 6 diálogos com `grid-cols-2` **fixo**, que não colapsa; `AppDialog` travado em `w-[70vw]` |
| Loading | 3 telas com `<p>{t('common.loading')}</p>`; tabelas com o overlay do PrimeReact |
| Contraste | 29 arquivos com cor Tailwind fixa, incluindo `shared/ui/FormField` (6 ocorrências) e `CourseDialog` (16) |
| Forms de `shared/ui` | **já satisfeito** — zero `<input>`, `<select>` ou `<textarea>` nativo em `features/`. O que sobra é duplicação de cabeçalho de seção em 6 diálogos |
| Densidade / empty state | entregues nas Partes 1 e 2 |

### D16 — Erro de listagem sobe até a tela, com estado próprio

`useCrudPage` passa a expor `isError`, `error` e `refetch`. `shared/ui` ganha **`AppErrorState`** —
ícone, título, `detail` do RFC 7807 e botão `Reintentar` — e `AppDataTable` ganha `error?: ReactNode`,
que vence `emptyMessage` e apaga a faixa de rodapé (contar linhas de uma lista que não carregou é
ruído). As 7 tabelas e as 2 telas de detalhe passam a distinguir **falhou** de **vazio**.

É o único item do checklist em que a tela hoje afirma algo falso, e a lei de que erro não some em
silêncio existe por peso legal.

Rejeitadas: (a) toast global de erro de query — o toast some e a tabela continua dizendo "sem
registros"; (b) deixar como débito — o convite a cadastrar sobre uma falha de rede é o pior estado
possível num módulo com auditoria.

### D17 — Exceção mínima ao shell: colapso por viewport

§7 põe o shell fora de escopo porque o João aprovou sua aparência. Mas `Sidebar` tem largura fixa
(`w-64` / `w-20`) e só colapsa por clique — sem tocá-la, "sem scroll horizontal em 768px" não se
prova.

Decisão: a `Sidebar` força `collapsed` abaixo de 1024px por media query, **sem** escrever no
`uiStore` (o toggle manual do usuário continua sendo dele) e sem trocar cor, estrutura ou aparência
em desktop. `AppLayout` troca `p-6` por `p-4 sm:p-6`.

O par `bg-slate-50 dark:bg-slate-950` do `AppLayout` e as cores da `Sidebar` **ficam como estão** —
são cor hardcoded contra ADR-16, mas trocá-las mudaria a aparência aprovada. Vira pendência nova.

Rejeitada: drawer off-canvas no mobile — mexe mais no shell do que o colapso, e o protótipo não
cobre esse padrão.

### D18 — Corte da cor: os 3 arquivos do D14 **mais** todo o `shared/ui`

D14 nomeou `DocumentTypeCard`, `TurmaConfigCard` e `RedatorDesignation`. O baseline achou 29
arquivos. O corte é por alcance, não por contagem: cor errada em `shared/ui` se replica em todas as
telas, então `FormField`, `AppPassword`, `ConfirmDialog`, `AppButton/style` e `Clock` entram junto.

Ficam fora, como débito: os 6 diálogos de feature (`CourseDialog` com 16 ocorrências, `ClientDialog`,
`StaffUserDialog`, `RedatorDialog`, `RoleDialog`, `QuoteWizard`), `LoginForm`, `ImportDialog`,
`ImportResultSummary`, `ManualButton`, `EnrollStudentForm` e o shell.

### D19 — Loading padrão é skeleton, não texto

`shared/ui` ganha **`AppSkeleton`**, wrapper de `primereact/skeleton` (feature não importa PrimeReact
direto, §5.6). Substitui os 3 `<p>{t('common.loading')}</p>` de `BudgetDetailPage`, `TurmaDetailPage`
e `TurmaDocuments`. A tabela mantém o overlay do PrimeReact, que já é consistente e já foi corrigido
na Parte 2 (Q-3).

Texto cru como estado de carregamento produz salto de layout e não sinaliza a forma do conteúdo que
vem — o checklist pede "skeleton/spinner padrão", e o skeleton é o que a tela de detalhe comporta.

### D20 — Responsividade da tabela é scroll horizontal no `pt`, não coluna colapsável

O checklist aceita "scroll horizontal **ou** colunas colapsáveis". Colapsar coluna exige decidir, por
tabela, qual dado some — julgamento de domínio que nenhuma fonte cobre, e esconder coluna numa tela
com peso de auditoria é perda de informação silenciosa.

Decisão: `AppDataTable` ganha, no `pt` base, `wrapper` com `overflow-x-auto` e `table` com
`min-width`. Uma mudança em um arquivo torna as 7 tabelas responsivas, e a página nunca rola na
horizontal — quem rola é o card.

### D21 — `FormSection` fecha o item de duplicação local

O item "componentes de formulário vindos de `shared/ui`" já está satisfeito: nenhum controle nativo
em `features/`. O que sobra é o `<h3 className="text-xs font-semibold uppercase text-slate-500">`
copiado em 6 diálogos — mesma marcação, mesma cor hardcoded, seis vezes. Vira `FormSection` em
`shared/ui`, e a cor morre junto numa implementação única.

### Escopo da Parte 4, consolidado

1. `AppErrorState`, `AppSkeleton` e `FormSection` novos em `shared/ui`.
2. `AppDataTable` com `error` e scroll horizontal; `AppDialog` com largura responsiva; `useCrudPage`
   expondo `isError`/`error`/`refetch`.
3. Cor por variável do tema em `FormField`, `AppPassword`, `ConfirmDialog`, `AppButton/style`,
   `Clock` e nos 3 arquivos do D14.
4. `Sidebar` colapsando por viewport; `AppLayout` com padding responsivo.
5. As 7 tabelas e as 2 telas de detalhe com estado de erro; as 3 telas de loading com skeleton.
6. `grid-cols-2` fixo virando `sm:grid-cols-2` em 6 diálogos.
7. `TurmaCreatePage` migrando para `DetailHeader` + `AppCard`.

### DoD da Parte 4

- Janela em 768px: nenhuma página com scroll horizontal; a tabela rola **dentro** do card.
- Diálogo de cliente em 768px: campos em uma coluna.
- Com a API derrubada (`docker compose stop nginx`), `/comercial` mostra `AppErrorState` com texto
  explícito e botão `Reintentar`; subindo a API de volta, `Reintentar` recarrega a lista. Nenhuma tela
  oferece "cadastre o primeiro" sobre uma falha.
- `Tab` percorre `ClientDialog` na ordem visual, com foco visível em cada controle.
- Telas de detalhe abrem com skeleton, não com texto.
- `grep -rn "window.confirm" frontend/src` vazio (conferência do P-11, fechado na Parte 3).
- Tudo provado nos dois temas.
