# Sprint 1 · Correções do Code Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os 7 defeitos confirmados pelo code-review do Sprint 1 (Cadastros), deixando o build verde e o comportamento provado por teste.

**Architecture:** Cada task é um defeito independente, corrigido por TDD onde há suíte (backend) e por verificação manual no navegador onde não há (frontend — o projeto ainda não tem test runner de front). Nenhuma refatoração estrutural aqui: este plano é a rede de segurança do plano seguinte (`2026-07-09-frontend-fundacao-ui.md`).

**Tech Stack:** Laravel 13 / PHP 8.3 (PHPUnit, sqlite `:memory:`), React 19 + TypeScript + Vite, TanStack Query v5, PrimeReact 10.9.

## Global Constraints

- Backend roda **dentro do container**: `docker compose exec -T app php artisan …`. O PHP do host não tem mbstring.
- `frontend/src/shared/types/generated.ts` é **gerado**. Nunca editar à mão. Regenerar com `docker compose exec app php artisan typescript:transform`.
- **Não tocar, não commitar, não reverter** `frontend/src/features/identity/components/LoginPage.tsx` nem `frontend/src/features/identity/hooks/usePermissions.ts` — carregam edições não commitadas do dono. As alterações de whitespace ali ficam como estão.
- Auditoria só na camada de aplicação — nunca trigger de banco (ADR-08).
- Delete de documento = soft-delete do metadado. O binário **permanece** no bucket.
- Controllers deixam exceções subirem; o handler global formata RFC 7807. Nunca montar envelope de erro à mão (ADR-03).
- Gate de cada commit: `docker compose exec -T app php artisan test` verde **e** `pnpm build` + `pnpm lint` limpos em `frontend/`.
- Estilo PHP: `./vendor/bin/pint` antes de commitar backend.

---

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `frontend/src/shared/ui/AppDialog/index.ts` | Barrel do wrapper — reexporta o tipo que voltou a existir | 1 |
| `frontend/src/shared/ui/AppDialog/AppDialog.tsx` | Wrapper do Dialog | 1 |
| `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php` | Replace de documento com soft-delete auditado | 2 |
| `backend/app/Domains/Identity/Models/Redator.php` | Cascade de soft-delete auditado | 2 |
| `backend/app/Domains/Commercial/Models/Client.php` | Cascade de soft-delete auditado | 2 |
| `backend/app/Domains/Commercial/Actions/UpdateClientAction.php` | Replace de nested com soft-delete auditado | 2 |
| `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php` | Replace (não append) de documento tipado | 3 |
| `backend/app/Domains/Identity/Actions/CreateRedatorAction.php` | Usa a mesma action de documento | 3 |
| `backend/app/Domains/Identity/Http/Controllers/RedatorController.php` | `documents` malformado → 422, não 500 | 4 |
| `frontend/src/features/identity/hooks/useRedatoresPage.ts` | Guarda o id, deriva a entidade da lista | 5 |
| `frontend/src/features/commercial/hooks/useClientsPage.ts` | Idem | 5 |
| `frontend/src/features/commercial/components/ClientDialog.tsx` | Erros aninhados visíveis; endereços preservados | 6 |
| `frontend/src/features/identity/components/PersonasPage.tsx` | Aba Redactores como aba inicial | 7 |

---

### Task 1: Destravar o build (`AppDialogProps`)

O barrel `AppDialog/index.ts` reexporta `AppDialogProps`, mas uma edição não commitada removeu esse export do componente. `pnpm build` falha.

**Files:**
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.tsx`
- Modify: `frontend/src/shared/ui/AppDialog/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `AppDialog` (componente) e `AppDialogProps` (tipo) exportados do barrel `@shared/ui`.

- [ ] **Step 1: Reproduzir a falha**

```bash
cd frontend && pnpm build
```

Esperado: `src/shared/ui/AppDialog/index.ts(2,15): error TS2305: Module './AppDialog' has no exported member 'AppDialogProps'.`

- [ ] **Step 2: Decidir e aplicar**

Nada em `src/` consome `AppDialogProps` além do próprio barrel. Duas saídas válidas; escolhemos **restaurar o export**, porque todos os outros wrappers exportam seu `AppXProps` e o barrel raiz depende disso (`export * from './AppDialog'`).

`frontend/src/shared/ui/AppDialog/AppDialog.tsx` — restaurar a linha 3:

```tsx
import { Dialog } from 'primereact/dialog'
import type { DialogProps } from 'primereact/dialog'

export type { DialogProps as AppDialogProps } from 'primereact/dialog'

/** Wrapper do Dialog: maximizable por default, largo/alto. Usado para os
 * dialogs unificados de cadastro/visualização/edição. */
export function AppDialog(props: DialogProps) {
```

(O resto do arquivo fica intacto.)

- [ ] **Step 3: Verificar que o build passa**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: `tsc -b` sem erro, `vite build` conclui, eslint sem saída.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/ui/AppDialog/AppDialog.tsx
git commit -m "fix(shared/ui): restaura export de AppDialogProps (build quebrado)"
```

---

### Task 2: Soft-delete auditado (o requisito de rastreabilidade)

`$relation->delete()` no query builder vira um `UPDATE deleted_at` direto: não dispara `deleting`/`deleted`, logo o `owen-it/laravel-auditing` **não grava nada**. Provado: após um replace de CV, `audits` tem 0 linhas com `event='deleted'`. O requisito é rastrear o soft-delete pela tabela de auditoria.

A correção é iterar instâncias. Volume é irrelevante aqui (≤ 4 documentos por redator, poucos endereços por cliente, ~10 usuários internos).

**Files:**
- Test: `backend/tests/Feature/Cadastros/RedatorDocumentTest.php` (adicionar)
- Modify: `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php:25`
- Modify: `backend/app/Domains/Identity/Models/Redator.php:33`
- Modify: `backend/app/Domains/Commercial/Models/Client.php:39-40`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php:37,42`

**Interfaces:**
- Consumes: `StoreRedatorDocumentAction::execute(Redator, RedatorDocumentType, UploadedFile, ?CarbonInterface): File` (assinatura inalterada).
- Produces: toda remoção soft de `File`, `ClientAddress` e `ClientContact` passa a gerar uma linha em `audits` com `event = 'deleted'`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao fim de `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`, antes do `}` final da classe:

```php
    public function test_replace_de_documento_registra_auditoria_do_soft_delete(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv1.pdf', 100, 'application/pdf')],
        ])->json('id');

        $antigo = File::where('fileable_id', $id)->where('type', 'CV')->firstOrFail();

        $this->postJson("/api/redatores/{$id}/documents", [
            'type' => 'CV',
            'file' => UploadedFile::fake()->create('cv2.pdf', 100, 'application/pdf'),
        ])->assertCreated();

        // O binário fica no bucket; o rastro do soft-delete vive na auditoria.
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file',
            'auditable_id' => $antigo->id,
            'event' => 'deleted',
        ]);
    }

    public function test_delete_direto_de_documento_registra_auditoria(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf')],
        ])->json('id');
        $file = File::where('fileable_id', $id)->firstOrFail();

        $this->deleteJson("/api/redatores/{$id}/documents/{$file->id}")->assertNoContent();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file',
            'auditable_id' => $file->id,
            'event' => 'deleted',
        ]);
    }
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=RedatorDocumentTest
```

Esperado: `test_replace_de_documento_registra_auditoria_do_soft_delete` FALHA (`Failed asserting that a row in the table [audits] matches …`). `test_delete_direto_de_documento_registra_auditoria` já PASSA — ele documenta o caminho que funciona, e serve de contraste.

- [ ] **Step 3: Corrigir o replace**

`backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php` — substituir o corpo do `execute`:

```php
    public function execute(Redator $redator, RedatorDocumentType $type, UploadedFile $file, ?CarbonInterface $validUntil = null): File
    {
        return DB::transaction(function () use ($redator, $type, $file, $validUntil) {
            // Soft-delete por instância, não pelo query builder: `->delete()` no
            // builder emite um UPDATE direto, sem eventos de model — e sem
            // eventos o owen-it não grava a linha em `audits`. A rastreabilidade
            // do documento removido é requisito (o binário fica no bucket).
            $redator->documents()->where('type', $type->value)->get()
                ->each(fn (File $antigo) => $antigo->delete());

            return $this->uploads->execute($redator, $file, $type->value, $validUntil);
        });
    }
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=RedatorDocumentTest
```

Esperado: todos os testes da classe PASSAM.

- [ ] **Step 5: Aplicar a mesma correção nos outros três pontos**

`backend/app/Domains/Identity/Models/Redator.php` — dentro de `booted()`:

```php
    protected static function booted(): void
    {
        static::deleting(function (Redator $redator) {
            if (! $redator->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                $redator->documents()->get()->each(fn (File $f) => $f->delete());
                $redator->user?->delete();
            }
        });
    }
```

`backend/app/Domains/Commercial/Models/Client.php` — dentro de `booted()`:

```php
    protected static function booted(): void
    {
        static::deleting(function (Client $client) {
            if (! $client->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                $client->addresses()->get()->each(fn (ClientAddress $a) => $a->delete());
                $client->contacts()->get()->each(fn (ClientContact $c) => $c->delete());
                $client->user?->delete();
            }
        });
    }
```

`backend/app/Domains/Commercial/Actions/UpdateClientAction.php` — substituir as duas linhas de `->delete()`:

```php
            // Replace dos nested. Soft-delete por instância para a auditoria
            // registrar o que saiu (o builder emitiria UPDATE sem eventos).
            $client->addresses()->get()->each(fn (ClientAddress $a) => $a->delete());
            foreach ($data->addresses as $address) {
                $client->addresses()->create($address->toArray());
            }

            $client->contacts()->get()->each(fn (ClientContact $c) => $c->delete());
            foreach ($data->contacts as $contact) {
                $client->contacts()->create($contact->toArray());
            }
```

E adicionar no topo do arquivo:

```php
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Models\ClientContact;
```

`Redator.php` já importa `File`; conferir. `Client.php` precisa importar `ClientAddress` e `ClientContact` — verificar se já estão (estão no mesmo namespace, então não é necessário `use`).

- [ ] **Step 6: Teste de regressão do cascade**

Acrescentar a `backend/tests/Feature/Cadastros/ClientCrudTest.php`, antes do `}` final:

```php
    public function test_delete_de_cliente_audita_o_soft_delete_dos_nested(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', [
            'name' => 'ACME SA', 'rut' => '13.456.789-9', 'email' => 'acme@lotus.cl',
            'legal_name' => 'ACME SA', 'type' => 'client',
            'addresses' => [['commune' => 'Providencia', 'is_primary' => true]],
            'contacts' => [['name' => 'Ana', 'is_primary' => true]],
        ])->json('id');

        $address = \App\Domains\Commercial\Models\ClientAddress::where('client_id', $id)->firstOrFail();

        $this->deleteJson("/api/clients/{$id}")->assertNoContent();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'client_address',
            'auditable_id' => $address->id,
            'event' => 'deleted',
        ]);
    }
```

- [ ] **Step 7: Suíte inteira + estilo**

```bash
docker compose exec -T app ./vendor/bin/pint
docker compose exec -T app php artisan test
```

Esperado: todos verdes (contagem ≥ 68 testes).

- [ ] **Step 8: Commit**

```bash
git add backend/app backend/tests
git commit -m "fix(audit): soft-delete por instancia para gerar linha em audits"
```

---

### Task 3: `UpdateRedatorAction` substitui o documento, não duplica

Provado: criar redator com `documents[CV]` e depois `PUT` com `documents[CV]` deixa **2 arquivos ativos** com `type='CV'`. O dialog faz `existing.find(d => d.type === 'CV')` e pega o primeiro — o CV **antigo**. Documento de idoneidade tem peso legal.

`StoreRedatorDocumentAction` já implementa a semântica correta (replace). A correção é fazer as duas Actions delegarem a ele, em vez de existirem duas regras de "o que acontece quando chega um documento".

**Files:**
- Test: `backend/tests/Feature/Cadastros/RedatorCrudTest.php` (adicionar)
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php`
- Modify: `backend/app/Domains/Identity/Actions/CreateRedatorAction.php`

**Interfaces:**
- Consumes: `StoreRedatorDocumentAction::execute(Redator, RedatorDocumentType, UploadedFile, ?CarbonInterface): File` (da Task 2).
- Produces: `CreateRedatorAction::execute(RedatorData, array<string,UploadedFile>): Redator` e `UpdateRedatorAction::execute(Redator, RedatorData, array<string,UploadedFile>): Redator` — assinaturas inalteradas, semântica de documento agora é replace nas duas.

**Trade-off registrado:** no `create` o redator é novo, então o `DELETE` do replace não encontra nada — uma query desperdiçada por documento. Aceito: 4 documentos no máximo, e o ganho é ter **um único lugar** que define "chegou documento do tipo X".

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `backend/tests/Feature/Cadastros/RedatorCrudTest.php`, antes do `}` final:

```php
    public function test_update_multipart_substitui_documento_do_mesmo_tipo(): void
    {
        \Illuminate\Support\Facades\Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => \Illuminate\Http\UploadedFile::fake()->create('cv1.pdf', 10, 'application/pdf')],
        ])->json('id');

        // multipart com _method=PUT (form-data não suporta PUT nativo)
        $this->post("/api/redatores/{$id}", [
            '_method' => 'PUT',
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => \Illuminate\Http\UploadedFile::fake()->create('cv2.pdf', 10, 'application/pdf')],
        ])->assertOk();

        $ativos = \App\Shared\Files\Models\File::where('fileable_id', $id)->where('type', 'CV')->get();

        $this->assertCount(1, $ativos, 'O documento do mesmo tipo deve ser substituído, não duplicado.');
        $this->assertSame('cv2.pdf', $ativos->first()->original_name);
    }
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=test_update_multipart_substitui_documento_do_mesmo_tipo
```

Esperado: FALHA com `Failed asserting that actual size 2 matches expected size 1.`

- [ ] **Step 3: Fazer `UpdateRedatorAction` delegar**

`backend/app/Domains/Identity/Actions/UpdateRedatorAction.php` — arquivo completo:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Atualiza usuário-redator + habilitação de cursos (sync) + documentos.
 * Documento chegando pelo multipart SUBSTITUI o do mesmo tipo (soft-delete do
 * anterior, binário fica no bucket) — a regra vive em StoreRedatorDocumentAction,
 * fonte única compartilhada com o create e com a rota aninhada.
 *
 * @param  array<string,UploadedFile>  $documents
 */
class UpdateRedatorAction
{
    public function __construct(
        private UserProvisioner $users,
        private StoreRedatorDocumentAction $documents,
    ) {}

    public function execute(Redator $redator, RedatorData $data, array $documents = []): Redator
    {
        $rut = $this->users->ensureRutAvailable($data->rut, $redator->user_id);

        return DB::transaction(function () use ($redator, $data, $rut, $documents) {
            $redator->user->update([
                'name' => $data->name,
                'rut' => $rut,
                'email' => $data->email,
                'phone' => $data->phone instanceof Optional ? null : $data->phone,
            ]);

            if (! $data->course_ids instanceof Optional) {
                $redator->courses()->sync($data->course_ids);
            }

            foreach ($documents as $type => $document) {
                $this->documents->execute($redator, RedatorDocumentType::from($type), $document);
            }

            return $redator->fresh()->load(['user', 'documents', 'courses']);
        });
    }
}
```

- [ ] **Step 4: Fazer `CreateRedatorAction` usar a mesma action**

`backend/app/Domains/Identity/Actions/CreateRedatorAction.php` — trocar a dependência e o loop:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cria o redator (usuário-redator + redator + habilitação de cursos + documentos)
 * numa transação. O provisionamento do User é delegado ao UserProvisioner, e o
 * upload de documento ao StoreRedatorDocumentAction — mesma regra de replace do
 * update e da rota aninhada. is_active=false até o fluxo de ativação.
 *
 * @param  array<string,UploadedFile>  $documents
 */
class CreateRedatorAction
{
    public function __construct(
        private UserProvisioner $users,
        private StoreRedatorDocumentAction $documents,
    ) {}

    public function execute(RedatorData $data, array $documents = []): Redator
    {
        return DB::transaction(function () use ($data, $documents) {
            $user = $this->users->provision(
                type: 'redator',
                name: $data->name,
                rut: $data->rut,
                email: $data->email,
                phone: $data->phone instanceof Optional ? null : $data->phone,
            );

            $redator = $user->redator()->create([]);

            if (! $data->course_ids instanceof Optional) {
                $redator->courses()->sync($data->course_ids);
            }

            foreach ($documents as $type => $document) {
                $this->documents->execute($redator, RedatorDocumentType::from($type), $document);
            }

            return $redator->load(['user', 'documents', 'courses']);
        });
    }
}
```

- [ ] **Step 5: Rodar a suíte inteira**

```bash
docker compose exec -T app ./vendor/bin/pint
docker compose exec -T app php artisan test
```

Esperado: tudo verde. `UploadFileAction` deixou de ser injetada nas duas Actions — se algum teste construía essas Actions à mão, ele quebra e precisa passar `StoreRedatorDocumentAction`. Verifique `RedatorCrudTest` e `UploadFileActionTest`.

- [ ] **Step 6: Commit**

```bash
git add backend/app backend/tests
git commit -m "fix(identity): documento no update substitui em vez de duplicar"
```

---

### Task 4: `documents` malformado devolve 422, não 500

`documentsFromRequest` faz `array_keys($request->file('documents', []))`. Se o cliente mandar `documents` como arquivo escalar em vez de `documents[CV]`, `$request->file()` devolve um `UploadedFile` e `array_keys()` lança `TypeError`. Provado: **HTTP 500**.

De quebra, o `abort(422, "…")` atual devolve só `detail`, sem `errors.documents` — o frontend não consegue ligar a mensagem ao campo. Trocamos por `ValidationException`, que o handler global já formata com `errors`.

**Files:**
- Test: `backend/tests/Feature/Cadastros/RedatorDocumentTest.php` (adicionar)
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php:58-68`

**Interfaces:**
- Consumes: nada.
- Produces: `POST/PUT /api/redatores` com `documents` inválido → 422 com `errors.documents[0]`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`:

```php
    public function test_documents_escalar_devolve_422_com_erro_de_campo(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->post('/api/redatores', [
            'name' => 'Ana', 'rut' => '12.345.678-5', 'email' => 'ana@lotus.cl',
            'documents' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.documents.0', 'O campo documents deve ser um mapa de tipo => arquivo.');
    }

    public function test_tipo_de_documento_invalido_devolve_422_com_erro_de_campo(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->post('/api/redatores', [
            'name' => 'Ana', 'rut' => '12.345.678-5', 'email' => 'ana@lotus.cl',
            'documents' => ['DIPLOMA' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')],
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.documents.0', 'Tipo de documento inválido: DIPLOMA');
    }
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=RedatorDocumentTest
```

Esperado: o primeiro FALHA com status 500; o segundo FALHA porque hoje não há `errors.documents` (só `detail`).

- [ ] **Step 3: Corrigir o controller**

`backend/app/Domains/Identity/Http/Controllers/RedatorController.php` — substituir `documentsFromRequest` e ajustar imports:

```php
    /**
     * Lê os documentos tipados do multipart: `documents[<TIPO>] = arquivo`.
     * Entrada malformada é erro do cliente (422 com `errors.documents`), não 500 —
     * `$request->file('documents')` devolve um UploadedFile se o campo vier escalar.
     *
     * @return array<string,\Illuminate\Http\UploadedFile>
     */
    private function documentsFromRequest(Request $request): array
    {
        $files = $request->file('documents', []);

        if (! is_array($files)) {
            throw ValidationException::withMessages([
                'documents' => 'O campo documents deve ser um mapa de tipo => arquivo.',
            ]);
        }

        foreach (array_keys($files) as $type) {
            if (RedatorDocumentType::tryFrom((string) $type) === null) {
                throw ValidationException::withMessages([
                    'documents' => "Tipo de documento inválido: {$type}",
                ]);
            }
        }

        return $files;
    }
```

Adicionar o import no topo:

```php
use Illuminate\Validation\ValidationException;
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=RedatorDocumentTest
docker compose exec -T app php artisan test
```

Esperado: tudo verde.

- [ ] **Step 5: Commit**

```bash
docker compose exec -T app ./vendor/bin/pint
git add backend/app backend/tests
git commit -m "fix(identity): documents malformado vira 422 com erro de campo"
```

---

### Task 5: Dialog reflete o que a API devolveu (upload/remoção de documento)

`useRedatoresPage.openView(redator)` guarda **o objeto** num `useState`. Depois de um upload, `useUploadDocument` invalida `redatoresApi.keys.all` e a lista é refetchada — mas `dialog.redator` continua apontando para o objeto antigo, e `useRedatorForm` só reseta quando a identidade da prop muda. Resultado: subir um CV retorna 201 e a linha continua "No cargado".

Correção: guardar o **id** e derivar a entidade da lista viva. O mesmo defeito latente existe em `useClientsPage`.

**Cuidado — esta correção sozinha introduz uma regressão.** Derivada da lista, a entidade muda de *identidade de objeto* a cada refetch. `useRedatorForm` reseta o form quando `redator !== prev.redator`, então subir um documento apagaria o nome que o usuário acabou de digitar. Duas mudanças acompanham a correção:

1. O reset do form passa a comparar `entity?.id` e `mode`, não a identidade do objeto.
2. Os **documentos saem do estado do form**. Eles não são campo de formulário — são geridos por mutações próprias contra o servidor. O dialog passa a lê-los da prop viva (`redator.documents`), e o form guarda só os campos editáveis (`name`, `rut`, `email`, `phone`, `course_ids`) mais os `stagedDocs` do modo create.

**Files:**
- Modify: `frontend/src/features/identity/hooks/useRedatoresPage.ts`
- Modify: `frontend/src/features/identity/hooks/useRedatorForm.ts`
- Modify: `frontend/src/features/identity/components/RedatorDialog.tsx`
- Modify: `frontend/src/features/commercial/hooks/useClientsPage.ts`
- Modify: `frontend/src/features/commercial/hooks/useClientForm.ts`

**Interfaces:**
- Consumes: `redatoresApi.useList()` / `clientsApi.useList()` de `createCrudResource`.
- Produces: ambos os hooks de página expõem `{ <items>, loading, dialog: { mode, <entity> } | null, openCreate, openView, startEdit, close }`, com a entidade derivada de `items` a cada render. Os nomes de campo (`redatores`/`redator`, `clients`/`client`) são preservados para não tocar nas páginas.

- [ ] **Step 1: Reescrever `useRedatoresPage`**

`frontend/src/features/identity/hooks/useRedatoresPage.ts`:

```ts
import { useState } from 'react'
import type { RedatorData } from '@shared/types/generated'
import { redatoresApi } from '../api/redatoresApi'
import type { RedatorDialogMode } from './useRedatorForm'

export function useRedatoresPage() {
  const query = redatoresApi.useList()
  const [dialog, setDialog] = useState<{ mode: RedatorDialogMode; id: number | null } | null>(null)

  const redatores = query.data ?? []

  // Deriva a entidade aberta da lista viva em vez de congelar o objeto no
  // estado: subir ou remover um documento invalida a query, a lista é
  // refetchada, e o dialog passa a ver a versão nova. Guardar o objeto fazia o
  // dialog ficar com um snapshot obsoleto até ser fechado e reaberto.
  const selected = dialog?.id != null ? (redatores.find((r) => r.id === dialog.id) ?? null) : null

  return {
    redatores,
    loading: query.isLoading,
    dialog: dialog ? { mode: dialog.mode, redator: selected } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (redator: RedatorData) => setDialog({ mode: 'view', id: redator.id ?? null }),
    /** view -> edit, preservando o redator aberto. Nunca entra em edit sem redator. */
    startEdit: () => setDialog((d) => (d && d.id != null ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
```

- [ ] **Step 2: Reescrever `useClientsPage` do mesmo jeito**

`frontend/src/features/commercial/hooks/useClientsPage.ts`:

```ts
import { useState } from 'react'
import type { ClientData } from '@shared/types/generated'
import { clientsApi } from '../api/clientsApi'
import type { ClientDialogMode } from './useClientForm'

export function useClientsPage() {
  const query = clientsApi.useList()
  const [dialog, setDialog] = useState<{ mode: ClientDialogMode; id: number | null } | null>(null)

  const clients = query.data ?? []

  // Ver nota em useRedatoresPage: derivar da lista, não congelar o objeto.
  const selected = dialog?.id != null ? (clients.find((c) => c.id === dialog.id) ?? null) : null

  return {
    clients,
    loading: query.isLoading,
    dialog: dialog ? { mode: dialog.mode, client: selected } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (client: ClientData) => setDialog({ mode: 'view', id: client.id ?? null }),
    /** view -> edit, preservando o cliente aberto. Nunca entra em edit sem cliente. */
    startEdit: () => setDialog((d) => (d && d.id != null ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
```

- [ ] **Step 3: Resetar o form por `id`, não por identidade de objeto**

`frontend/src/features/identity/hooks/useRedatorForm.ts` — trocar o bloco de reset (linhas ~17-30) e o `EMPTY`:

```ts
const EMPTY: RedatorFormFields = {
  id: undefined, name: '', rut: '', email: '', phone: null, course_ids: [],
}

/** Só os campos que o formulário edita. `documents` NÃO entra aqui: eles são
 * geridos por mutações próprias contra o servidor e lidos da entidade viva. */
export type RedatorFormFields = Pick<RedatorData, 'id' | 'name' | 'rut' | 'email' | 'phone' | 'course_ids'>

function toFields(r: RedatorData): RedatorFormFields {
  const { id, name, rut, email, phone, course_ids } = r
  return structuredClone({ id, name, rut, email, phone, course_ids })
}

export function useRedatorForm(redator: RedatorData | null, mode: RedatorDialogMode, onDone: () => void) {
  const [form, setForm] = useState<RedatorFormFields>(() => (redator ? toFields(redator) : structuredClone(EMPTY)))
  const [stagedDocs, setStagedDocs] = useState<Record<string, File>>({})
  const [prev, setPrev] = useState({ id: redator?.id ?? null, mode })

  const create = redatoresApi.useCreate()
  const update = redatoresApi.useUpdate()

  // Reseta quando muda a ENTIDADE (id) ou o modo — não quando muda a identidade
  // do objeto. A entidade é derivada da lista, então um refetch (disparado por
  // upload/remoção de documento) produz um objeto novo com o mesmo id; resetar
  // ali apagaria o que o usuário digitou e ainda não salvou.
  const currentId = redator?.id ?? null
  if (currentId !== prev.id || mode !== prev.mode) {
    setPrev({ id: currentId, mode })
    setForm(redator ? toFields(redator) : structuredClone(EMPTY))
    setStagedDocs({})
  }
```

O restante do hook (`readOnly`, `set`, `toggleCourse`, `stageDoc`, `unstageDoc`, `submit`, erros) fica igual, exceto que `submit` no modo `edit` continua enviando `{ name, rut, email, phone, course_ids }` — já era o caso.

- [ ] **Step 4: Ler documentos da entidade viva, não do form**

`frontend/src/features/identity/components/RedatorDialog.tsx` — trocar as duas leituras:

```tsx
  const title = mode === 'create' ? 'Nuevo redactor' : form.name
  // Documentos vêm da entidade viva (derivada da lista), não do estado do form:
  // são geridos por mutações próprias e devem refletir o servidor na hora.
  const existing = redator?.documents ?? []
  const courseIds = form.course_ids
```

E a tag de idoneidade, que hoje lê `form`:

```tsx
      {mode !== 'create' && redator && (
        <div className="mb-4">
          <AppTag
            value={`Idoneidad: ${idoneidade(redator)}`}
            severity={idoneidade(redator) === 'idoneo' ? 'success' : idoneidade(redator) === 'por_vencer' ? 'warning' : 'danger'}
          />
        </div>
      )}
```

- [ ] **Step 5: Mesma mudança de reset em `useClientForm`**

`frontend/src/features/commercial/hooks/useClientForm.ts` — trocar o bloco de reset:

```ts
  const [prev, setPrev] = useState({ id: client?.id ?? null, mode })

  // Ver nota em useRedatorForm: comparar o id, não a identidade do objeto.
  const currentId = client?.id ?? null
  if (currentId !== prev.id || mode !== prev.mode) {
    setPrev({ id: currentId, mode })
    setForm(client ? structuredClone(client) : structuredClone(EMPTY))
  }
```

(`ClientData` não tem sub-recurso gerido por mutação separada, então o form continua carregando `addresses`/`contacts` inteiros.)

- [ ] **Step 6: Verificar que as páginas não precisam mudar**

`PersonasPage.tsx` já lê `page.dialog.redator` e `CommercialPage.tsx` já lê `page.dialog.client` — os nomes de campo foram preservados de propósito. Confirmar:

```bash
cd frontend && grep -n "dialog\." src/features/identity/components/PersonasPage.tsx src/features/commercial/components/CommercialPage.tsx
```

Esperado: `page.dialog.mode`, `page.dialog.redator`, `page.dialog.client`. Nenhuma edição necessária.

- [ ] **Step 7: Build + lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: limpos.

- [ ] **Step 8: Verificação manual no navegador (não há test runner de front)**

Backend rodando (`docker compose up -d`), front em `pnpm dev`.

1. Abrir `http://localhost:5173/personas`, aba **Redactores**, clicar no olho de um redator.
2. Clicar **Editar datos**.
3. Digitar algo no campo **Nombre completo** (sem salvar).
4. Subir um PDF na linha **Currículum (CV)**.
5. **Esperado:** a linha do CV passa de "No cargado" para o nome do arquivo, ganha tag de status e botão de download — **e o que você digitou no Nombre continua lá**.
6. Clicar na lixeira do CV. **Esperado:** a linha volta a "No cargado" imediatamente; o Nombre digitado continua intacto.
7. Fechar sem salvar, reabrir. **Esperado:** o Nombre voltou ao valor do servidor.

Antes desta task, os passos 5 e 6 não atualizavam nada. O passo 3 é a rede contra a regressão que a derivação da lista poderia causar.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/identity/hooks/useRedatoresPage.ts \
        frontend/src/features/identity/hooks/useRedatorForm.ts \
        frontend/src/features/identity/components/RedatorDialog.tsx \
        frontend/src/features/commercial/hooks/useClientsPage.ts \
        frontend/src/features/commercial/hooks/useClientForm.ts
git commit -m "fix(frontend): dialog deriva a entidade da lista (reflete upload/remocao)"
```

---

### Task 6: `ClientDialog` — erros aninhados visíveis e endereços preservados

Dois defeitos no mesmo arquivo:

1. `useClientForm.EMPTY` semeia um contato `{name: ''}`. `ClientData::validate` rejeita com `contacts.0.name`. O dialog só renderiza erros de `legal_name`, `name`, `rut` e `email`, e `generalError` é `null` porque `errors` existe. O usuário clica "Registrar cliente" e **nada acontece**.
2. `setAddr` reconstrói `addresses` como array de **um** elemento. `UpdateClientAction` apaga e recria os nested. Cliente com 2 endereços perde o segundo ao editar a comuna.

**Files:**
- Modify: `frontend/src/features/commercial/components/ClientDialog.tsx`

**Interfaces:**
- Consumes: `useClientForm(client, mode, onDone)` → `{ form, set, setForm, readOnly, submit, pending, fieldErrors, generalError }` (inalterado).
- Produces: nada novo.

- [ ] **Step 1: Preservar os endereços além do primeiro**

Em `ClientDialog.tsx`, substituir `setAddr` (linha ~38):

```tsx
  // Cliente criado fora da UI (seed/API) pode não ter endereço nenhum — cai
  // para um endereço vazio em vez de quebrar ao ler `addr.region`.
  const addr = form.addresses[0] ?? EMPTY_ADDRESS

  // Só o primeiro endereço é editável nesta tela; os demais são preservados.
  // (Antes o array era reconstruído com um único elemento e o update do backend,
  // que apaga-e-recria os nested, descartava os outros endereços em silêncio.)
  const setAddr = (patch: Partial<ClientAddressData>) =>
    setForm((f) => {
      const rest = f.addresses.slice(1)
      const first = { ...(f.addresses[0] ?? EMPTY_ADDRESS), ...patch }
      return { ...f, addresses: [first, ...rest] }
    })
```

- [ ] **Step 2: Renderizar os erros dos contatos**

Substituir o bloco de contatos (linhas ~99-114):

```tsx
        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Personas de contacto</h3>
        {form.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <NestedField error={fieldErrors?.[`contacts.${i}.name`]?.[0]}>
              <AppInputText placeholder="Nombre" value={c.name} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { name: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.email`]?.[0]}>
              <AppInputText placeholder="Email" value={c.email ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { email: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.phone`]?.[0]}>
              <AppInputText placeholder="Teléfono" value={c.phone ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { phone: e.target.value })} />
            </NestedField>
          </div>
        ))}
```

E adicionar, junto do `Field` no fim do arquivo:

```tsx
/** Campo aninhado (contatos/endereços): sem label própria, mas com o erro do
 * backend visível. Sem isso, um 422 em `contacts.0.name` deixa o botão de
 * salvar aparentemente inerte. */
function NestedField({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </div>
  )
}
```

- [ ] **Step 3: Rede de segurança — erro não mapeado nunca some**

Ainda em `ClientDialog.tsx`, logo abaixo do bloco `generalError`, acrescentar:

```tsx
      {/* Um 422 cujo campo não tem input nesta tela ficaria invisível e o botão
          pareceria inerte. Lista o que sobrou, para nunca falhar em silêncio. */}
      {fieldErrors && (
        <UnmappedErrors
          errors={fieldErrors}
          mapped={['legal_name', 'name', 'rut', 'email', 'type', 'business_activity']}
        />
      )}
```

E o componente, no fim do arquivo:

```tsx
function UnmappedErrors({ errors, mapped }: { errors: Record<string, string[]>; mapped: string[] }) {
  const leftover = Object.entries(errors).filter(
    ([key]) => !mapped.includes(key) && !key.startsWith('contacts.') && !key.startsWith('addresses.'),
  )
  if (leftover.length === 0) return null
  return (
    <ul className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
      {leftover.map(([key, msgs]) => (
        <li key={key}>{msgs[0]}</li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Build + lint**

```bash
cd frontend && pnpm build && pnpm lint
```

- [ ] **Step 5: Verificação manual**

1. `http://localhost:5173/comercial` → **Nuevo cliente**.
2. Preencher Razón social, RUT válido (`13.456.789-9`) e Email; deixar o **Nombre** do contato vazio. Clicar **Registrar cliente**.
3. **Esperado:** mensagem de erro sob o campo Nombre do contato. Antes: nada acontecia.
4. Preencher o nome do contato e salvar. **Esperado:** 201, dialog fecha, cliente aparece na tabela.
5. Criar um segundo endereço via API (`POST /api/clients/{id}/addresses`), abrir o cliente, editar a Comuna, salvar, e conferir com `GET /api/clients/{id}` que **os dois endereços continuam lá**.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/commercial/components/ClientDialog.tsx
git commit -m "fix(commercial): erros aninhados visiveis e enderecos preservados"
```

---

### Task 7: `/personas` abre na aba que tem conteúdo

`AppTabView` é pass-through do `TabView` do PrimeReact, cujo `activeIndex` default é 0. Em `PersonasPage` a aba 0 é **Alumnos**, um placeholder vazio. O usuário navega para `/personas` e não vê a lista de redatores — o critério de aceite da task 4.2.1 do Notion é "lista de redatores carrega".

`CommercialPage` já tem a ordem certa (Clientes primeiro).

**Files:**
- Modify: `frontend/src/features/identity/components/PersonasPage.tsx`

**Interfaces:**
- Consumes: `AppTabView`, `AppTabPanel` de `@shared/ui`.
- Produces: nada.

- [ ] **Step 1: Inverter a ordem das abas**

Em `PersonasPage.tsx`, trocar os dois `AppTabPanel` de lugar, com **Redactores** primeiro:

```tsx
      <AppTabView>
        <AppTabPanel header="Redactores">
          <RedatoresTable redatores={page.redatores} loading={page.loading} onView={page.openView} />
        </AppTabPanel>
        <AppTabPanel header="Alumnos">
          <p className="p-4 text-sm text-slate-500">Módulo de alumnos — próxima sprint.</p>
        </AppTabPanel>
      </AppTabView>
```

Justificativa da ordem (e não de um `activeIndex={1}` fixo): quando Alumnos existir de verdade, a primeira aba continua sendo a que o módulo entrega. Um índice fixo teria que ser lembrado e trocado.

- [ ] **Step 2: Build + verificação manual**

```bash
cd frontend && pnpm build && pnpm lint
```

Abrir `http://localhost:5173/personas`. **Esperado:** a tabela de redatores aparece sem nenhum clique.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/identity/components/PersonasPage.tsx
git commit -m "fix(identity): aba Redactores como aba inicial de /personas"
```

---

### Task 8: Fechar a rastreabilidade e limpar a árvore

Duas pendências deixadas pelo review, ambas de higiene.

**Files:**
- Modify: `frontend/src/shared/types/generated.ts` (regenerar, não editar)
- Delete: `frontend/src/shared/ui/AppTable/` (pasta vazia)

- [ ] **Step 1: Regenerar `generated.ts`**

A working tree tem linhas em branco inseridas à mão nesse arquivo. CLAUDE.md §3.3: *"`shared/types/generated.ts` NÃO se edita à mão."*

```bash
docker compose exec -T app php artisan typescript:transform
cd frontend && git diff --stat src/shared/types/generated.ts
```

Esperado: as linhas em branco somem; o conteúdo volta a ser exatamente o que o transformer emite.

- [ ] **Step 2: Apagar a pasta órfã**

```bash
cd /home/jvbat/projetos/lotus && rmdir frontend/src/shared/ui/AppTable
```

(`AppTable/` está vazia — sobra do planejamento em `docs/estrutura-monolito.md`. O wrapper real chama-se `AppDataTable`.)

- [ ] **Step 3: Gate final**

```bash
docker compose exec -T app php artisan test
cd frontend && pnpm build && pnpm lint
```

Esperado: backend verde, front limpo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/types/generated.ts
git commit -m "chore(frontend): regenera generated.ts e remove pasta AppTable vazia"
```

---

## Definition of Done

- [ ] `pnpm build` e `pnpm lint` limpos.
- [ ] `docker compose exec -T app php artisan test` verde, com **pelo menos 6 testes novos** (auditoria do replace, auditoria do delete direto, auditoria do cascade de cliente, replace no update multipart, `documents` escalar → 422, tipo inválido → 422).
- [ ] No navegador: subir e remover documento de redator reflete no dialog **sem fechá-lo**.
- [ ] No navegador: criar cliente com contato em branco mostra o erro sob o campo.
- [ ] No navegador: `/personas` abre na aba Redactores com a tabela carregada.
- [ ] `git status` limpo, exceto as edições do dono em `LoginPage.tsx` e `usePermissions.ts`.

## Follow-ups registrados (fora deste plano)

- `download_url` é uma URL pré-assinada de 10 min embutida no DTO e cacheada pelo TanStack Query — expira com a tela aberta. Correção estrutural: rota de redirect que assina no clique. Fica para o plano de fundação.
- `UploadFileAction::temporaryUrl` lança no driver `local`; `GET /api/redatores` retornaria 500 se `FILESYSTEM_DISK=local`.
- Rotas `PUT/DELETE addresses/{address}`, `contacts/{contact}`, `templates/{template}` não checam posse do pai — contrato divergente do que foi decidido para documentos de redator. Hoje são inalcançáveis pela UI.
- `RedatorDocumentController` não implementa `HasMiddleware` como os controllers irmãos.
- `docs/der-fisico.md` está desatualizado (schema foi entregue em inglês, RUT do cliente vive em `users.rut`).
- Tabela de redator não tem a coluna `Documentos` prevista na spec §5.3.
