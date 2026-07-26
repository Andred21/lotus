BEGIN LOTUS CONTEXT PACKET
---
schema_version: 1
packet_id: bloco-visual-refino-ui-context-v3
block_id: bloco-visual-refino-ui
status: ready
generated_at: 2026-07-26
generated_by: claude
base_ref: main
base_commit: ac7b5c8
state_path: docs/superpowers/state.md
progress_path: docs/superpowers/progress.md
plan_path: null
spec_path: null
supersedes: bloco-visual-refino-ui-context-v2
---

# Context Packet — Bloco visual · Refinamento de UI por módulo

> Derived snapshot. A hierarquia canônica de fontes e as regras de staleness continuam valendo.
>
> **v1 (Codex, `status: blocked`) foi substituído.** O `unavailable` do Notion era gap de tooling do
> runtime do Codex (`mcp__codex_apps__notion_*` inexistente), não ausência de fonte. Este v2 foi
> gerado pelo Claude por decisão do João em 2026-07-26.

## Scope

**Goal:** um bloco, review por partes, unindo duas frentes que o João decidiu tratar juntas em
2026-07-26:

1. **Composição visual** (origem: backlog): camada compartilhada em `frontend/src/shared/ui` —
   `AppCard` com variante `stat`, toolbar dentro do card, densidade/zebra/hover do `AppDataTable`
   via `pt`, paleta semântica de estado no `AppTag`, empty state, convenção de footer/paginação —
   **+** migração de Comercial, Operación, Cursos, Pessoas, detalhe de orçamento e detalhe de turma.
2. **Responsividade e estados** (origem: Notion H.2.1): o checklist por módulo transcrito abaixo.

**Non-goals:** shell (`Sidebar.tsx`, `AppLayout.tsx`, `AppHeader`); tokens próprios; PrimeReact
`unstyled`; Pessoas · Alunos (backlog item 2); Roles e permissões (backlog item 3).

## Source registry

| Key | Provider | Source | Status | Used for |
|---|---|---|---|---|
| JOAO | João Victor | Decisões da sessão de 2026-07-26 | retrieved | Escopo, união das duas frentes, exclusões |
| STATE | Repository | `docs/superpowers/state.md` @ `341e062` | retrieved | Item ativo e exclusões |
| BACKLOG | Repository | `docs/superpowers/backlog.md` item 1 + débitos técnicos | retrieved | Contrato compartilhado, telas, débitos |
| P13 | Repository | `docs/pendencias.md` P-13 | retrieved | Coluna CÓDIGO da turma; decisão reservada ao João |
| NOTION-H13 | Notion | 4 páginas EAP `H.1.3` em `Tasks · Lotus Fase 2` (`3a2bc960-3dfa-8059-abdd-e0230ad8e196` e 3 irmãs) | retrieved — **vazias** | Ver "Divergência de fonte" |
| NOTION-H21 | Notion | `[Template] Refinamento de UI/UX por módulo`, EAP `H.2.1`, `39dbc960-3dfa-8180-937c-d9a86a8c6f0c` | retrieved | Critério de aceite e checklist reais |
| CODE | Repository | `frontend/src/shared/ui/` e consumidores @ `341e062` | retrieved | Baseline que substitui a auditoria perdida |
| PROTO | João Victor | 5 prints do protótipo anexados em 2026-07-26 | retrieved | Composição, cores, espaçamento, posição da ação primária |
| FIGMA | Figma | Protótipo `https://piece-desert-35638359.figma.site/` | unavailable — Figma Site publicado, não arquivo `figma.com`; HTML servido é shell JS (só o título `Protótipo AF`); MCP do Figma exige `fileKey`. **Contornado por `PROTO`** | — |
| DRIVE | Google Drive | "auditoria de 2026-07-24" e "baseline refinada de 2026-07-26" | **unavailable** — não existem como arquivo; buscas independentes do Codex e do Claude voltaram vazias | — (substituído pelo baseline CODE) |

## Divergência de fonte — resolvida pelo João

O backlog cita **"Notion H.1.3"** como fonte do bloco. As 4 páginas com esse EAP (uma por sprint)
estão **em branco**, com `Critério de aceite` vazio; só carregam a descrição `"Passada de design.
Vai além do shell (que já tem task própria)."`

O conteúdo real está em **H.2.1**, o template, e seu escopo é **responsividade + estados** — não a
composição visual que o backlog descreve. Interseção: empty state e densidade. Decisão do João em
2026-07-26: **o bloco entrega as duas frentes**. `[JOAO]` `[NOTION-H13]` `[NOTION-H21]`

## Critério de aceite externo `[NOTION-H21]`

> Módulo responsivo em mobile/tablet; loading/empty/error consistentes; densidade e espaçamento
> revisados.

Checklist por módulo, verbatim:

- [ ] Tabelas responsivas em mobile (scroll horizontal ou colunas colapsáveis)
- [ ] Dialogs adaptados a telas estreitas (grid 2-col → 1-col)
- [ ] Estados de loading consistentes (skeleton/spinner padrão)
- [ ] Estados empty com mensagem e ação clara
- [ ] Estados de erro visíveis (nunca falhar em silêncio — peso legal)
- [ ] Densidade e espaçamento revisados contra o design system
- [ ] Contraste e navegação por teclado nos formulários
- [ ] Componentes de formulário vindos de `shared/ui` (sem duplicação local)

## Baseline do código `[CODE]`

Substitui a auditoria de 2026-07-24, que não existe como artefato. Levantado em `341e062`.

| Alvo | Estado real |
|---|---|
| `AppCard` | **não existe**; zero import de `primereact/card` no repo. `TurmaConfigCard` é componente de feature, não molde compartilhado |
| `AppDataTable` | `pt` base é só `root: { className: 'text-sm' }` (`AppDataTable/style.ts`). Sem zebra, hover ou densidade. Default `paginator`, `rows={10}`, `removableSort`, `dataKey="id"` |
| Merge do `pt` | `pt={{ ...appDataTablePt, ...pt }}` — **raso**. `pt` vindo do caller com a chave `root` descarta o `className` base em vez de compor |
| `AppTag` | passthrough puro de `primereact/tag`; sem paleta semântica de estado |
| Empty state | `emptyMessage` como string crua em 7 tabelas (`TurmasTable`, `BudgetsTable`, `ClientsTable`, `CoursesTable`, `RolesTable`, `UsersTable`, `RedatoresTable`). Sem ilustração e sem ação |
| `ModulePage` | é `PageHeader` + `children`; a ação primária entra por `PageHeader actions` — **este é o contrato que o bloco quebra** |
| Consumidores | 5 `ModulePage` (`CatalogPage`, `CommercialPage`, `AdministracionPage`, `PeoplePage`, `OperationPage`) + 2 detalhes (`BudgetDetailPage`, `TurmaDetailPage`) |

## Débitos que caem neste bloco

- `CatalogPage` usa `ModuleTabs` com uma aba só, contra o contrato do próprio `ModulePage`. `[BACKLOG]`
- Títulos derivados da entidade errada: Comercial usa `t('client.module')`, Pessoas usa
  `t('redator.module')`. Vocabulário `es-CL` pede `Comercial` e `Personas`. `[BACKLOG]`
- **P-11 venceu.** O gatilho era "quando `shared/ui` padronizar um `ConfirmDialog`"; já
  padronizou — `shared/ui/ConfirmDialog` existe e é consumido por `MoveConfirmDialog`,
  `TurmaDocuments`, `EnrollStudentForm`, `ConcludePanel` e `BudgetDetailPage`. Restou
  `EnrollmentTable.tsx:55` com `window.confirm`. `[CODE]` `[P13]`

## Protótipo `[PROTO]`

5 prints, 2 temas (Comercial e Operación em claro; os 3 detalhes em escuro) — a camada tem de
funcionar nos dois via variável CSS do tema, não por par Tailwind hardcoded.

### Onde a ação vive — a resposta do pivô

Não é uma regra só. **A ação mora no cabeçalho do container mais próximo**, e o container muda por
tipo de página:

| Contexto | Print | Onde | Exemplo |
|---|---|---|---|
| Página de módulo | Comercial | **dentro do card**, na barra de ferramentas, à direita, mesma linha da busca | `Nuevo cliente` (azul, com ícone) à direita de `Buscar por razón social o RUT…` |
| Página de módulo sem criar | Operación | mesma barra, mas o slot da direita traz **contagem**, não botão | busca + filtro `Todos` à esquerda; `4 turmas` à direita |
| Página de detalhe | PRE-2026-018 | **no cabeçalho da página**, à direita, ao lado da tag de estado | tag `Pendiente` + botão `Agregar cotización` |
| Detalhe sem ação primária | TR-45 | cabeçalho traz **só tags** | `En curso` + `Presencial` |
| Cabeçalho de card interno | Cotizaciones / Documentos | título (+ badge de contagem) à esquerda, ação secundária à direita | `Cotizaciones ③` … `Modo SuperAdmin`; `Documentos` … `Subir documento` |
| Aba sem busca | TR-45 · Alumnos | grupo de botões **à esquerda**, acima da tabela | `Importar planilla (xlsx/csv)` (sólido) + `Agregar alumno` (outline) |

O `PageHeader` continua existindo para título/descrição/tags; o que sai dele é a **ação primária de
módulo**, que desce para a toolbar do card.

### Composição do card de módulo

Um card branco/escuro, cantos arredondados, borda sutil, envolvendo tudo abaixo do `PageHeader`, na
ordem: **abas → toolbar → tabela → footer**. Abas e footer ficam dentro do mesmo card, separados por
borda. Operación acrescenta um **card de alerta acima do card principal** — fundo e borda azuis,
título `Cotizaciones aprobadas pendientes de configuración` com badge de contagem, e cada linha traz
ícone + resumo + botão `Configurar turma` à direita.

### Card `stat` (detalhe de orçamento)

Três cards lado a lado: número grande (~28px, peso alto) sobre rótulo pequeno esmaecido. Cor
**semântica, aplicada em texto + fundo tingido + borda**: `450 UF / Total cotizado` neutro,
`120 UF / Total aprobado` verde, `80 UF / Total rechazado` vermelho.

### Tabela

Cabeçalho em caixa alta, fonte menor, esmaecido, com faixa de fundo própria. **Hover de linha** com
fundo sutil (visível em `Transelec` e `TR-44`). **Zebra** aparece na lista de cotizaciones do
detalhe, não nas tabelas de módulo — divergência a decidir. RUT e código de turma em **monospace**;
código de turma ainda em **azul**, sinalizando link. Colunas numéricas (`CONTACTOS`, `ALUMNOS`) em
negrito. Última coluna é o ícone de olho (ver), à direita. Campo vazio vira texto esmaecido
(`— Sin asignar`), nunca célula em branco.

### Footer do card

Contagem à esquerda, em texto esmaecido, sempre em prosa: `3 clientes`, `1–4 de 4 turmas`,
`4 alumnos matriculados`. Paginador à direita **só quando existe** (Operación mostra `‹ 1 ›`;
Comercial, com 3 linhas, não mostra nenhum).

### Paleta semântica das tags

| Cor | Estados no protótipo |
|---|---|
| Azul | `En curso`, `Matriculado` |
| Verde | `Concluida`, `Aprobado`, `Aprobada` |
| Âmbar | `Habilitada`, `Pendiente` |
| Vermelho | `Reprobado`, `Rechazada` |
| Neutro | `Empresa`, `Presencial` |
| Roxo | `Online` |

Duas leituras convivem: **estado** (azul/verde/âmbar/vermelho) e **modalidade** (neutro para
`Presencial`, roxo para `Online`) — a modalidade não é estado e não entra na escala de severidade.

### Outros sinais

- Detalhe abre com link de volta: `← Volver a Comercial` / `← Volver a Operación`.
- Título do detalhe de turma é `TR-45 · Trabajos en líneas energizadas 220kV` — o código lidera.
- Aba `Alumnos` usa avatar circular com iniciais, colorido, antes do nome.
- Campo somente-leitura ganha cadeado: `Carga horaria (del curso, solo lectura) 🔒`.
- Erro nunca é só cor: `Cotización rechazada — no se generará turma.` traz texto explícito.
- Documento listado com ícone tipado (PDF vermelho em quadrado arredondado), nome, meta
  `03/06/2026 · 142 KB` e ícone de download à direita.

### Andaimes do protótipo — NÃO implementar

Dois controles existem só para demonstrar o protótipo e não são funcionalidade do produto:

- **`Con datos` / `Sin datos`** no topo de Comercial e Operación — chave para exibir o empty state.
- **`SuperAdmin` / `Administrativo`** no detalhe de orçamento (e o botão `Modo SuperAdmin` no card
  de Cotizaciones) — prévia de papel. No produto, quem decide é o RBAC real (ADR-07); `can()` é
  conveniência de interface, não segurança.

## Constraints

- Escopo dentro do **ADR-16**: wrapper + `className` na raiz + `pt`. Tokens próprios e `unstyled`
  seguem rejeitados.
- Tailwind é layout; cor vem de variável CSS do tema (`.claude/rules/frontend-fsliced.md`).
- Feature não importa PrimeReact direto nem outra feature (ADR-05, lei §5.6).
- Estado de erro nunca some em silêncio — peso legal.

## Open questions — para o brainstorming

1. **P-13, código da turma.** O protótipo não deixa ambiguidade: `CÓDIGO` é a **primeira** coluna de
   Operación, em azul e monospace (`TR-45`…`TR-42`), e o título do detalhe abre com ele
   (`TR-45 · Trabajos en líneas energizadas 220kV`). O backend **não tem** código de turma — a
   identificação é `quote_code` + `budget_code` (spec D7), e criar um exige coluna, sequência e
   migration (o ADR-17 fez isso para orçamento e cotação, deliberadamente não para turma). Sai do
   escopo puramente visual. Decisão do João. `[P13]` `[PROTO]`
2. **Zebra.** Aparece na lista de cotizaciones do detalhe, não nas tabelas de módulo, que mostram só
   hover. Aplicar zebra em tudo, em nada, ou manter a distinção lista-vs-tabela? `[PROTO]`
3. **Empty state.** O protótipo demonstra o estado vazio pelo andaime `Sin datos`, mas nenhum print
   anexado mostra a tela vazia renderizada. O conteúdo do empty state (ilustração? só texto? qual
   ação?) não tem fonte — hoje são 7 `emptyMessage` como string crua. `[PROTO]` `[CODE]`
4. **Fatiamento do review por partes.** O bloco soma a camada `shared/ui`, 7 telas e o checklist
   H.2.1 de 8 itens por módulo. Onde cortam as partes? `[JOAO]` `[NOTION-H21]`

## Staleness triggers

- H.1.3 deixar de ser página em branco no Notion.
- P-13 receber decisão.
- Escopo ou exclusões mudarem em `state.md` ou no backlog.
- Novos prints ou acesso ao arquivo `figma.com` contradizerem a seção `Protótipo`.

END LOTUS CONTEXT PACKET
RECOMMENDED_TRANSITION: ready_for_planning
