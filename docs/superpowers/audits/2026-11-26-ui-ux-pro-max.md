# Análise de interface — ui-ux-pro-max v2.15.0 contra o frontend do Lotus

- **Data:** 2026-11-26 · **Base:** `main` @ `c576bc35` (o que está em produção)
- **Método:** as 10 categorias da skill (`references/quick-reference.md`, 141 regras + checklist do
  `pro-rules.md`) divididas em 4 auditores só de leitura; ~40 consultas ao `search.py` (domínios `ux`,
  `icons`, `chart`, `react`, stacks `react` e `html-tailwind`), cada achado com `arquivo:linha` lido.
  Sem navegador (nenhuma stack de pé); o que depende de pixel está marcado "a confirmar no navegador".
- **Régua:** a skill é recomendação; o DESIGN.md (ADR-16) é o sistema fechado. Onde as duas brigam, o
  achado vira **divergência** para o João decidir, não bug.
- **Cruzamento:** a rodada Impeccable de outubro (branch `docs/impeccable-product`, 24 commits, 95
  arquivos) **nunca entrou na main**; a main andou 681 commits (361 arquivos de `frontend/src`) desde a
  base `524fda45`. Cada achado diz se aquela branch já o tratava.

## Decisões do João (2026-11-26)

1. **Escopo:** os 9 temas abaixo **e** o T10 (ícones), num bloco só — ficha **64**
   `frontend-revisao-ui-ux-e-icones`.
2. **Branch `docs/impeccable-product` abandonada:** o que ela corrigia (T8) entra como trabalho novo.
3. **Ícones:** trocar PrimeIcons (57 ícones, 95 arquivos, fonte global no `main.tsx`) por **Phosphor**
   (`@phosphor-icons/react`), a escolha da própria skill (os 105 ícones curados dela são Phosphor;
   Heroicons só de reserva). Peso `regular` no repouso, `fill` no ativo da navegação.
4. **Entrada na fila:** pela PR da própria lane (desvio da invariante 10, como no 42/43/46).
5. Ficam para o brainstorming: as divergências com o DESIGN.md listadas no fim.

## Temas e achados

Severidade ajustada ao contexto Lotus (desktop denso, ~10 usuários, celular não confirmado).
Esforço P/M/G. "Imp." = rodada Impeccable.

### T1 · Sessão e dado fresco
| ID | Achado | Sev | Esf | Imp. |
|---|---|---|---|---|
| C-1 | 401/419 sem ramo no interceptor (`shared/api/axios.ts:55-108`): sessão expirada (120 min ociosos, `backend/config/session.php:35`) vira "Revisa tu conexión" + "Reintentar" em loop (`screenDetail.ts:99-109`, `AppDataTable.tsx:110`); o docblock de `screenDetail.ts:32-34` afirma um redirect que não existe; login devolve só o `pathname`, perde `?tab=` (`ProtectedRoute.tsx:10`, `useLoginForm.ts:21`) | ALTA | M | não |
| D-1 | Dashboard com `refetchOnWindowFocus: false` global (`AppProviders.tsx:8`), sem override em `useDashboard.ts:104-112`; KPIs/pendências congelam em aba aberta — o projeto já tratou a mesma classe no Historial (`certificatesApi.ts:52-58`) | ALTA | P | não |
| D-9 | Trocar o período mantém o gráfico antigo sem sinal de carga (`useWindowedQuery.ts:68-71`, `useDashboard.ts:104-117`, `AdminView.tsx:30-50`) | BAIXA | P | não |

### T2 · Trabalho protegido em formulários
| ID | Achado | Sev | Esf | Imp. |
|---|---|---|---|---|
| C-2 | Esc/X/Cancelar/Volver descartam rascunho sem aviso (`CrudDialog.tsx:102,107,124-126`, `QuoteWizard.tsx:31,37,58`, `TurmaCreatePage.tsx:15,23`); zero `dirty`/`beforeunload`/`useBlocker` no `src`; o app usa `BrowserRouter` (`AppRouter.tsx:28`), então `useBlocker` exige migrar para data router | ALTA | M | só o caso do resultado (b6fe8010) |
| C-7 | `NestedField` sem `FieldContext` (sem `aria-invalid`), a regra de foco do `CrudDialog.tsx:75-82` não acha o campo; `FormErrorSummary` sem `role="alert"`/`tabIndex` (`FormField.tsx:107-153`; ex. `ModuleCard.tsx:29-37`) | MÉDIA | P | não |
| C-8 | Erro de 422 continua vermelho depois de corrigido (`useEntityForm.ts:39,54-63`, `FormField.tsx:55-56`) | BAIXA | P | não |
| A-10 | Enter não envia o `CrudDialog` (corpo é `<div>`, Salvar só `onClick`, `CrudDialog.tsx:106-131`) | BAIXA | P | **sim (c147f727)** |
| C-9 | Obrigatório nunca marcado (`FormField.tsx:18-35` sem `required`/`hint`); "Revocar" pré-desabilitado sem dizer por quê (`RevokeDialog.tsx:39,48`; idem `ConfirmIssueDialog.tsx:46`, `QuoteWizard.tsx:32`) | BAIXA | M | não · **divergência** (DESIGN §Inputs não prevê marca) |

### T3 · Feedback e confirmações
| ID | Achado | Sev | Esf | Imp. |
|---|---|---|---|---|
| C-5 | Sucesso silencioso em cadastro, aprovar/rejeitar cotização, eliminar e **revogar certificado** (`useCrudForm.ts:167,189`, `HistorialDialogs.tsx:32`, `useBudgetDetail.ts:55,64`) — arquivar/concluir dão toast (`useArchiveToasts.ts:25-26`, `useConclusionSection.ts:45`) | MÉDIA | P | não |
| C-4 | Confirmações sem nome do objeto ("¿Archivar este registro?", `ArchiveConfirmDialog.tsx:24,36-38`; "¿Aprobar cotización?", `BudgetOverlays.tsx:31-34`; conclusão fixa, `ConcludePanel.tsx:74-75`); "Eliminar presupuesto" em `danger` que na verdade arquiva (`BudgetOverlays.tsx:45-48`) | MÉDIA | P | parcial (3e7a39c8) |
| C-6 | Erro do gate de arquivamento só em toast de 8s, diálogo parado em cima (`useArchiveAction.ts:34`, `ArchiveConfirmDialog.tsx:34-43`; o slot existe em `ConfirmDialog.tsx:33,93`) | MÉDIA | P | não |
| A-2 | Motivo do ZIP desabilitado só no `title` (`HistorialExportActions.tsx:31-41`); nome truncado só no `title` (`IdentityCell.tsx:91-95`) | MÉDIA | P | não |

### T4 · Contraste e identificadores
| ID | Achado | Sev | Esf | Imp. |
|---|---|---|---|---|
| A-1 | Borda de input/dropdown/checkbox/radio no **tema escuro** a 1,41:1 contra o cartão (`lara-dark-lotus.css:1315-1317`, `:1043-1045`, `:761-763`, `:1864-1866`); o gerador exclui o escuro por premissa que a medição derruba (`generate-brand-theme.mjs:301-303`). Fix: a mesma `CINZA_BORDA` `#64748b` → 3,07:1 sobre o cartão, 3,93:1 sobre o poço; regerar com `pnpm brand-theme` | ALTA | P | não · **divergência** (DESIGN:306 limita 3:1 ao claro) |
| B-1 | Folio `LOT-…` transborda a coluna e pinta sob o avatar no Historial (peso `COL.code` 8, `columnWidth.ts:43`; `historialColumns.ts:17-26`; `HistorialTable.tsx:64`); a 1024 sobram 22px de conteúdo | ALTA | P | parcial (8675421c, antes da coluna Cotización) |
| B-11 | Barra de progresso de documentos 1,53:1 / 2,09:1 (`TurmaDocuments.tsx:46-49`) | BAIXA | P | não |
| B-7 | `✓ LOT-…` como glifo de texto, folio pode quebrar no hífen (`EmissionStudentsTable.tsx:88`, `BatchIssueDialog.tsx:79`) | BAIXA | P | não |
| B-8 | Peso 700 pedido (`RecordCode.tsx:14`, `.p-tag` em `lara-light-lotus.css:6791`) sem face Inter 700 carregada (`main.tsx:9-11`) | BAIXA | P | não · divergência interna do DESIGN (:196 × :291) |

### T5 · Navegação e deep link
| ID | Achado | Sev | Esf | Imp. |
|---|---|---|---|---|
| C-3 | Filtro/busca/página/sort em `useState` (`OperationPage.tsx:24`, `useServerTable.ts:85-88`, `useArchivedPage.ts:51`); "Volver" faz push para a lista (`useTurmaDetail.ts:43`, `useBudgetDetail.ts:102`); `onSaved` em push reabre o formulário de criação no back (`TurmaCreatePage.tsx:22`) | MÉDIA | M | não |
| C-11 | Abas fora da URL (`CommercialPage.tsx:25,35`, `CertificatesPage.tsx:11,16-26`, `AdministracionPage.tsx:27,32`, `PeoplePage.tsx:19`); o molde existe em `useTurmaDetail.ts:12-42` + `turmaTabs.ts` | BAIXA | P | não |
| C-12 | `<title>` fixo "Lotus - IntraNet" (`index.html:9`); foco não vai ao `<main tabIndex={-1}>` na troca de rota (`AppLayout.tsx:36`) | BAIXA | P | não |
| C-10 | Rota desconhecida cai no Dashboard (`AppRouter.tsx:78`); guard por módulo ainda é "follow-up" (`AppRouter.tsx:53-55`); 403 mostra "Reintentar" inútil | BAIXA | P | não |

### T6 · Gráficos do painel
| ID | Achado | Sev | Esf | Imp. |
|---|---|---|---|---|
| D-2 | Mês sem registro some do eixo X (UF) ou vira buraco (`AnalyticsQuery.php:250-259,272-281`; `pivot.ts:27-38`; `AppLineChart.tsx:111`); rankings preenchem zero (`AnalyticsQuery.php:352-356`) — critério incoerente. **Backend + contraria decisão D7 registrada em `pivot.ts:17-20`** | ALTA | P–M | não |
| D-3 | Rankings sem limite (`AnalyticsQuery.php:336-364`, `RankingsPanel.tsx:38-43`) numa caixa fixa de 260px (`AppBarChart.tsx:35`); com ~30 itens metade dos rótulos some | MÉDIA | P | não |
| D-4 | 4 linhas só por cor (`AppLineChart.tsx:88-108`, `legend.tsx:26`), turmas achatadas sob matrículas no mesmo eixo (`SeriesPanel.tsx:17-22,48-58`) | MÉDIA | P–M | não |
| D-5 | UF sem separador de milhar e com vírgula fixa em qualquer idioma (`uf.ts:1-9`; uso em `SeriesPanel.tsx:101`, `RankingsPanel.tsx:78`) | MÉDIA | P | não |
| D-7 | KPI com trilho de severidade fixo, amarelo mesmo com valor 0 (`kpiCards.ts:39,43,49`) | MÉDIA | P | não |
| D-8 | `role="img"` (`AppLineChart.tsx:47`, `AppBarChart.tsx:45`) anula a camada de teclado do Recharts; sem tabela alternativa | BAIXA | P–M | não |

### T7 · Teclado e leitor de tela
| ID | Achado | Sev | Esf | Imp. |
|---|---|---|---|---|
| A-3 | Reordenar módulos: foco fica na posição, Enter duplo desfaz ou exclui dois (`ModuleFields.tsx:37-49`, `ModuleCard.tsx:42-44`) | MÉDIA | P | não |
| A-4 | Toggles e menus sem estado: tema (`AppearanceControls.tsx:26-28`), sidebar sem `aria-expanded` (`Sidebar.tsx:53`), `ArchiveSwitch.tsx:19-38`, `UserMenu.tsx:92-97`, `RowActions.tsx:106-111`; "Idioma" esconde o idioma atual (`LanguageMenu.tsx:75-80`, WCAG 2.5.3) | MÉDIA | P | não |
| A-5 | Busca das tabelas só com placeholder (`SearchableTableFrame.tsx:177-181`); contagem não anunciada (`AppDataTable.tsx:133`) | MÉDIA | P | não |
| A-6 | Rolagem horizontal da tabela fora do alcance do teclado (wrapper sem `tabIndex`; `AppDataTable/style.ts:173-183`) | BAIXA | P | não |
| A-7 | `AppCardHeader` crava `<h3>` (`AppCard.tsx:147`) → h1→h3 fora do Dashboard | BAIXA | P | não |
| A-9 | Rótulos acessíveis do Prime em inglês ("Close", "Option List"): `AppToast.tsx:29`, `primeLocale.ts:17-58` sem bloco `aria` | BAIXA | P | não |
| A-12 | Item ativo do `AppSubNav` só por tinte de 10% (1,10:1) (`AppSubNav.tsx:40`) | BAIXA | P | não |
| A-8 | Links do Dashboard idênticos a texto (`CompliancePanel.tsx:90`, `RedatorLoadPanel.tsx:68`); link do relator leva à listagem | BAIXA | P | não |

### T8 · O que a rodada Impeccable já resolvia (reencontrado na main)
| ID | Achado | Sev | Esf | Imp. |
|---|---|---|---|---|
| B-2 | Celeste deixou de ser raro: avatar cheio (`AppAvatar.tsx:47`), info = mesmo hex da marca (`brand-theme.css:203`), ações de linha (`RowActions.tsx:44-47`) e `ArchiveSwitch` celeste | MÉDIA | M | **sim (77047abb, 3ff5cf3e)** |
| B-5 | Controles do shell trocam de pele com o tema (`brandOutline` com `dark:` em `AppButton/style.ts:21-23,41,44`, usado no header navy) | MÉDIA | M | **sim (6b2757f4)** · divergência interna do DESIGN (:184 × :283, :319) |
| B-3 / A-11 | Zero `prefers-reduced-motion`; sidebar anima largura (`Sidebar.tsx:32` `transition-all`); skeleton anima sem parar | MÉDIA | P | parcial (92b62f74) |
| B-4 | Rótulo do rail a 10px e truncado (`SidebarItem.tsx:52`) | MÉDIA | P/M | parcial (92b62f74) · **divergência** (DESIGN:317 prescreve 10px) |

### T9 · Carga e polimento
| ID | Achado | Sev | Esf | Imp. |
|---|---|---|---|---|
| D-6 | Sem code splitting por rota (`AppRouter.tsx:1-18`; 1 chunk ~477 KB gz); bandeiras inline (`main.tsx:6`) = ~88% do CSS (~84 KB gz) — números de um `dist` antigo, refazer com build do HEAD | MÉDIA | P–M | não |
| D-10 | Logo sem width/height (`AppLogo.tsx:27`; salto no login/sidebar); `hero.png`, `Logo.png`, `react.svg`, `vite.svg` sem uso; favicon PNG declarado `image/svg+xml` (`index.html:7`) | BAIXA | P | não |
| B-6 | Busca da toolbar cortada a 390 (`min-w-64`, `SearchableTableFrame.tsx:175-176`) | BAIXA | P | não |
| B-9 | `h-screen` (100vh) no shell (`AppLayout.tsx:11`, `AppSidebar.tsx:16`, `index.css:64`) — iOS esconde o paginador | BAIXA | P | não |
| B-10 | Botões só-ícone em pílula (`RowActions.tsx:46,109`, `AppFileActions.tsx:113,126` e outros) contra o raio de 4px | BAIXA | P | não |
| B-12 | `h1` solto da descrição (20px vs 24px, `PageHeader.tsx:29-33`); rótulos de KPI quebram feio (`KpiRow.tsx:77`) | BAIXA | P | não |

### T10 · Ícones (pedido do João, 2026-11-26)
PrimeIcons hoje: fonte global (`main.tsx:5`, `primeicons ^7.0.0`), 57 ícones distintos em 95 arquivos
(mais usados: `pi-inbox`, `pi-file`, `pi-check`, `pi-times`, `pi-eye`). Os ícones internos do PrimeReact
(chevron, fechar, paginador) já são SVG próprios e se trocam pelos props dos wrappers de `shared/ui`.
Destino decidido: **Phosphor** (`@phosphor-icons/react`), atrás de um wrapper em `shared/ui`.

## Divergências com o DESIGN.md (decisão do João no brainstorming)
1. **A-1** — o 3:1 de traço de controle vale também no tema escuro? (hoje DESIGN:306 limita ao claro)
2. **C-9** — marca de obrigatório e texto de ajuda entram no §Inputs/Fields?
3. **B-4** — o rail sobe de 10px para 12px com rótulos curtos (`nav.short.*`)?
4. **B-5 / B-8** — contradições internas do próprio DESIGN (Fixed Dial × botão de marca no header; Inter 400/500/600 × tag 700).
5. **D-2** — preencher meses zerados contraria a decisão D7 aplicada na linha (`pivot.ts:17-20`).
6. Lente de contraste do `--design-system`: a skill separa acento de CTA da marca/navegação; o Lotus põe
   tudo no mesmo celeste (raiz de B-2/B-5). E o Lotus não revisa a faixa 640–1023px.
7. O DESIGN.md:240 ainda descreve diálogos 95→85→70vw para todos; o código tem tetos `sm`/`md`/`lg`.

## Verificado OK (o que já cumpre)
- Nenhum hex fora dos tokens, nenhum `gray-*`, nenhuma sombra em cartão, nenhum raio literal em `features/`/`app/`.
- Skip-link, foco visível medido (14,65:1 / 6,76:1 / 5,29:1 no navy), diálogos com armadilha e retorno de foco.
- Nenhum botão só-ícone sem nome; alvos 48×48; tags sempre com texto.
- 422 mapeado por campo com classificação obrigatória `mapped`/`summaryOnly`; duplo clique travado.
- Busca com debounce 300ms, paginação no servidor (virtualização não se justifica), PrimeReact importado por componente, fontes só com os pesos do DESIGN e `font-display: swap`.
- Gráficos com tokens `--chart-1..5`, estados vazio/erro/skeleton, eixo de mês por locale.

---

## Anexo — ficha 64 completa (vai para o `backlog.md` na lane)

## 64. `frontend-revisao-ui-ux-e-icones`

**Prioridade:** P2 · **Frente:** Frontend · **Contexto:** não · **Depende:** —
**Fonte:** `audits/2026-11-26-ui-ux-pro-max.md` — análise com a skill ui-ux-pro-max v2.15.0 contra
`main@c576bc35`, 46 achados em 9 temas, cada um com `arquivo:linha` — e o pedido do João de
2026-11-26 de trocar os ícones por uma biblioteca mais moderna e condizente com o tema.

**Objetivo:** fechar os 46 achados da análise e trocar a família PrimeIcons (fonte) por uma
biblioteca de ícones SVG coerente com "O Voltímetro" (DESIGN.md).

**Escopo** (IDs da auditoria):
- **T1 Sessão e dado fresco:** C-1 (401/419 sem volta ao login, `?tab=` perdido), D-1 (painel não
  refaz ao voltar à aba), D-9.
- **T2 Formulários protegidos:** C-2 (rascunho descartado sem aviso), C-7, C-8, A-10, C-9.
- **T3 Feedback e confirmações:** C-5 (sucesso silencioso, inclusive ao revogar), C-4, C-6, A-2.
- **T4 Contraste e identificadores:** A-1 (controles do tema escuro a 1,41:1), B-1 (folio transborda
  a coluna do Historial), B-11, B-7, B-8.
- **T5 Navegação e deep link:** C-3 (Volver zera a lista), C-11, C-12, C-10.
- **T6 Gráficos do painel:** D-2 (meses zerados somem do eixo; backend `AnalyticsQuery`), D-3, D-4,
  D-5, D-7, D-8.
- **T7 Teclado e leitor de tela:** A-3, A-4, A-5, A-6, A-7, A-8, A-9, A-12.
- **T8 Identidade:** B-2 (celeste deixou de ser raro), B-5 (shell troca de pele com o tema), B-3/A-11
  (`prefers-reduced-motion`), B-4 (rail a 10px). Trabalho novo: a branch `docs/impeccable-product`,
  que já os corrigia, foi abandonada pelo João em 2026-11-26.
- **T9 Carga e polimento:** D-6 (code splitting por rota, bandeiras inline no CSS), D-10, B-6, B-9,
  B-10, B-12.
- **T10 Ícones — Phosphor** (`@phosphor-icons/react`, decidido pelo João em 2026-11-26, a escolha
  da própria skill): atrás de um wrapper em `shared/ui`, que nenhuma feature contorna; peso
  `regular` no repouso e `fill` no item ativo da navegação; os 57 ícones em 95 arquivos migrados;
  os ícones internos do Prime (chevron, fechar, paginador, check) trocados pelos props dos
  wrappers; `primeicons` fora do `package.json` e do `main.tsx`; DESIGN.md §Navigation e
  §Components atualizados.

**Entrada na fila:** pela PR da própria lane, com o mesmo desvio da invariante 10 e a mesma cópia
provisória do `42`, por decisão do João em 2026-11-26.

**Decisões do João no brainstorming:** as divergências que a auditoria achou com o DESIGN.md — A-1
(3:1 também no tema escuro), C-9 (marca de obrigatório), B-4 (rail de 10 para 12px), B-5 e B-8
(contradições internas do próprio DESIGN.md), D-2 (meses zerados contra a decisão D7 registrada no
código).

**Fora:** redesenho de tela (Administración é do 9); tom de voz; uso autenticado no celular como
contexto novo (B-6 e B-9 só deixam de quebrar); resgate dos commits da branch Impeccable.

**DoD:** cada achado fechado com teste, ou com captura no navegador nas viewports de referência
(1440×900, 1024×768 e 390×844, claro e escuro), ou com veredito escrito do João; nenhum `pi pi-` nem
`primeicons` em `frontend/`; gate verde (lint, vitest, build e PHP); DESIGN.md atualizado nas seções
que as decisões mudarem.
