# Spec — Certificação · frontend (módulo próprio)

> Bloco `certificacao-frontend`. Item 1 do `backlog.md`, selecionado pelo João em 2026-08-08.
> **Base:** a spec compartilhada `2026-08-05-certificacao-sprint-4-design.md` segue valendo no que
> não for alterado aqui (D11, D14, D18, D19, invariante §4.2 e o desenho do backend já entregue);
> este bloco é o **último consumidor** dela e as duas arquivam juntas no fechamento.
> **Fontes visuais:** 5 prints do protótipo Figma anexados pelo João à seleção (Emisión vazia,
> Emisión com turma, Confirmar emisión, Certificado emitido, Historial) — a fonte que o packet
> declarou `unavailable`. Validação pública e resultado acadêmico **não têm print**: composição sem
> referência, checkpoint do João cobre (decisão de 2026-08-08).
> Packet `context-packets/certificacao-sprint-4.md` reutilizado por ponteiro (`status: partial`).

## §1 · O que este bloco é

Replanejamento das Tasks 9–13 migradas pelo D-P8: o módulo `/certificados` na interface, a
validação pública, o resultado acadêmico na tela da turma e as duas dívidas de Blade herdadas.
O backend da certificação está entregue e provado; este bloco o torna **alcançável pelo admin** e
pelo visitante do QR.

### Medições que moldaram o desenho (repositório vs. protótipo)

1. **`GET /certificates/issuable` não sustenta a tela de emissão do protótipo.** Devolve só turmas
   com matrícula emissível, e cada matrícula só `enrollment_id/nome/RUT`. O protótipo mostra
   **todos** os alunos da turma concluída (aprovados, reprovados, já emitidos) com nota,
   asistencia, estado acadêmico e código do certificado.
2. **Turma não tem código próprio** — o "TR-43" do protótipo não existe no schema (só
   `quote_code`/`budget_code`). Não nasce coluna por causa de rótulo de dropdown.
3. **`IssueCertificateData` exige `redator_id` sempre**, e o protótipo não mostra seletor de
   relator em diálogo nenhum. A D11 (admin escolhe quando há mais de um) manda o seletor existir.
4. **O protótipo mostra "Reemitir" sobre certificado Vencido, e o D8 recusa:** vencido segue
   `status='emitido'` e o índice único (um `emitido` por matrícula) bloqueia segunda emissão.
5. **"Por vencer" não tem regra em fonte nenhuma** — no print, o exemplar está a 27 dias do
   vencimento.
6. **O diálogo "Confirmar emisión" mostra Código pré-emissão** (`LOT-2026-0044`) — o código nasce
   dentro da transação de emissão (D9); não existe antes do POST.
7. **`SessionBootstrap` ainda envolve o router inteiro** (`App.tsx`) — a D19 migrou junto com as
   tasks e segue pendente. `/certificados` é `ModulePlaceholder`; `features/certification` só tem
   `.gitkeep`.
8. **`GET /certificates` devolve tudo, sem busca nem paginação** — filtro client-side é
   proporcional (~10 usuários internos).
9. **`frontend-fsliced.md` afirma "validação QR pública é rota Laravel, fora desta SPA"** —
   contradiz a spec aprovada (D14: o QR aponta `FRONTEND_URL/validar/{uuid}`; D19 existe para essa
   página). Doc descrevendo intenção que a decisão posterior reverteu (lição 13).

### Decisões do João no brainstorming (2026-08-08)

- **Corte:** as 4 frentes num bloco (módulo, validação+D19, resultado na turma, Blades herdados).
- **Reemitir só existe para Revocado.** Vencido fica sem ação de reemissão: renovação de
  certificado vencido é capacitação nova → matrícula nova. O botão do protótipo sobre Vencido é
  artefato. D8 intacto, zero mudança de backend.
- **"Por vencer" = 30 dias** antes de `valido_ate`. Badge de UI derivada no front; o certificado
  segue válido.
- **Lote = endpoint batch no backend**, com **relatório por item** (não tudo-ou-nada).
- **Validação e resultado acadêmico sem print:** compor sem referência visual.

## §2 · Decisões de desenho

**D1 — Corte.** Módulo `/certificados` (Emisión + Historial), validação pública + D19, resultado
acadêmico na turma, Blades herdados (`@page` do Manual + transbordo do certificado). Zero
migration, zero permissão nova.

**D2 — O painel de emissão substitui o `issuable`.** `GET /api/certificates/emission-panel`
(permissão `issue`) devolve **todas as turmas concluídas**, cada uma com `turma_id`,
`course_name`, `client_name` (razão social via seam contratante), `end_date`,
`template {exists, validity_months}`, `redatores[]` e **todos os alunos**: `enrollment_id`, nome,
RUT, `approval_status`, nota final imprimível, `attendance_pct`,
`certificate {id, codigo, status} | null`. A rota `issuable` e os DTOs `Issuable*` **morrem no
mesmo commit** — zero consumidor medido (a dívida D-P8 dos DTOs órfãos fecha aqui). Turma sem
template aparece com emissão **desabilitada e motivo visível** (padrão do projeto: falha visível,
não turma escondida); as portas do POST seguem a fonte da verdade. O eager-load do seam
(`client.user`) entra no mesmo commit da query nova, com cenário no `ContratanteEagerLoadTest`
(regra do `backend-ddd.md` §Testes).

**D3 — Lote.** `POST /api/certificates/batch`, body `{enrollment_ids[], redator_id}`, permissão
`issue`. Cada item roda na **própria transação** via `IssueCertificateAction` — portas, numeração
D9 e auditoria por certificado intactas; `ValidationException` capturada por item. Resposta 200
com `[{enrollment_id, ok, codigo?, problem?}]`. **Um relator por lote** (a turma é a mesma; D11
satisfeita com um seletor).

**D4 — Blades herdados.** `manual-turma.blade.php` ganha `@page` A4 + `preferCssPageSize`
(mecanismo provado no certificado na Task 16). Transbordo do certificado: DoD comportamental — com
a `description` de 3.689 caracteres do seed, o PDF sai **2 páginas com rodapé/assinatura/QR
posicionados**; a mecânica exata (altura máxima da narrativa × rodapé em fluxo) se decide na task,
com RED visual por `pdftoppm` antes do fix.

**D5 — Módulo `/certificados`.** `features/certification` com hooks explícitos em `api/` (sem
`createCrudResource` — certificado não é CRUD, decisão herdada), componentes ≤150 linhas e lógica
em `hooks/`. Divergências declaradas contra o protótipo: **dropdown sem "TR-43"** (rótulo =
curso · cliente · concluida el {end_date}); **"Confirmar emisión" sem linha Código** (o diálogo
pós-emissão mostra o real); **seletor de relator entra** quando a turma tem >1 (pré-preenchido com
1). Vigencia do confirm deriva de `validity_months` do painel ("Indefinida" quando nulo). Ver →
diálogo lendo o snapshot + Descargar PDF (blob autenticado, precedente `useTurmaManualOpener`).
Reemitir (só Revocado) reabre o diálogo de emissão com a matrícula pré-selecionada, alimentado
pelo painel — turma que deixou de ser emissível aparece como erro visível. Historial filtra
client-side: busca por código/aluno/RUT (snapshot) + dropdown de estado derivado.

**D6 — a `SearchableTableFrame` ganha o slot de filtro neste bloco.** O Historial é busca +
dropdown — o consumidor com `where` que o débito registrado esperava. A moldura ganha o slot e a
bifurcação de redação do empty state (`common.noResultsFiltered`/`common.clearFilters`), com o
Historial de primeiro consumidor. Migrar `BudgetsTable`/`TurmasTable` segue **fora** (débito
próprio delas, DoD próprio).

**D7 — Validação pública + D19 + correção de rule.** Rota `/validar/:uuid` fora do ramo protegido;
`SessionBootstrap` desce de `App.tsx` para envolver só o ramo protegido do `AppRouter` — quem abre
o QR não espera `GET /api/me`. Página mobile-first com 4 estados: **Válido** (dados mínimos do
`PublicCertificateData`), **Revocado** (sem motivo — a rota pública não o expõe), **Expirado**
(derivado de `valido_ate`), **No encontrado** (404). O parágrafo desatualizado da
`frontend-fsliced.md` (medição 9) é corrigido neste bloco, no commit que cria a rota.

**D8 — Resultado acadêmico na turma.** Em `operation`: ação "Registrar resultado" por matrícula na
tela da turma → diálogo com estado (Aprobado/Reprobado/Pendiente), nota final (texto livre —
`"6,9"` passa; o 422 es-CL do backend cobre o resto) e asistencia %. Consome o
`PUT api/turmas/{turma}/alunos/{enrollment}/resultado` existente e invalida a query dos alunos.
O backend é a fonte da verdade sobre quando a escrita é aceita; a UI só pinta o 422.

## §3 · Detalhe por camada

### Backend (sem migration)

- `CertificateController`: `emissionPanel()` substitui `issuable()`; `batch()` novo. Rotas:
  `GET certificates/emission-panel` e `POST certificates/batch` no lugar de
  `GET certificates/issuable`.
- `Certification/Data`: `EmissionPanelTurmaData`, `EmissionPanelEnrollmentData`,
  `BatchIssueData`, `BatchIssueItemResultData`; `IssuableTurmaData`/`IssuableEnrollmentData`/
  `IssuableRedatorData` morrem. `typescript:transform` no mesmo commit dos consumidores (lição 11).
- `CertificateEligibility` continua dono das portas; a consulta do painel é projeção de listagem no
  domínio Certification, com eager-load completo (turma → quote.budget.client.user, enrollments →
  student.user + result, template, redatores) — sem lazy-load novo.
- Blades: `manual-turma.blade.php` (`@page` A4), `certificate.blade.php` (transbordo, D4).

### Frontend

- `features/certification/api/`: `useEmissionPanel`, `useCertificates`, `useIssueCertificate`,
  `useIssueBatch`, `useRevokeCertificate`, `useCertificatePdf`.
- `features/certification/components/`: `CertificatesPage` (tabs Emisión/Historial, gate por
  `can()`); `Emission/` (`EmissionPanel`, `StudentsTable`, `ConfirmIssueDialog`,
  `BatchConfirmDialog` com resultado por linha, `IssuedDialog`); `Historial/` (`HistorialTable`
  sobre a `SearchableTableFrame` com slot, `CertificateViewDialog`, `RevokeDialog` com motivo
  obrigatório).
- `features/certification/hooks/`: estado e derivações (estado da linha: Sin emitir / ✓código /
  No corresponde; estado do certificado: Vigente / Por vencer 30d / Vencido / Revocado).
- `features/certification/components/Validation/ValidationPage.tsx` — pública, mobile-first.
- `shared/ui/SearchableTableFrame`: slot de filtro + bifurcação do empty state (D6).
- `app/router`: `/certificados` deixa o `ModulePlaceholder`; `/validar/:uuid` público; descida do
  `SessionBootstrap` (D7).
- `operation`: `RegisterResultDialog` + hook + ação na tabela de alunos da turma (D8).
- i18n: chaves novas nas 3 locales em paridade; es-CL é a referência (textos dos prints).

## §4 · Invariantes de comportamento

1. Fora de `Certification`, **nenhuma rota existente muda de resposta**; dentro, o rename
   `issuable → emission-panel` é a única quebra e tem zero consumidor medido.
2. `generated.ts` muda e os consumidores entram no **mesmo commit** (herda a §4.2 da spec base).
3. Zero permissão nova; `PermissionI18nParityTest` imóvel. Zero migration.
4. A rota pública segue **sem cookie e sem CSRF** e não passa a expor nenhum campo novo.
5. Batch: cada certificado auditado individualmente com `user_id`; a falha de um item não impede
   os demais nem consome número da sequência do item falho.
6. Reemissão só nasce de certificado **revocado** (D8 da spec base preservado).
7. Estados derivados (Por vencer, Vencido, Sin emitir, No corresponde) derivam **no front**; o
   enum `CertificateStatus` do backend não muda.
8. A descida do `SessionBootstrap` não muda o comportamento do ramo protegido — mesma sequência de
   boot para quem loga.
9. O painel não introduz lazy-load: consulta nova nasce com eager-load completo e cenário no
   `ContratanteEagerLoadTest`.

## §5 · Gate

**Item 0 — na tela real, não na suíte:** registrar resultado na turma → emitir individual (diálogo
mostra o código real) → Descargar PDF → Historial com Vigente → revogar com motivo → badge
Revocado → Reemitir → **QR do PDF aberto sem sessão** exibindo a validação → batch numa turma com
pendentes e uma falha provocada, pintada por linha. Mais: `pdfinfo` do Manual dizendo **A4**, e o
certificado com a description de 3.689 chars saindo em **2 páginas** com rodapé/QR no lugar
(inspeção via `pdftoppm`).

**Mecanismos vistos reprovando antes de valer (lição 10):** o cenário novo do
`ContratanteEagerLoadTest`; o teste do batch com item falho; o RED visual do transbordo.

**Automático:** suíte backend com placar declarado task a task; `pnpm test`/`pnpm build`/
`pnpm lint`; Pint cirúrgico nos `.php` tocados; `typescript:transform` com consumidores no mesmo
commit; locales em paridade nas 3; greps de lei (§5.6, query-em-componente, `primereact` direto,
cross-feature, `abort(` novo).

**Checkpoint visual do João (não delegável):** Emisión, diálogos, Historial, validação pública e
resultado na turma, nos dois temas.

## §6 · Fora de escopo

Reemitir sobre Vencido · migração de `BudgetsTable`/`TurmasTable` para o slot da moldura ·
melhoria de conteúdo do Manual além do `@page` · emissão a partir da tela da turma (D18 da base) ·
armazenamento de assinaturas (D20) · remoção do `spatie/laravel-pdf` (D21) · Dashboard e Perfil ·
coluna `code` em turmas · paginação/busca server-side no histórico.
