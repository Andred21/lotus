# Hardening · Upload e visualização de arquivos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o upload de arquivo falhar de forma honesta e previsível nas quatro camadas, e dar aos quatro consumidores da tabela polimórfica `files` uma linha de arquivo e uma pré-visualização compartilhadas.

**Architecture:** O teto lógico de 10 MB já vive nos 5 controllers (`max:10240`) e não muda; nginx e PHP sobem para 12 MB de transporte, de modo que a regra do Laravel seja sempre quem rejeita, com envelope RFC 7807 e header CORS. No frontend, `AppFileUpload` passa a barrar o arquivo grande antes de disparar a requisição, e `shared/ui` ganha `AppFileRow` + `AppFilePreviewDialog`, adotados pelas três telas sem redesenhá-las. `TurmaDocumentData` e `RedatorDocumentData` sobem ao núcleo comum de `FileData` para alimentar esses componentes.

**Tech Stack:** nginx (Alpine, compose), PHP 8.3-fpm, Laravel 13 + spatie/laravel-data + typescript-transformer, React 19 + TS, PrimeReact via `shared/ui`, TanStack Query, i18next (3 locales).

**Spec:** `docs/superpowers/specs/2026-07-31-hardening-upload-visualizacao-arquivos-design.md` (D1–D11)
**Context packet:** `docs/superpowers/context-packets/hardening-upload-visualizacao-arquivos.md` (`partial`)

## Global Constraints

- Teto lógico do upload: **10 MB** = `max:10240` (KB) no Laravel = `10485760` bytes no frontend. Os 5 controllers já declaram esse valor e **nenhum muda**.
- Transporte com folga de multipart (D2): nginx `client_max_body_size 12m`; PHP `upload_max_filesize=12M` **e** `post_max_size=12M`. Nunca igualar transporte ao teto lógico.
- `generated.ts` não se edita à mão (ADR-04) — muda-se o DTO e roda `php artisan typescript:transform`.
- Feature não importa PrimeReact direto nem outra feature (ADR-05): componente novo entra em `shared/ui`, com pasta por componente + `index.ts` + export no barrel `shared/ui/index.ts`.
- Tailwind só para layout; cor por variável CSS do tema (ADR-16).
- i18n: as 3 chaves novas entram nos **3** locales (`es-CL`, `pt-BR`, `en`) com chaves idênticas; `es-CL` é a referência de rótulo.
- Backend roda no container: `docker compose exec -T app php artisan ...`. Pint roda no host, de `backend/`, **sempre com os arquivos como argumento**.
- Frontend não tem test runner. Onde não há teste automatizado, a verificação é `pnpm build` + `pnpm lint` + prova comportamental na tela.
- Toque de backend acontece no main tree (P-03).

---

## Estrutura de arquivos

**Criados**
- `docker/php/uploads.ini` — as duas diretivas de upload do PHP, versionadas.
- `backend/tests/Feature/Shared/UploadSizeLimitTest.php` — o teto de 10 MB como regressão nos endpoints de upload.
- `frontend/src/shared/ui/AppFileRow/AppFileRow.tsx` + `index.ts` — a linha de arquivo (ícone por mime, nome, tamanho, data, slot de ações).
- `frontend/src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx` + `index.ts` — o diálogo de pré-visualização.
- `frontend/src/shared/lib/upload.ts` — `MAX_UPLOAD_BYTES`, `formatFileSize`, `isPreviewable`.

**Modificados**
- `docker/nginx/default.conf` — `client_max_body_size`.
- `docker/php/Dockerfile` — `COPY` do `.ini`.
- `backend/app/Domains/Operation/Data/TurmaDocumentData.php` — `+mime`, `+download_url`.
- `backend/app/Domains/Identity/Data/RedatorDocumentData.php` — `+mime`, `+size`, `+created_at`.
- `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx` — gate de tamanho.
- `frontend/src/shared/ui/index.ts` — barrel.
- `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` — chaves novas.
- `frontend/src/features/commercial/components/Budget/FileList.tsx`
- `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`
- `frontend/src/features/operation/lib/turmaDocuments.ts` — `formatFileSize` sai daqui e passa a vir de `shared/lib`.
- `frontend/src/features/identity/components/Redator/RedatorDialog.tsx`
- `frontend/src/features/operation/components/Enrollment/ImportDialog.tsx`

---

## Parte A — Infra e backend

### Task 1: Alinhar os limites de transporte

**Files:**
- Modify: `docker/nginx/default.conf`
- Create: `docker/php/uploads.ini`
- Modify: `docker/php/Dockerfile`

**Interfaces:**
- Consumes: nada.
- Produces: teto de transporte de 12 MB em nginx e PHP. As Tasks 2–4 e a Parte B assumem que uma requisição de até 12 MB chega ao Laravel.

- [ ] **Step 1: Provar o comportamento atual (o teste que precisa falhar)**

Com o ambiente de pé (`docker compose up -d`), gere um arquivo de 11 MB e poste sem autenticação:

```bash
head -c 11534336 /dev/urandom > /tmp/big.bin
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: application/json' \
  -F 'type=quote_document' -F 'file=@/tmp/big.bin' \
  http://localhost:8080/api/quotes/1/files
```

Esperado HOJE: `413`. O nginx corta antes do Laravel — é exatamente o erro que o print rotula como CORS.

- [ ] **Step 2: Subir o limite do nginx**

Em `docker/nginx/default.conf`, dentro do bloco `server`, logo após `index index.php;`:

```nginx
    # Teto de transporte com folga sobre o limite lógico de 10 MB (spec D2): o
    # envelope multipart soma boundary e headers ao arquivo. Igualar os dois
    # faria o nginx cortar um arquivo de exatos 10 MB com 413 — resposta que
    # não passa pelo Laravel, logo sem CORS, logo opaca no navegador.
    client_max_body_size 12m;
```

- [ ] **Step 3: Versionar os limites do PHP**

Crie `docker/php/uploads.ini`:

```ini
; Teto de transporte do PHP. 12M nas DUAS diretivas, acima do limite lógico de
; 10 MB (max:10240) — assim quem rejeita é sempre a regra do Laravel, com
; envelope RFC 7807 e mensagem de tamanho. Ver spec D2/D3.
upload_max_filesize = 12M
post_max_size = 12M
```

Em `docker/php/Dockerfile`, antes da linha `USER appuser`:

```dockerfile
COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/zz-uploads.ini
```

Se o `build.context` do serviço `app` no `docker-compose.yml` não for a raiz do repositório, ajuste o caminho do `COPY` para o contexto real em vez de mudar o contexto.

- [ ] **Step 4: Rebuildar e conferir as diretivas**

```bash
docker compose build app && docker compose up -d
docker compose exec -T app php -r 'echo ini_get("upload_max_filesize"),"|",ini_get("post_max_size"),PHP_EOL;'
```

Esperado: `12M|12M`.

- [ ] **Step 5: Repetir o Step 1 e ver o 413 sumir**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: application/json' \
  -F 'type=quote_document' -F 'file=@/tmp/big.bin' \
  http://localhost:8080/api/quotes/1/files
```

Esperado AGORA: `401` (ou `419`). Qualquer um dos dois prova o ponto — a requisição de 11 MB **atravessou o nginx e o PHP e chegou ao Laravel**, que a recusou por autenticação, não por tamanho. O que não pode mais aparecer é `413`.

- [ ] **Step 6: Provar que o nginx ainda tem teto**

```bash
head -c 13631488 /dev/urandom > /tmp/huge.bin
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: application/json' \
  -F 'type=quote_document' -F 'file=@/tmp/huge.bin' \
  http://localhost:8080/api/quotes/1/files
rm -f /tmp/big.bin /tmp/huge.bin
```

Esperado: `413`. 13 MB acima do teto de transporte continua barrado — o alinhamento subiu o limite, não o removeu.

- [ ] **Step 7: Commit**

```bash
git add docker/nginx/default.conf docker/php/uploads.ini docker/php/Dockerfile
git commit -m "fix(infra): alinha os limites de upload de nginx e PHP ao teto de 10 MB"
```

---

### Task 2: `TurmaDocumentData` ganha `mime` e `download_url`

**Files:**
- Modify: `backend/app/Domains/Operation/Data/TurmaDocumentData.php`
- Test: `backend/tests/Feature/Operation/TurmaDocumentApiTest.php`

**Interfaces:**
- Consumes: nada da Task 1.
- Produces: `TurmaDocumentData` com o núcleo `{ id: int, type: string, original_name: string, mime: ?string, size: int, created_at: string, download_url: string }`. A Task 9 (frontend da turma) depende de `mime` e `download_url` existirem.

- [ ] **Step 1: Escrever o teste que falha**

Em `backend/tests/Feature/Operation/TurmaDocumentApiTest.php`, adicione:

```php
    public function test_listagem_expoe_mime_e_download_url(): void
    {
        $this->actingAsRedatorRole();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->assertCreated();

        $response = $this->getJson("/api/turmas/{$this->turma->id}/documents")->assertOk();

        $response->assertJsonPath('0.mime', 'application/pdf');
        $this->assertNotEmpty($response->json('0.download_url'));
    }
```

Se o `setUp` desta classe ainda não chamar `Storage::fake('s3')`, adicione-o — `download_url` sai de `UploadFileAction::temporaryUrl`, e o driver `local` não suporta URL temporária. É o mesmo arranjo que os testes de anexo do comercial já usam.

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=test_listagem_expoe_mime_e_download_url
```

Esperado: FAIL — a resposta não tem a chave `mime`.

- [ ] **Step 3: Implementar**

`backend/app/Domains/Operation/Data/TurmaDocumentData.php` passa a ser:

```php
<?php

namespace App\Domains\Operation\Data;

use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Documento da turma (leitura). Núcleo comum de `FileData` (spec D5): `mime`
 * decide a pré-visualização no front e `download_url` é a URL pré-assinada
 * temporária (ADR-11) — antes desta sprint a turma listava o documento sem
 * conseguir baixá-lo.
 */
#[TypeScript]
class TurmaDocumentData extends Data
{
    public function __construct(
        public int $id,
        public string $type,
        public string $original_name,
        public ?string $mime,
        public int $size,
        public string $created_at,
        public string $download_url,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            mime: $file->mime,
            size: $file->size,
            created_at: $file->created_at->toISOString(),
            download_url: app(UploadFileAction::class)->temporaryUrl($file),
        );
    }
}
```

- [ ] **Step 4: Rodar o arquivo inteiro**

```bash
docker compose exec -T app php artisan test --filter=TurmaDocumentApiTest
```

Esperado: PASS em todos os casos, inclusive os pré-existentes.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Data/TurmaDocumentData.php tests/Feature/Operation/TurmaDocumentApiTest.php && cd ..
git add backend/app/Domains/Operation/Data/TurmaDocumentData.php backend/tests/Feature/Operation/TurmaDocumentApiTest.php
git commit -m "feat(operation): expoe mime e download_url no documento de turma"
```

---

### Task 3: `RedatorDocumentData` ganha `mime`, `size` e `created_at`

**Files:**
- Modify: `backend/app/Domains/Identity/Data/RedatorDocumentData.php`
- Test: `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`
- Modify (gerado): `frontend/src/shared/types/generated.ts`

**Interfaces:**
- Consumes: o padrão de núcleo fixado na Task 2.
- Produces: `RedatorDocumentData` com `{ id, type, original_name, mime: ?string, size: int, valid_until: ?string, created_at: ?string, download_url }`. A Task 10 depende de `mime` e `size`. `valid_until` permanece — é dado de idoneidade (D5).

- [ ] **Step 1: Escrever o teste que falha**

Em `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`:

```php
    public function test_dto_do_documento_expoe_nucleo_comum(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $response = $this->postJson('/api/redatores', [
            'name' => 'Ana Rojas',
            'rut' => '13.456.789-9',
            'email' => 'ar@lotus.cl',
            'documents' => [
                'CV' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf'),
            ],
        ])->assertCreated();

        $doc = collect($response->json('documents'))->firstWhere('type', 'CV');

        $this->assertSame('application/pdf', $doc['mime']);
        $this->assertGreaterThan(0, $doc['size']);
        $this->assertNotNull($doc['created_at']);
    }
```

Se o RUT `13.456.789-9` já estiver em uso por outro caso desta classe, use outro RUT válido — a unicidade é checada com `withTrashed`.

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=test_dto_do_documento_expoe_nucleo_comum
```

Esperado: FAIL — chave `mime` inexistente no array do documento.

- [ ] **Step 3: Implementar**

Em `backend/app/Domains/Identity/Data/RedatorDocumentData.php`, o construtor e o `fromModel`:

```php
    public function __construct(
        public int $id,
        public string $type,
        public string $original_name,
        public ?string $mime,
        public int $size,
        public ?string $valid_until,
        public ?string $created_at,
        public string $download_url,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            mime: $file->mime,
            size: $file->size,
            valid_until: $file->valid_until?->toDateString(),
            created_at: $file->created_at?->toIso8601String(),
            download_url: app(UploadFileAction::class)->temporaryUrl($file),
        );
    }
```

- [ ] **Step 4: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: verde. A suíte inteira porque `RedatorDocumentData` é consumido pela idoneidade e pelo CRUD de redator, não só pelo teste acima.

- [ ] **Step 5: Regenerar os tipos**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: `generated.ts` modificado, com `TurmaDocumentData` e `RedatorDocumentData` carregando os campos novos. Não edite o arquivo à mão (ADR-04).

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/RedatorDocumentData.php tests/Feature/Cadastros/RedatorDocumentTest.php && cd ..
git add backend/app/Domains/Identity/Data/RedatorDocumentData.php backend/tests/Feature/Cadastros/RedatorDocumentTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(identity): expoe mime, size e created_at no documento do redator"
```

---

### Task 4: Fixar o teto de 10 MB como regressão

**Files:**
- Create: `backend/tests/Feature/Shared/UploadSizeLimitTest.php`

**Interfaces:**
- Consumes: os endpoints de upload existentes.
- Produces: guarda automatizada do `max:10240`. Nenhum código de produção muda nesta task.

- [ ] **Step 1: Escrever o teste**

`backend/tests/Feature/Shared/UploadSizeLimitTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * O teto lógico do upload é 10 MB (`max:10240`) e vale igual em todos os
 * endpoints de arquivo. As camadas de transporte (nginx 12m, PHP 12M) ficam
 * ACIMA dele de propósito — spec D2 — para que a rejeição venha daqui, com
 * envelope RFC 7807, e não do nginx com 413 sem CORS.
 */
class UploadSizeLimitTest extends TestCase
{
    use RefreshDatabase;

    /** 11 MB em kilobytes — acima do teto, abaixo do limite de transporte. */
    private const OVERSIZED_KB = 11264;

    public function test_anexo_de_cotacao_acima_de_10mb_e_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $quote = Quote::factory()->create();

        $this->postJson("/api/quotes/{$quote->id}/files", [
            'type' => 'quote_document',
            'file' => UploadedFile::fake()->create('grande.pdf', self::OVERSIZED_KB, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_anexo_de_orcamento_acima_de_10mb_e_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $budget = Budget::factory()->create();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'invoice',
            'file' => UploadedFile::fake()->create('grande.pdf', self::OVERSIZED_KB, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_anexo_no_limite_e_aceito(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $quote = Quote::factory()->create();

        $this->postJson("/api/quotes/{$quote->id}/files", [
            'type' => 'quote_document',
            'file' => UploadedFile::fake()->create('no-limite.pdf', 10240, 'application/pdf'),
        ])->assertCreated();
    }
}
```

Se `Quote::factory()` ou `Budget::factory()` exigirem relações (cliente, curso, orçamento pai), monte-as como os testes de `tests/Feature/Comercial/` já fazem — copie o arranjo de lá em vez de inventar um novo.

- [ ] **Step 2: Rodar**

```bash
docker compose exec -T app php artisan test --filter=UploadSizeLimitTest
```

Esperado: PASS nos três casos. Estes passam contra o código atual de propósito — o `max:10240` já existe; o teste fixa o valor para que uma alteração futura de limite não passe despercebida, e o caso "no limite" prova que 10 MB exatos são aceitos.

- [ ] **Step 3: Pint e commit**

```bash
cd backend && ./vendor/bin/pint tests/Feature/Shared/UploadSizeLimitTest.php && cd ..
git add backend/tests/Feature/Shared/UploadSizeLimitTest.php
git commit -m "test(shared): fixa o teto de 10 MB nos endpoints de upload"
```

---

## Parte B — Frontend

### Task 5: `shared/lib/upload.ts` e o gate de tamanho no `AppFileUpload`

**Files:**
- Create: `frontend/src/shared/lib/upload.ts`
- Modify: `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json`, `en.json`
- Modify: `frontend/src/shared/lib/index.ts` — acrescente `export * from './upload'` junto dos outros re-exports

**Interfaces:**
- Consumes: nada.
- Produces:
  - `MAX_UPLOAD_BYTES = 10485760`
  - `formatFileSize(bytes: number): string`
  - `isPreviewable(mime: string | null | undefined, name: string): 'image' | 'pdf' | null`
  - `AppFileUpload` passa a aceitar `onSizeReject?: (message: string) => void` e a barrar arquivo acima do teto antes de chamar `uploadHandler`.

- [ ] **Step 1: Criar o módulo compartilhado**

`frontend/src/shared/lib/upload.ts`:

```ts
/** Teto lógico do upload: 10 MB. É o MESMO valor do `max:10240` (KB) dos 5
 * controllers Laravel — 10240 * 1024. nginx e PHP ficam acima disso de
 * propósito (spec D2), então quem rejeita é sempre o backend. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Tamanho legível para a linha do arquivo (o backend devolve bytes). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Como o arquivo se pré-visualiza. Decide por `mime`, que é o que ficou
 * gravado em `files` (spec D7); a extensão do nome é fallback só quando o
 * mime vier null — a coluna é nullable. */
export function isPreviewable(
  mime: string | null | undefined,
  name: string,
): 'image' | 'pdf' | null {
  if (mime?.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime) return null

  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  return null
}
```

- [ ] **Step 2: Chaves de i18n nos 3 locales**

Em `es-CL.json`, dentro de `common`:

```json
    "fileTooLarge": "El archivo pesa {{size}} y el máximo es {{limit}}.",
    "preview": "Ver",
    "previewUnavailable": "Este formato no se puede previsualizar. Descárgalo para abrirlo."
```

Em `pt-BR.json`, dentro de `common`:

```json
    "fileTooLarge": "O arquivo tem {{size}} e o máximo é {{limit}}.",
    "preview": "Ver",
    "previewUnavailable": "Este formato não tem pré-visualização. Baixe o arquivo para abri-lo."
```

Em `en.json`, dentro de `common`:

```json
    "fileTooLarge": "The file is {{size}} and the maximum is {{limit}}.",
    "preview": "View",
    "previewUnavailable": "This format cannot be previewed. Download it to open."
```

- [ ] **Step 3: Gate no wrapper**

`frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx`:

```tsx
import { FileUpload } from 'primereact/fileupload'
import type { FileUploadProps, FileUploadHandlerEvent } from 'primereact/fileupload'
import { useTranslation } from 'react-i18next'
import { MAX_UPLOAD_BYTES, formatFileSize } from '@shared/lib/upload'

export type { FileUploadHandlerEvent } from 'primereact/fileupload'
export type { FileUploadProps as AppFileUploadProps } from 'primereact/fileupload'

export type AppFileUploadOwnProps = FileUploadProps & {
  /** Recebe a mensagem já traduzida quando o arquivo excede o teto. O chamador
   * decide onde exibi-la (banner do diálogo, erro da seção). */
  onSizeReject?: (message: string) => void
}

/** Wrapper do FileUpload do PrimeReact. Default: modo básico, upload
 * automático via customUpload (o chamador trata em `uploadHandler`, subindo
 * pela API própria em vez do endpoint embutido do Prime). `customUpload` é
 * invariante do wrapper — fixado APÓS o spread para o chamador nunca poder
 * reativar o uploader XHR embutido do PrimeReact.
 *
 * O teto de tamanho é checado AQUI, não via `maxFileSize` do Prime: em
 * `mode="basic"` a área de mensagens dele não é renderizada, então a rejeição
 * dele seria silenciosa (spec D4). Arquivo acima do teto não vira requisição. */
export function AppFileUpload({ uploadHandler, onSizeReject, ...props }: AppFileUploadOwnProps) {
  const { t } = useTranslation()

  const guarded = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (file && file.size > MAX_UPLOAD_BYTES) {
      e.options.clear()
      onSizeReject?.(
        t('common.fileTooLarge', {
          size: formatFileSize(file.size),
          limit: formatFileSize(MAX_UPLOAD_BYTES),
        }),
      )
      return
    }
    uploadHandler?.(e)
  }

  return <FileUpload mode="basic" auto {...props} uploadHandler={guarded} customUpload />
}
```

- [ ] **Step 4: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: build e lint verdes. `uploadHandler` sai do spread e volta embrulhado — confira que nenhum consumidor existente quebrou de tipo.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/lib/upload.ts frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx frontend/src/shared/config/locales
git commit -m "feat(shared): barra arquivo acima de 10 MB antes de disparar o upload"
```

---

### Task 6: `AppFileRow` e `AppFilePreviewDialog`

**Files:**
- Create: `frontend/src/shared/ui/AppFileRow/AppFileRow.tsx`, `frontend/src/shared/ui/AppFileRow/index.ts`
- Create: `frontend/src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx`, `frontend/src/shared/ui/AppFilePreviewDialog/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `MAX_UPLOAD_BYTES` não; usa `formatFileSize` e `isPreviewable` da Task 5.
- Produces:
  - `AppFileRow({ name, mime, size, createdAt, actions })` — `size`/`createdAt` opcionais.
  - `AppFilePreviewDialog({ file, visible, onHide })`, onde `file` é `{ original_name: string; mime?: string | null; size?: number; download_url: string } | null`.
  - Ambos exportados pelo barrel `@shared/ui`.

- [ ] **Step 1: A linha**

`frontend/src/shared/ui/AppFileRow/AppFileRow.tsx`:

```tsx
import type { ReactNode } from 'react'
import { formatFileSize } from '@shared/lib/upload'

/** Ícone e cor por tipo. Decide por mime (spec D7); extensão é fallback quando
 * o mime é null. Cor por palette var do Lara, composta com --surface-card no
 * fundo para funcionar nos dois temas (os palette vars não invertem). */
function fileIcon(mime: string | null | undefined, name: string): { icon: string; hue: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const is = (m: string, ...exts: string[]) => mime === m || (!mime && exts.includes(ext))

  if (mime?.startsWith('image/') || (!mime && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext))) {
    return { icon: 'pi pi-image', hue: 'var(--blue-500)' }
  }
  if (is('application/pdf', 'pdf')) return { icon: 'pi pi-file-pdf', hue: 'var(--red-500)' }
  if (
    mime?.includes('spreadsheet') || mime === 'text/csv' ||
    (!mime && ['xlsx', 'xls', 'csv'].includes(ext))
  ) {
    return { icon: 'pi pi-file-excel', hue: 'var(--green-500)' }
  }
  if (mime?.includes('word') || (!mime && ['doc', 'docx'].includes(ext))) {
    return { icon: 'pi pi-file-word', hue: 'var(--indigo-500)' }
  }
  return { icon: 'pi pi-file', hue: 'var(--text-color-secondary)' }
}

export type AppFileRowProps = {
  name: string
  mime?: string | null
  size?: number
  createdAt?: string | null
  /** Botões da linha (ver, baixar, excluir). O chamador decide quais existem. */
  actions?: ReactNode
}

/** Linha de arquivo compartilhada pelos consumidores de `files`: comercial,
 * turma e redator. Absorve o ícone e a formatação que viviam em três cópias
 * divergentes (spec D8). A ESTRUTURA de cada tela continua com a tela. */
export function AppFileRow({ name, mime, size, createdAt, actions }: AppFileRowProps) {
  const { icon, hue } = fileIcon(mime, name)
  const meta = [
    createdAt ? new Date(createdAt).toLocaleDateString() : null,
    size !== undefined ? formatFileSize(size) : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${hue} 12%, var(--surface-card))`, color: hue }}
      >
        <i className={icon} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {meta && <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{meta}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}
```

`frontend/src/shared/ui/AppFileRow/index.ts`:

```ts
export * from './AppFileRow'
```

- [ ] **Step 2: O diálogo**

`frontend/src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'
import { AppFileRow } from '../AppFileRow'
import { isPreviewable } from '@shared/lib/upload'

export type PreviewableFile = {
  original_name: string
  mime?: string | null
  size?: number
  download_url: string
}

export type AppFilePreviewDialogProps = {
  file: PreviewableFile | null
  visible: boolean
  onHide: () => void
}

/** Pré-visualização de documento de `files`. Imagem e PDF renderizam inline
 * pela URL pré-assinada; formato sem preview mostra a linha do arquivo e o
 * botão de baixar (spec D9) — a ação NÃO some conforme o tipo, porque ação que
 * desaparece é falha escondida. */
export function AppFilePreviewDialog({ file, visible, onHide }: AppFilePreviewDialogProps) {
  const { t } = useTranslation()
  if (!file) return null

  const kind = isPreviewable(file.mime, file.original_name)

  return (
    <AppDialog visible={visible} onHide={onHide} header={file.original_name} style={{ width: '70vw' }}>
      {kind === 'image' && (
        <img
          src={file.download_url}
          alt={file.original_name}
          className="mx-auto max-h-[70vh] max-w-full object-contain"
        />
      )}

      {kind === 'pdf' && (
        <iframe
          src={file.download_url}
          title={file.original_name}
          className="h-[70vh] w-full"
          style={{ border: 'none' }}
        />
      )}

      {kind === null && (
        <div className="flex flex-col gap-4 p-2">
          <AppFileRow name={file.original_name} mime={file.mime} size={file.size} />
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('common.previewUnavailable')}
          </p>
          <a href={file.download_url} target="_blank" rel="noreferrer" className="self-start">
            <AppButton icon="pi pi-download" label={t('common.download')} />
          </a>
        </div>
      )}
    </AppDialog>
  )
}
```

`frontend/src/shared/ui/AppFilePreviewDialog/index.ts`:

```ts
export * from './AppFilePreviewDialog'
```

- [ ] **Step 3: Barrel**

Em `frontend/src/shared/ui/index.ts`, em ordem alfabética junto dos vizinhos:

```ts
export * from './AppFilePreviewDialog'
export * from './AppFileRow'
```

- [ ] **Step 4: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verde.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/AppFileRow frontend/src/shared/ui/AppFilePreviewDialog frontend/src/shared/ui/index.ts
git commit -m "feat(shared): adiciona linha de arquivo e dialogo de pre-visualizacao"
```

---

### Task 7: Comercial adota a linha e ganha a pré-visualização

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/FileList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`

**Interfaces:**
- Consumes: `AppFileRow`, `AppFilePreviewDialog` (Task 6); `onSizeReject` do `AppFileUpload` (Task 5).
- Produces: `FileList` continua com a mesma assinatura pública — `{ files: FileData[]; onRemove?: (fileId: number) => void }` — para não mexer nos dois call sites.

- [ ] **Step 1: Reescrever `FileList`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppFileRow, AppFilePreviewDialog } from '@shared/ui'
import type { FileData } from '@shared/types/generated'

export function FileList({ files, onRemove }: { files: FileData[]; onRemove?: (fileId: number) => void }) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<FileData | null>(null)

  if (files.length === 0) {
    return <p className="px-4 pb-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noDocuments')}</p>
  }

  return (
    <>
      <ul>
        {files.map((f) => (
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
                  <AppButton
                    icon="pi pi-eye"
                    text
                    rounded
                    aria-label={t('common.preview')}
                    onClick={() => setPreview(f)}
                  />
                  <a href={f.download_url} target="_blank" rel="noreferrer">
                    <AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />
                  </a>
                  {onRemove && (
                    <AppButton
                      icon="pi pi-trash"
                      text
                      rounded
                      severity="danger"
                      aria-label={t('common.delete')}
                      onClick={() => onRemove(f.id)}
                    />
                  )}
                </>
              }
            />
          </li>
        ))}
      </ul>

      <AppFilePreviewDialog file={preview} visible={preview !== null} onHide={() => setPreview(null)} />
    </>
  )
}
```

- [ ] **Step 2: Ligar a rejeição por tamanho nos dois uploads do comercial**

Em `QuotesList.tsx`, o `AppFileUpload` da cotação passa a reportar a rejeição pelo banner de erro que o componente já tem (`FormErrorBanner` + `useMutationErrors`). Acrescente ao componente um estado local:

```tsx
  const [sizeError, setSizeError] = useState<string | null>(null)
```

exiba-o junto do banner existente. `FormErrorBanner` recebe `message` no singular (`FormField.tsx:91`), não uma lista:

```tsx
  {sizeError && <FormErrorBanner message={sizeError} />}
```

e passe o handler ao upload, limpando o erro anterior a cada tentativa:

```tsx
                <AppFileUpload
                  chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                  chooseLabel=""
                  pt={{ basicButton: { 'aria-label': t('common.upload') } }}
                  disabled={uploadFile.isPending && uploadFile.variables?.quoteId === q.id}
                  onSizeReject={setSizeError}
                  uploadHandler={(e) => { setSizeError(null); handleUpload(q.id!, e) }}
                />
```

Faça o mesmo no `AppFileUpload` de `BudgetDetailPage.tsx`, com o mesmo par estado + `onSizeReject`.

- [ ] **Step 3: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

- [ ] **Step 4: Prova na tela**

Com `pnpm dev` e o backend de pé, abra o detalhe de um orçamento:
1. clicar no olho de um `.docx` abre o diálogo com o fallback e o botão de baixar;
2. subir uma imagem e clicar no olho renderiza a imagem inline;
3. escolher um arquivo acima de 10 MB mostra a mensagem com o tamanho e o limite, **sem** requisição na aba Network.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/commercial/components/Budget
git commit -m "feat(commercial): adiciona pre-visualizacao e gate de tamanho nos anexos"
```

---

### Task 8: Turma adota a linha, ganha download e pré-visualização

**Files:**
- Modify: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`
- Modify: `frontend/src/features/operation/lib/turmaDocuments.ts`

**Interfaces:**
- Consumes: `TurmaDocumentData` com `mime` e `download_url` (Task 2); `AppFileRow`, `AppFilePreviewDialog` (Task 6).
- Produces: nada para tasks posteriores.

- [ ] **Step 1: Remover a cópia de `formatFileSize`**

Em `frontend/src/features/operation/lib/turmaDocuments.ts`, apague a função `formatFileSize` inteira (o `TURMA_DOCUMENT_TYPES` fica). Ela agora vive em `@shared/lib/upload`. Se algum outro arquivo da feature a importava, repare o import para o módulo compartilhado:

```bash
grep -rn "formatFileSize" frontend/src
```

- [ ] **Step 2: Reescrever a lista do card**

Em `DocumentTypeCard.tsx`, troque os imports e a `<ul>`. Imports:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppFileUpload, AppTag, AppFileRow, AppFilePreviewDialog } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
```

Estado local, no corpo do componente:

```tsx
  const [preview, setPreview] = useState<TurmaDocumentData | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
```

A lista:

```tsx
      <ul className="mt-3 space-y-2">
        {files.map((file) => (
          <li key={file.id}>
            <AppFileRow
              name={file.original_name}
              mime={file.mime}
              size={file.size}
              createdAt={file.created_at}
              actions={
                <>
                  <AppButton
                    icon="pi pi-eye"
                    text
                    rounded
                    aria-label={t('common.preview')}
                    onClick={() => setPreview(file)}
                  />
                  <a href={file.download_url} target="_blank" rel="noreferrer">
                    <AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />
                  </a>
                  {canSubmit && (
                    <AppButton
                      icon="pi pi-trash"
                      text
                      rounded
                      severity="danger"
                      aria-label={t('operation.documents.remove')}
                      disabled={removing}
                      onClick={() => onRemove(file)}
                    />
                  )}
                </>
              }
            />
          </li>
        ))}
        {!delivered && <li className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.documents.empty')}</li>}
      </ul>

      {sizeError && <p className="mt-2 text-sm" style={{ color: 'var(--red-500)' }}>{sizeError}</p>}

      <AppFilePreviewDialog file={preview} visible={preview !== null} onHide={() => setPreview(null)} />
```

E no `AppFileUpload` do cabeçalho, mantendo o `e.options.clear()` que já existe e o comentário que explica por que ele vem antes da mutação:

```tsx
            onSizeReject={setSizeError}
```

mais `setSizeError(null)` como primeira linha do `uploadHandler`.

- [ ] **Step 3: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

- [ ] **Step 4: Prova na tela**

Na aba `Documentación` de uma turma: baixar um documento funciona (antes desta sprint não existia), o olho abre o PDF inline, e a exclusão continua no lugar.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/operation/components/Document/DocumentTypeCard.tsx frontend/src/features/operation/lib/turmaDocuments.ts
git commit -m "feat(operation): documento de turma ganha download e pre-visualizacao"
```

---

### Task 9: Redator adota a linha e a pré-visualização

**Files:**
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx`

**Interfaces:**
- Consumes: `RedatorDocumentData` com `mime`, `size`, `created_at` (Task 3); `AppFileRow`, `AppFilePreviewDialog` (Task 6).
- Produces: nada para tasks posteriores.

- [ ] **Step 1: Estado local do diálogo**

No corpo de `RedatorDialog`, junto dos outros `useState`:

```tsx
  const [preview, setPreview] = useState<RedatorDocumentData | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
```

- [ ] **Step 2: Ação de ver nos modos `view` e `edit`**

No bloco de cada tipo de documento, ao lado do link de download já existente, tanto no ramo `mode === 'view'` quanto no `mode === 'edit'`:

```tsx
                  <AppButton
                    icon="pi pi-eye"
                    text
                    rounded
                    aria-label={t('common.preview')}
                    onClick={() => setPreview(doc)}
                  />
```

Mantenha a segregação por modo que já existe: `view` continua imutável (só ver e baixar), `edit` mantém upload e exclusão.

- [ ] **Step 3: Gate de tamanho nos dois caminhos de upload**

O redator tem **dois** caminhos, e ambos precisam do gate: o `handleUpload` do modo `edit` (endpoint aninhado) e o `handleStage` do modo `create` (arquivo fica no estado local até o submit multipart). Passe `onSizeReject={setSizeError}` nos dois `AppFileUpload` e limpe o erro no início de cada handler.

Exiba o erro acima da lista de tipos, junto do `upload.error.detail` que já é renderizado ali:

```tsx
        {sizeError && <p className="text-sm text-red-600">{sizeError}</p>}
```

- [ ] **Step 4: Diálogo de pré-visualização**

No fim do bloco de documentos:

```tsx
        <AppFilePreviewDialog file={preview} visible={preview !== null} onHide={() => setPreview(null)} />
```

- [ ] **Step 5: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

- [ ] **Step 6: Prova na tela**

No diálogo de redator: em `view`, o olho abre o PDF do CV; em `edit`, upload e exclusão seguem funcionando; em `create`, escolher arquivo acima de 10 MB mostra a mensagem e **não** deixa o arquivo em stage.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/identity/components/Redator/RedatorDialog.tsx
git commit -m "feat(identity): documento do redator ganha pre-visualizacao e gate de tamanho"
```

---

### Task 10: Import de planilha herda o gate

**Files:**
- Modify: `frontend/src/features/operation/components/Enrollment/ImportDialog.tsx`

**Interfaces:**
- Consumes: `onSizeReject` (Task 5).
- Produces: nada.

- [ ] **Step 1: Ligar o gate**

Estado local:

```tsx
  const [sizeError, setSizeError] = useState<string | null>(null)
```

No `AppFileUpload`:

```tsx
            <AppFileUpload
              accept=".xlsx,.csv"
              chooseLabel={t('operation.enrollment.import.choose')}
              onSizeReject={setSizeError}
              uploadHandler={(e) => { setSizeError(null); upload(e) }}
              disabled={importMutation.isPending}
            />
```

E exiba `sizeError` no mesmo lugar em que o diálogo já mostra o erro da mutação — confira o arquivo e reaproveite o elemento existente em vez de criar um segundo canal de erro.

- [ ] **Step 2: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/operation/components/Enrollment/ImportDialog.tsx
git commit -m "feat(operation): import de planilha rejeita arquivo acima do teto"
```

---

### Task 11: DoD end-to-end

**Files:** nenhum arquivo de produção. Esta task só prova.

**Interfaces:**
- Consumes: tudo.
- Produces: a evidência que fecha o bloco.

- [ ] **Step 1: Suíte e gates**

```bash
docker compose exec -T app php artisan test
cd frontend && pnpm build && pnpm lint && cd ..
```

Esperado: suíte verde, build e lint verdes.

- [ ] **Step 2: Prova de que o 413 opaco morreu**

Com o app rodando e o container reconstruído (Task 1):

```bash
head -c 11534336 /dev/urandom > /tmp/big.bin
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: application/json' \
  -F 'type=quote_document' -F 'file=@/tmp/big.bin' \
  http://localhost:8080/api/quotes/1/files
rm -f /tmp/big.bin
```

Esperado: `401`/`419`, nunca `413`.

- [ ] **Step 3: Prova do 422 com motivo certo**

Autenticado pela UI, no card de documentos de uma cotação, suba um arquivo de ~11 MB **contornando o gate do cliente** (o gate barraria antes) — a via prática é `curl` com o cookie de sessão da aba, ou o teste `UploadSizeLimitTest` da Task 4, que já afirma 422 com erro de validação em `file`. Registre qual das duas foi usada.

- [ ] **Step 4: Contrato novo contra a API real (DoD 3 da spec)**

Autenticado, com o `OperationDemoSeeder` carregado, confira que os campos novos chegam de verdade — não só no teste com `Storage::fake`:

```bash
curl -s http://localhost:8080/api/turmas/1/documents -H 'Accept: application/json' -b cookies.txt \
  | head -c 400
```

Esperado: `mime` e `download_url` presentes no primeiro item. Repita para `/api/redatores/{id}`, conferindo `mime`, `size` e `created_at` no array `documents`. Se não houver cookie de sessão à mão, use o DevTools da aba já autenticada e registre a resposta.

- [ ] **Step 5: Prova visual do João**

Nos quatro consumidores — orçamento, cotação, turma e redator:
1. pré-visualização de imagem;
2. pré-visualização de PDF;
3. fallback de `.docx` com botão de baixar;
4. upload de 3 MB, que hoje falha, passando;
5. arquivo acima de 10 MB rejeitado com o tamanho e o limite na mensagem, sem requisição.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "chore(hardening): fecha o bloco de upload e visualizacao de arquivos"
```

---

## Handoff de execução

Execução dividida por parte, como no `bloco-alunos-modulo`:

**Parte A (Tasks 1–4) — `executor: codex`**

`paths_autorizados`:
- `docker/nginx/default.conf`
- `docker/php/**`
- `backend/app/Domains/Operation/Data/TurmaDocumentData.php`
- `backend/app/Domains/Identity/Data/RedatorDocumentData.php`
- `backend/tests/Feature/Operation/TurmaDocumentApiTest.php`
- `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`
- `backend/tests/Feature/Shared/UploadSizeLimitTest.php`
- `frontend/src/shared/types/generated.ts` (saída de `artisan typescript:transform`, nunca editado à mão)

Critério: tasks mecânicas, com verificação executável e paths fechados. O Codex precisa de sandbox com acesso ao Docker — a Task 1 exige `docker compose build`, e a falha de `docker.sock` já bloqueou uma sessão antes (`0cfd369`); se acontecer de novo, abra sessão nova em `danger-full-access`.

**Parte B (Tasks 5–10) — `executor: claude`**

Critério: julgamento de UI fora do plano (onde o erro de tamanho aparece em cada tela, como a linha compartilhada se encaixa em três estruturas diferentes) e fronteira do ADR-05 entre `shared/ui` e feature.

**Task 11 — `executor: claude`**, com a prova visual do João.
