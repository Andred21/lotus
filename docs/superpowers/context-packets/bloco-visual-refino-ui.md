BEGIN LOTUS CONTEXT PACKET
---
schema_version: 1
packet_id: bloco-visual-refino-ui-context-v2
block_id: bloco-visual-refino-ui
status: partial
generated_at: 2026-07-26
generated_by: claude
base_ref: main
base_commit: 341e062
state_path: docs/superpowers/state.md
progress_path: docs/superpowers/progress.md
plan_path: null
spec_path: null
supersedes: bloco-visual-refino-ui-context-v1
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
| FIGMA | Figma | Protótipo `https://piece-desert-35638359.figma.site/` | **unavailable** — Figma Site publicado, não arquivo `figma.com`; HTML servido é shell JS (só o título `Protótipo AF`); MCP do Figma exige `fileKey` | Composição, cores, espaçamento, posição da ação primária |
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

## Constraints

- Escopo dentro do **ADR-16**: wrapper + `className` na raiz + `pt`. Tokens próprios e `unstyled`
  seguem rejeitados.
- Tailwind é layout; cor vem de variável CSS do tema (`.claude/rules/frontend-fsliced.md`).
- Feature não importa PrimeReact direto nem outra feature (ADR-05, lei §5.6).
- Estado de erro nunca some em silêncio — peso legal.

## Open questions

- **Bloqueante — protótipo:** composição do card, se a toolbar vive dentro dele, densidade e zebra
  da tabela, cores e estados da tag, empty state, footer/paginação e **onde a ação primária passa a
  ficar** depois de sair do `PageHeader`. O João anexa os prints. `[FIGMA]`
- **P-13, reservada ao brainstorming:** a coluna CÓDIGO da turma exibe relacionamento existente
  (`quote_code` + `budget_code`), ganha código próprio ou sai? O protótipo mostra `TR-45`…`TR-42`;
  o implementado não tem código de turma. O gatilho da pendência é literalmente a decisão do João
  no planejamento deste bloco. `[P13]`

## Staleness triggers

- Os prints do protótipo chegarem — regerar este packet com a seção visual preenchida.
- H.1.3 deixar de ser página em branco no Notion.
- P-13 receber decisão.
- Escopo ou exclusões mudarem em `state.md` ou no backlog.

END LOTUS CONTEXT PACKET
RECOMMENDED_TRANSITION: context_required
