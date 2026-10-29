# Bloco 43 — `frontend-dialogos-proporcionais-e-tipo-de-documento` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** diálogos em duas famílias proporcionais — moldura padrão `sm`/`md`/`lg` com header e
footer navy, e confirmação compacta com três severidades —, formulários de aluno e matrícula em
grade, e documento do orçamento etiquetado por tipo (orden de compra, factura, comprobante)
escolhido num diálogo.

**Architecture:** o comportamento comum a todo diálogo (foco de volta ao disparador, nomes
acessíveis do fechar e do maximizar, `draggable={false}`) sai do `AppDialog` para um
`DialogFrame` interno de `shared/ui`; sobre ele vivem duas cascas: `AppDialog` (tamanho
obrigatório, maximizar só no `lg`, classe `lotus-dialog` que a folha de marca pinta de navy) e
`ConfirmDialog` (28rem, sem maximizar, faixa e ícone pela severidade). O tipo de anexo do
orçamento vira enum do domínio Comercial, e o upload sai do header do card para um diálogo cujo
estado mora num hook da feature.

**Tech Stack:** React 19 + TS, PrimeReact 10 via `shared/ui`, Tailwind v4 (layout), Vitest
(jsdom); Laravel 13 / PHP 8.3, PHPUnit (sqlite `:memory:`), typescript-transformer.

**Spec:** `docs/superpowers/blocos/43-frontend-dialogos-proporcionais-e-tipo-de-documento/spec.md`

**Como ler este plano:** cada task traz o conteúdo final dos arquivos. Arquivo novo ou pequeno
vem **inteiro** ("arquivo inteiro"); arquivo grande vem em **trechos exatos** — `// antes` é o
texto de hoje, a copiar no `old_string`, e `// depois` é o que fica no lugar. Os trechos de uma
task já contam com as tasks anteriores aplicadas (ex.: o `size` que a Task 3 põe aparece no
"antes" da Task 4). Os testes vêm prontos e são escritos primeiro. Desvio do código do plano só se
o teste ou o build o exigirem, com o motivo na mensagem do commit; mudança de desenho volta ao
João.

## Global Constraints

- Lei 6: feature não importa PrimeReact nem outra feature; peça nova de UI nasce em `shared/ui`.
- Lei 3: `frontend/src/shared/types/generated.ts` só muda por
  `docker compose exec -T app php artisan typescript:transform` (o transformer emite sozinho todo
  enum de `app/`, sem atributo).
- Lei 7 / RN-14: anexo ausente nunca bloqueia aprovar o orçamento.
- Larguras (spec §4.1–4.2): todas `w-[95vw]`; teto `sm` = `max-w-[32rem]`, `md` =
  `max-w-[48rem]`, `lg` = `max-w-[64rem]`, confirmação = `max-w-[28rem]`. Maximizar só no `lg`.
- Cor só por variável do tema. A pintura navy do diálogo mora em `brand-theme.css`, escopada em
  `.lotus-dialog` (molde: `.lotus-language-menu`, `brand-theme.css:334-347` — a folha fica fora de
  layer e vence o Lara sem depender de especificidade).
- Todo `AppButton` declara papel; secundária de diálogo (Cancelar/Cerrar) é `text`
  (`BOTAO_SEM_PAPEL`).
- Componente em `features/*/components/**` ≤ 150 linhas e sem query/mutation direta (lint).
- i18n: as 3 locales com chaves idênticas (`es-CL` é a referência); chave que ficar sem uso sai
  das três.
- `danger` preenchido segue como está (3,76:1 no claro, `P-74`) — fora do bloco (spec J10).
- A branch `docs/impeccable-product` não é base nem referência: será descartada depois deste
  bloco (spec J13). Nada dela se copia aqui — nem o `size`, nem os tons, nem os testes.
- Comandos: backend no container da lane (`docker compose exec -T app …`); frontend com
  `pnpm -C frontend <script>`; Pint só nos arquivos tocados
  (`cd backend && ./vendor/bin/pint <arquivos>`).
- Regressão vista reprovando contra o código antigo por cópia no scratchpad. **Nunca `git stash`.**
- Commits em pt-BR, `feat(43): …`/`test(43): …`/`fix(43): …`, terminando com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Reabrir o diálogo de upload depois de um envio** (sucesso ou erro): começa limpo, sem tipo,
   sem arquivo, sem erro. Teste no `useBudgetDocumentUpload.test.tsx` (Task 5).
2. **Erro do servidor no upload** (422 de MIME ou tamanho): o diálogo fica aberto, com o erro
   dentro, e tipo e arquivo preservados para tentar de novo. Teste no hook (Task 5).
3. **Fechar com o envio em voo:** X, ESC e Cancelar travados enquanto `pending`; senão o 422
   chegaria sem ninguém para exibi-lo. Teste no `BudgetDocumentUploadDialog.test.tsx` (Task 5).
4. **Arquivo com `type` fora do enum na lista** (dado antigo ou de outro fluxo): tag neutra com o
   valor cru, sem quebrar. Teste no `FileList.test.tsx` (Task 5).
5. **`lg` maximizado:** o teto de largura não pode prender o maximizado. Teste no
   `AppDialog.test.tsx` (Task 3) e conferência no navegador (Task 6).

---

## Preparação (antes da Task 1, uma vez)

Na raiz da lane (`/home/jvbat/projetos/lotus-43-frontend-dialogos-proporcionais-e-tipo-de-documento`,
offset +3: API `:8083`, Vite `:5176`):

```bash
docker compose up -d
docker compose exec -T app composer install
docker compose exec -T app php artisan test --filter=CommercialFilesTest
pnpm -C frontend test
```
Esperado: verde (linha de base).

---

### Task 1: Enum `BudgetDocumentType` e validação do upload do orçamento

**Files:**
- Create: `backend/app/Domains/Commercial/Enums/BudgetDocumentType.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php`
- Modify: `backend/tests/Feature/Comercial/CommercialFilesTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)
- Modify: `frontend/src/features/commercial/api/useCommercialFiles.ts`
- Modify: `frontend/src/features/commercial/hooks/useBudgetDetail.ts` (só o tipo)
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx` (só o tipo)

**Interfaces:**
- Produces: `App\Domains\Commercial\Enums\BudgetDocumentType` (`PURCHASE_ORDER = 'purchase_order'`,
  `INVOICE = 'invoice'`, `RECEIPT = 'receipt'`). TS gerado:
  `export type BudgetDocumentType = 'purchase_order' | 'invoice' | 'receipt';`.
  `useUploadBudgetFile()` tipa `type: BudgetDocumentType`. O `BudgetFileType` escrito à mão deixa
  de existir.

- [ ] **Step 1: Testes que falham** — `backend/tests/Feature/Comercial/CommercialFilesTest.php`.

Import novo, junto dos outros `use`:

```php
use PHPUnit\Framework\Attributes\DataProvider;
```

Logo depois de `test_tipo_invalido_rejeitado()` (que fica como está), acrescentar:

```php
    /** @return array<string, array{string}> */
    public static function tiposDoOrcamento(): array
    {
        return [
            'orden de compra' => ['purchase_order'],
            'factura' => ['invoice'],
            'comprobante' => ['receipt'],
        ];
    }

    #[DataProvider('tiposDoOrcamento')]
    public function test_upload_de_cada_tipo_do_orcamento(string $tipo): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => $tipo,
            'file' => UploadedFile::fake()->create('anexo.pdf', 20, 'application/pdf'),
        ])->assertCreated()->assertJsonPath('type', $tipo);

        $this->assertDatabaseHas('files', [
            'fileable_type' => 'budget', 'fileable_id' => $budget->id, 'type' => $tipo,
        ]);
    }

    /** O tipo da cotação tem rota própria; no orçamento ele é recusado. */
    public function test_tipo_da_cotacao_rejeitado_no_orcamento(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'quote_document',
            'file' => UploadedFile::fake()->create('x.pdf', 1, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('type');
    }
```

- [ ] **Step 2:** `docker compose exec -T app php artisan test --filter=CommercialFilesTest` → FAIL
  só no caso `orden de compra` (hoje 422); os outros dois e o da cotação já passam.

- [ ] **Step 3: Implementar.**

`backend/app/Domains/Commercial/Enums/BudgetDocumentType.php` (arquivo inteiro):

```php
<?php

namespace App\Domains\Commercial\Enums;

/**
 * Tipos de anexo do orçamento (RN-14): orden de compra, factura e comprobante.
 * Enum do domínio, não global: a `files` polimórfica tem `type` string livre, e
 * este enum só restringe e rotula os anexos de orçamento (mesmo padrão do
 * `TurmaDocumentType`). `invoice` e `receipt` são os valores que já estavam
 * gravados antes dele — por isso não houve migration nem backfill. O documento
 * da cotação (`quote_document`) é outro fluxo e não entra aqui.
 */
enum BudgetDocumentType: string
{
    case PURCHASE_ORDER = 'purchase_order';
    case INVOICE = 'invoice';
    case RECEIPT = 'receipt';
}
```

`backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php` (arquivo inteiro):

```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Enums\BudgetDocumentType;
use App\Domains\Commercial\Models\Budget;
use App\Http\Controllers\Controller;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\ContentClass;
use App\Shared\Files\Data\FileData;
use App\Shared\Files\Models\File;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rules\Enum;

/**
 * Anexos do orçamento: orden de compra, fatura e comprovante
 * (`BudgetDocumentType`). Registro financeiro — NÃO bloqueia nenhuma ação
 * (RN-14).
 */
class BudgetFileController extends Controller
{
    public function store(Request $request, Budget $budget, UploadFileAction $action): FileData
    {
        $validated = $request->validate([
            'type' => ['required', new Enum(BudgetDocumentType::class)],
            'file' => ContentClass::Documento->regras(),
        ]);

        return FileData::fromModel(
            $action->execute($budget, $request->file('file'), $validated['type']),
        );
    }

    public function destroy(Budget $budget, File $file): Response
    {
        // Posse garantida pelo `->scopeBindings()` da rota: o {file} é resolvido
        // por $budget->files(), então arquivo de outro budget — ou de outro
        // fileable_type — nunca chega aqui (404 no binding).
        $file->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 4:** `docker compose exec -T app php artisan test --filter=CommercialFilesTest` → PASS;
  `docker compose exec -T app php artisan test --filter='Comercial|UploadSizeLimit|RateLimit'` verde.

- [ ] **Step 5: Tipo gerado e consumidores TS.**

`docker compose exec -T app php artisan typescript:transform`, e conferir:
`grep -n "export type BudgetDocumentType" frontend/src/shared/types/generated.ts` →
`export type BudgetDocumentType = 'purchase_order' | 'invoice' | 'receipt';`

`frontend/src/features/commercial/api/useCommercialFiles.ts` — três trocas:

```ts
// antes
import type { FileData } from '@shared/types/generated'
// depois
import type { BudgetDocumentType, FileData } from '@shared/types/generated'
```

```ts
// antes
import { postMultipart } from '@shared/api/postMultipart'

/** Tipos aceitos pelo backend: orçamento = fatura/comprovante; cotação = documento. */
export type BudgetFileType = 'invoice' | 'receipt'
// depois
import { postMultipart } from '@shared/api/postMultipart'
```

```ts
// antes
export function useUploadBudgetFile() {
  const invalidate = useInvalidate()
  return useMutation<FileData, ProblemDetails, { budgetId: number; type: BudgetFileType; file: File }>({
// depois
/** Anexo do orçamento; o tipo é o enum do domínio Comercial. A cotação sobe o
 * dela por `useUploadQuoteFile`, com `quote_document` fixo. */
export function useUploadBudgetFile() {
  const invalidate = useInvalidate()
  return useMutation<FileData, ProblemDetails, { budgetId: number; type: BudgetDocumentType; file: File }>({
```

`frontend/src/features/commercial/hooks/useBudgetDetail.ts` — duas trocas (a Task 5 reescreve o
resto):

```ts
// antes
import type { QuoteData } from '@shared/types/generated'
import { useApproveQuote, useRejectQuote, useRemoveQuote } from '../api/useQuotes'
import { useUploadBudgetFile, useRemoveBudgetFile, type BudgetFileType } from '../api/useCommercialFiles'
// depois
import type { BudgetDocumentType, QuoteData } from '@shared/types/generated'
import { useApproveQuote, useRejectQuote, useRemoveQuote } from '../api/useQuotes'
import { useUploadBudgetFile, useRemoveBudgetFile } from '../api/useCommercialFiles'
```

```ts
// antes
  const [fileType, setFileType] = useState<BudgetFileType>('invoice')
// depois
  const [fileType, setFileType] = useState<BudgetDocumentType>('invoice')
```

`frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx` — trocar o tipo nos
quatro pontos (a Task 5 reescreve o arquivo):

```ts
// antes
import type { FileData } from '@shared/types/generated'
import type { BudgetFileType } from '../../api/useCommercialFiles'
// depois
import type { BudgetDocumentType, FileData } from '@shared/types/generated'
```

e `BudgetFileType` → `BudgetDocumentType` em `fileType:`, `onFileTypeChange:` e no
`e.value as …`.

`pnpm -C frontend build` e `pnpm -C frontend test` verdes; `grep -rn BudgetFileType frontend/src`
sem resultado.

- [ ] **Step 6:** `cd backend && ./vendor/bin/pint app/Domains/Commercial/Enums/BudgetDocumentType.php
  app/Domains/Commercial/Http/Controllers/BudgetFileController.php
  tests/Feature/Comercial/CommercialFilesTest.php`; commit
  `feat(43): enum de tipo de anexo do orçamento com orden de compra`.

### Task 2: `DialogFrame` e confirmação compacta com três severidades

**Files:**
- Create: `frontend/src/shared/ui/AppDialog/DialogFrame.tsx`
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.tsx`
- Create: `frontend/src/shared/ui/AppTag/tones.ts`
- Modify: `frontend/src/shared/ui/AppTag/AppTag.tsx`
- Create: `frontend/src/shared/ui/ConfirmDialog/style.ts`
- Modify: `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.tsx`
- Modify: `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.test.tsx`
- Modify: `frontend/tests/tone-ink.test.ts`
- Modify: `frontend/src/features/operation/components/Enrollment/MoveConfirmDialog.tsx`
- Modify: `frontend/src/features/certification/components/Historial/RevokeDialog.tsx`
- Modify: `frontend/src/features/certification/components/Emission/ConfirmIssueDialog.tsx`
- Modify: `frontend/src/features/operation/components/Turma/RedatorDesignation.tsx` (o aviso de inelegível vira `warning`)
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (sai `operation.enrollment.move.cancel`)

**Interfaces:**
- Produces: `DialogFrame(props: DialogProps)` — interno de `shared/ui`, **fora do barrel**. É o
  corpo de hoje do `AppDialog`: captura do disparador no render, foco de volta no fechamento,
  `draggable={false}` e os pins de `aria-label` do fechar e do maximizar. Não liga `maximizable`
  sozinho: quem embrulha decide.
- Produces: `severityTone: Record<SeverityToneName, { background: string; color: string }>` e
  `SeverityToneName = 'success' | 'info' | 'warning' | 'danger'` em `AppTag/tones.ts` (os valores
  de hoje do `TOM` do `AppTag`, movidos sem mudança).
- Produces: `ConfirmDialogSeverity = 'confirm' | 'warning' | 'danger'` e `confirmSeverityStyle`
  em `ConfirmDialog/style.ts`; `ConfirmDialog` com as props de hoje mais `severity?:
  ConfirmDialogSeverity` (default `'confirm'`), `confirmIcon?: string` (default `'pi pi-check'`) e
  `confirmDisabled?: boolean`. Os consumidores atuais (`severity="danger"` ou sem severidade) não
  mudam, salvo o aviso de inelegível do `RedatorDesignation`, que passa a `warning` (spec J12).

- [ ] **Step 1: Testes que falham.**

`frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.test.tsx` (arquivo inteiro; os três testes
de hoje ficam):

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'
import { confirmSeverityStyle } from './style'
import { severityTone } from '../AppTag/tones'

const base = {
  visible: true,
  title: 'Confirmar',
  message: '¿Seguro?',
  onConfirm: () => {},
  onCancel: () => {},
}

/**
 * `CrudDialog` confirmava com a marca e `ConfirmDialog` com o `severity` cru do
 * Lara: dois diálogos do mesmo produto, dois botões de confirmar diferentes
 * (achado B3). Confirmar é a mesma ação nos dois; o que difere é a severidade.
 */
describe('ConfirmDialog — botão de confirmar', () => {
  it('sem severidade, confirma com a marca (igual ao CrudDialog)', () => {
    render(<ConfirmDialog {...base} confirmLabel="Aceptar" />)

    expect(screen.getByRole('button', { name: /Aceptar/ }).className)
      .toContain('border-[var(--brand-ink)]')
  })

  /** Ação destrutiva NÃO veste marca: o preenchido de severidade é o sinal, e
   * trocá-lo por marca apagaria a diferença entre confirmar e destruir. */
  it('com `severity="danger"`, mantém o preenchido de severidade', () => {
    render(<ConfirmDialog {...base} confirmLabel="Eliminar" severity="danger" />)

    const botao = screen.getByRole('button', { name: /Eliminar/ })
    expect(botao.className).toContain('p-button-danger')
    expect(botao.className).not.toContain('border-[var(--brand-ink)]')
  })

  it('com `severity="warning"`, veste o preenchido de aviso', () => {
    render(<ConfirmDialog {...base} confirmLabel="Mover" severity="warning" />)

    const botao = screen.getByRole('button', { name: /Mover/ })
    expect(botao.className).toContain('p-button-warning')
    expect(botao.className).not.toContain('border-[var(--brand-ink)]')
  })

  it('confirmDisabled desliga só o confirmar', () => {
    render(<ConfirmDialog {...base} confirmLabel="Revocar" confirmDisabled />)

    expect((screen.getByRole('button', { name: /Revocar/ }) as HTMLButtonElement).disabled).toBe(true)
    expect((document.querySelector('.p-dialog-footer .p-button-text') as HTMLButtonElement).disabled).toBe(false)
  })

  it('confirmIcon troca o ícone do botão', () => {
    render(<ConfirmDialog {...base} confirmLabel="Revocar" confirmIcon="pi pi-ban" severity="danger" />)

    expect(screen.getByRole('button', { name: /Revocar/ }).querySelector('.pi-ban')).toBeTruthy()
  })
})

/** Bloco 43, spec J3: a severidade se lê antes do texto — faixa no topo e
 * ícone no header —, e a confirmação não se confunde com a moldura navy de
 * formulário (J4). */
describe('ConfirmDialog — confirmação compacta', () => {
  it.each(['confirm', 'warning', 'danger'] as const)('%s marca a severidade e pinta o ícone do header', (severity) => {
    render(<ConfirmDialog {...base} severity={severity} />)

    expect(document.querySelector('[data-severity]')?.getAttribute('data-severity')).toBe(severity)
    const classeDoIcone = confirmSeverityStyle[severity].icon.split(' ')[1]
    expect(document.querySelector('[data-severity-icon]')?.className).toContain(classeDoIcone)
  })

  it('não maximiza nem herda a moldura navy', () => {
    render(<ConfirmDialog {...base} />)

    expect(document.querySelector('.p-dialog-header-maximize')).toBeNull()
    const raiz = document.querySelector('.p-dialog')
    expect(raiz?.className).toContain('max-w-[28rem]')
    expect(raiz?.className).not.toContain('lotus-dialog')
  })

  it('com a requisição em voo, Cancelar trava e o X some', () => {
    render(<ConfirmDialog {...base} confirmLabel="Eliminar" severity="danger" pending />)

    expect((document.querySelector('.p-dialog-footer .p-button-text') as HTMLButtonElement).disabled).toBe(true)
    expect(document.querySelector('.p-dialog-header-close')).toBeNull()
  })

  it('o mapa de estilo lê os tons medidos do AppTag', () => {
    expect(confirmSeverityStyle.confirm).toMatchObject({ stripe: 'var(--green-500)', ...severityTone.success })
    expect(confirmSeverityStyle.warning).toMatchObject({ stripe: 'var(--yellow-500)', ...severityTone.warning })
    expect(confirmSeverityStyle.danger).toMatchObject({ stripe: 'var(--red-500)', ...severityTone.danger })
  })
})

describe('ConfirmDialog — children', () => {
  it('mostra o conteúdo extra no corpo, junto da mensagem', () => {
    render(
      <ConfirmDialog {...base}>
        <ul role="list"><li>Detalhe extra</li></ul>
      </ConfirmDialog>,
    )

    expect(screen.getByText('¿Seguro?')).toBeTruthy()
    expect(screen.getByText('Detalhe extra')).toBeTruthy()
  })
})
```

`frontend/tests/tone-ink.test.ts` — dentro do `describe.each` de
`'tinta de severidade sobre superfície de card (UI-04)'`, depois do
`'o tom $tom continua passando sobre a superfície tingida pelo próprio tom'`:

```ts
    /** Bloco 43: o fundo de 15% do `AppTag` (`severityTone`) é também o do ícone
     * da `ConfirmDialog`, e só o `accent` era medido nessa proporção. */
    it.each(tintasDe(bloco, folha).filter(({ tom }) => tom !== 'accent'))(
      'o tom $tom passa AA sobre o fundo de 15% do `severityTone`',
      ({ tom, tinta }) => {
        const { hue } = TONS[tom as keyof typeof TONS]
        expect(contraste(tinta, tingido(hex(folha, `--${hue}-500`), card, 0.15))).toBeGreaterThanOrEqual(4.5)
      },
    )
```

Se este caso reprovar em algum tom, **pare e reporte ao João**: é defeito anterior do `AppTag`,
fora do desenho do bloco.

- [ ] **Step 2:** `pnpm -C frontend exec vitest run src/shared/ui/ConfirmDialog tests/tone-ink.test.ts`
  → FAIL nos testes novos do `ConfirmDialog` (`./style` e `../AppTag/tones` não existem).

- [ ] **Step 3: Implementar.**

`frontend/src/shared/ui/AppDialog/DialogFrame.tsx` (arquivo novo; o corpo é o do `AppDialog` de
hoje, movido):

```tsx
import { useEffect, useRef } from 'react'
import { Dialog } from 'primereact/dialog'
import type { DialogProps } from 'primereact/dialog'
import { useTranslation } from 'react-i18next'
import { mergePt } from '../mergePt'

/** O que TODO diálogo do produto faz, qualquer que seja a casca: devolve o foco
 * ao disparador, nomeia o fechar e o maximizar no idioma da interface e não
 * arrasta. Interno de `shared/ui`, fora do barrel. As cascas — `AppDialog`, a
 * moldura de formulário, e `ConfirmDialog`, a confirmação compacta — decidem
 * tamanho, pintura e se maximiza; este componente não liga `maximizable`
 * sozinho (bloco 43).
 *
 * Devolve o foco ao disparador no fechamento. O mecanismo do PrimeReact existe
 * (`onExited` -> `DomHandler.focus`) mas é INERTE aqui: ele captura dentro de um
 * `useUpdateEffect`, que pula a primeira execução, e as 9 páginas do repo montam
 * o diálogo condicionalmente já com `visible`. Os dois não competem — o do
 * PrimeReact segue rodando com `null`, que é no-op. */
export function DialogFrame({ pt, visible, ...props }: DialogProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLElement | null>(null)
  const wasVisible = useRef(false)

  // Captura no RENDER, não em efeito: quando o efeito rodaria, o Dialog já moveu
  // o foco para dentro de si e o disparador deixou de ser o `activeElement`.
  /* eslint-disable react-hooks/refs -- mutação de ref em render é intencional aqui,
   * não descuido: é a única forma de detectar a borda de subida de `visible`
   * (false -> true) num componente que já estava montado (o caso 2 de montagem
   * do wrapper) e capturar o disparador ANTES do Dialog mover o foco pra dentro
   * de si no mesmo commit. `wasVisible` não é o idioma de "lazy init" que a regra
   * permite (ref != null uma vez só) porque a borda se repete a cada abertura. */
  if (visible && !wasVisible.current) {
    triggerRef.current = document.activeElement as HTMLElement | null
  }
  wasVisible.current = Boolean(visible)
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (!visible) return
    return () => {
      // NÃO zera `triggerRef.current` aqui. O StrictMode do dev roda esta
      // limpeza uma vez a mais, de propósito (mount -> cleanup -> mount,
      // simulado, no mesmo commit) para expor efeitos que não sobrevivem a
      // ser remontados. Como a captura vive no RENDER (acima), não neste
      // efeito, aquele ciclo fantasma não recaptura nada — só a limpeza
      // roda de novo. Zerar aqui apagava o disparador antes do fechamento
      // real, e o foco caía pro <body> (bug visto e provado no navegador
      // antes desta correção). Deixar o valor parado é seguro: a próxima
      // abertura sempre sobrescreve via a captura no render.
      const trigger = triggerRef.current
      // Disparador que saiu do DOM (linha de tabela removida pela invalidação)
      // não recebe foco: o navegador fica onde está, sem exceção.
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [visible])

  return (
    <Dialog
      draggable={false}
      visible={visible}
      pt={mergePt<DialogProps['pt']>(pt, {
        // Pinado DEPOIS do `pt` recebido: o nome do controle é acessibilidade,
        // não estilo, e não pode ser desligado por quem customiza o `pt` (mesma
        // regra do `customUpload` em `AppFileUpload`). Funde por `mergePt`, e
        // não por spread raso, porque o spread trocaria a chave INTEIRA: quem
        // passasse `pt.closeButton.className` perdia o nome acessível, e quem
        // não passasse nada perdia a customização — o mesmo silêncio que o
        // `AppFileUpload` já tinha pago. O rótulo de maximizar é DINÂMICO — o
        // `pt` do Dialog recebe `state` (`dialog.cjs.js:453-455`) —, porque um
        // rótulo fixo mentiria em metade dos estados.
        maximizableButton: ({ state }: { state: { maximized: boolean } }) => ({
          'aria-label': state.maximized ? t('common.restoreDialog') : t('common.maximizeDialog'),
        }),
        // O irmão que faltava. O botão de maximizar ganhou nome traduzido e o de
        // FECHAR ficou no default do Prime — `localeOption('close')`, isto é
        // "Close" em inglês, em TODO diálogo da aplicação (medido no gate do
        // BD-16). Não vem pela locale global do Prime porque `locale('es')`
        // nunca é chamado no projeto: `primeLocale.ts` só faz `addLocale`, e um
        // rótulo pendurado lá ficaria congelado na troca de idioma — o mesmo
        // motivo pelo qual o olho do `AppPassword` se nomeia no wrapper (UI-08).
        closeButton: { 'aria-label': t('common.close') },
      })}
      {...props}
    />
  )
}
```

`frontend/src/shared/ui/AppDialog/AppDialog.tsx` (arquivo inteiro; comportamento idêntico ao de
hoje — a Task 3 o muda):

```tsx
import type { DialogProps } from 'primereact/dialog'
import { mergePt } from '../mergePt'
import { DialogFrame } from './DialogFrame'
import { appDialogPt } from './style'

export type { DialogProps as AppDialogProps } from 'primereact/dialog'

/** Wrapper do Dialog: maximizable por default, largo/alto, header e footer na
 * mesma superfície. Usado pelo CrudDialog. Foco de volta e nomes acessíveis
 * moram no `DialogFrame`, que a `ConfirmDialog` também usa. */
export function AppDialog({ pt, ...props }: DialogProps) {
  return <DialogFrame maximizable {...props} pt={mergePt<DialogProps['pt']>(appDialogPt, pt)} />
}
```

`frontend/src/shared/ui/AppTag/tones.ts` (arquivo novo):

```ts
import { dangerText, infoText, successText, warningText } from '../../styles/tokens'

export type SeverityToneName = 'success' | 'info' | 'warning' | 'danger'

/** Hue por severidade. Os palette vars do Lara NÃO invertem entre temas, então o
 * fundo tingido é composto com `--surface-card` (que inverte) via color-mix — a
 * mesma mecânica do `AppCard`. A TINTA, essa, vem de `--tone-*-ink`, que troca o
 * degrau da rampa por tema e já é o que o corpo do produto usa para texto de
 * severidade. Dois donos: a tag (`AppTag`) e o ícone da confirmação compacta
 * (`ConfirmDialog`, bloco 43); a régua UI-04 de `tone-ink.test.ts` mede os 15%. */
export const severityTone: Record<SeverityToneName, { background: string; color: string }> = {
  success: { background: 'color-mix(in srgb, var(--green-500) 15%, var(--surface-card))', color: successText },
  info: { background: 'color-mix(in srgb, var(--blue-500) 15%, var(--surface-card))', color: infoText },
  warning: { background: 'color-mix(in srgb, var(--yellow-500) 15%, var(--surface-card))', color: warningText },
  danger: { background: 'color-mix(in srgb, var(--red-500) 15%, var(--surface-card))', color: dangerText },
}
```

`frontend/src/shared/ui/AppTag/AppTag.tsx` — o import de tokens e o `TOM` saem; o resto do arquivo
(docblocks inclusive) fica:

```tsx
// antes
import { accentText, dangerText, infoText, successText, warningText } from '../../styles/tokens'
// depois
import { accentText } from '../../styles/tokens'
import { severityTone, type SeverityToneName } from './tones'
```

```tsx
// antes: o bloco inteiro do `TOM`, do docblock "/** Hue por severidade." até o `}` que fecha o objeto
// depois: nada (mudou para `tones.ts`)
```

```tsx
// antes
        : props.severity
          ? TOM[props.severity]
          : undefined
// depois
        : props.severity && props.severity in severityTone
          ? severityTone[props.severity as SeverityToneName]
          : undefined
```

`frontend/src/shared/ui/ConfirmDialog/style.ts` (arquivo novo):

```ts
import { severityTone } from '../AppTag/tones'

export type ConfirmDialogSeverity = 'confirm' | 'warning' | 'danger'

/** A pintura de cada severidade da confirmação compacta (bloco 43, spec J3):
 * faixa no topo e ícone circular no header, na cor do sinal. Fundo e tinta do
 * ícone são os do `AppTag` (`severityTone`), medidos pela régua UI-04; a faixa é
 * o hue cheio, que é traço e não texto. `confirm` é verde (`success`, spec J11):
 * o botão de confirmar já veste a marca, e o ícone diz o TIPO da pergunta — um
 * azul ao lado do celeste leria como outro tom da mesma cor. */
export const confirmSeverityStyle: Record<
  ConfirmDialogSeverity,
  { stripe: string; icon: string; background: string; color: string }
> = {
  confirm: { stripe: 'var(--green-500)', icon: 'pi pi-check-circle', ...severityTone.success },
  warning: { stripe: 'var(--yellow-500)', icon: 'pi pi-exclamation-triangle', ...severityTone.warning },
  danger: { stripe: 'var(--red-500)', icon: 'pi pi-exclamation-circle', ...severityTone.danger },
}
```

`frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.tsx` (arquivo inteiro):

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DialogFrame } from '../AppDialog/DialogFrame'
import { AppButton } from '../AppButton'
import { FormErrorBanner } from '../FormField'
import { confirmSeverityStyle, type ConfirmDialogSeverity } from './style'

export type { ConfirmDialogSeverity } from './style'

/** Confirmação compacta (bloco 43): 28rem, sem maximizar, e a severidade dita
 * antes do texto — faixa no topo e ícone no header. `confirm` pergunta (aprovar
 * uma cotação libera a turma na Operação), `warning` avisa de um efeito
 * colateral ou de uma regra contornada (mover o aluno de cliente, designar um
 * redator inelegível) e `danger` destrói ou não tem volta.
 * Não usa a moldura navy do `AppDialog`: as duas famílias se distinguem à
 * primeira vista (spec J3/J4). Apresentacional puro: não conhece feature nem
 * mutação. */
export function ConfirmDialog({
  visible, title, message, children, confirmLabel, confirmIcon = 'pi pi-check', confirmDisabled,
  severity = 'confirm', pending, error, onConfirm, onCancel,
}: {
  visible: boolean
  title: string
  message: string
  /** Conteúdo extra do corpo, depois da mensagem (ex.: lista de detalhes). */
  children?: ReactNode
  confirmLabel?: string
  confirmIcon?: string
  /** Desliga só o confirmar (ex.: motivo obrigatório ainda vazio). */
  confirmDisabled?: boolean
  severity?: ConfirmDialogSeverity
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const s = confirmSeverityStyle[severity]

  const header = (
    <div data-severity={severity} className="flex items-center gap-3 pr-6">
      <span
        aria-hidden
        data-severity-icon
        className={`${s.icon} grid size-10 shrink-0 place-items-center rounded-full text-xl`}
        style={{ background: s.background, color: s.color }}
      />
      <span>{title}</span>
    </div>
  )

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} text disabled={pending} onClick={onCancel} />
      {/* `confirm` veste a marca — a mesma grafia do `CrudDialog` (achado B3).
        * `warning` e `danger` vestem o preenchido de severidade, que é o sinal;
        * a marca sairia por cima dele. */}
      <AppButton
        variant={severity === 'confirm' ? 'primary' : undefined}
        severity={severity === 'confirm' ? undefined : severity}
        label={confirmLabel ?? t('common.save')}
        icon={confirmIcon}
        loading={pending}
        disabled={confirmDisabled}
        onClick={onConfirm}
      />
    </div>
  )

  return (
    // Com a requisição em voo, ESC e o X do header ficam travados junto com o
    // Cancelar: fechar aqui solta o observer da mutação e a resposta (403/422)
    // chegaria sem ninguém para exibi-la.
    <DialogFrame
      header={header}
      visible={visible}
      onHide={onCancel}
      footer={footer}
      closable={!pending}
      closeOnEscape={!pending}
      maximizable={false}
      pt={{
        root: {
          className: 'w-[95vw] max-w-[28rem]',
          style: { borderTop: `4px solid ${s.stripe}` },
        },
      }}
    >
      <FormErrorBanner message={error} />
      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{message}</p>
      {children}
    </DialogFrame>
  )
}
```

- [ ] **Step 4: Migrar os três consumidores e reclassificar o aviso do `RedatorDesignation`** (as
  props públicas deles não mudam).

`frontend/src/features/operation/components/Enrollment/MoveConfirmDialog.tsx` (arquivo inteiro):

```tsx
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@shared/ui'

type Props = {
  visible: boolean
  studentName: string
  previousClient: string | null
  currentClient: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** Confirma a troca de cliente ANTES de matricular (RN-10). Sem este passo, um
 * RUT de outro cliente moveria o aluno silenciosamente — o usuário precisa ver
 * "de X para Y" e confirmar; cancelar não matricula ninguém. É aviso, não
 * perigo: muda o vínculo do aluno, mas não destrói nada (`warning`). */
export function MoveConfirmDialog({
  visible,
  studentName,
  previousClient,
  currentClient,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation()
  return (
    <ConfirmDialog
      visible={visible}
      severity="warning"
      title={t('operation.enrollment.move.title')}
      message={t('operation.enrollment.move.body', {
        name: studentName,
        previous: previousClient ?? '—',
        current: currentClient ?? '—',
      })}
      confirmLabel={t('operation.enrollment.move.confirm')}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
```

`frontend/src/features/certification/components/Historial/RevokeDialog.tsx` (arquivo inteiro):

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog, AppTextarea, FormField } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useRevokeCertificate } from '../../api/certificatesApi'
import { CertificateIdentityFields } from './CertificateIdentityFields'

type Props = {
  certificate: CertificateData
  onHide: () => void
  onRevoked: () => void
}

/** Confirmação de revogação — ação irreversível, peso legal (RN de
 * certificação), por isso `danger`. Motivo obrigatório
 * (`RevokeCertificateData::rules()`: `required|string|max:255`); o disable do
 * botão evita a viagem ao backend para o caso óbvio, mas o 422 real (motivo
 * vazio ou too-long) sobe pelo banner igual. */
export function RevokeDialog({ certificate, onHide, onRevoked }: Props) {
  const { t } = useTranslation()
  const revoke = useRevokeCertificate()
  const { fieldErrors, message } = useMutationErrors([revoke.error])
  const [reason, setReason] = useState('')

  const submit = () => {
    if (reason.trim() === '' || revoke.isPending) return
    revoke.mutate({ certificateId: certificate.id, reason }, { onSuccess: onRevoked })
  }

  return (
    <ConfirmDialog
      visible
      severity="danger"
      title={t('certificate.revokeTitle')}
      message={t('certificate.revokeBody')}
      confirmLabel={t('certificate.revokeConfirm')}
      confirmIcon="pi pi-ban"
      confirmDisabled={reason.trim() === ''}
      pending={revoke.isPending}
      error={message}
      onConfirm={submit}
      onCancel={onHide}
    >
      <div className="mt-4 space-y-4">
        <CertificateIdentityFields certificate={certificate} />

        <FormField label={t('certificate.revokeReason')} error={fieldErrors?.reason?.[0]}>
          <AppTextarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoResize className="w-full" />
        </FormField>
      </div>
    </ConfirmDialog>
  )
}
```

`frontend/src/features/certification/components/Emission/ConfirmIssueDialog.tsx` — imports, e
o `footer` + `return` viram:

```tsx
// antes
import { AppDialog, AppButton, AppDropdown, FormField, FormErrorBanner } from '@shared/ui'
// depois
import { ConfirmDialog, AppDropdown, FormField } from '@shared/ui'
```

Docblock do componente: acrescentar ao fim "Confirmação compacta `confirm` (bloco 43)." O estado,
o `vigencia` e o `submit` ficam; do `const footer = (` até o fim do arquivo vira:

```tsx
  return (
    <ConfirmDialog
      visible
      title={t('certificate.confirmTitle')}
      message={t('certificate.confirmBody')}
      confirmLabel={t('certificate.confirmEmit')}
      confirmDisabled={redatorId == null}
      pending={issue.isPending}
      error={message}
      onConfirm={submit}
      onCancel={onHide}
    >
      <div className="mt-4 space-y-4">
        {/* Campos de confirmação: nascem só-leitura, então não há controle a
            montar — `readOnly` sem filho. Input desabilitado cortava o nome
            longo e derrubava o contraste (spec BD-3 §4). */}
        <FormField label={t('certificate.fieldAlumno')} readOnly value={enrollment.student_name} />
        <FormField label={t('certificate.fieldRut')} readOnly value={enrollment.student_rut} />
        <FormField label={t('certificate.fieldCurso')} readOnly value={turma.course_name} />
        <FormField label={t('certificate.fieldVigencia')} readOnly value={vigencia} />

        <FormField label={t('certificate.fieldRedator')} error={fieldErrors?.redator_id?.[0]}>
          <AppDropdown
            value={redatorId}
            options={turma.redatores.map((r) => ({ label: r.name, value: r.redator_id }))}
            optionLabel="label"
            optionValue="value"
            placeholder={t('certificate.fieldRedator')}
            onChange={(e) => setRedatorId(e.value)}
          />
        </FormField>
      </div>
    </ConfirmDialog>
  )
}
```

`frontend/src/features/operation/components/Turma/RedatorDesignation.tsx` — o aviso de inelegível
é `warning` (spec J12: o título já diz "Designar con aviso de idoneidad"):

```tsx
// antes
        confirmLabel={t('operation.redator.confirmIneligibleAction')}
        pending={picker.pending}
// depois
        confirmLabel={t('operation.redator.confirmIneligibleAction')}
        severity="warning"
        pending={picker.pending}
```

Locales — `operation.enrollment.move.cancel` fica sem uso (o `ConfirmDialog` usa
`common.cancel`, de mesmo texto) e sai das três:

```json
// es-CL — antes
        "confirm": "Sí, mover y continuar",
        "cancel": "Cancelar"
      },
// es-CL — depois
        "confirm": "Sí, mover y continuar"
      },
```

```json
// pt-BR — antes
        "confirm": "Sim, mover e continuar",
        "cancel": "Cancelar"
      },
// pt-BR — depois
        "confirm": "Sim, mover e continuar"
      },
```

```json
// en — antes
        "confirm": "Yes, move and continue",
        "cancel": "Cancel"
      },
// en — depois
        "confirm": "Yes, move and continue"
      },
```

- [ ] **Step 5:** `pnpm -C frontend exec vitest run src/shared/ui/ConfirmDialog tests/tone-ink.test.ts`
  → PASS; `pnpm -C frontend lint`, `pnpm -C frontend test` e `pnpm -C frontend build` verdes (o
  `AppDialog.test.tsx`, o `AppTag.test.tsx` e o `EmissionPanel.test.tsx` incluídos);
  `grep -rn "move.cancel" frontend/src` sem resultado.

- [ ] **Step 6:** commit `feat(43): confirmação compacta com três severidades`.

### Task 3: Moldura padrão — tamanho obrigatório, maximizar só no `lg`, header e footer navy

**Files:**
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.tsx`, `AppDialog/style.ts`, `AppDialog/index.ts`
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.test.tsx`
- Modify: `frontend/src/shared/styles/brand-theme.css` (bloco novo `.lotus-dialog`, no fim)
- Modify: `frontend/tests/tone-ink.test.ts` (describe novo, no fim)
- Modify: `frontend/src/shared/ui/CrudDialog/CrudDialog.tsx`, `CrudDialog/CrudDialog.test.tsx`
- Modify: `frontend/src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx`
- Modify (só `size`; tabela do Step 4), todos sob `frontend/src/features/`:
  `commercial/components/Budget/{BudgetDialog,QuoteWizard}.tsx`,
  `commercial/components/Client/ClientDialog.tsx`, `catalog/components/Course/CourseDialog.tsx`,
  `identity/components/Admin/{RoleDialog,StaffUserDialog}.tsx`,
  `identity/components/Student/StudentDialog.tsx`, `identity/components/Redator/RedatorDialog.tsx`,
  `operation/components/Enrollment/{EnrollStudentForm,RegisterResultDialog,ImportDialog}.tsx`,
  `operation/components/Turma/RedatorDesignation.tsx`,
  `certification/components/Emission/{BatchIssueDialog,IssuedDialog}.tsx`,
  `certification/components/Historial/{ReissueDialog,CertificateViewDialog}.tsx`

**Interfaces:**
- Consumes: `DialogFrame` (Task 2).
- Produces: `AppDialogSize = 'sm' | 'md' | 'lg'` e `AppDialogProps = Omit<DialogProps,
  'maximizable'> & { size: AppDialogSize }`, os dois pelo barrel; `appDialogPt(size)` interno (sai
  do barrel — ninguém fora da pasta o usa). `CrudDialog` ganha `size: AppDialogSize` obrigatório.

- [ ] **Step 1: Testes que falham.**

`frontend/src/shared/ui/AppDialog/AppDialog.test.tsx` (arquivo inteiro; os dois testes de hoje
ficam, agora com `size="lg"`, o único tamanho que tem o botão de maximizar):

```tsx
import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { AppDialog } from './AppDialog'

// O idioma da INTERFACE, nao o do runtime: em jsdom o detector resolve pelo
// `navigator.language` (en-US), e o defeito medido no gate do BD-16 e
// justamente um rotulo ingles aparecendo numa interface em espanhol.
beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

describe('AppDialog', () => {
  it('os DOIS botoes do cabecalho se anunciam no idioma da interface', () => {
    // O de maximizar ja tinha nome traduzido; o de FECHAR caia no
    // `localeOption('close')` do Prime (`dialog.cjs.js:835`), isto e "Close",
    // em todo dialogo da aplicacao.
    render(<AppDialog size="lg" visible header="Nuevo cliente" onHide={() => {}} />)

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Maximizar diálogo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('o pt do chamador sobrevive ao pin do wrapper', () => {
    // mergePt funde chave a chave: quem customiza o botao de fechar nao apaga o
    // nome acessivel, e o pin nao apaga a customizacao dele.
    render(
      <AppDialog
        size="lg"
        visible
        header="Nuevo cliente"
        onHide={() => {}}
        pt={{ closeButton: { className: 'marcador-do-chamador' } }}
      />,
    )

    const fechar = screen.getByRole('button', { name: 'Cerrar' })
    expect(fechar.className).toContain('marcador-do-chamador')
  })
})

/** Bloco 43, spec §4.1: o tamanho decide o teto de largura e se maximiza. */
describe('AppDialog — tamanho', () => {
  it.each([
    ['sm', 'max-w-[32rem]'],
    ['md', 'max-w-[48rem]'],
    ['lg', 'max-w-[64rem]'],
  ] as const)('%s crava o teto %s e a moldura navy', (size, teto) => {
    render(<AppDialog size={size} visible header="Diálogo" onHide={() => {}} />)

    const raiz = document.querySelector('.p-dialog')
    expect(raiz?.className).toContain('w-[95vw]')
    expect(raiz?.className).toContain(teto)
    expect(raiz?.className).toContain('lotus-dialog')
  })

  it.each(['sm', 'md'] as const)('%s não maximiza', (size) => {
    render(<AppDialog size={size} visible header="Diálogo" onHide={() => {}} />)

    expect(document.querySelector('.p-dialog-header-maximize')).toBeNull()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy()
  })

  it('lg maximiza', () => {
    render(<AppDialog size="lg" visible header="Diálogo" onHide={() => {}} />)

    expect(screen.getByRole('button', { name: 'Maximizar diálogo' })).toBeTruthy()
  })

  it('o lg maximizado não fica preso ao teto', () => {
    render(<AppDialog size="lg" visible header="Diálogo" onHide={() => {}} />)

    expect(document.querySelector('.p-dialog')?.className).toContain('[&.p-dialog-maximized]:max-w-none')
  })

  it('o footer navy tem respiro em cima e embaixo', () => {
    render(<AppDialog size="md" visible header="Diálogo" footer={<span>rodapé</span>} onHide={() => {}} />)

    expect(document.querySelector('.p-dialog-footer')?.className).toContain('py-3')
  })

  it('o chamador não religa o maximizar fora do lg', () => {
    // @ts-expect-error -- `maximizable` saiu do tipo: quem decide é o tamanho.
    render(<AppDialog size="sm" maximizable visible header="Diálogo" onHide={() => {}} />)

    expect(document.querySelector('.p-dialog-header-maximize')).toBeNull()
  })
})
```

`frontend/tests/tone-ink.test.ts` — describe novo, no fim do arquivo:

```ts
/**
 * Bloco 43, spec §4.1: header e footer do diálogo padrão vestem a superfície
 * FIXA do shell — a do sidebar e do navbar. A pintura mora em `brand-theme.css`,
 * fora de layer, e por isso um seletor sem estado vence também o hover e o
 * active do Lara; a premissa só vale enquanto o tema viver em `@layer primereact`.
 */
describe('moldura navy do diálogo padrão (bloco 43)', () => {
  /** O corpo da regra cujo seletor é exatamente `seletor`. */
  const regra = (seletor: string) =>
    camadaDeMarca.match(new RegExp(`${seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''

  it('o tema vive em layer — é o que deixa a folha de marca vencer sem especificidade', () => {
    expect(temaClaro).toContain('@layer primereact')
    expect(temaEscuro).toContain('@layer primereact')
  })

  it('header e footer pintam o navy, com a tinta do shell e o foco celeste', () => {
    const corpo = regra('.lotus-dialog .p-dialog-header,\n.lotus-dialog .p-dialog-footer')

    expect(corpo).toMatch(/background:\s*var\(--brand-navy\)/)
    expect(corpo).toMatch(/color:\s*var\(--shell-ink\)/)
    expect(corpo).toMatch(/--focus-stroke:\s*var\(--brand\)/)
    expect(corpo).toMatch(/--text-color-secondary:\s*var\(--shell-ink-muted\)/)
  })

  it('as tintas do shell passam AA sobre o navy', () => {
    // As duas são `slate` copiado literal (comentário do `:root`): `--shell-ink`
    // é o 300 (#cbd5e1) e `--shell-ink-muted` o 400 (#94a3b8).
    const navy = hex(camadaDeMarca, '--brand-navy')
    expect(navy).toBe('#0f2b3d')
    expect(camadaDeMarca).toMatch(/--shell-ink:\s*oklch\(86\.9% 0\.022 252\.894\);/)
    expect(camadaDeMarca).toMatch(/--shell-ink-muted:\s*oklch\(70\.4% 0\.04 256\.788\);/)
    expect(contraste('#cbd5e1', navy)).toBeGreaterThanOrEqual(4.5)
    expect(contraste('#94a3b8', navy)).toBeGreaterThanOrEqual(4.5)
  })

  it('o botão primário de marca se destaca do navy (3:1, contorno)', () => {
    expect(contraste(hex(camadaDeMarca, '--brand'), hex(camadaDeMarca, '--brand-navy'))).toBeGreaterThanOrEqual(3)
  })

  it.each([
    '.lotus-dialog .p-dialog-header .p-dialog-title,\n.lotus-dialog .p-dialog-header .p-dialog-header-icon',
    '.lotus-dialog .p-dialog-footer .p-button.p-button-text',
  ])('%s lê a tinta do shell', (seletor) => {
    expect(regra(seletor)).toMatch(/color:\s*var\(--shell-ink\)/)
  })
})
```

`frontend/src/shared/ui/CrudDialog/CrudDialog.test.tsx`: todo `<CrudDialog` do arquivo ganha
`size="md"` logo depois do nome (ex.: `<CrudDialog size="md" visible mode="create" …>`).

- [ ] **Step 2:** `pnpm -C frontend exec vitest run src/shared/ui/AppDialog tests/tone-ink.test.ts`
  → FAIL (teto, `lotus-dialog`, maximizar no `sm`/`md`, o `py-3` do footer e as regras do CSS).

- [ ] **Step 3: Implementar.**

`frontend/src/shared/ui/AppDialog/style.ts` (arquivo inteiro):

```ts
import type { DialogPassThroughOptions } from 'primereact/dialog'

export type AppDialogSize = 'sm' | 'md' | 'lg'

/** O teto de cada tamanho (bloco 43, spec §4.1). `w-[95vw]` vale em tela
 * estreita e o teto a partir dela. Uma classe literal por tamanho, para o
 * Tailwind enxergá-la. O `lg` solta o teto quando maximizado: o
 * `.p-dialog-maximized` do Prime crava largura e altura cheias, não o
 * `max-width`, e o teto prenderia o maximizado em 64rem. */
const TETO: Record<AppDialogSize, string> = {
  sm: 'max-w-[32rem]',
  md: 'max-w-[48rem]',
  lg: 'max-w-[64rem] [&.p-dialog-maximized]:max-w-none',
}

/** Passthrough do Dialog (ADR-16): largura, a classe da moldura e o respiro do
 * footer. A pintura navy do header e do footer mora em `brand-theme.css`
 * (`.lotus-dialog`), porque alcança peças internas do Prime — ícones do header,
 * botões `text` do footer — que o `pt` do Dialog não nomeia. O `py-3` fica: o
 * Lara dá ao footer padding 0 em cima (ele nasce colado ao conteúdo), e numa
 * faixa de cor própria os botões encostariam na borda. */
export const appDialogPt = (size: AppDialogSize): DialogPassThroughOptions => ({
  root: { className: `lotus-dialog w-[95vw] ${TETO[size]}` },
  content: { className: 'bg-[var(--surface-card)] pt-2' },
  footer: { className: 'py-3' },
})
```

`frontend/src/shared/ui/AppDialog/AppDialog.tsx` (arquivo inteiro):

```tsx
import type { DialogProps } from 'primereact/dialog'
import { mergePt } from '../mergePt'
import { DialogFrame } from './DialogFrame'
import { appDialogPt, type AppDialogSize } from './style'

export type { AppDialogSize } from './style'

/** Tamanho obrigatório: um diálogo que esquecesse de dizer o seu voltaria aos
 * 70vw de antes, e uma confirmação de duas linhas abriria do tamanho de um
 * formulário (bloco 43). */
export type AppDialogProps = Omit<DialogProps, 'maximizable'> & { size: AppDialogSize }

/** Moldura dos diálogos de formulário e visualização (bloco 43): três tamanhos,
 * maximizar só no `lg` e header e footer navy — a superfície fixa do sidebar e
 * do navbar, pintada em `brand-theme.css` pela classe `lotus-dialog` que o
 * `appDialogPt` crava no root. Usado pelo `CrudDialog`. Foco de volta e nomes
 * acessíveis moram no `DialogFrame`, que a `ConfirmDialog` também usa.
 *
 * `maximizable` vem DEPOIS do spread e não está no tipo: quem decide é o
 * tamanho, e religá-lo num `sm` passaria por cima da proporção que ele promete. */
export function AppDialog({ size, pt, ...props }: AppDialogProps) {
  return (
    <DialogFrame
      {...props}
      pt={mergePt<DialogProps['pt']>(appDialogPt(size), pt)}
      maximizable={size === 'lg'}
    />
  )
}
```

`frontend/src/shared/ui/AppDialog/index.ts` (arquivo inteiro):

```ts
export { AppDialog } from './AppDialog'
export type { AppDialogProps, AppDialogSize } from './AppDialog'
```

`frontend/src/shared/styles/brand-theme.css` — no fim do arquivo, depois da regra do
`.lotus-language-menu`:

```css

/* Moldura navy do diálogo padrão (bloco 43, spec §4.1). Header e footer do
 * `AppDialog` vestem a superfície FIXA do shell — a mesma do sidebar e do
 * navbar, que não acompanha o tema —, então a tinta é a do shell, não a do
 * tema, e o traço de foco é redeclarado celeste como no `Sidebar.tsx`: um
 * traço navy sobre navy seria foco invisível. A tinta secundária do tema
 * também é redeclarada com a do shell: o "Paso 1 de 2" do `QuoteWizard` lê
 * `--text-color-secondary`, que no claro (#475569) mediria 1,9:1 sobre o navy.
 *
 * Escopada em `.lotus-dialog`, que o `appDialogPt` crava no root: a
 * `ConfirmDialog` não a recebe e fica com a superfície do tema — as duas
 * famílias se distinguem à primeira vista. Fora de layer, como o resto desta
 * folha: vence o `@layer primereact` do Lara sem depender de especificidade, e
 * por isso a cor sem estado vale também no hover e no active. Só o FUNDO do
 * hover precisa de regra própria: o do Lara é um cinza claro sobre o qual a
 * tinta do shell some. */
.lotus-dialog .p-dialog-header,
.lotus-dialog .p-dialog-footer {
  background: var(--brand-navy);
  color: var(--shell-ink);
  --focus-stroke: var(--brand);
  --text-color-secondary: var(--shell-ink-muted);
}

.lotus-dialog .p-dialog-header {
  border-bottom: 1px solid rgb(255 255 255 / 0.1);
}

.lotus-dialog .p-dialog-footer {
  border-top: 1px solid rgb(255 255 255 / 0.1);
}

.lotus-dialog .p-dialog-header .p-dialog-title,
.lotus-dialog .p-dialog-header .p-dialog-header-icon {
  color: var(--shell-ink);
}

.lotus-dialog .p-dialog-footer .p-button.p-button-text {
  color: var(--shell-ink);
}

.lotus-dialog .p-dialog-header .p-dialog-header-icon:enabled:hover,
.lotus-dialog .p-dialog-footer .p-button.p-button-text:not(:disabled):hover,
.lotus-dialog .p-dialog-footer .p-button.p-button-text:not(:disabled):active {
  background: rgb(255 255 255 / 0.1);
}
```

`frontend/src/shared/ui/CrudDialog/CrudDialog.tsx` — quatro trocas:

```tsx
// antes
import { AppDialog } from '../AppDialog'
// depois
import { AppDialog, type AppDialogSize } from '../AppDialog'
```

```tsx
// antes
 * Dialog unificado de cadastro: visualização, edição e criação são o mesmo
 * componente — no create os campos vêm vazios. Maximizable.
// depois
 * Dialog unificado de cadastro: visualização, edição e criação são o mesmo
 * componente — no create os campos vêm vazios. O tamanho é do chamador
 * (bloco 43): `md` nos cadastros; maximiza só no `lg`.
```

```tsx
// antes
export function CrudDialog({
  visible, mode, title, onHide, onEdit, onSubmit, pending, disabled, closeBlocked, submitLabel, headerExtra, children,
}: {
  visible: boolean
// depois
export function CrudDialog({
  size, visible, mode, title, onHide, onEdit, onSubmit, pending, disabled, closeBlocked, submitLabel, headerExtra, children,
}: {
  /** Teto de largura e maximizar (bloco 43) — repassado ao `AppDialog`. */
  size: AppDialogSize
  visible: boolean
```

```tsx
// antes
    <AppDialog
      header={header}
// depois
    <AppDialog
      size={size}
      header={header}
```

`frontend/src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx`:

```tsx
// antes
      header={file.original_name}
      style={{ width: '70vw' }}
// depois
      size="lg"
      header={file.original_name}
```

- [ ] **Step 4: O tamanho de cada consumidor** (spec §4.3). Em cada arquivo, a prop entra logo
  depois do nome do componente — `<AppDialog size="sm" visible={open} …` na abertura de uma linha
  só, ou numa linha própria logo abaixo de `<AppDialog`/`<CrudDialog` quando a abertura quebra:

| Arquivo (`frontend/src/features/…`) | Linha de hoje | `size` |
|---|---|---|
| `operation/components/Enrollment/EnrollStudentForm.tsx` | 26 | `sm` |
| `operation/components/Enrollment/RegisterResultDialog.tsx` | 33 | `sm` |
| `operation/components/Enrollment/ImportDialog.tsx` | 18 | `sm` |
| `operation/components/Turma/RedatorDesignation.tsx` (picker) | 89 | `sm` |
| `certification/components/Historial/ReissueDialog.tsx` (as três) | 38, 46, 64 | `sm` |
| `certification/components/Emission/BatchIssueDialog.tsx` | 42 | `sm` |
| `commercial/components/Budget/BudgetDialog.tsx` | 28 | `md` |
| `commercial/components/Client/ClientDialog.tsx` | 54 | `md` |
| `catalog/components/Course/CourseDialog.tsx` | 29 | `md` |
| `identity/components/Admin/RoleDialog.tsx` | 44 | `md` |
| `identity/components/Admin/StaffUserDialog.tsx` | 56 | `md` |
| `identity/components/Student/StudentDialog.tsx` | 51 | `md` |
| `identity/components/Redator/RedatorDialog.tsx` | 64 | `md` |
| `certification/components/Emission/IssuedDialog.tsx` | 59 | `md` |
| `commercial/components/Budget/QuoteWizard.tsx` | 45 | `lg` |
| `certification/components/Historial/CertificateViewDialog.tsx` | 51 | `lg` |

  Conferência: `pnpm -C frontend build` não acusa nenhum `size` faltando, e
  `grep -rn "<AppDialog\b\|<CrudDialog\b" frontend/src/features -A1 | grep -c "size="` dá 18.

- [ ] **Step 5:** `pnpm -C frontend exec vitest run src/shared/ui tests/tone-ink.test.ts` → PASS;
  `pnpm -C frontend lint`, `pnpm -C frontend test` e `pnpm -C frontend build` verdes.

- [ ] **Step 6:** commit `feat(43): moldura de diálogo com tamanho e header e footer navy`.

### Task 4: Formulários em grade e botões no footer

**Files:**
- Modify: `frontend/src/shared/ui/FormPhotoRow/FormPhotoRow.tsx`
- Modify: `frontend/src/features/identity/components/Student/StudentIdentifyFields.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollStudentForm.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/EnrollStudentForm.test.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/RegisterResultDialog.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/RegisterResultDialog.test.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/ImportDialog.tsx`

**Interfaces:**
- Consumes: `AppDialog` com `size` e a prop `footer` do Prime (Task 3).
- Produces: nenhuma interface nova; só layout. Os trechos "antes" abaixo já contam com o `size`
  que a Task 3 pôs.

- [ ] **Step 1: Testes que falham.**

`frontend/src/features/operation/components/Enrollment/EnrollStudentForm.test.tsx` (arquivo novo):

```tsx
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { EnrollStudentForm } from './EnrollStudentForm'
import { useEnrollStudentFlow } from '../../hooks/useEnrollStudentFlow'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('../../hooks/useEnrollStudentFlow', () => ({ useEnrollStudentFlow: vi.fn() }))

type Fluxo = ReturnType<typeof useEnrollStudentFlow>

const fluxo = (sobre: Partial<Fluxo>) =>
  ({
    step: 'rut',
    rut: '11.111.111-1',
    setRut: vi.fn(),
    preview: null,
    isNewStudent: true,
    moveOpen: false,
    turmaClientName: 'Cliente',
    details: { name: '', email: '', phone: '' },
    setField: vi.fn(),
    runPreview: vi.fn(),
    confirmMove: vi.fn(),
    cancelMove: vi.fn(),
    submit: vi.fn(),
    reset: vi.fn(),
    fieldErrors: undefined,
    message: null,
    previewing: false,
    submitting: false,
    ...sobre,
  }) as unknown as Fluxo

const montar = () =>
  renderWithProviders(<EnrollStudentForm turmaId={1} turmaClientName="Cliente" visible onHide={() => {}} />)

const rodape = () => document.querySelector('.p-dialog-footer') as HTMLElement
const corpo = () => document.querySelector('.p-dialog-content') as HTMLElement

/** Bloco 43: os botões moravam no corpo, e o footer navy ficava vazio. */
describe('EnrollStudentForm — botões no footer', () => {
  it('no passo do RUT, cancelar e verificar vivem no footer', () => {
    vi.mocked(useEnrollStudentFlow).mockReturnValue(fluxo({ step: 'rut' }))
    montar()

    expect(within(rodape()).getByRole('button', { name: 'operation.enrollment.form.cancel' })).toBeTruthy()
    expect(within(rodape()).getByRole('button', { name: 'operation.enrollment.form.verify' })).toBeTruthy()
    expect(within(corpo()).queryAllByRole('button')).toHaveLength(0)
  })

  it('no passo dos dados, o footer matricula e o RUT segue travado', () => {
    vi.mocked(useEnrollStudentFlow).mockReturnValue(
      fluxo({ step: 'details', details: { name: 'Ana', email: '', phone: '' } }),
    )
    montar()

    expect(within(rodape()).getByRole('button', { name: 'operation.enrollment.form.submit' })).toBeTruthy()
    expect(within(rodape()).queryByRole('button', { name: 'operation.enrollment.form.verify' })).toBeNull()
    expect((screen.getByDisplayValue('11.111.111-1') as HTMLInputElement).disabled).toBe(true)
  })
})
```

`frontend/src/features/operation/components/Enrollment/RegisterResultDialog.test.tsx` — o import
de `@testing-library/react` passa a trazer `within`, e um describe novo no fim do arquivo:

```tsx
// antes
import { screen } from '@testing-library/react'
// depois
import { screen, within } from '@testing-library/react'
```

```tsx
/** Bloco 43: os botões moravam no corpo, e o footer navy ficava vazio. */
describe('RegisterResultDialog — footer', () => {
  it('cancelar e salvar vivem no footer', () => {
    montar(DIVERGENTE)

    const rodape = document.querySelector('.p-dialog-footer') as HTMLElement
    expect(within(rodape).getByRole('button', { name: 'common.save' })).toBeTruthy()
    expect(within(rodape).getByRole('button', { name: 'common.cancel' })).toBeTruthy()
    const corpo = document.querySelector('.p-dialog-content') as HTMLElement
    expect(within(corpo).queryByRole('button', { name: 'common.save' })).toBeNull()
  })
})
```

- [ ] **Step 2:** `pnpm -C frontend exec vitest run src/features/operation/components/Enrollment`
  → FAIL (sem `.p-dialog-footer`: os botões estão no corpo).

- [ ] **Step 3: Implementar.**

`frontend/src/shared/ui/FormPhotoRow/FormPhotoRow.tsx` (arquivo inteiro):

```tsx
import type { ReactNode } from 'react'
import type { useEntityPhoto } from '@shared/hooks'
import { AppPhotoField } from '../AppPhotoField'

/**
 * A linha "foto à esquerda, campos à direita" dos diálogos de cadastro. O
 * markup era idêntico byte a byte em ClientDialog, StaffUserDialog,
 * StudentDialog e RedatorUserSection (BD-5).
 *
 * Bloco 43: a foto é uma coluna estreita que não encolhe, e a linha vale a
 * partir de `sm`. Antes a foto tomava 3/5 da linha no `lg` e tudo virava
 * coluna abaixo dele — num diálogo de 48rem, os campos empilhavam.
 *
 * `photo` entra inteiro em vez de nove props soltas: o objeto já é o contrato
 * do `useEntityPhoto`, e desmontá-lo aqui só criaria uma segunda grafia dele.
 */
export function FormPhotoRow({
  name,
  photo,
  readOnly,
  children,
}: {
  name: string
  photo: ReturnType<typeof useEntityPhoto>
  readOnly: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex shrink-0 justify-center sm:w-40">
        <AppPhotoField
          name={name}
          url={photo.url}
          readOnly={readOnly}
          pending={photo.pending}
          error={photo.error}
          onSelect={photo.onSelect}
          onRemove={photo.onRemove}
          onSizeReject={photo.onSizeReject}
          onRetry={photo.onRetry}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
    </div>
  )
}
```

`frontend/src/features/identity/components/Student/StudentIdentifyFields.tsx` (arquivo inteiro):

```tsx
import { useTranslation } from 'react-i18next'
import { AppInputText, type FieldComponent } from '@shared/ui'
import type { StudentFormFields } from '../../hooks/useStudentForm'

/** Os quatro campos de identificação do aluno, em duas colunas a partir de
 * `sm`: Nome │ RUT e E-mail │ Teléfono (bloco 43). A empresa fica fora deste
 * componente, em linha inteira abaixo da foto (`StudentClientField`).
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o redator tem o acesso abaixo do telefone; o aluno, a
 * empresa fora do grid), e unificá-los mudaria o que três telas renderizam.
 *
 * Sem escape nenhum aqui — os quatro campos colapsam inteiros no `Field`. */
export function StudentIdentityFields({
  Field,
}: {
  Field: FieldComponent<StudentFormFields>
}) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label={t('student.name')}>
        <AppInputText className="w-full" />
      </Field>

      <Field name="rut" label={t('common.rut')}>
        <AppInputText className="w-full" />
      </Field>

      <Field name="email" label={t('common.email')}>
        <AppInputText className="w-full" />
      </Field>

      <Field name="phone" label={t('common.phone')}>
        <AppInputText className="w-full" />
      </Field>
    </div>
  )
}
```

`frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx` — duas trocas:

```tsx
// antes
/** Os quatro campos de identificação do redator, no grid 2×2 de sempre.
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o aluno tem nome em linha inteira e empresa ao lado do
 * telefone), e unificá-los mudaria o que três telas renderizam.
// depois
/** Os quatro campos de identificação do redator, em duas colunas a partir de
 * `sm`: Nome │ RUT e E-mail │ Teléfono (bloco 43).
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o redator tem o acesso abaixo do telefone; o aluno, a
 * empresa fora do grid), e unificá-los mudaria o que três telas renderizam.
```

```tsx
// antes (o primeiro grid, o de nome e RUT)
      <div className="grid gap-4 sm:grid-cols-1">
        <Field name="name" label={t('redator.name')}>
// depois
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label={t('redator.name')}>
```

`frontend/src/features/operation/components/Enrollment/EnrollStudentForm.tsx` (arquivo inteiro):

```tsx
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppInputText, FormField, FormErrorSummary } from '@shared/ui'
import { useEnrollStudentFlow } from '../../hooks/useEnrollStudentFlow'
import { MoveConfirmDialog } from './MoveConfirmDialog'
import { dangerText } from '@shared/styles/tokens'

type Props = {
  turmaId: number
  turmaClientName: string | null
  visible: boolean
  onHide: () => void
}

/** Matrícula de aluno na turma, em dois passos: o RUT primeiro (o backend diz
 * se o aluno existe e de qual cliente é) e os dados depois. Grade de duas
 * colunas a partir de `sm` — RUT │ Nome, E-mail │ Teléfono — e botões no
 * footer, que muda com o passo (bloco 43). */
export function EnrollStudentForm({ turmaId, turmaClientName, visible, onHide }: Props) {
  const { t } = useTranslation()
  const f = useEnrollStudentFlow(turmaId, turmaClientName, onHide)

  const close = () => {
    f.reset()
    onHide()
  }

  const err = (key: string) => f.fieldErrors?.[key]?.[0]

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('operation.enrollment.form.cancel')} text onClick={close} />
      {f.step === 'rut' ? (
        <AppButton
          variant="primary"
          label={t('operation.enrollment.form.verify')}
          disabled={!f.rut || f.previewing}
          onClick={f.runPreview}
        />
      ) : (
        <AppButton
          variant="primary"
          label={t('operation.enrollment.form.submit')}
          disabled={!f.details.name || f.submitting}
          onClick={f.submit}
        />
      )}
    </div>
  )

  return (
    <AppDialog size="sm" visible={visible} header={t('operation.enrollment.form.title')} onHide={close} footer={footer}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="empty:hidden sm:col-span-2">
          <FormErrorSummary errors={f.fieldErrors} mapped={['rut', 'name', 'email', 'phone']} />
        </div>

        <div className={f.step === 'rut' ? 'sm:col-span-2' : undefined}>
          <FormField label={t('operation.enrollment.form.rutLabel')} error={err('rut')}>
            <AppInputText
              className="w-full"
              value={f.rut}
              onChange={(e) => f.setRut(e.target.value)}
              disabled={f.step === 'details'}
            />
          </FormField>
        </div>

        {f.step === 'details' && (
          <>
            <FormField label={t('operation.enrollment.form.nameLabel')} error={err('name')}>
              <AppInputText className="w-full" value={f.details.name} onChange={(e) => f.setField('name', e.target.value)} />
            </FormField>
            <FormField label={t('operation.enrollment.form.emailLabel')} error={err('email')}>
              <AppInputText className="w-full" value={f.details.email} onChange={(e) => f.setField('email', e.target.value)} />
            </FormField>
            <FormField label={t('operation.enrollment.form.phoneLabel')} error={err('phone')}>
              <AppInputText className="w-full" value={f.details.phone} onChange={(e) => f.setField('phone', e.target.value)} />
            </FormField>
            {f.isNewStudent && (
              <p className="text-sm sm:col-span-2" style={{ color: 'var(--text-color-secondary)' }}>
                {t('operation.enrollment.form.emailHintNew')}
              </p>
            )}
          </>
        )}

        {f.message && (
          <p className="text-sm sm:col-span-2" style={{ color: dangerText }}>
            {f.message}
          </p>
        )}
      </div>

      <MoveConfirmDialog
        visible={f.moveOpen}
        studentName={f.preview?.name ?? ''}
        previousClient={f.preview?.previous_client ?? null}
        currentClient={f.turmaClientName}
        onConfirm={f.confirmMove}
        onCancel={f.cancelMove}
      />
    </AppDialog>
  )
}
```

`frontend/src/features/operation/components/Enrollment/RegisterResultDialog.tsx` — do `  return (`
até o fim do arquivo vira (o resto fica):

```tsx
  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} text disabled={r.submitting} onClick={close} />
      <AppButton
        variant="primary"
        label={t('common.save')}
        disabled={r.submitting}
        onClick={() => r.submit({ onSuccess: close })}
      />
    </div>
  )

  return (
    <AppDialog
      size="sm"
      visible={visible}
      header={t('certificate.result.title')}
      onHide={close}
      closable={!r.submitting}
      footer={footer}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="empty:hidden sm:col-span-2">
          <FormErrorBanner message={r.message} />
        </div>

        <div className="sm:col-span-2">
          <FormField label={t('certificate.result.status')} error={r.fieldErrors?.approval_status?.[0]}>
            <AppDropdown value={r.form.approval_status} options={r.statusOptions} onChange={(e) => r.setStatus(e.value)} />
          </FormField>
        </div>

        <FormField label={t('certificate.result.finalGrade')} error={r.fieldErrors?.['grades.final']?.[0]}>
          <AppInputText className="w-full" value={r.form.finalGrade} onChange={(e) => r.setFinalGrade(e.target.value)} />
        </FormField>

        <FormField label={t('certificate.result.attendance')} error={r.fieldErrors?.attendance_pct?.[0]}>
          <AppInputText className="w-full" value={r.form.attendance_pct} onChange={(e) => r.setAttendance(e.target.value)} />
        </FormField>

        {/* Aviso, não erro: âmbar e sem role="alert" (o FormErrorBanner é vermelho e
            para 422). NUNCA bloqueia o salvar — registro não bloqueia ação. */}
        {r.ruleWarning && (
          <p
            className="rounded-control px-3 py-2 text-sm sm:col-span-2"
            style={{
              background: warningSurface,
              color: warningText,
            }}
          >
            {r.ruleWarning}
          </p>
        )}
      </div>
    </AppDialog>
  )
}
```

`frontend/src/features/operation/components/Enrollment/ImportDialog.tsx` — três trocas:

```tsx
// antes
  const f = useImportStudentsFlow(turmaId, onHide)

  return (
// depois
  const f = useImportStudentsFlow(turmaId, onHide)

  // O Cerrar só existe depois do resultado, como antes; antes dele, a saída é o X.
  const footer = f.result ? (
    <div className="flex justify-end">
      <AppButton label={t('operation.enrollment.import.close')} text onClick={f.close} />
    </div>
  ) : undefined

  return (
```

```tsx
// antes
      dismissableMask={false}
    >
// depois
      dismissableMask={false}
      footer={footer}
    >
```

```tsx
// antes
        {f.result && (
          <>
            <ImportResultSummary result={f.result} />
            <div className="flex justify-end">
              <AppButton label={t('operation.enrollment.import.close')} text onClick={f.close} />
            </div>
          </>
        )}
// depois
        {f.result && <ImportResultSummary result={f.result} />}
```

- [ ] **Step 4:** `pnpm -C frontend exec vitest run src/features/operation src/features/identity` →
  PASS; `pnpm -C frontend lint`, `pnpm -C frontend test` e `pnpm -C frontend build` verdes.

- [ ] **Step 5:** commit `feat(43): formulários de aluno e matrícula em grade`.

### Task 5: Diálogo de upload do orçamento e tag de tipo na lista

**Files:**
- Create: `frontend/src/features/commercial/lib/budgetDocumentType.ts`
- Create: `frontend/src/features/commercial/hooks/useBudgetDocumentUpload.ts`
- Create: `frontend/src/features/commercial/hooks/useBudgetDocumentUpload.test.tsx`
- Create: `frontend/src/features/commercial/components/Budget/BudgetDocumentUploadDialog.tsx`
- Create: `frontend/src/features/commercial/components/Budget/BudgetDocumentUploadDialog.test.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/FileList.tsx`
- Create: `frontend/src/features/commercial/components/Budget/FileList.test.tsx`
- Modify: `frontend/src/features/commercial/hooks/useBudgetDetail.ts`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `BudgetDocumentType` e `useUploadBudgetFile()` (Task 1); `AppDialog size="sm"` (Task 3).
- Produces: `BUDGET_DOCUMENT_TYPES` e `budgetDocumentTag(type: string)` em
  `lib/budgetDocumentType.ts`; `useBudgetDocumentUpload(budgetId: number)`;
  `BudgetDocumentUploadDialog({ u })`; `FileList` com `showType?: boolean`;
  `BudgetDocumentsCard({ budgetId, files, onRemove, fileError })`.

- [ ] **Step 1: Testes que falham.**

`frontend/src/features/commercial/hooks/useBudgetDocumentUpload.test.tsx` (arquivo novo):

```tsx
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useUploadBudgetFile } from '../api/useCommercialFiles'
import { useBudgetDocumentUpload } from './useBudgetDocumentUpload'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('../api/useCommercialFiles', () => ({ useUploadBudgetFile: vi.fn() }))

const mutacao = (mutate: unknown, reset: unknown) =>
  ({ mutate, reset, isPending: false, error: null }) as unknown as ReturnType<typeof useUploadBudgetFile>

const escolha = (file: File) =>
  ({ files: [file], options: { clear: vi.fn() } }) as unknown as FileUploadHandlerEvent

const pdf = new File(['%PDF'], 'oc-451.pdf', { type: 'application/pdf' })

const montar = (mutate: unknown = vi.fn(), reset: unknown = vi.fn()) => {
  vi.mocked(useUploadBudgetFile).mockReturnValue(mutacao(mutate, reset))
  return renderHook(() => useBudgetDocumentUpload(7)).result
}

describe('useBudgetDocumentUpload', () => {
  it('só envia com tipo e arquivo', () => {
    const result = montar()

    expect(result.current.canSubmit).toBe(false)
    act(() => result.current.setType('purchase_order'))
    expect(result.current.canSubmit).toBe(false)
    act(() => result.current.pickFile(escolha(pdf)))
    expect(result.current.canSubmit).toBe(true)
  })

  it('envia o tipo escolhido por último, mesmo depois do arquivo', () => {
    const mutate = vi.fn()
    const result = montar(mutate)

    act(() => result.current.pickFile(escolha(pdf)))
    act(() => result.current.setType('invoice'))
    act(() => result.current.setType('purchase_order'))
    act(() => result.current.submit())

    expect(mutate).toHaveBeenCalledWith({ budgetId: 7, type: 'purchase_order', file: pdf }, expect.anything())
  })

  it('o seletor volta ao vazio depois de escolher', () => {
    const result = montar()
    const evento = escolha(pdf)

    act(() => result.current.pickFile(evento))

    expect(evento.options.clear).toHaveBeenCalled()
    expect(result.current.file).toBe(pdf)
  })

  /** Review Focus 2: o erro fica no diálogo, e a pessoa tenta de novo sem refazer a escolha. */
  it('sem sucesso, o diálogo fica aberto com tipo e arquivo', () => {
    const result = montar(vi.fn())

    act(() => result.current.open())
    act(() => result.current.setType('receipt'))
    act(() => result.current.pickFile(escolha(pdf)))
    act(() => result.current.submit())

    expect(result.current).toMatchObject({ visible: true, type: 'receipt', file: pdf })
  })

  /** Review Focus 1: a próxima abertura não herda nada da anterior. */
  it('o sucesso fecha, e reabrir começa limpo', () => {
    const result = montar(vi.fn((_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()))

    act(() => result.current.open())
    act(() => result.current.setType('invoice'))
    act(() => result.current.pickFile(escolha(pdf)))
    act(() => result.current.submit())
    expect(result.current.visible).toBe(false)

    act(() => result.current.open())
    expect(result.current).toMatchObject({ visible: true, type: null, file: null, sizeError: null })
  })

  it('fechar descarta a escolha, o erro de tamanho e o erro do envio', () => {
    const reset = vi.fn()
    const result = montar(vi.fn(), reset)

    act(() => result.current.open())
    act(() => result.current.setType('invoice'))
    act(() => result.current.pickFile(escolha(pdf)))
    act(() => result.current.onSizeReject('El archivo supera el límite'))
    act(() => result.current.close())
    act(() => result.current.open())

    expect(result.current).toMatchObject({ visible: true, type: null, file: null, sizeError: null })
    expect(reset).toHaveBeenCalled()
  })
})
```

`frontend/src/features/commercial/components/Budget/BudgetDocumentUploadDialog.test.tsx` (arquivo
novo):

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { useBudgetDocumentUpload } from '../../hooks/useBudgetDocumentUpload'
import { BudgetDocumentUploadDialog } from './BudgetDocumentUploadDialog'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type Upload = ReturnType<typeof useBudgetDocumentUpload>

const upload = (sobre: Partial<Upload> = {}): Upload => ({
  visible: true,
  open: vi.fn(),
  close: vi.fn(),
  type: null,
  setType: vi.fn(),
  file: null,
  pickFile: vi.fn(),
  sizeError: null,
  onSizeReject: vi.fn(),
  error: null,
  pending: false,
  canSubmit: false,
  submit: vi.fn(),
  ...sobre,
})

const rodape = () => document.querySelector('.p-dialog-footer') as HTMLElement

describe('BudgetDocumentUploadDialog', () => {
  it('três cartões na ordem do ciclo do orçamento, nenhum escolhido', () => {
    renderWithProviders(<BudgetDocumentUploadDialog u={upload()} />)

    const cartoes = screen.getAllByRole('button', { pressed: false })
    expect(cartoes.map((b) => b.textContent)).toEqual([
      'budget.documentType.purchase_order',
      'budget.documentType.invoice',
      'budget.documentType.receipt',
    ])
  })

  it('clicar num cartão escolhe o tipo', () => {
    const setType = vi.fn()
    renderWithProviders(<BudgetDocumentUploadDialog u={upload({ setType })} />)

    fireEvent.click(screen.getByRole('button', { name: 'budget.documentType.receipt' }))

    expect(setType).toHaveBeenCalledWith('receipt')
  })

  it('Subir só habilita com canSubmit', () => {
    const { unmount } = renderWithProviders(<BudgetDocumentUploadDialog u={upload()} />)
    expect((within(rodape()).getByRole('button', { name: 'common.upload' }) as HTMLButtonElement).disabled).toBe(true)
    unmount()

    renderWithProviders(<BudgetDocumentUploadDialog u={upload({ canSubmit: true })} />)
    expect((within(rodape()).getByRole('button', { name: 'common.upload' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('mostra o arquivo escolhido e o erro dentro do diálogo', () => {
    renderWithProviders(
      <BudgetDocumentUploadDialog
        u={upload({ file: new File(['x'], 'factura-001.pdf'), error: 'Tipo de archivo no permitido' })}
      />,
    )

    const dialogo = document.querySelector('.p-dialog') as HTMLElement
    expect(within(dialogo).getByText('factura-001.pdf')).toBeTruthy()
    expect(within(dialogo).getByText('Tipo de archivo no permitido')).toBeTruthy()
  })

  /** Review Focus 3: fechar com o envio em voo soltaria o 422 sem ninguém para exibi-lo. */
  it('com envio em voo, Cancelar trava e o X some', () => {
    renderWithProviders(<BudgetDocumentUploadDialog u={upload({ pending: true })} />)

    expect((within(rodape()).getByRole('button', { name: 'common.cancel' }) as HTMLButtonElement).disabled).toBe(true)
    expect(document.querySelector('.p-dialog-header-close')).toBeNull()
  })
})
```

`frontend/src/features/commercial/components/Budget/FileList.test.tsx` (arquivo novo):

```tsx
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { FileData } from '@shared/types/generated'
import { FileList } from './FileList'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const arquivo = (id: number, type: string): FileData => ({
  id,
  type,
  original_name: `${type}-${id}.pdf`,
  mime: 'application/pdf',
  size: 2048,
  download_url: `http://localhost/arquivo/${id}`,
  created_at: '2026-10-28T10:00:00Z',
})

describe('FileList — tag do tipo (bloco 43)', () => {
  it('com showType, cada linha mostra o tipo', () => {
    renderWithProviders(<FileList files={[arquivo(1, 'invoice'), arquivo(2, 'purchase_order')]} showType />)

    expect(screen.getByText('budget.documentType.invoice')).toBeTruthy()
    expect(screen.getByText('budget.documentType.purchase_order')).toBeTruthy()
  })

  /** Review Focus 4: dado antigo ou de outro fluxo não quebra a lista. */
  it('tipo fora do enum vira tag neutra com o valor cru', () => {
    renderWithProviders(<FileList files={[arquivo(3, 'foo')]} showType />)

    expect(screen.getByText('foo')).toBeTruthy()
  })

  it('sem showType (a lista da cotação), nenhuma tag', () => {
    renderWithProviders(<FileList files={[arquivo(4, 'invoice')]} />)

    expect(screen.queryByText('budget.documentType.invoice')).toBeNull()
  })
})
```

- [ ] **Step 2:** `pnpm -C frontend exec vitest run src/features/commercial` → FAIL (módulos novos
  inexistentes; `FileList` sem `showType`).

- [ ] **Step 3: Implementar.**

`frontend/src/features/commercial/lib/budgetDocumentType.ts` (arquivo novo):

```ts
import type { BudgetDocumentType } from '@shared/types/generated'
import type { AppTagProps } from '@shared/ui'

/** A ordem dos cartões do diálogo de upload (bloco 43): o ciclo do orçamento —
 * a orden de compra chega, a factura sai e o comprobante fecha. */
export const BUDGET_DOCUMENT_TYPES: readonly BudgetDocumentType[] = ['purchase_order', 'invoice', 'receipt']

type DocumentTag = Pick<AppTagProps, 'severity' | 'tone'> & { labelKey: string }

/** Três hues distintos, todos medidos em AA no `AppTag`; o rótulo é texto e a
 * cor só reforça. */
const TAG: Record<BudgetDocumentType, Pick<AppTagProps, 'severity' | 'tone'>> = {
  purchase_order: { severity: 'info' },
  invoice: { tone: 'accent' },
  receipt: { severity: 'success' },
}

/** A tag do tipo na lista de documentos. Tipo fora do enum (dado antigo ou de
 * outro fluxo) devolve `null`, e quem renderiza cai na tag neutra com o valor
 * cru — a lista nunca quebra por causa do rótulo. */
export function budgetDocumentTag(type: string): DocumentTag | null {
  if (!BUDGET_DOCUMENT_TYPES.includes(type as BudgetDocumentType)) return null
  return { ...TAG[type as BudgetDocumentType], labelKey: `budget.documentType.${type}` }
}
```

`frontend/src/features/commercial/hooks/useBudgetDocumentUpload.ts` (arquivo novo):

```ts
import { useState } from 'react'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useMutationErrors } from '@shared/hooks'
import type { BudgetDocumentType } from '@shared/types/generated'
import { useUploadBudgetFile } from '../api/useCommercialFiles'

/** O diálogo de subir documento do orçamento (bloco 43, spec J1): o tipo se
 * escolhe em cartões, o arquivo no seletor, e só o "Subir" envia. Erro de envio
 * fica dentro do diálogo, com tipo e arquivo preservados para tentar de novo;
 * fechar e o sucesso zeram tudo, para a próxima abertura começar limpa. */
export function useBudgetDocumentUpload(budgetId: number) {
  const upload = useUploadBudgetFile()
  const { message: error } = useMutationErrors([upload.error])
  const [visible, setVisible] = useState(false)
  const [type, setType] = useState<BudgetDocumentType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  // Rejeição por tamanho é local: o AppFileUpload barra o arquivo antes de
  // qualquer request, então não vira erro de mutação.
  const [sizeError, setSizeError] = useState<string | null>(null)

  const limpar = () => {
    upload.reset()
    setType(null)
    setFile(null)
    setSizeError(null)
  }

  const close = () => {
    // A tela já trava X, ESC e Cancelar com o envio em voo; esta guarda cobre
    // quem chegar aqui por outro caminho.
    if (upload.isPending) return
    limpar()
    setVisible(false)
  }

  // O AppFileUpload é `auto`: o handler só GUARDA o arquivo, quem envia é o
  // "Subir". `clear()` devolve o seletor ao vazio, para aceitar o mesmo arquivo
  // de novo depois de um erro.
  const pickFile = (e: FileUploadHandlerEvent) => {
    const escolhido = e.files[0]
    e.options.clear()
    if (!escolhido) return
    setFile(escolhido)
    setSizeError(null)
  }

  const submit = () => {
    if (type === null || file === null || upload.isPending) return
    upload.mutate(
      { budgetId, type, file },
      {
        onSuccess: () => {
          limpar()
          setVisible(false)
        },
      },
    )
  }

  return {
    visible,
    open: () => setVisible(true),
    close,
    type,
    setType,
    file,
    pickFile,
    sizeError,
    onSizeReject: setSizeError,
    error,
    pending: upload.isPending,
    canSubmit: type !== null && file !== null && !upload.isPending,
    submit,
  }
}
```

`frontend/src/features/commercial/components/Budget/BudgetDocumentUploadDialog.tsx` (arquivo novo):

```tsx
import { useTranslation } from 'react-i18next'
import {
  AppButton, AppDialog, AppFileUpload, AppSelectableCard, FormErrorBanner, SectionLabel,
} from '@shared/ui'
import type { useBudgetDocumentUpload } from '../../hooks/useBudgetDocumentUpload'
import { BUDGET_DOCUMENT_TYPES } from '../../lib/budgetDocumentType'

/** Diálogo de subir documento do orçamento (bloco 43, spec J1): tipo em
 * cartões, arquivo no seletor e "Subir" só com os dois. Todo o estado mora no
 * `useBudgetDocumentUpload`; este componente só consome. */
export function BudgetDocumentUploadDialog({ u }: { u: ReturnType<typeof useBudgetDocumentUpload> }) {
  const { t } = useTranslation()

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} text disabled={u.pending} onClick={u.close} />
      <AppButton
        variant="primary"
        label={t('common.upload')}
        icon="pi pi-upload"
        disabled={!u.canSubmit}
        loading={u.pending}
        onClick={u.submit}
      />
    </div>
  )

  return (
    // Com o envio em voo, X, ESC e Cancelar ficam travados: fechar soltaria o
    // observer da mutação e o 422 chegaria sem ninguém para exibi-lo.
    <AppDialog
      size="sm"
      visible={u.visible}
      header={t('budget.uploadTitle')}
      onHide={u.close}
      closable={!u.pending}
      closeOnEscape={!u.pending}
      footer={footer}
    >
      <div className="space-y-4">
        <FormErrorBanner message={u.error} />
        <FormErrorBanner message={u.sizeError} />

        <div role="group" aria-label={t('budget.fileTypeLabel')} className="space-y-2">
          <SectionLabel as="h3" rule={false}>{t('budget.fileTypeLabel')}</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-3">
            {BUDGET_DOCUMENT_TYPES.map((tipo) => (
              <AppSelectableCard
                key={tipo}
                selected={u.type === tipo}
                disabled={u.pending}
                onToggle={() => u.setType(tipo)}
              >
                {t(`budget.documentType.${tipo}`)}
              </AppSelectableCard>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AppFileUpload
            chooseLabel={t('budget.chooseFile')}
            chooseOptions={{ icon: 'pi pi-paperclip' }}
            disabled={u.pending}
            onSizeReject={u.onSizeReject}
            uploadHandler={u.pickFile}
          />
          {u.file && <span className="min-w-0 truncate text-sm">{u.file.name}</span>}
        </div>
      </div>
    </AppDialog>
  )
}
```

`frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx` (arquivo inteiro):

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton, AppCard, AppCardHeader, FormErrorBanner } from '@shared/ui'
import type { FileData } from '@shared/types/generated'
import { useBudgetDocumentUpload } from '../../hooks/useBudgetDocumentUpload'
import { BudgetDocumentUploadDialog } from './BudgetDocumentUploadDialog'
import { FileList } from './FileList'

/** Card de documentos do orçamento: o botão de subir, o erro de remoção e a
 * lista com a tag do tipo. Subir é um diálogo (bloco 43), cujo estado mora no
 * `useBudgetDocumentUpload`; este componente só consome. */
export function BudgetDocumentsCard({
  budgetId, files, onRemove, fileError,
}: {
  budgetId: number
  files: FileData[]
  onRemove: (fileId: number) => void
  /** Erro de REMOÇÃO de anexo; o do upload aparece dentro do diálogo. */
  fileError: string | null
}) {
  const { t } = useTranslation()
  const upload = useBudgetDocumentUpload(budgetId)

  return (
    <AppCard>
      <AppCardHeader
        title={t('budget.documents')}
        count={files.length}
        actions={
          <AppButton variant="compact" icon="pi pi-upload" label={t('budget.uploadDocument')} onClick={upload.open} />
        }
      />
      <div className="mx-4 mt-4 empty:m-0">
        <FormErrorBanner message={fileError} />
      </div>
      <FileList files={files} onRemove={onRemove} showType />
      <BudgetDocumentUploadDialog u={upload} />
    </AppCard>
  )
}
```

`frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`:

```tsx
// antes
        <BudgetDocumentsCard
          files={budget.files ?? []}
          fileType={d.fileType}
          onFileTypeChange={d.setFileType}
          uploadPending={d.uploadPending}
          onUpload={d.handleUpload}
          onSizeReject={d.onFileSizeReject}
          onRemove={(fileId) => d.removeFile(fileId)}
          fileError={d.fileError}
          fileSizeError={d.fileSizeError}
        />
// depois
        <BudgetDocumentsCard
          budgetId={budgetId}
          files={budget.files ?? []}
          onRemove={(fileId) => d.removeFile(fileId)}
          fileError={d.fileError}
        />
```

`frontend/src/features/commercial/components/Budget/FileList.tsx` (arquivo inteiro):

```tsx
import { useTranslation } from 'react-i18next'
import { AppFileRow, AppFileActions, AppFilePreviewDialog, AppTag } from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
import type { FileData } from '@shared/types/generated'
import { budgetDocumentTag } from '../../lib/budgetDocumentType'

export function FileList({
  files, onRemove, showType = false,
}: {
  files: FileData[]
  onRemove?: (fileId: number) => void
  /** Tag do tipo em cada linha (bloco 43). Só o orçamento passa: a lista da
   * cotação tem um tipo só (`quote_document`), e a tag seria ruído. */
  showType?: boolean
}) {
  const { t } = useTranslation()
  const preview = useFilePreview<FileData>()

  if (files.length === 0) {
    return <p className="px-4 pb-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noDocuments')}</p>
  }

  return (
    <>
      <ul role="list">
        {files.map((f) => {
          const tag = showType ? budgetDocumentTag(f.type) : undefined
          return (
            <li
              key={f.id}
              className="border-t px-4 py-3 first:border-t-0"
              style={{ borderColor: 'var(--surface-border)' }}
            >
              <AppFileRow
                name={f.original_name}
                mime={f.mime}
                size={f.size}
                createdAt={f.created_at}
                actions={
                  <>
                    {tag && <AppTag value={t(tag.labelKey)} severity={tag.severity} tone={tag.tone} />}
                    {tag === null && <AppTag value={f.type} severity="secondary" />}
                    <AppFileActions
                      file={f}
                      onPreview={preview.open}
                      onRemove={onRemove ? () => onRemove(f.id) : undefined}
                    />
                  </>
                }
              />
            </li>
          )
        })}
      </ul>

      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </>
  )
}
```

`frontend/src/features/commercial/hooks/useBudgetDetail.ts` — o upload sai daqui (mora no
`useBudgetDocumentUpload`); sete trocas:

```ts
// antes
import { useNavigate } from 'react-router-dom'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { usePermissions, useMutationErrors, loadFailure } from '@shared/hooks'
// depois
import { useNavigate } from 'react-router-dom'
import { usePermissions, useMutationErrors, loadFailure } from '@shared/hooks'
```

```ts
// antes
import type { BudgetDocumentType, QuoteData } from '@shared/types/generated'
import { useApproveQuote, useRejectQuote, useRemoveQuote } from '../api/useQuotes'
import { useUploadBudgetFile, useRemoveBudgetFile } from '../api/useCommercialFiles'
// depois
import type { QuoteData } from '@shared/types/generated'
import { useApproveQuote, useRejectQuote, useRemoveQuote } from '../api/useQuotes'
import { useRemoveBudgetFile } from '../api/useCommercialFiles'
```

```ts
// antes
  const [confirmDeleteBudget, setConfirmDeleteBudget] = useState(false)
  const [fileType, setFileType] = useState<BudgetDocumentType>('invoice')
  // Rejeição por tamanho é local (não passa pela API): o AppFileUpload barra o
  // arquivo antes de qualquer request, então não vira erro de mutação.
  const [fileSizeError, setFileSizeError] = useState<string | null>(null)
// depois
  const [confirmDeleteBudget, setConfirmDeleteBudget] = useState(false)
```

```ts
// antes
  const removeBudget = budgetsApi.useRemove()
  const uploadFile = useUploadBudgetFile()
  const removeFile = useRemoveBudgetFile()
// depois
  const removeBudget = budgetsApi.useRemove()
  const removeFile = useRemoveBudgetFile()
```

```ts
// antes
  const { message: fileError } = useMutationErrors([uploadFile.error, removeFile.error])
// depois
  const { message: fileError } = useMutationErrors([removeFile.error])
```

```ts
// antes
  // e.options.clear() devolve o AppFileUpload ao estado vazio depois do envio.
  const handleUpload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (!file) return
    setFileSizeError(null)
    uploadFile.mutate({ budgetId, type: fileType, file }, { onSuccess: () => e.options.clear() })
  }

// depois: nada (o bloco sai inteiro, com a linha em branco)
```

```ts
// antes
    fileType,
    setFileType,
    handleUpload,
    uploadPending: uploadFile.isPending,
    removeFile: (fileId: number) => removeFile.mutate({ budgetId, fileId }),
    fileError,
    fileSizeError,
    onFileSizeReject: setFileSizeError,
    goBack: () => navigate('/comercial'),
// depois
    removeFile: (fileId: number) => removeFile.mutate({ budgetId, fileId }),
    /** Erro de REMOÇÃO de anexo; o do upload mora no `useBudgetDocumentUpload`. */
    fileError,
    goBack: () => navigate('/comercial'),
```

Locales — no bloco `budget`, `fileTypeInvoice` e `fileTypeReceipt` saem e entram `uploadTitle`,
`chooseFile` e `documentType` (`fileTypeLabel` fica: é o rótulo do grupo de cartões):

```json
// es-CL — antes
    "fileTypeLabel": "Tipo de documento",
    "fileTypeInvoice": "Factura",
    "fileTypeReceipt": "Comprobante",
// es-CL — depois
    "fileTypeLabel": "Tipo de documento",
    "uploadTitle": "Subir documento",
    "chooseFile": "Elegir archivo",
    "documentType": {
      "purchase_order": "Orden de compra",
      "invoice": "Factura",
      "receipt": "Comprobante"
    },
```

```json
// pt-BR — antes
    "fileTypeLabel": "Tipo de documento",
    "fileTypeInvoice": "Fatura",
    "fileTypeReceipt": "Comprovante",
// pt-BR — depois
    "fileTypeLabel": "Tipo de documento",
    "uploadTitle": "Enviar documento",
    "chooseFile": "Escolher arquivo",
    "documentType": {
      "purchase_order": "Ordem de compra",
      "invoice": "Fatura",
      "receipt": "Comprovante"
    },
```

```json
// en — antes
    "fileTypeLabel": "Document type",
    "fileTypeInvoice": "Invoice",
    "fileTypeReceipt": "Receipt",
// en — depois
    "fileTypeLabel": "Document type",
    "uploadTitle": "Upload document",
    "chooseFile": "Choose file",
    "documentType": {
      "purchase_order": "Purchase order",
      "invoice": "Invoice",
      "receipt": "Receipt"
    },
```

- [ ] **Step 4:** `pnpm -C frontend exec vitest run src/features/commercial` → PASS;
  `pnpm -C frontend lint`, `pnpm -C frontend test` e `pnpm -C frontend build` verdes (o
  `BudgetDetailPage.test.tsx` e o `parity.test.ts` das locales incluídos);
  `grep -rn "fileTypeInvoice\|fileTypeReceipt\|handleUpload" frontend/src` sem resultado.

- [ ] **Step 5:** commit `feat(43): diálogo de upload por tipo e tag na lista de documentos`.

### Task 6: Verificação no navegador, P-94 e gate completo

**Files:**
- Create: `docs/superpowers/blocos/43-frontend-dialogos-proporcionais-e-tipo-de-documento/smoke.md`
- Modify (só se a medição da P-94 reprovar): `frontend/src/features/identity/components/Student/StudentDialog.tsx`

- [ ] **Step 1:** gate fresco: `docker compose exec -T app php artisan test` (suíte inteira),
  `pnpm -C frontend lint`, `pnpm -C frontend test`, `pnpm -C frontend build`. Tudo verde.

- [ ] **Step 2:** stack da lane: `docker compose exec -T app php artisan migrate:fresh --seed
  --force`; Vite em background (`pnpm -C frontend dev`, porta 5176); login `admin@lotus.cl` /
  `senha123`; navegador pela skill `playwright-cli`, sempre em `http://localhost:5176`.

- [ ] **Step 3: P-94.** Copiar o `medir.cjs` do Apêndice A de
  `docs/superpowers/audits/2026-09-27-item23-medicoes.md` para o scratchpad, apontar para `:5176`
  e `:8083` e medir, com um alumno que tenha turma, a linha `DIALOGO` em 1024×768: `scroll` =
  `frame`. Se reprovar, a troca no `StudentDialog.tsx` é

  ```tsx
  // antes
      size="md"
  // depois
      size={mode === 'view' ? 'lg' : 'md'}
  ```

  medir de novo e commitar `fix(43): diálogo do alumno em lg no modo ver`.

- [ ] **Step 4: Conferir e capturar** (scratchpad, caminho absoluto), em 1024×768 e 1440×900, tema
  claro e escuro:
  1. Alumno criar e ver: Nome │ RUT e E-mail │ Teléfono lado a lado, sem rolagem lateral;
  2. Operación › matricular: passo 1 e passo 2 (RUT │ Nome, E-mail │ Teléfono), botões no footer
     navy; RUT de outro cliente abre o aviso âmbar;
  3. orçamento: subir um documento de cada tipo e ver a tag na lista; um arquivo de tipo recusado
     mostra o erro dentro do diálogo, que não fecha;
  4. uma confirmação de cada severidade: aprovar cotização (`confirm`, verde), mover aluno ou
     designar redator inelegível (`warning`), arquivar ou eliminar (`danger`) — sem maximizar, 28rem;
  5. preview de arquivo (`lg`): maximiza e ocupa a tela; `sm`/`md` sem botão de maximizar;
  6. Cliente, Usuario e Redator (`FormPhotoRow`): sem regressão de layout; header do `QuoteWizard`
     e `headerExtra` do `CrudDialog` legíveis sobre o navy.

- [ ] **Step 5:** `Skill(lotus-ui-review)` nas telas do DoD 9 da spec. O `danger` a 3,76:1 é resíduo
  declarado da `P-74` (spec J10); outro achado se corrige aqui ou se registra no `smoke.md`.

- [ ] **Step 6:** gravar o `smoke.md` no molde abaixo, com o visto em cada item; commit
  `docs(43): smoke no navegador`.

```markdown
# Bloco 43 — smoke no navegador

**Data:** <AAAA-MM-DD> · **Commit:** `<git rev-parse --short HEAD>` · **Stack:** lane, offset +3
(SPA `:5176`, API `:8083`), es-CL · **Gate:** backend <N> testes, frontend <N> testes, lint e build verdes.

## P-94 — diálogo do Alumno em 1024×768

Linha `DIALOGO` do `medir.cjs` (Apêndice A de `audits/2026-09-27-item23-medicoes.md`), literal:

    <linha medida>

Veredito: <scroll = frame, fecha | reprovou, StudentDialog em lg no modo ver, nova linha: …>.

## Conferência

| # | Tela | 1024×768 | 1440×900 | Escuro | Captura |
|---|---|---|---|---|---|
| 1 | Alumno criar / ver | | | | `<caminho absoluto>` |
| 2 | Matrícula, passos 1 e 2, aviso âmbar | | | | |
| 3 | Upload por tipo, tag, erro no diálogo | | | | |
| 4 | Confirmação `confirm` / `warning` / `danger` | | | | |
| 5 | Preview `lg` maximizado; `sm`/`md` sem maximizar | | | | |
| 6 | Cliente, Usuario, Redator; `QuoteWizard`; `headerExtra` | | | | |

## lotus-ui-review

<achados por tela; o `danger` a 3,76:1 registrado como resíduo da P-74 (J10)>
```

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2 | sim — Task 1 toca backend, `generated.ts`, `useCommercialFiles`, `useBudgetDetail` e `BudgetDocumentsCard`; Task 2 toca `shared/ui/{AppDialog,AppTag,ConfirmDialog}`, `tests/tone-ink.test.ts`, os três diálogos migrados, o `RedatorDesignation` e as locales | nenhuma entre elas |
| G2 | 4, 5 | sim — Task 4 toca `FormPhotoRow`, campos de identidade e três diálogos de `Enrollment/`; Task 5 toca `features/commercial/**` e as locales | nenhuma entre elas (as duas consomem a Task 3; a 5 consome também a 1) |

Ordem: G1 → Task 3 → G2 → Task 6. A Task 3 fica fora de grupo porque toca `AppDialog.tsx`,
`tests/tone-ink.test.ts` e `RedatorDesignation.tsx` (também da Task 2) e os três diálogos de
`Enrollment/` (também da Task 4). A Task 6 precisa de todas.

Task fora de grupo executa e revisa uma a uma.

## Handoff de execução

- **executor:** `claude`. O bloco toca as leis 3, 6 e 7, muda primitivos de `shared/ui` com
  fan-out em 25 consumidores e pede julgamento visual medido no navegador; não é mecânico com paths
  fechados.
- **Sessão:** modelo `opus`, esforço da sessão, na lane
  `/home/jvbat/projetos/lotus-43-frontend-dialogos-proporcionais-e-tipo-de-documento` (offset +3).
- **Papéis** (`.claude/papeis.md`):
  - `implementador-integracao` nas Tasks 1 a 5 (todas multi-arquivo). O código vem pronto no
    plano, mas cada task cruza vários arquivos e verifica contra testes e build, então o papel
    mecânico (1–2 arquivos) não cabe;
  - `revisor-task` por task, `re-revisor` nas rodadas de correção e `corretor-tardio` nas rodadas
    4 e 5;
  - `revisor-branch` ao fim.
  - A Task 6 roda na própria sessão: precisa do stack, do navegador e da skill `lotus-ui-review`.
- **paths_autorizados:** não se aplica (`executor: claude`).
