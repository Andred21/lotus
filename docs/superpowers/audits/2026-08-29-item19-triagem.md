# Triagem dos audits do item 18 — ledger (item 19)

**Fonte:** `2026-08-28-item18-fase{1,2,3,4}.md` (49 achados) · **Spec:** `specs/2026-08-29-frontend-triagem-dos-audits-do-item-18-design.md`
**Gabarito:** `adequado` · `corrigir` · `ficha` · `recusado` · `sem evidência` (spec §2). Linha com prova `pendente` no fechamento = bloco não fecha.

## Fase 1 — Comercial

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| A1–A6 | A | adequado | — | — (nota da A3: "Volver" em linha própria é desenho do `DetailHeader`, não achado) | — |
| UI-01 | B | corrigir | R1 | `ArchiveSwitch`: selecionado `outlined`, não selecionado `text` | `ArchiveSwitch.test.tsx` (visto reprovar) · run 5: Activos/Archivados 40px/14px (`sm`, outlined × text) contra a CTA 48px/16px |
| UI-02 | B | corrigir | sítio | `size="small"` no Rechazar | run 5: Rechazar 101×40px/14px, Aprobar 83×44px/14px — ênfase desinvertida, degrau de 4px vira o achado UI-03 da run |
| UI-03 | B | corrigir | R2 | `identifierClass` no RUT do `BudgetDetailPage` | grep refinado zero (Task 9) · run 5: RUT do cabeçalho a 1024 em uma linha (134×18px), IBM Plex Mono + `tabular-nums` |
| UI-04 | B | recusado | — | costura decidida em `AppDialog/style.ts`; f4 A3 mediu coerente | `AppDialog/style.ts:6-11` |

## Fase 2 — Dashboard, Cursos, Perfil

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| UI-01 | A | adequado | — | — | — |
| UI-02 | B | ficha | — | D-63 | `backlog.md` D-63 |
| UI-03 | B | corrigir (semântica) + ficha | sítio | `FormSection as="h2"` no Perfil; grafia na D-63 | `FormSection.test.tsx` (visto reprovar) · `backlog.md` D-63 |
| UI-04 | B | recusado | — | consome `sectionLabelClass` por template; `GRAFIA_LITERAL` verde; `h4` sob `h3` é aninhamento | `AgendaPanel.tsx:99`, `KpiRow.tsx:77` |
| UI-05 | B | corrigir | R2 | `technicalDataClass` no pill do `AppCard` e nas colunas numéricas de Cursos | `typography.test.ts` (Task 7) · grep refinado zero (Task 9) · run 5: colunas numéricas de `/cursos` em IBM Plex Mono 14px `tabular-nums` (7 nós mono na tela, todos por constante) |
| UI-06 | B | corrigir | R2 | as duas constantes nos 20 sítios | `app/` grep zero (Task 8) · `features/` grep refinado zero (Task 9) |
| UI-07 | B | corrigir | R2 | `technicalDataClass` na versão da sidebar | grep zero em `src/app` · run 5: `v0.1.0` da sidebar em IBM Plex Mono 14px `tabular-nums` |
| UI-08 | B | ficha | — | D-64 | `backlog.md` D-64 |
| UI-09 | B | corrigir | sítio | legenda com conteúdo próprio; paga P-63 | `legend.test.tsx` (visto reprovar) · run 5: texto da legenda 12px `rgb(71,85,105)` sobre branco = 7,58:1; todas as `ul` da tela com `role="list"` |
| UI-10 | C | corrigir | sítio | `min-w-0` na `<section>` da Agenda | run 5: a 390×844 o card Agenda mede `scrollWidth == clientWidth` (278/278), título longo com reticência (255 > 244), página sem rolagem horizontal |

## Fase 3 — Certificados

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| A1–A6 | A | adequado | — | — | — |
| UI-01 | B | ficha | — | D-65 | `backlog.md` D-65 |
| UI-02 | B | corrigir | R2 | `identifierClass` no RUT da Emisión | grep refinado zero (Task 9) · run 5: RUT da tabela em IBM Plex Mono 14px `tabular-nums` |
| UI-03 | B | corrigir | sítio | motivo do bloqueio na linha do CTA + `aria-describedby` | tag e CTA na mesma linha, `id`/`aria-describedby` ligados · run 5 (medido pelo bloco antes da run, com a turma ainda bloqueada): `aria-describedby` do CTA resolve para "The template does not define an issuance city", tag (877,596,279×26) e CTA (1168,585,231×48), centros verticais a 1px |
| UI-04 | B | recusado | — | opacidade de `disabled` é calibração por folha do Lara (`:292`); isento da 1.4.3 | `lara-light-lotus.css:292`, `lara-dark-lotus.css:292` |
| UI-05 | B | ficha | — | D-66 (+ P-67) | `backlog.md` D-66; P-67 rehospedada na D-66 |
| UI-06 | B | corrigir | R4 | `dataKey="enrollment_id"` na Emisión | `AppDataTable.test.tsx` (visto reprovar) · auditadas as 9 outras tabelas com DTO — só `EmissionPanelEnrollmentData` não tem `id` · run 5: console 0 erros / 0 warnings ao montar a tabela de 10 linhas da Emisión |
| UI-07 | B | ficha | — | D-67 | `backlog.md` D-67 |
| UI-08 | B | corrigir | R1 | CTA `primary`, secundárias `text` nos 6 diálogos | catraca vista reprovar (2 sondas) · run 5: 5 dos 6 medidos na tela (`ConfirmIssue`, `BatchIssue`, `IssuedDialog`/`CertificateView`, `Revoke`) — CTA `p-button` da marca, secundária `p-button-text`, destrutivo `p-button-danger`, costura 24/24 · 8/32 · 12/12 nos dois; o `Reissue` só existe em certificado revogado/vencido e ficou inalcançável read-only, coberto pela catraca |
| UI-09 | B | corrigir | sítio | `staleTime: 30_000` no painel (segundo observador do `useHistorial`) | `certificatesApi.test.tsx` (visto reprovar) · run 5: Emisión → Historial → Emisión sem nenhum `GET /api/certificates/emission-panel` novo |

**Nota (Task 6):** a sonda do plano mediu 13 sítios; o `no-restricted-syntax` real acusou 17 — 4 a
mais em `features/operation/components/Enrollment/` (`EnrollStudentForm.tsx:41,68`,
`ImportDialog.tsx:47`, `RegisterResultDialog.tsx:49`), fora da varredura original. Corrigidos aqui
pela mesma raiz (R1), não viram ficha.

## Fase 4 — Login, shell, CourseDialog

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| A1–A8 | A | adequado | — | — | — |
| UI-01 | C | corrigir | R1 | alvo do `AppSelectableCard` sem superfície própria | `AppSelectableCard.test.tsx` (visto reprovar) · run 5: o alvo é `p-button-text` com fundo `rgba(0,0,0,0)` nos dois estados; quem pinta o selecionado é o card |
| UI-02 | B | corrigir | R3 | `invalid` pelo contexto | `fieldAssociation.test.tsx` (5 wrappers, visto reprovar) · run 5: no 422 real o input sai com `aria-invalid="true"`, `aria-describedby="_r_0_-error"` e borda `rgb(226,76,76)` |
| UI-03 | B | corrigir | R3 | `CrudDialog` devolve o foco | `CrudDialog.test.tsx` (visto reprovar) · run 5: depois do `POST /api/courses` 422 o `activeElement` é o primeiro campo inválido, dentro do diálogo |
| UI-04 | B | corrigir (pela raiz) | R1 | fecha com a UI-01 | `AppSelectableCard.test.tsx` · run 5: RUT do card selecionado 6,88:1 no claro e 5,59:1 no escuro (alfa 0,6 composto sobre o fundo do card) |
| UI-05 | B | ficha | — | D-68 | `backlog.md` D-68 |
| UI-06 | B | corrigir | sítio | auth consome `FormField` | `AuthPanel.test.tsx` reescrito (achado por rótulo, passa contra código antigo — prova a associação) · grep `className="font-medium"` em Login/Password = 0 · run 5: credencial errada pinta `.p-invalid` no e-mail e escreve "Estas credenciales no coinciden con nuestros registros." sob o campo (14px, 6,4:1); os dois rótulos com `label[for]`, 14px/400, um recibo só |

**Nota (Task 9):** `grep -rn "font-mono" src/features` devolve 4 linhas, não zero — refinado como
código, não literal (mesma correção já precedente no bloco do item 18): duas são asserção de teste
que confere substring da própria constante (`HistorialTable.test.tsx:131,136`,
`ValidationPageFolio.test.tsx:82`, todas contra `identifierClass`/`technicalDataClass`, não contra
grafia solta), e uma é prosa de docblock histórico (`IssuedDialog.tsx:74`, cita a grafia antiga por
referência). Nenhum `className` literal restante.

**R2 — catraca `MONO_LITERAL`:** nasceu verde nas duas camadas (`src/features/**` ×3, `src/app/**`);
sonda negativa confirmada em `RedatorCard.tsx` (features) e `KpiRow.tsx` (app), revertidas.

**Fichas D-63..D-68 escritas** em `backlog.md` §"Decisões não promovíveis isoladamente", com fatos
medidos e recomendação. **P-63 encerrada por mecanismo** (Task 12, legenda com `role="list"`) e
movida para `pendencias/encerradas.md`. **P-67 rehospedada na D-66** (era hospedeira o item 18,
fechado sem pagá-la). Rule `.claude/rules/frontend-estilizacao.md` atualizada: `BOTAO_SEM_PAPEL`,
as duas constantes de dado técnico + `MONO_LITERAL`, os fatos de raio da D-66, e `<FormField>` na
tabela de tipografia. `tests/repo-docs-refs.test.ts` verde (15/15).

## Run 5 — `2026-08-29-item19-run5.md`

Corrida em 2026-08-30 sobre `04912aa3`, nesta árvore (`:5175`/`:8082`), nos dois temas e nas três
viewports, com dado de prova preparado pelo bloco: template do curso 2 e **um** certificado emitido
pela UI na turma 3 (folio `LOT-2026-1000`). As 16 medidas que fecharam as linhas acima estão na
coluna Prova; o relatório inteiro, com a tabela de cobertura e os sinais técnicos, está em
`audits/2026-08-29-item19-run5.md` (cópia idêntica em `.artifacts/ui-review/2026-08-29-item19-run5/`,
junto das 30 evidências).

**Escopo declarado:** a run cobre sete superfícies, contra a regra de uma superfície por run da
`lotus-ui-review` — é o que a Task 17 pede, e está escrito no cabeçalho do relatório. Cobertura
desigual por superfície: certificados foi medido só no tema escuro, `/validar` nos dois temas e nas
três viewports, e o `ReissueDialog` ficou **não testado** (só existe em certificado revogado ou
vencido, e alcançá-lo exigiria mutação) — a catraca `BOTAO_SEM_PAPEL` é quem cobre o papel dos
botões dele.

**Veredito do `CertificateFolio` (spec do item 18, §4.3):** **manter**. Medido em `/validar` válido:
IBM Plex Mono 30px/400, `letter-spacing: 4.5px`, `tabular-nums`, um degrau acima do corpo, e a 390
ocupa 293px dos 308px disponíveis — uma linha, sem vazamento, nos dois temas. O degrau que
desconforta não é dele: é o `h1` do veredito, 18px/600, menor que o número. Mover **um** degrau ali é
o que a run recomenda, e como a raiz é a escala de heading o fato foi acrescentado à **D-63**, que já
espera o João, em vez de virar ficha nova.

**Três achados novos, pelo gabarito da spec §2:**

| Id (run) | Cl. | Raiz tocada neste bloco? | Veredito | Prova |
|---|---|---|---|---|
| UI-02 — o diálogo abre com o foco no botão "Maximizar diálogo" | B | sim (`CrudDialog`, Task 3) | corrigido agora | `CrudDialog.test.tsx` (2 casos, vistos reprovar) · navegador: `activeElement` = `INPUT` dentro de `.p-dialog-content` |
| UI-03 — Rechazar 40px contra Aprobar 44px | B | sim (`QuoteRow`, Task 14) | corrigido agora | `QuotesList.test.tsx` (visto reprovar) · navegador a 1024: 44px/14px nos dois |
| UI-04 — em `/validar`, o folio (30px) pesa mais que o veredito (`h1` 18px) | B | não (escala de heading) | fato para a **D-63** | `backlog.md` D-63 |

**UI-02, o mecanismo:** o `Dialog` do Prime foca o primeiro focável que encontra, e no `CrudDialog`
esse é o botão de maximizar do header — quem abre por teclado ou leitor de tela começa por um
controle de janela. O `CrudDialog` passou a apontar o foco ele mesmo, no `onShow` do Dialog (o commit
em que um efeito nosso rodaria ainda não tem o conteúdo do portal no documento) e com
`focusOnShow={false}`, senão o Prime, que foca no mesmo `onEntered` porém depois, venceria. Vai ao
primeiro `input`/`select`/`textarea` do corpo; corpo sem controle (o `view` de puro texto) recebe o
foco no próprio container, que é `tabIndex={-1}`. Sonda: devolver `focusOnShow` ao Prime derruba os
dois casos.

**UI-03, o mecanismo:** o `size="small"` do Prime rende 40px; o `compact` do Aprobar rende 44px. O
Rechazar passou a escrever a geometria do `compact` (`px-3 py-2.5 text-sm`) mais `border-2` — a
camada de marca do `compact` traz borda de 2px e o `outlined` do Prime desenha 1px, e eram esses 2px
que ainda separavam o par (44 × 42 na medida intermediária). O `compact` inteiro não serve aqui: ele
pinta a superfície da marca, e esta é a recusa.

**P-63 e P-67:** a P-63 fechou na Task 12 (medida aqui: todas as `ul` do Dashboard com `role="list"`,
texto da legenda a 7,58:1 no claro) e está em rastro em `pendencias/encerradas.md`. A P-67 segue
aberta, rehospedada na **D-66**, e a run não a tocou — a escala de raio espera decisão do João.

## Gate do bloco (spec §9.6) — 2026-08-30

| Prova | Resultado |
|---|---|
| Escopo — `git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts` | **vazio**. `pint` e `typescript:transform` N/A por escopo, provados. Diff do bloco: 71 arquivos, +2697/−251, todo em `frontend/` e `docs/` |
| `pnpm lint` | **0** |
| `pnpm build` | verde (`tsc -b` + vite) |
| `pnpm test` | verde — **124 arquivos / 699 testes** |
| `pnpm test tests/repo-docs-refs.test.ts` | verde (15/15) |
| Suíte do backend (`docker compose exec -T app php artisan test`) | **1108 passed / 5 skipped**, o mesmo número da `main` no fechamento do item 6 |
| `grep -rn 'font-mono' src/features src/app` | 4 linhas, **0** delas `className` literal (`grep -rn 'className="[^"]*font-mono'` = 0): três são asserção de teste sobre a própria constante e uma é prosa de docblock — a nota da Task 9 |
| `FormField` com o mecanismo de invalidez | `fieldContext.ts` + `FormField.test.tsx` + `fieldAssociation.test.tsx` |
| Ledger sem prova pendente | **0** ocorrências de `pendente —`. O grep literal do plano (`grep -c "pendente"`) devolve **1**, que é a linha do gabarito no cabeçalho definindo o próprio critério — desvio declarado aqui, não linha de prova em aberto |

**As quatro catracas vistas reprovar de novo, contra o código final** (sonda aplicada, lint rodado,
arquivo restaurado por cópia — nunca por stash, que é compartilhado entre árvores):

| Catraca | Sonda | Resultado |
|---|---|---|
| `MONO_LITERAL` (features) | `RedatorCard.tsx:41` com `className="font-mono"` | reprovou nomeando o arquivo e a linha |
| `MONO_LITERAL` (app) | `KpiRow.tsx:109` com `` className={`font-mono text-xs`} `` | reprovou nomeando o arquivo e a linha |
| `BOTAO_SEM_PAPEL` (features) | `RedatorDesignation.tsx:41` sem `variant="primary"` | reprovou |
| `BOTAO_SEM_PAPEL` (app) | `Sidebar.tsx:53` sem `variant="iconToggle"` | reprovou |

Depois de restaurar os quatro arquivos, `pnpm lint` volta a **0** e `git diff` fica vazio nos quatro.
