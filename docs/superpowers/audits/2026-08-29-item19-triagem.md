# Triagem dos audits do item 18 — ledger (item 19)

**Fonte:** `2026-08-28-item18-fase{1,2,3,4}.md` (49 achados) · **Spec:** `specs/2026-08-29-frontend-triagem-dos-audits-do-item-18-design.md`
**Gabarito:** `adequado` · `corrigir` · `ficha` · `recusado` · `sem evidência` (spec §2). Linha com prova `pendente` no fechamento = bloco não fecha.

## Fase 1 — Comercial

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| A1–A6 | A | adequado | — | — (nota da A3: "Volver" em linha própria é desenho do `DetailHeader`, não achado) | — |
| UI-01 | B | corrigir | R1 | `ArchiveSwitch`: selecionado `outlined`, não selecionado `text` | pendente — Task 5 / run 5 |
| UI-02 | B | corrigir | sítio | `size="small"` no Rechazar | pendente — Task 14 / run 5 |
| UI-03 | B | corrigir | R2 | `identifierClass` no RUT do `BudgetDetailPage` | pendente — Task 9 / run 5 |
| UI-04 | B | recusado | — | costura decidida em `AppDialog/style.ts`; f4 A3 mediu coerente | `AppDialog/style.ts:6-11` |

## Fase 2 — Dashboard, Cursos, Perfil

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| UI-01 | A | adequado | — | — | — |
| UI-02 | B | ficha | — | D-63 | pendente — Task 16 |
| UI-03 | B | corrigir (semântica) + ficha | sítio | `FormSection as="h2"` no Perfil; grafia na D-63 | pendente — Task 14 / Task 16 |
| UI-04 | B | recusado | — | consome `sectionLabelClass` por template; `GRAFIA_LITERAL` verde; `h4` sob `h3` é aninhamento | `AgendaPanel.tsx:99`, `KpiRow.tsx:77` |
| UI-05 | B | corrigir | R2 | `technicalDataClass` no pill do `AppCard` e nas colunas numéricas de Cursos | pendente — Tasks 7/9 / run 5 |
| UI-06 | B | corrigir | R2 | as duas constantes nos 20 sítios | pendente — Tasks 8/9 |
| UI-07 | B | corrigir | R2 | `technicalDataClass` na versão da sidebar | pendente — Task 8 / run 5 |
| UI-08 | B | ficha | — | D-64 | pendente — Task 16 |
| UI-09 | B | corrigir | sítio | legenda com conteúdo próprio; paga P-63 | pendente — Task 12 / run 5 |
| UI-10 | C | corrigir | sítio | `min-w-0` na `<section>` da Agenda | pendente — Task 12 / run 5 |

## Fase 3 — Certificados

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| A1–A6 | A | adequado | — | — | — |
| UI-01 | B | ficha | — | D-65 | pendente — Task 16 |
| UI-02 | B | corrigir | R2 | `identifierClass` no RUT da Emisión | pendente — Task 9 / run 5 |
| UI-03 | B | corrigir | sítio | motivo do bloqueio na linha do CTA + `aria-describedby` | pendente — Task 13 / run 5 |
| UI-04 | B | recusado | — | opacidade de `disabled` é calibração por folha do Lara (`:292`); isento da 1.4.3 | `lara-light-lotus.css:292`, `lara-dark-lotus.css:292` |
| UI-05 | B | ficha | — | D-66 (+ P-67) | pendente — Task 16 |
| UI-06 | B | corrigir | R4 | `dataKey="enrollment_id"` na Emisión | pendente — Task 11 / run 5 |
| UI-07 | B | ficha | — | D-67 | pendente — Task 16 |
| UI-08 | B | corrigir | R1 | CTA `primary`, secundárias `text` nos 6 diálogos | pendente — Task 6 / run 5 |
| UI-09 | B | corrigir | sítio | `staleTime: 30_000` no painel (segundo observador do `useHistorial`) | pendente — Task 13 / run 5 |

## Fase 4 — Login, shell, CourseDialog

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| A1–A8 | A | adequado | — | — | — |
| UI-01 | C | corrigir | R1 | alvo do `AppSelectableCard` sem superfície própria | pendente — Task 4 / run 5 |
| UI-02 | B | corrigir | R3 | `invalid` pelo contexto | `fieldAssociation.test.tsx` (5 wrappers, visto reprovar) · run 5 |
| UI-03 | B | corrigir | R3 | `CrudDialog` devolve o foco | pendente — Task 3 / run 5 |
| UI-04 | B | corrigir (pela raiz) | R1 | fecha com a UI-01 | pendente — run 5 (≥ 4,5:1) |
| UI-05 | B | ficha | — | D-68 | pendente — Task 16 |
| UI-06 | B | corrigir | sítio | auth consome `FormField` | pendente — Task 15 / run 5 |

## Run 5 — `2026-08-29-item19-run5.md`

*(preenchido na Task 17: os seis diálogos, `/validar` válido, veredito do `CertificateFolio`, remedições; achado novo entra aqui com o mesmo gabarito.)*
