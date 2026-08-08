# Certificação · frontend (módulo próprio) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** tornar a certificação alcançável pelo admin (módulo `/certificados` com Emisión e
Historial), pelo visitante do QR (`/validar/:uuid` sem sessão) e pelo fluxo real (resultado
acadêmico registrável na turma), pagando as duas dívidas de Blade herdadas.

**Architecture:** backend ganha `emission-panel` (substitui `issuable`) e `batch` — o resto é
consumo do que o Bloco 7 entregou. Frontend nasce em `features/certification` com hooks explícitos
(sem `createCrudResource`), derivações de estado no front e a `SearchableTableFrame` ganhando o
slot de filtro. Spec: `docs/superpowers/specs/2026-08-08-certificacao-frontend-design.md` (base:
`2026-08-05-certificacao-sprint-4-design.md`).

**Tech Stack:** Laravel 13 (PHP 8.3) · spatie/laravel-data + typescript-transformer · React 19 +
TS · TanStack Query · PrimeReact via `shared/ui` · Tailwind (layout) · vitest (só `shared/` e
`locales/parity`) · Gotenberg.

## Global Constraints

- **Leis §5 do `CLAUDE.md`:** sem Repository, sem `abort(422)`, tipos TS gerados (`generated.ts`
  NUNCA à mão), features sem PrimeReact direto e sem import cross-feature, financeiro nunca gateia.
- **Zero migration, zero permissão nova** (`PermissionI18nParityTest` imóvel).
- **i18n:** toda chave nova entra nas 3 locales (`es-CL` referência, valores dos prints;
  `locales/parity.test.ts` reprova ausência).
- Backend roda no container: `docker compose exec -T app php artisan test --filter=X`.
  Pint no host, de `backend/`: `./vendor/bin/pint --test <arquivos>` — **nunca sem argumento**.
- Frontend de `frontend/`: `pnpm build` + `pnpm lint` + `pnpm test`.
- `typescript:transform` na task que muda DTO, consumidores ajustados **no mesmo commit** (lição 11).
- Componente de feature ≤150 linhas (lint `max-lines`); query só em `hooks/`/`api/` (lint).
- Main tree, sem worktree (P-03). `git add` cirúrgico; `git status` antes de editar — o João edita
  o working tree ao vivo (lição 9).
- Baseline backend: **477 passed, 1 skipped (1698 assertions)**. Frontend: **10 arquivos / 35
  testes**. Cada task declara o delta esperado; delta diferente é desvio a declarar no ledger.

## §Desvios contra a spec aprovada (achados na escrita do plano, não silenciados)

- **D-P1 — o motivo de bloqueio da turma é calculado no servidor.** A spec D2 listava
  `template {exists, validity_months}` e mandava o front desabilitar com motivo. As portas 5
  (cidade de emissão) e 6 (redator) **não são deriváveis** desse payload, e re-derivar porta no
  cliente é a classe de bug que o docblock do `CertificateEligibility` documenta ("a lista promete
  o que o POST recusa"). O painel entrega `emission_blocked: string|null` calculado pelas mesmas
  portas (`sin_plantilla` | `plantilla_sin_ciudad` | `sin_redactor`), além de
  `template_validity_months` para a Vigencia do diálogo.
- **D-P2 — as portas são 6, não 4.** A spec base (§D10) envelheceu: o código real tem 6 portas em
  pares `assert*`/`constrain*`. Nenhum efeito no desenho — o painel serve as 6 via D-P1.
- **D-P3 — os testes de ocultação do `issuable` migram de contrato.** `CertificateListingTest`
  prova que turma sem template/cidade/redator é **ocultada**; o painel as **mostra bloqueadas**
  (spec D2). Os 3 testes migram para asserir `emission_blocked`, e o teste de
  reaparecimento pós-revogação migra para asserir o campo `certificate` da matrícula. Mudança de
  contrato deliberada, não regressão.
- **D-P4 — `problemFromBlob` ainda não existe** (a Task 11 do plano antigo que o extrairia migrou
  para cá). O download de PDF reusa o padrão do `useTurmaManual`; se a extração virar duplicação
  de 2 sítios, ela acontece na Task 5 em `shared/api/problemFromBlob.ts`.

---

### Task 0: Baseline e branch

**Files:** nenhum (medição).

- [ ] **Step 1:** `git status` limpo (WIP do João é intocável — se houver, PARE e pergunte).
- [ ] **Step 2:** `git checkout -b feature/certificacao-frontend` a partir de `main`.
- [ ] **Step 3:** `docker compose exec -T app php artisan test` →
      esperado **477 passed, 1 skipped (1698 assertions)**. Registre o placar real.
- [ ] **Step 4:** de `frontend/`: `pnpm test` (10 files / 35 tests), `pnpm lint`, `pnpm build` —
      verdes. Registre.

---

### Task 1: Backend — `emission-panel` substitui `issuable`

**Files:**
- Create: `backend/app/Domains/Certification/Data/EmissionPanelTurmaData.php`
- Create: `backend/app/Domains/Certification/Data/EmissionPanelEnrollmentData.php`
- Create: `backend/app/Domains/Certification/Data/EmissionPanelCertificateData.php`
- Create: `backend/app/Domains/Certification/Data/EmissionPanelRedatorData.php`
- Create: `backend/app/Domains/Certification/Services/EmissionPanelQuery.php`
- Delete: `backend/app/Domains/Certification/Data/IssuableTurmaData.php`,
  `IssuableEnrollmentData.php`, `IssuableRedatorData.php`
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateController.php`
  (`issuable()` → `emissionPanel()`), `backend/app/Domains/Certification/routes.php`
- Test: `backend/tests/Feature/Certification/CertificateListingTest.php` (migra os 6 testes de
  `issuable`), `backend/tests/Feature/Shared/ContratanteEagerLoadTest.php` (+1 cenário)
- Modify: `frontend/src/shared/types/generated.ts` via `typescript:transform` (nunca à mão)

**Interfaces (Produces):**
- `GET /api/certificates/emission-panel` (permissão `certification.certificate.issue`) →
  `array<EmissionPanelTurmaData>`:

```php
EmissionPanelTurmaData {
    int $turma_id; string $course_name; string $client_name; string $end_date;
    ?int $template_validity_months;
    ?string $emission_blocked;            // null | 'sin_plantilla' | 'plantilla_sin_ciudad' | 'sin_redactor'
    array<EmissionPanelEnrollmentData> $enrollments;
    array<EmissionPanelRedatorData> $redatores;   // { int $redator_id; string $name; }
}
EmissionPanelEnrollmentData {
    int $enrollment_id; string $student_name; string $student_rut;
    EnrollmentApprovalStatus $approval_status;    // 'pendiente'|'aprobado'|'reprobado'
    ?string $attendance_pct; ?string $nota_final; // grades['final'] como string, null se ausente
    ?EmissionPanelCertificateData $certificate;   // { int $id; string $codigo; CertificateStatus $status; } — o VIGENTE, senão null
}
```

- [ ] **Step 1: migrar os testes (RED primeiro).** Em `CertificateListingTest`, renomeie/reescreva
  os 6 testes de `issuable` para o contrato novo — a rota vira
  `/api/certificates/emission-panel`. Comportamentos:
  - turma concluída **sem template** aparece com `emission_blocked === 'sin_plantilla'` (era
    ocultação — D-P3); análogo para cidade (`plantilla_sin_ciudad`) e redator (`sin_redactor`);
  - turma emitível: `emission_blocked === null`, `template_validity_months` do template mais novo;
  - **todos** os alunos aparecem (aprovado, reprovado, pendente), com `approval_status`,
    `nota_final` (de `grades['final']`), `attendance_pct`;
  - matrícula com certificado **emitido** traz `certificate.codigo`; depois da revogação o campo
    vira `null` (migração do teste de reaparecimento);
  - a consulta de certificados vigentes roda **uma vez** por request (migração do teste de query
    única — conte queries com `DB::listen` como o teste atual já faz);
  - sem permissão `issue` → 403.
  Esqueleto de um deles (os demais seguem o mesmo `IssuableEnrollmentBuilder` dos setUps atuais):

```php
public function test_panel_mostra_turma_sem_template_bloqueada(): void
{
    $this->actingAsAdmin();
    $chain = $this->issuableEnrollment()->semTemplate()->create(); // helper existente do arquivo

    $this->getJson('/api/certificates/emission-panel')
        ->assertOk()
        ->assertJsonPath('0.emission_blocked', 'sin_plantilla')
        ->assertJsonPath('0.enrollments.0.enrollment_id', $chain->enrollment->id);
}
```

  (Adapte aos builders/helpers REAIS do arquivo — leia-o antes; a forma exata dos setUps é a do
  B7.) Rode: `docker compose exec -T app php artisan test --filter=CertificateListingTest` →
  **FAIL** (rota inexistente).
- [ ] **Step 2: DTOs.** Quatro classes `#[TypeScript]` em `Certification/Data`, `fromModel`
  recebendo o que a projeção precisa (padrão `IssuableTurmaData` atual — razão social via
  `$turma->contratante()->name`):

```php
public static function fromModel(
    Turma $turma,
    ?CourseCertificateTemplate $template,
    ?string $emissionBlocked,
    Collection $vigentesPorEnrollment,   // Certificate keyBy enrollment_id
): self
```

  `EmissionPanelEnrollmentData::fromModel(Enrollment $e, ?Certificate $vigente)` projeta
  `nota_final: isset($e->grades['final']) ? (string) $e->grades['final'] : null`.
- [ ] **Step 3: `EmissionPanelQuery`.** Serviço novo em `Certification/Services`, construtor com
  `CertificateTemplateResolver`. Consulta: todas as turmas `TurmaStatus::Concluida`, com
  `['course', 'quote.budget.client.user', 'redatores.user', 'enrollments' => fn ($q) => $q->withListingData()]`,
  `orderByDesc('end_date')`. Certificados vigentes em **uma** query
  (`Certificate::where('status', CertificateStatus::Emitido)->whereIn('enrollment_id', $ids)->get()->keyBy('enrollment_id')`).
  `emission_blocked` calculado com o `CertificateTemplateResolver` (mesma fonte das portas):
  template `null` → `sin_plantilla`; `emissionCityFor()` `null` → `plantilla_sin_ciudad`;
  `redatores` vazio → `sin_redactor`; senão `null`. Devolve `array<EmissionPanelTurmaData>`.
  **`CertificateEligibility` não muda** — as portas continuam donas da emissão.
- [ ] **Step 4: controller + rota.** `issuable()` vira
  `emissionPanel(EmissionPanelQuery $panel): array`; em `routes.php`,
  `Route::get('certificates/emission-panel', [CertificateController::class, 'emissionPanel'])`
  no lugar da linha de `issuable` (middleware `issue` já cobre pelo `only` — renomeie lá também).
  Apague os 3 arquivos `Issuable*`.
- [ ] **Step 5:** suíte de certificação inteira:
  `docker compose exec -T app php artisan test --filter=Certification` → verde.
  Cheque que nada mais referencia `Issuable`:
  `grep -rn "Issuable" backend/app/ backend/tests/` → só `IssuableEnrollmentBuilder` (Support).
- [ ] **Step 6: guarda de eager-load.** Cenário novo no `ContratanteEagerLoadTest` no molde dos
  existentes (duas cadeias, `Model::preventLazyLoading()`, `getJson('/api/certificates/emission-panel')`
  com `actingAsAdmin()`). **Veja-o reprovar**: remova temporariamente `'quote.budget.client.user'`
  do `with()` do `EmissionPanelQuery`, rode
  (`--filter=ContratanteEagerLoadTest`), espere `lazy load` na mensagem, restaure, verde (lição 10).
- [ ] **Step 7:** `docker compose exec -T app php artisan typescript:transform`; confirme no diff
  de `generated.ts`: `EmissionPanel*` entram, `Issuable*` saem. Zero consumidor TS existe ainda —
  nada quebra (`pnpm build` de `frontend/` verde).
- [ ] **Step 8:** suíte completa; delta esperado: contagem estável ±2 (migração 1:1 dos 6 testes
  + 1 eager-load; declare o real). Pint nos `.php` tocados. Commit:
  `feat(certification): emission-panel substitui issuable com turmas bloqueadas visíveis`.

---

### Task 2: Backend — `POST /api/certificates/batch`

**Files:**
- Create: `backend/app/Domains/Certification/Data/BatchIssueData.php`
- Create: `backend/app/Domains/Certification/Data/BatchIssueItemResultData.php`
- Modify: `CertificateController.php` (+`batch()`), `Certification/routes.php`
- Test: Create `backend/tests/Feature/Certification/BatchIssueTest.php`
- Modify: `frontend/src/shared/types/generated.ts` via transform

**Interfaces (Produces):** `POST /api/certificates/batch` (permissão `issue`), body
`{ enrollment_ids: int[], redator_id: int }` → 200 `array<BatchIssueItemResultData>`:
`{ int $enrollment_id; bool $ok; ?string $codigo; ?int $certificate_id; ?string $error; }`.

- [ ] **Step 1: testes RED.** `BatchIssueTest` (setUp com `IssuableEnrollmentBuilder`, como os
  vizinhos):
  - lote de 2 emitíveis → 200, 2 itens `ok: true` com `codigo` sequenciais, 2 linhas em
    `certificates`, 2 registros de auditoria com `user_id` (asserção no molde do
    `IssueCertificateTest`);
  - lote com 1 emitível + 1 **já emitido** → 200, item 1 `ok: true`, item 2 `ok: false` com
    `error` contendo `'Ya existe un certificado vigente'`, e **só 1** certificado novo — a falha
    de um item não impede o outro;
  - o item falho **não consome número**: emita o lote acima e depois emita individual; o `codigo`
    seguinte é contíguo ao último emitido;
  - `enrollment_ids` vazio → 422; id inexistente → 422 (`exists`); sem permissão `issue` → 403;
  - `redator_id` não designado na turma → itens todos `ok: false` com a mensagem da porta 6.
  Rode `--filter=BatchIssueTest` → FAIL (rota inexistente).
- [ ] **Step 2: DTOs.**

```php
#[TypeScript]
class BatchIssueData extends Data
{
    public function __construct(
        /** @var array<int> */
        public array $enrollment_ids,
        public int $redator_id,
    ) {}

    public static function rules(): array
    {
        return [
            'enrollment_ids' => ['required', 'array', 'min:1'],
            'enrollment_ids.*' => ['integer', 'exists:enrollments,id'],
            'redator_id' => ['required', 'integer'],
        ];
    }
}
```

  `BatchIssueItemResultData` `#[TypeScript]` com as 5 propriedades acima (sem `rules` — é saída).
- [ ] **Step 3: controller.**

```php
public function batch(BatchIssueData $data, IssueCertificateAction $action): array
{
    $redator = Redator::query()->findOrFail($data->redator_id);

    return collect($data->enrollment_ids)
        ->map(function (int $enrollmentId) use ($action, $redator): BatchIssueItemResultData {
            $enrollment = Enrollment::query()->findOrFail($enrollmentId);

            try {
                $certificate = $action->execute($enrollment, $redator);

                return new BatchIssueItemResultData(
                    enrollment_id: $enrollmentId,
                    ok: true,
                    codigo: $certificate->codigo,
                    certificate_id: $certificate->id,
                    error: null,
                );
            } catch (ValidationException $e) {
                return new BatchIssueItemResultData(
                    enrollment_id: $enrollmentId,
                    ok: false,
                    codigo: null,
                    certificate_id: null,
                    error: collect($e->errors())->flatten()->first(),
                );
            }
        })
        ->all();
}
```

  Rota: `Route::post('certificates/batch', [CertificateController::class, 'batch']);` +
  `'batch'` no `only` do middleware `issue`. Cada `execute()` já é a própria transação (portas +
  D9 + auditoria) — o batch **não** abre transação por fora, e é isso que faz o item falho não
  consumir número.
- [ ] **Step 4:** `--filter=BatchIssueTest` verde; suíte completa (delta: +6 esperado, declare);
  `typescript:transform` (tipos novos, zero consumidor quebrado); Pint; commit
  `feat(certification): emissao em lote com relatorio por item`.

---

### Task 3: Backend — Blades herdados (Manual A4 + transbordo do certificado)

**Files:**
- Modify: `backend/resources/views/operation/manual-turma.blade.php` (+`@page`)
- Modify: `backend/app/Domains/Operation/Services/ManualPdfService.php:25`
- Modify: `backend/resources/views/certification/certificate.blade.php` (narrativa)

- [ ] **Step 1: RED do Manual.** Com o compose de pé:
  login e2e (lição 12) e `GET /api/turmas/3/manual` salvo em `/tmp/manual.pdf`;
  `pdfinfo /tmp/manual.pdf` → hoje **Letter (612 × 792 pts)**. Registre.
- [ ] **Step 2: fix.** No Blade: `@page { size: A4 portrait; margin: 0; }` dentro do `<style>`
  (o `body` já tem `margin: 32px`, que vira a margem visual). No service, linha 25:
  `PageOptions::converterDefault()` → `PageOptions::fromCss()` — o mesmo mecanismo que o
  certificado usa (`CertificatePdfService:19`).
- [ ] **Step 3:** repita o Step 1 → `pdfinfo` diz **A4 (594.96 × 841.92 pts)** e
  `pdftoppm -png -r 96 -f 1 -l 1 /tmp/manual.pdf /tmp/manual-page` renderiza layout íntegro.
- [ ] **Step 4: RED do transbordo.** Emita (ou reuse) um certificado de curso com a `description`
  de 3.689 chars do seed (curso do `OperationDemoSeeder` que o gate de 2026-08-07 usou);
  `GET /api/certificates/{id}/pdf` → `pdfinfo` diz **3 páginas** e
  `pdftoppm` da página 2 mostra rodapé/QR/assinatura transbordados. Registre com os PNGs em `/tmp`.
- [ ] **Step 5: fix.** Em `certificate.blade.php`:

```css
.narrative {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 14;
    overflow: hidden;
}
.narrative--compact { font-size: 9px; line-height: 1.5; -webkit-line-clamp: 24; }
```

```blade
@php $narrativeCompact = mb_strlen($curso->description ?? '') > 1500; @endphp
<p class="narrative {{ $narrativeCompact ? 'narrative--compact' : '' }}">{{ $curso->description }}</p>
```

  Ajuste `line-clamp`/limiar contra o `pdftoppm` até: descrição longa → **2 páginas**, rodapé, QR
  e assinatura na posição correta; descrição normal (certificado 2 do seed) → **inalterada**
  byte-visual (compare os PNGs antes/depois).
- [ ] **Step 6:** suíte (`--filter=CertificatePdfTest` + `--filter=Operation`) verde — placar
  estável; Pint nos 2 `.php`; commit
  `fix(pdf): manual em A4 e narrativa do certificado sem transbordar o rodape`.

---

### Task 4: `SearchableTableFrame` ganha slot de filtro + bifurcação do empty state

**Files:**
- Modify: `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx`

**Interfaces (Produces):** props novas, ambas opcionais — os 5 consumidores atuais **não mudam
uma linha**:
`filterSlot?: ReactNode` (renderizado na toolbar, após o input de busca) e a bifurcação interna:
quando `table.filtering && table.term === ''` o vazio usa `common.noResultsFiltered` +
`common.clearFilters` (chaves que já existem — `BudgetsTable`/`TurmasTable` as usam hoje).

- [ ] **Step 1:** adicione `filterSlot` ao `SearchableTableFrameProps` e renderize:

```tsx
start={
  <div className="flex min-w-64 flex-1 items-center gap-3">
    <div className="min-w-64 flex-1">
      <AppInputText ... />
    </div>
    {filterSlot}
  </div>
}
```

- [ ] **Step 2:** bifurque o vazio de filtro:

```tsx
const filteredBySearch = table.term !== ''
const empty = table.filtering ? (
  <AppEmptyState
    icon="pi pi-search"
    title={filteredBySearch ? t('common.noResults', { term: table.filter.trim() }) : t('common.noResultsFiltered')}
    description={filteredBySearch ? t('common.noResultsHint') : undefined}
    action={
      <AppButton
        label={filteredBySearch ? t('common.clearSearch') : t('common.clearFilters')}
        icon="pi pi-times" text onClick={table.clear}
      />
    }
  />
) : (emptyState)
```

  **Atenção ao contrato do `clear`:** ele limpa só a busca. O consumidor com `where` passa um
  `clear` composto (busca + filtro próprio) — documente isso no docblock do prop, e o
  `HistorialTable` (Task 8) é o primeiro a fazê-lo. Atualize o docblock da moldura: o parágrafo
  "QUEM FOR ADOTAR COM `where`" morre — a bifurcação agora existe.
- [ ] **Step 3:** `pnpm build && pnpm lint && pnpm test` verdes (35 testes estáveis — a moldura
  não tem teste de componente; consumidores atuais intactos por diff:
  `git diff -- src/features` vazio).
- [ ] **Step 4:** commit `feat(shared): slot de filtro e bifurcacao do vazio na SearchableTableFrame`.

---

### Task 5: `features/certification` — api hooks, derivações e i18n base

**Files:**
- Create: `frontend/src/features/certification/api/certificatesApi.ts`
- Create: `frontend/src/features/certification/api/usePublicCertificate.ts`
- Create: `frontend/src/features/certification/lib/certStatus.ts`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (namespace `certificate`)

**Interfaces (Produces):**

```ts
// certificatesApi.ts — todos exportados
useEmissionPanel(): UseQueryResult<EmissionPanelTurmaData[]>          // GET /certificates/emission-panel
useCertificates(): UseQueryResult<CertificateData[]>                  // GET /certificates
useIssueCertificate(): UseMutationResult<CertificateData, ..., { enrollmentId: number; redatorId: number }>
useIssueBatch(): UseMutationResult<BatchIssueItemResultData[], ..., { enrollmentIds: number[]; redatorId: number }>
useRevokeCertificate(): UseMutationResult<CertificateData, ..., { certificateId: number; reason: string }>
useCertificatePdf(): UseMutationResult<Blob, ..., number>             // GET /certificates/{id}/pdf (blob)

// certStatus.ts
export const POR_VENCER_DIAS = 30
export type CertDerivedStatus = 'vigente' | 'por_vencer' | 'vencido' | 'revocado'
export function certStatus(c: Pick<CertificateData, 'status' | 'valido_ate'>, today?: Date): CertDerivedStatus
export type RowCertKind = 'sin_emitir' | 'emitido' | 'no_corresponde'
export function rowCertKind(e: EmissionPanelEnrollmentData): RowCertKind
```

- [ ] **Step 1: hooks.** Molde real do projeto (`features/operation/api/useTurmas.ts` — leia-o
  antes; blob e invalidação seguem o `useTurmaManual`). Estrutura:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api'
import type { BatchIssueItemResultData, CertificateData, EmissionPanelTurmaData } from '@shared/types/generated'

const panelKey = ['certificates', 'emission-panel'] as const
const listKey = ['certificates', 'list'] as const

export function useEmissionPanel() {
  return useQuery({
    queryKey: panelKey,
    queryFn: async () => (await api.get<EmissionPanelTurmaData[]>('/certificates/emission-panel')).data,
  })
}
// useCertificates: idem com listKey e '/certificates'
// mutações: onSuccess invalida panelKey E listKey (emitir muda as duas telas)
// useIssueCertificate: api.post<CertificateData>(`/enrollments/${enrollmentId}/certificate`, { redator_id: redatorId })
// useIssueBatch: api.post<BatchIssueItemResultData[]>('/certificates/batch', { enrollment_ids, redator_id })
// useRevokeCertificate: api.post<CertificateData>(`/certificates/${certificateId}/revoke`, { reason })
// useCertificatePdf: api.get<Blob>(`/certificates/${id}/pdf`, { responseType: 'blob' })
```

  `usePublicCertificate.ts`: `useQuery` com `retry: false`,
  `api.get<PublicCertificateData>(`/publico/certificados/${uuid}`)` — arquivo próprio porque a
  página pública não deve importar o módulo autenticado. Se o tratamento de erro de blob duplicar
  o do `useTurmaManual`, extraia `shared/api/problemFromBlob.ts` e adote nos 2 sítios (D-P4).
- [ ] **Step 2: derivações.**

```ts
export function certStatus(c: Pick<CertificateData, 'status' | 'valido_ate'>, today = new Date()): CertDerivedStatus {
  if (c.status === 'revocado') return 'revocado'
  if (!c.valido_ate) return 'vigente'
  const limit = new Date(`${c.valido_ate}T00:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (limit < start) return 'vencido'
  const days = Math.floor((limit.getTime() - start.getTime()) / 86_400_000)
  return days <= POR_VENCER_DIAS ? 'por_vencer' : 'vigente'
}

export function rowCertKind(e: EmissionPanelEnrollmentData): RowCertKind {
  if (e.certificate) return 'emitido'
  return e.approval_status === 'aprobado' ? 'sin_emitir' : 'no_corresponde'
}
```

- [ ] **Step 3: i18n.** Namespace `certificate` nas 3 locales (es-CL de referência, textos dos
  prints): `title` "Certificados" · `subtitle` "Emisión y gestión del historial de certificados" ·
  `tabEmision` "Emisión" · `tabHistorial` "Historial" · `turmaConcluida` "Turma concluida" ·
  `selectTurma` "Selecciona una turma concluida..." · `concludedAt` "Concluida el {{date}}" ·
  `emptyPanelTitle` "Selecciona una turma para ver los alumnos certificables" · `emptyPanelHint`
  "Solo se muestran turmas con estado Concluida." · `financialNote` "La emisión no depende del
  estado financiero. Solo requiere turma concluida y alumno aprobado." · `emitAllPending`
  "Emitir todos los pendientes ({{count}})" · `studentsCount` "{{total}} alumnos ·
  {{approved}} aprobados" · `issuedPending` "{{issued}} certificado emitido · {{pending}}
  pendientes" · colunas `colName/colRut/colFinalGrade/colAttendance/colAcadStatus/colCertificate`
  ("Nombre", "RUT", "Nota final", "Asistencia", "Estado acad.", "Certificado") · `emit` "Emitir" ·
  `view` "Ver" · `sinEmitir` "Sin emitir" · `noCorresponde` "No corresponde" · `aprobado`
  "Aprobado" · `reprobado` "Reprobado" · `pendiente` "Pendiente" · `blocked.sin_plantilla` "El
  curso no tiene plantilla de certificado" · `blocked.plantilla_sin_ciudad` "La plantilla no
  define ciudad de emisión" · `blocked.sin_redactor` "La turma no tiene redactor designado" ·
  `confirmTitle` "Confirmar emisión" · `confirmBody` "Se generará y registrará el certificado
  para este alumno." · `fieldAlumno/fieldRut/fieldCurso/fieldVigencia/fieldRelator` · `vigencia
  Indefinida` → `vigenciaIndefinida` "Indefinida" · `vigenciaMeses` "{{count}} meses" ·
  `confirmEmit` "Confirmar emisión" · `issuedTitle` "Certificado emitido" · `issuedHeading`
  "CERTIFICADO DE APROBACIÓN" · `issuedBy` "Emitido por Lotus · {{date}}" · `downloadPdf`
  "Descargar PDF" · `status.vigente` "Vigente" · `status.por_vencer` "Por vencer" ·
  `status.vencido` "Vencido" · `status.revocado` "Revocado" · `searchPlaceholder` "Buscar por
  alumno, RUT o código de certificado..." · `filterAll` "Todos" · `colCodigo` "Código" ·
  `colCourse` "Curso" · `colIssuedAt` "Fecha emisión" · `colValidUntil` "Vigencia hasta" ·
  `colStatus` "Estado" · `revoke` "Revocar" · `reissue` "Reemitir" · `revokeTitle` "Revocar
  certificado" · `revokeReason` "Motivo de la revocación" · `revokeConfirm` "Revocar" ·
  `certCount` "{{count}} certificados" · `statusSummary` "{{vigentes}} vigentes · {{porVencer}}
  por vencer · {{vencidos}} vencidos · {{revocados}} revocados" · `popupBlocked` "El navegador
  bloqueó la pestaña del PDF" · validação (Task 9): `validation.valid` "Certificado válido" ·
  `validation.revoked` "Certificado revocado" · `validation.expired` "Certificado vencido" ·
  `validation.notFound` "Certificado no encontrado" · `validation.issuedTo` "Emitido a" ·
  `validation.course` "Curso" · `validation.hours` "{{count}} horas" · `validation.completedAt`
  "Turma concluida el {{date}}" · `validation.validUntil` "Válido hasta {{date}}" ·
  `validation.revokedAt` "Revocado el {{date}}" · resultado (Task 10): `result.action` "Registrar
  resultado" · `result.title` "Resultado académico" · `result.finalGrade` "Nota final" ·
  `result.attendance` "Asistencia (%)" · `result.status` "Estado académico".
  pt-BR/en com os mesmos **nomes de chave** (tradução fiel; `pnpm test` roda o
  `parity.test.ts`).
- [ ] **Step 4:** `pnpm build && pnpm lint && pnpm test` verdes (parity passa com o namespace nas
  3). Commit `feat(certification): api hooks, derivacoes de estado e i18n do modulo`.

---

### Task 6: Emisión — página, painel e diálogos + rota real

**Files:**
- Create: `frontend/src/features/certification/components/CertificatesPage.tsx`
- Create: `frontend/src/features/certification/components/Emission/EmissionPanel.tsx`
- Create: `frontend/src/features/certification/components/Emission/EmissionStudentsTable.tsx`
- Create: `frontend/src/features/certification/components/Emission/ConfirmIssueDialog.tsx`
- Create: `frontend/src/features/certification/components/Emission/IssuedDialog.tsx`
- Create: `frontend/src/features/certification/hooks/useEmissionPanelState.ts`
- Create: `frontend/src/features/certification/hooks/useCertificatePdfOpener.ts`
- Modify: `frontend/src/app/router/AppRouter.tsx` (troca do `ModulePlaceholder`)

**Interfaces:**
- Consumes: Task 5 (hooks, `rowCertKind`), Task 1 (`EmissionPanelTurmaData`).
- Produces: `useCertificatePdfOpener(certificateId)` → `{ open, pending, popupBlocked, message }`
  (clone do `useTurmaManualOpener` sobre `useCertificatePdf` — Task 8 reusa);
  `ConfirmIssueDialog { enrollment, turma, onIssued }` (Task 8 reusa no Reemitir).

- [ ] **Step 1: hook de estado.** `useEmissionPanelState()`: `useEmissionPanel()` + `useState`
  do `turmaId` selecionado + derivações — `selected: EmissionPanelTurmaData | undefined`,
  contagens (`total`, `aprobados`, `emitidos`, `pendientes` — pendiente = `rowCertKind === 'sin_emitir'`),
  opções do dropdown (`label: `${course_name} · ${client_name}``, `value: turma_id`).
- [ ] **Step 2: componentes.** `CertificatesPage`: `ModulePage` + `AppTabView` com as 2 abas
  gateadas por `usePermissions().can` — Emisión exige `certification.certificate.issue`, Historial
  `certification.certificate.view`; a rota inteira já é gateada pela navegação (view).
  `EmissionPanel`: card do dropdown (`AppDropdown` com `optionValue="value"`) + linha-resumo da
  turma selecionada (curso, cliente, `concludedAt`) + vazio (`AppEmptyState`
  `emptyPanelTitle/Hint`) quando nada selecionado + banner `financialNote` + botão
  `emitAllPending` com `count = pendientes` (desabilitado se 0 ou `emission_blocked`) + aviso de
  bloqueio (`certificate.blocked.<motivo>` via `AppTag` severity warning) quando
  `emission_blocked !== null`. `EmissionStudentsTable`: `AppDataTable` sem toolbar (molde
  `EnrollmentTable`), colunas nome/RUT/nota/asistencia/estado (`AppTag` severity: aprobado
  success, reprobado danger, pendiente warning)/certificado (`rowCertKind`: `emitido` → ✓código;
  `sin_emitir`/`no_corresponde` → texto) e ação por linha: `Emitir` (habilitado se `sin_emitir` e
  não bloqueada) ou `Ver` (abre `IssuedDialog` do emitido). Cada componente ≤150 linhas — o
  que passar, extraia irmão.
- [ ] **Step 3: diálogos.** `ConfirmIssueDialog` (`AppDialog`): campos Alumno/RUT/Curso/Vigencia
  (`vigenciaIndefinida` quando `template_validity_months == null`, senão `vigenciaMeses`) +
  **seletor de relator** (`AppDropdown` das `redatores` da turma; pré-selecionado quando só há 1;
  obrigatório) — **sem linha Código** (spec: nasce no POST). Submit → `useIssueCertificate`;
  422 → `useMutationErrors` + `FormErrorBanner`. Sucesso → fecha e abre `IssuedDialog`:
  cartão com `issuedHeading`, nome, curso, `codigo` real, `issuedBy` com a data, botões Cerrar e
  `downloadPdf` via `useCertificatePdfOpener`.
- [ ] **Step 4: rota.** No `AppRouter`, substitua a linha do placeholder:
  `<Route path="/certificados" element={<CertificatesPage />} />` (import da feature, molde das
  outras páginas).
- [ ] **Step 5:** `pnpm build && pnpm lint && pnpm test` verdes; smoke manual no `pnpm dev`
  (login admin do seed): selecionar turma concluída do seed, emitir 1, ver diálogo com código
  real, baixar PDF. Commit `feat(certification): emissao individual no modulo /certificados`.

---

### Task 7: Emisión — lote com resultado por linha

**Files:**
- Create: `frontend/src/features/certification/components/Emission/BatchIssueDialog.tsx`
- Create: `frontend/src/features/certification/hooks/useBatchIssue.ts`
- Modify: `EmissionPanel.tsx` (liga o botão `emitAllPending`)

**Interfaces:** Consumes `useIssueBatch` (Task 5), contagens da Task 6.

- [ ] **Step 1: hook.** `useBatchIssue(turma)`: deriva `pendientes` (linhas `sin_emitir`),
  estado do relator (mesma regra do individual: pré-seleção com 1), dispara
  `useIssueBatch({ enrollmentIds, redatorId })` e expõe `results: BatchIssueItemResultData[] | null`,
  `pending`, `message`.
- [ ] **Step 2: diálogo.** `BatchIssueDialog`: confirmação com contagem + seletor de relator;
  após o POST **não fecha** — lista cada item com nome do aluno (join com as linhas do painel por
  `enrollment_id`), `AppTag` ✓`codigo` quando `ok` e severity danger com `error` (mensagem crua do
  backend, já es-CL) quando não. A invalidação do painel (Task 5) repinta a tabela atrás.
- [ ] **Step 3:** `pnpm build && pnpm lint` verdes; smoke: turma do seed com ≥2 pendentes, lote →
  linhas pintadas. Commit `feat(certification): emissao em lote com resultado por linha`.

---

### Task 8: Historial — tabela, Ver, Revocar, Reemitir

**Files:**
- Create: `frontend/src/features/certification/components/Historial/HistorialTable.tsx`
- Create: `frontend/src/features/certification/components/Historial/CertificateViewDialog.tsx`
- Create: `frontend/src/features/certification/components/Historial/RevokeDialog.tsx`
- Create: `frontend/src/features/certification/hooks/useHistorial.ts`
- Modify: `CertificatesPage.tsx` (aba Historial deixa de ser stub)

**Interfaces:** Consumes `useCertificates`, `certStatus`, `useRevokeCertificate`,
`ConfirmIssueDialog`/`useCertificatePdfOpener` (Task 6), frame com `filterSlot` (Task 4).

- [ ] **Step 1: hook.** `useHistorial()`: `useCertificates()` + filtro de estado
  (`useState<CertDerivedStatus | null>`) + `useTableFilter` com
  `searchable: (c) => [c.codigo, c.snapshot.aluno.name, c.snapshot.aluno.rut]` e
  `where: statusFilter ? (c) => certStatus(c) === statusFilter : undefined` + contagens por
  estado para o rodapé (`statusSummary`) + `clearAll` composto (busca + estado) para o `clear`
  da moldura (contrato da Task 4).
- [ ] **Step 2: tabela.** `HistorialTable` sobre `SearchableTableFrame` com
  `filterSlot={<AppDropdown …opções Todos/vigente/por_vencer/vencido/revocado, optionValue="value"/>}`
  (opção "Todos" com `value: null` — é o caso do `optionValue` obrigatório). Colunas: código
  (mono, como o print) · alumno (nome + RUT do snapshot em 2 linhas) · curso (snapshot) · fecha
  emisión (`created_at` formatado `dd/MM/yyyy`) · vigencia hasta (`valido_ate` ou "—") · estado
  (`AppTag` por `certStatus`: vigente success, por_vencer warning, vencido neutro, revocado
  danger). Ações por linha: `Ver` sempre; `Revocar` quando `vigente|por_vencer`
  (gate `can('certification.certificate.revoke')`); `Reemitir` **só `revocado`**
  (gate `issue`) — decisão do João, Vencido não tem ação.
- [ ] **Step 3: diálogos.** `CertificateViewDialog`: resumo do snapshot (aluno, RUT, curso,
  código, vigência, estado, e quando revocado `revoked_at` + `revocation_reason`) + Descargar PDF
  (`useCertificatePdfOpener`). `RevokeDialog`: `AppTextarea` motivo obrigatório →
  `useRevokeCertificate`; 422 → banner. Reemitir: abre o `ConfirmIssueDialog` da Task 6
  alimentado pelo painel (`useEmissionPanel` já está em cache) — localize a matrícula pelo
  `enrollment_id` do certificado; se a turma não estiver mais emissível, o diálogo mostra o
  bloqueio (`certificate.blocked.*`) em vez do submit.
- [ ] **Step 4:** `pnpm build && pnpm lint && pnpm test` verdes; smoke: emitir → Historial
  Vigente → revogar com motivo → Revocado → Reemitir → novo código. Commit
  `feat(certification): historial com revogacao e reemissao`.

---

### Task 9: Validação pública + D19 + correção da rule

**Files:**
- Create: `frontend/src/features/certification/components/Validation/ValidationPage.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx`, `frontend/src/app/App.tsx`
- Modify: `.claude/rules/frontend-fsliced.md` (parágrafo da validação QR)

**Interfaces:** Consumes `usePublicCertificate` (Task 5), `certStatus` (para "Expirado").

- [ ] **Step 1: D19.** `App.tsx` perde o `SessionBootstrap`; no `AppRouter`:

```tsx
<Route path="/validar/:uuid" element={<ValidationPage />} />
<Route path="/login" element={<SessionBootstrap><LoginRoute /></SessionBootstrap>} />
<Route element={<SessionBootstrap><ProtectedRoute><AppLayout /></ProtectedRoute></SessionBootstrap>}>
```

  (login continua sob bootstrap — o redirect "já autenticado" depende do `/api/me`; só a rota
  pública fica fora.)
- [ ] **Step 2: página.** `ValidationPage` mobile-first (sem `AppLayout`): coluna centrada
  `max-w-md mx-auto`, marca no topo, e o cartão de estado: `isLoading` → `AppSkeleton`; 404 →
  `validation.notFound`; `status === 'revocado'` → `validation.revoked` + `revokedAt` (sem
  motivo); `valido_ate` passado → `validation.expired`; senão `validation.valid` + dados mínimos
  do `PublicCertificateData` (codigo, aluno.name, curso.name + `validation.hours`,
  turma.end_date, `validation.validUntil` quando houver). Nos dois temas (a página herda o
  provider de tema; sem toggle próprio).
- [ ] **Step 3: rule.** Em `frontend-fsliced.md`, o trecho "**Validação QR pública** é rota
  Laravel (domínio Certification), fora desta SPA — não criar `public/validate/` no front" passa a
  dizer: "**Validação QR pública** é a rota `/validar/:uuid` desta SPA, fora do ramo protegido e
  do `SessionBootstrap` (spec D14/D19 da certificação); a API pública
  `/api/publico/certificados/{uuid}` responde sem cookie."
- [ ] **Step 4:** provas: `pnpm build && pnpm lint && pnpm test`; no `pnpm dev` **numa janela
  anônima sem cookie**, abrir `/validar/<uuid real>` → renderiza sem redirect e o network **não
  mostra `GET /api/me`**; `/validar/<uuid inexistente>` → estado não encontrado; login normal
  segue funcionando (D19 sem regressão). Commit
  `feat(certification): validacao publica por uuid e descida do SessionBootstrap`.

---

### Task 10: Resultado acadêmico na tela da turma

**Files:**
- Modify: `frontend/src/features/operation/api/useEnrollments.ts` (+`useRecordResult`)
- Create: `frontend/src/features/operation/components/Enrollment/RegisterResultDialog.tsx`
- Create: `frontend/src/features/operation/hooks/useRegisterResult.ts`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx` (+ação) e/ou
  `EnrollmentSection.tsx` (estado do diálogo — siga a divisão real do arquivo)

**Interfaces:** Consumes `PUT /api/turmas/{turma}/alunos/{enrollment}/resultado`
(`EnrollmentResultData`: `{ grades: object|null, attendance_pct: string|null, approval_status }`,
permissão `operation.enrollment.manage`).

- [ ] **Step 1: mutation.** `useRecordResult(turmaId)` em `useEnrollments.ts`, invalidando a
  **mesma query key** que o `index` dos alunos usa (leia o arquivo — a key existe lá):

```ts
mutationFn: async (p: { enrollmentId: number; body: EnrollmentResultData }) =>
  (await api.put<EnrollmentData>(`/turmas/${turmaId}/alunos/${p.enrollmentId}/resultado`, p.body)).data
```

- [ ] **Step 2: hook + diálogo.** `useRegisterResult(turmaId, enrollment)`: form
  `{ approval_status, finalGrade, attendance_pct }` inicializado da matrícula
  (`grades?.final`, reset por `id+mode` no padrão "adjust state during render");
  `toBody()` **preserva as demais chaves de `grades`**: `{ ...enrollment.grades, final: finalGrade }`
  (omite `final` quando vazio — a omissão é o caminho válido do `PrintableGrade`);
  `useMutationErrors` para o 422. `RegisterResultDialog`: `AppDialog` com `AppDropdown` do estado
  (3 valores do enum, rótulos `certificate.aprobado/reprobado/pendiente`), `AppInputText` nota
  (texto livre — `"6,9"` chega como string), `AppInputText` asistencia; `FormErrorBanner`.
  Ação "Registrar resultado" por linha na tabela de alunos, gateada por
  `can('operation.enrollment.manage')`.
- [ ] **Step 3:** `pnpm build && pnpm lint && pnpm test`; smoke: registrar `"6,9"` → badge muda,
  emissão da matrícula passa a listá-la pendente; `grades.final` vazio + estado → 200 com omissão.
  Commit `feat(operation): registro do resultado academico na turma`.

---

### Task 11: Gate do bloco

**Files:** nenhum novo (correções que surgirem são declaradas).

- [ ] **Step 1 — item 0, na tela real (browser + curl), `migrate:fresh --seed` antes:**
  1. registrar resultado (`"6,9"`) numa matrícula de turma concluída;
  2. emitir individual — diálogo mostra código real; Descargar PDF abre o A4;
  3. Historial: Vigente → Revocar com motivo → Revocado → Reemitir → código novo;
  4. **QR do PDF baixado, aberto no celular/janela anônima** → `/validar/:uuid` renderiza válido
     **sem sessão e sem `GET /api/me`**; após revogar, a mesma URL diz revogado; uuid inexistente
     → não encontrado;
  5. lote: turma com ≥2 pendentes + 1 falha provocada (emita 1 antes por fora) → relatório por
     linha com a falha nomeada;
  6. `GET /api/turmas/{id}/manual` → `pdfinfo` **A4**; certificado do curso com description de
     3.689 chars → **2 páginas**, rodapé/QR conferidos por `pdftoppm`.
- [ ] **Step 2 — mecanismos vistos reprovando** (lição 10, sondas frescas e removidas): cenário
  do painel no `ContratanteEagerLoadTest` (remova o eager-load, veja a mensagem `lazy load`,
  restaure); item falho do batch (mutante: envolver o loop numa transação única → o teste de
  número contíguo reprova); bifurcação da moldura (dropdown ativo + lista vazia → texto de
  filtros, não de busca).
- [ ] **Step 3 — automático:** suíte backend completa com placar declarado vs. real; `pnpm test`
  + `pnpm build` + `pnpm lint`; Pint `--test` na lista exata dos `.php` do bloco (guarda de lista
  vazia, lição 9); `typescript:transform` → `git diff frontend/src/shared/types/generated.ts`
  **vazio** (já regenerado nas Tasks 1–2); locales em paridade (o `parity.test.ts` roda no
  `pnpm test`).
- [ ] **Step 4 — greps de lei:** `primereact` em `features/` (só via `shared/ui`), `@features/`
  em `shared/`, import cross-feature (certification não importa operation nem vice-versa — o
  Reemitir consome API, não componente), `abort(` novo em `backend/app/`, `new FormData(`,
  query-em-componente (lint já cobre).
- [ ] **Step 5 — checkpoint visual do João (não delegável):** Emisión (vazia + turma + bloqueada),
  diálogos (confirmar/emitido/lote), Historial (4 estados + busca + filtro), `/validar/:uuid`
  (4 estados, mobile), resultado na turma — **nos dois temas**.
- [ ] **Step 6:** placar final registrado no ledger; bloco vai a `ready_for_review` (o review de
  sprint é passo próprio, fora deste plano).

---

## Handoff de execução

`executor: claude` — subagent-driven-development nesta sessão. Nenhuma task vai ao Codex: as de
backend mexem em contrato de domínio de peso legal (emission-panel/batch) e as de frontend exigem
julgamento visual contra os prints; nenhuma é mecânica com verificação totalmente executável.
Review de bloco: **alto risco** (documento de peso legal + rota pública + `generated.ts`) → duas
frentes (lente Claude + Codex read-only) quando chegar em `ready_for_review`.
