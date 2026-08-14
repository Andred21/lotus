# Meu Perfil — backend self-service · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar ao usuário autenticado um contrato próprio para ler e editar o próprio perfil — nome, telefone, foto, senha e, sendo Redator, a própria documentação profissional — sem nenhuma rota administrativa envolvida.

**Architecture:** tudo dentro de `App\Domains\Identity`. Rotas `/api/profile` sob `auth:sanctum` e **nunca** sob `permission:identity.user.update`; a posse é estrutural, porque nenhuma rota carrega `{id}` e toda ação opera sobre `$request->user()`. DTOs `spatie/laravel-data` novos para a projeção de perfil; `SessionUserData`, `/api/me` e `RedatorDocumentData` ficam intocados. Serviços que já existem (`UserPhotoService`, `StoreRedatorDocumentAction`) são reusados, não reimplementados.

**Tech Stack:** Laravel 13 · PHP 8.3 · spatie/laravel-data 4.23 · spatie/laravel-permission · owen-it/laravel-auditing · Sanctum SPA (cookie de sessão) · sqlite `:memory:` nos testes.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-14-meu-perfil-backend-self-service-design.md`. As decisões D1–D9 são vinculantes.
- **Backend roda no container:** `docker compose exec -T app php artisan …`. O host WSL não tem mbstring.
- **Pint roda no host, de dentro de `backend/`, SEMPRE com argumento:** `./vendor/bin/pint <arquivos>`. Nunca sem argumento.
- **`frontend/src/shared/types/generated.ts` não se edita à mão** (lei §5.3). Errou o tipo, corrige o DTO e regenera.
- **Nenhum `abort(422)` e nenhum erro montado à mão** (lei §5.4). Validação sobe por `ValidationException`; 403/404 por `abort()`, que o `ProblemDetails` converte em RFC 7807 — é o que `UserPhotoController` já faz.
- **Nenhuma aresta nova entre domínios.** `backend/tests/Feature/Shared/DomainDependencyTest.php` **não é tocado por este plano** (D1). Se alguma task parecer precisar de `App\Domains\Operation\…`, PARE: é sinal de que o corte do João foi desfeito por engano.
- **Nenhuma permissão nova.** `PermissionCatalog` não muda (D7).
- **Sem `Hash::make`:** o cast `'password' => 'hashed'` do `User` faz o hash.
- **`postJson()` com `UploadedFile` funciona e é o idioma do repo** (`tests/Feature/Cadastros/RedatorDocumentTest.php:85`): o cliente de teste extrai os arquivos do payload antes de serializar. Não troque por `post()` — sem `Accept: application/json` a validação pode não sair como 422 JSON.
- **PHPUnit 12:** `@dataProvider` foi REMOVIDO. Use o atributo `#[DataProvider]`, como `EnrollmentResultTest` já faz.
- **Commits pequenos, um por task.** Mensagem em português, sem acentos no corpo do commit (convenção do repo).

---

### Task 1: As duas regras viram método de enum

Antes de qualquer DTO. São as duas únicas regras de negócio do bloco, e aqui elas se testam sem banco, sem HTTP e sem container.

**Files:**
- Create: `backend/app/Domains/Identity/Enums/DocumentValidityStatus.php`
- Modify: `backend/app/Domains/Identity/Enums/RedatorDocumentType.php`
- Test: `backend/tests/Unit/Identity/DocumentValidityStatusTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: `DocumentValidityStatus::for(?CarbonInterface $validUntil, bool $presente): self`, `DocumentValidityStatus::DIAS_AVISO` (int, 30), `RedatorDocumentType::isSelfService(): bool`, `RedatorDocumentType::selfServiceValues(): array<int, string>`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Unit/Identity/DocumentValidityStatusTest.php`. Ele estende o `PHPUnit\Framework\TestCase` puro, sem Laravel — é o padrão de `tests/Unit/Shared/RutTest.php`, e o enum não depende de container.

```php
<?php

namespace Tests\Unit\Identity;

use App\Domains\Identity\Enums\DocumentValidityStatus;
use App\Domains\Identity\Enums\RedatorDocumentType;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class DocumentValidityStatusTest extends TestCase
{
    public function test_documento_ausente_vence_qualquer_data(): void
    {
        $status = DocumentValidityStatus::for(CarbonImmutable::today()->addYear(), presente: false);

        $this->assertSame(DocumentValidityStatus::Ausente, $status);
    }

    /** `valid_until` nulo vale sempre — mesma semântica do RedatorIdoneidadeService. */
    public function test_sem_data_de_validade_e_vigente(): void
    {
        $status = DocumentValidityStatus::for(null, presente: true);

        $this->assertSame(DocumentValidityStatus::Vigente, $status);
    }

    public function test_data_passada_e_vencido(): void
    {
        $status = DocumentValidityStatus::for(CarbonImmutable::today()->subDay(), presente: true);

        $this->assertSame(DocumentValidityStatus::Vencido, $status);
    }

    /** Vence hoje ainda vale: o gate de idoneidade aceita `valid_until >= hoje`. */
    public function test_vence_hoje_e_vence_em_breve_nao_vencido(): void
    {
        $status = DocumentValidityStatus::for(CarbonImmutable::today(), presente: true);

        $this->assertSame(DocumentValidityStatus::VenceEmBreve, $status);
    }

    public function test_ultimo_dia_da_janela_ainda_e_vence_em_breve(): void
    {
        $limite = CarbonImmutable::today()->addDays(DocumentValidityStatus::DIAS_AVISO);

        $this->assertSame(DocumentValidityStatus::VenceEmBreve, DocumentValidityStatus::for($limite, presente: true));
    }

    public function test_um_dia_depois_da_janela_e_vigente(): void
    {
        $fora = CarbonImmutable::today()->addDays(DocumentValidityStatus::DIAS_AVISO + 1);

        $this->assertSame(DocumentValidityStatus::Vigente, DocumentValidityStatus::for($fora, presente: true));
    }

    /**
     * A D5 da spec vira propriedade do tipo. O REUF decide habilitação de
     * turma pela RN-09 lendo `valid_until`; self-service nele deixaria o
     * Redator declarar a própria validade e se auto-habilitar.
     */
    public function test_apenas_o_reuf_fica_fora_do_self_service(): void
    {
        $this->assertFalse(RedatorDocumentType::REUF->isSelfService());
        $this->assertTrue(RedatorDocumentType::CV->isSelfService());
        $this->assertTrue(RedatorDocumentType::TITULO->isSelfService());
        $this->assertTrue(RedatorDocumentType::POSTGRADO->isSelfService());

        $this->assertSame(['CV', 'TITULO', 'POSTGRADO'], RedatorDocumentType::selfServiceValues());
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=DocumentValidityStatusTest
```

Esperado: FAIL com `Class "App\Domains\Identity\Enums\DocumentValidityStatus" not found`.

- [ ] **Step 3: Criar o enum**

`backend/app/Domains/Identity/Enums/DocumentValidityStatus.php`:

```php
<?php

namespace App\Domains\Identity\Enums;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * Estado de validade de um documento profissional do redator, calculado no
 * BACKEND (spec D6). O Drive §5 é explícito: "A regra que decide
 * validade/idoneidade permanece no backend/domínio dono. O React não calcula
 * compliance a partir de datas cruas quando o contrato puder fornecer o estado
 * semântico."
 *
 * `RedatorDocumentData` (contrato administrativo) segue derivando no front e
 * NÃO muda aqui — reescrevê-lo é escopo de outro bloco.
 */
enum DocumentValidityStatus: string
{
    case Vigente = 'vigente';
    case VenceEmBreve = 'vence_em_breve';
    case Vencido = 'vencido';
    case Ausente = 'ausente';

    /**
     * Antecedência em que um documento passa a avisar. Coexiste de propósito
     * com `DashboardWindows::EXPIRY_WINDOW_DAYS`, que vive na branch paralela
     * do Dashboard e ainda não existe nesta árvore; unificar as duas é tarefa
     * do fechamento, depois do merge (spec §5).
     */
    public const DIAS_AVISO = 30;

    public static function for(?CarbonInterface $validUntil, bool $presente): self
    {
        if (! $presente) {
            return self::Ausente;
        }

        // Nulo vale sempre — a mesma leitura que o RedatorIdoneidadeService faz
        // do REUF (`whereNull('valid_until') orWhereDate(... >= hoje)`).
        if ($validUntil === null) {
            return self::Vigente;
        }

        $hoje = CarbonImmutable::today();

        if ($validUntil->lessThan($hoje)) {
            return self::Vencido;
        }

        return $validUntil->lessThanOrEqualTo($hoje->addDays(self::DIAS_AVISO))
            ? self::VenceEmBreve
            : self::Vigente;
    }
}
```

- [ ] **Step 4: Acrescentar os dois métodos ao tipo documental**

Em `backend/app/Domains/Identity/Enums/RedatorDocumentType.php`, dentro do enum, depois dos quatro `case`:

```php
    /**
     * O REUF fica fora do self-service (spec D5): ele é a ÚNICA entrada do
     * gate da RN-09 (`RedatorIdoneidadeService::temReufValido`), que lê
     * `valid_until`. Como a rota de upload aceita `valid_until` do corpo da
     * request, self-service nele deixaria o redator se auto-habilitar por
     * payload. CV, TÍTULO e POSTGRADO não entram em gate nenhum.
     */
    public function isSelfService(): bool
    {
        return $this !== self::REUF;
    }

    /** @return array<int, string> */
    public static function selfServiceValues(): array
    {
        return array_values(array_map(
            fn (self $type) => $type->value,
            array_filter(self::cases(), fn (self $type) => $type->isSelfService()),
        ));
    }
```

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=DocumentValidityStatusTest
```

Esperado: PASS, 7 testes.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Enums/DocumentValidityStatus.php app/Domains/Identity/Enums/RedatorDocumentType.php tests/Unit/Identity/DocumentValidityStatusTest.php
cd .. && git add backend/app/Domains/Identity/Enums backend/tests/Unit/Identity
git commit -m "feat(identity): status de validade documental e marca de self-service no enum"
```

---

### Task 2: Os três DTOs de saída

**Files:**
- Create: `backend/app/Domains/Identity/Data/RedatorProfileDocumentData.php`
- Create: `backend/app/Domains/Identity/Data/RedatorProfileData.php`
- Create: `backend/app/Domains/Identity/Data/ProfileData.php`
- Test: `backend/tests/Feature/Identity/ProfileDataTest.php`

**Interfaces:**
- Consumes: `DocumentValidityStatus::for()`, `RedatorDocumentType::isSelfService()` (Task 1).
- Produces: `ProfileData::fromUser(User $user): self`; `RedatorProfileData::fromRedator(Redator $redator): self`; `RedatorProfileDocumentData::slot(RedatorDocumentType $type, ?File $file): self`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Identity/ProfileDataTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Data\ProfileData;
use App\Domains\Identity\Enums\DocumentValidityStatus;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ProfileDataTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeRedator(): Redator
    {
        $user = User::factory()->create([
            'type' => 'redator',
            'is_active' => true,
            'rut' => '12.345.678-5',
            'phone' => '+56 9 1111 1111',
        ]);

        return Redator::create(['user_id' => $user->id]);
    }

    public function test_admin_nao_tem_bloco_de_redator(): void
    {
        $user = User::factory()->create(['type' => 'admin']);

        $data = ProfileData::fromUser($user);

        $this->assertNull($data->redator);
        $this->assertSame($user->email, $data->email);
    }

    public function test_redator_tem_sempre_quatro_slots_na_ordem_do_enum(): void
    {
        $redator = $this->makeRedator();

        $data = ProfileData::fromUser($redator->user);

        $this->assertNotNull($data->redator);
        $this->assertCount(4, $data->redator->documentos);
        $this->assertSame(
            array_map(fn (RedatorDocumentType $t) => $t->value, RedatorDocumentType::cases()),
            array_map(fn ($d) => $d->type->value, $data->redator->documentos),
        );
    }

    public function test_slot_sem_documento_sai_ausente_e_com_campos_nulos(): void
    {
        $redator = $this->makeRedator();

        $slot = ProfileData::fromUser($redator->user)->redator->documentos[0];

        $this->assertSame(DocumentValidityStatus::Ausente, $slot->status);
        $this->assertNull($slot->original_name);
        $this->assertNull($slot->download_url);
        $this->assertNull($slot->valid_until);
    }

    public function test_slot_com_documento_traz_status_calculado_e_metadados(): void
    {
        $redator = $this->makeRedator();
        $redator->documents()->create([
            'type' => RedatorDocumentType::CV->value,
            'path' => 'redator/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
            'valid_until' => CarbonImmutable::today()->addDays(5),
        ]);

        $slot = collect(ProfileData::fromUser($redator->user->refresh())->redator->documentos)
            ->firstWhere(fn ($d) => $d->type === RedatorDocumentType::CV);

        $this->assertSame(DocumentValidityStatus::VenceEmBreve, $slot->status);
        $this->assertSame('cv.pdf', $slot->original_name);
        $this->assertSame(1024, $slot->size);
        $this->assertSame('redator/1/cv.pdf', $slot->download_url);
    }

    /** A D5 chega ao front como DADO, não como regra reescrita lá. */
    public function test_slot_do_reuf_vem_marcado_como_nao_self_service(): void
    {
        $redator = $this->makeRedator();

        $slots = collect(ProfileData::fromUser($redator->user)->redator->documentos)->keyBy(fn ($d) => $d->type->value);

        $this->assertFalse($slots['REUF']->self_service);
        $this->assertTrue($slots['CV']->self_service);
    }

    public function test_cursos_habilitados_conta_e_nomeia(): void
    {
        $redator = $this->makeRedator();
        $redator->courses()->attach([
            $this->makeCourse(['name' => 'Alta Tensão'])->id,
            $this->makeCourse(['name' => 'Rescate'])->id,
        ]);

        $data = ProfileData::fromUser($redator->user->refresh());

        $this->assertSame(2, $data->redator->cursos_habilitados);
        $this->assertEqualsCanonicalizing(['Alta Tensão', 'Rescate'], $data->redator->cursos);
    }

    /** Documento substituído é soft-deletado; o slot mostra o vigente, não o morto. */
    public function test_documento_soft_deletado_nao_ocupa_o_slot(): void
    {
        $redator = $this->makeRedator();
        $morto = $redator->documents()->create([
            'type' => RedatorDocumentType::CV->value,
            'path' => 'redator/1/velho.pdf',
            'original_name' => 'velho.pdf',
            'mime' => 'application/pdf',
            'size' => 10,
        ]);
        $morto->delete();

        $slot = collect(ProfileData::fromUser($redator->user->refresh())->redator->documentos)
            ->firstWhere(fn ($d) => $d->type === RedatorDocumentType::CV);

        $this->assertSame(DocumentValidityStatus::Ausente, $slot->status);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=ProfileDataTest
```

Esperado: FAIL com `Class "App\Domains\Identity\Data\ProfileData" not found`.

- [ ] **Step 3: Criar `RedatorProfileDocumentData`**

`backend/app/Domains/Identity/Data/RedatorProfileDocumentData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Enums\DocumentValidityStatus;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Shared\Files\Models\File;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Um slot documental do perfil do redator. Existe um por tipo, SEMPRE — sem
 * documento, `status` é `Ausente` e os metadados são nulos. A tela não precisa
 * saber quais tipos existem para desenhar a lista, e "não enviou" nunca se
 * confunde com "não existe esse tipo".
 */
#[TypeScript]
class RedatorProfileDocumentData extends Data
{
    public function __construct(
        public RedatorDocumentType $type,
        public DocumentValidityStatus $status,
        /** `false` no REUF: a spec D5 chega ao front como dado, não como regra. */
        public bool $self_service,
        public ?string $valid_until = null,
        public ?string $original_name = null,
        public ?int $size = null,
        public ?string $created_at = null,
        // `null` nunca chega ao transformer: TransformedDataResolver devolve
        // null antes de chamá-lo. Mesmo arranjo de `SessionUserData::$photo_url`.
        #[WithTransformer(SignedUrlTransformer::class, 10)]
        public ?string $download_url = null,
    ) {}

    public static function slot(RedatorDocumentType $type, ?File $file): self
    {
        return new self(
            type: $type,
            status: DocumentValidityStatus::for($file?->valid_until, presente: $file !== null),
            self_service: $type->isSelfService(),
            valid_until: $file?->valid_until?->toDateString(),
            original_name: $file?->original_name,
            size: $file?->size,
            created_at: $file?->created_at?->toIso8601String(),
            download_url: $file?->path,
        );
    }
}
```

- [ ] **Step 4: Criar `RedatorProfileData`**

`backend/app/Domains/Identity/Data/RedatorProfileData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Shared\Data\Attributes\ReadOnlyCollection;
use App\Shared\Files\Models\File;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Parte do perfil que só o Redator tem. Fora do escopo por decisão do João
 * (spec D1): turmas em andamento, próximas turmas e pendências — tudo que
 * exigiria ler `App\Domains\Operation` de dentro de Identity. `cursos` fica
 * porque sai de `Redator::courses()`, aresta para Catalog já permitida.
 */
#[TypeScript]
class RedatorProfileData extends Data
{
    public function __construct(
        /**
         * Projeção de SAÍDA: o `fromRedator` a preenche e nenhuma Action a lê
         * da entrada — documento se envia por `POST /api/profile/documents`.
         * Por isso `#[ReadOnlyCollection]` em vez de `Optional`.
         *
         * @var array<RedatorProfileDocumentData>
         */
        #[DataCollectionOf(RedatorProfileDocumentData::class)]
        #[ReadOnlyCollection]
        public array $documentos,
        public int $cursos_habilitados,
        /** @var array<int, string> */
        public array $cursos,
    ) {}

    public static function fromRedator(Redator $redator): self
    {
        // Um ativo por tipo, no máximo: o replace do
        // StoreRedatorDocumentAction soft-deleta o anterior do mesmo tipo, e a
        // relação já filtra os soft-deletados.
        $porTipo = $redator->documents->keyBy(fn (File $file) => $file->type);

        return new self(
            documentos: array_map(
                fn (RedatorDocumentType $type) => RedatorProfileDocumentData::slot($type, $porTipo->get($type->value)),
                RedatorDocumentType::cases(),
            ),
            cursos_habilitados: $redator->courses->count(),
            cursos: $redator->courses->pluck('name')->all(),
        );
    }
}
```

- [ ] **Step 5: Criar `ProfileData`**

`backend/app/Domains/Identity/Data/ProfileData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\User;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Perfil do próprio usuário autenticado. Recurso PRÓPRIO (spec D4):
 * `SessionUserData` e `/api/me` continuam servindo a sessão e não engordam —
 * sessão e perfil têm formas e ciclos de vida diferentes.
 *
 * `email`, `rut`, `type` e o RBAC saem aqui como LEITURA. Escrevê-los é
 * administrativo, e a recusa está em `ProfileUpdateData::rules()`.
 */
#[TypeScript]
class ProfileData extends Data
{
    public function __construct(
        public int $id,
        public string $uuid,
        public string $name,
        public string $email,
        public ?string $rut,
        public ?string $phone,
        public string $type,
        public ?string $role,
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url,
        public ?RedatorProfileData $redator,
    ) {}

    /**
     * O `loadMissing` mora aqui, e não no controller, porque é o único jeito
     * de a projeção ser não-N+1 para TODO chamador — `show` e `update`
     * devolvem o mesmo DTO. Guarda: `test_perfil_nao_faz_n_mais_um`.
     */
    public static function fromUser(User $user): self
    {
        $user->loadMissing(['redator.documents', 'redator.courses']);

        return new self(
            id: $user->id,
            uuid: $user->uuid,
            name: $user->name,
            email: $user->email,
            rut: $user->rut,
            phone: $user->phone,
            type: $user->type,
            role: $user->getRoleNames()->first(),
            photo_url: $user->photo_path,
            redator: $user->redator === null ? null : RedatorProfileData::fromRedator($user->redator),
        );
    }
}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=ProfileDataTest
```

Esperado: PASS, 7 testes.

- [ ] **Step 7: Rodar a guarda de leis de persistência**

O `#[DataCollectionOf]` + `#[ReadOnlyCollection]` de `RedatorProfileData::$documentos` existe justamente para satisfazer esta catraca. Se ela reprovar, o marcador está errado — não é o teste que se ajusta.

```bash
docker compose exec -T app php artisan test --filter=PersistenceLawsTest
```

Esperado: PASS.

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/ProfileData.php app/Domains/Identity/Data/RedatorProfileData.php app/Domains/Identity/Data/RedatorProfileDocumentData.php tests/Feature/Identity/ProfileDataTest.php
cd .. && git add backend/app/Domains/Identity/Data backend/tests/Feature/Identity/ProfileDataTest.php
git commit -m "feat(identity): contrato de leitura do perfil proprio"
```

---

### Task 3: `GET /api/profile`

**Files:**
- Create: `backend/app/Domains/Identity/Http/Controllers/ProfileController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Identity/ProfileReadTest.php`

**Interfaces:**
- Consumes: `ProfileData::fromUser()` (Task 2).
- Produces: `ProfileController::show(Request $request): ProfileData`; rota nomeada `GET /api/profile`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Identity/ProfileReadTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ProfileReadTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create([
            'type' => 'redator',
            'is_active' => true,
            'rut' => '12.345.678-5',
        ]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return Redator::create(['user_id' => $user->id]);
    }

    public function test_visitante_nao_autenticado_recebe_401(): void
    {
        $this->getJson('/api/profile')->assertUnauthorized();
    }

    public function test_admin_le_o_proprio_perfil_sem_bloco_de_redator(): void
    {
        $admin = $this->actingAsAdmin();

        $this->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('email', $admin->email)
            ->assertJsonPath('redator', null);
    }

    /**
     * A permissão administrativa NÃO é o gate desta rota (spec D7): um redator,
     * que não tem `identity.user.update`, lê o próprio perfil normalmente.
     */
    public function test_redator_sem_permissao_administrativa_le_o_proprio_perfil(): void
    {
        $this->actingAsRedator();

        $this->getJson('/api/profile')
            ->assertOk()
            ->assertJsonCount(4, 'redator.documentos')
            ->assertJsonPath('redator.documentos.0.status', 'ausente')
            ->assertJsonPath('redator.cursos_habilitados', 0);
    }

    /**
     * Guarda de N+1 por INVARIÂNCIA, não por número mágico: mais cursos e mais
     * documentos não podem custar mais queries.
     *
     * `Model::preventLazyLoading()` não serve aqui e a spec §9 registra o
     * porquê — ele não está ligado globalmente na suíte, e `Builder::hydrate()`
     * só marca a instância quando hidrata MAIS DE UMA linha. O perfil hidrata
     * um usuário, então a guarda nunca dispararia e o teste passaria verde com
     * o N+1 presente.
     */
    public function test_perfil_nao_faz_n_mais_um(): void
    {
        $redator = $this->actingAsRedator();
        $redator->courses()->attach($this->makeCourse(['name' => 'Um'])->id);
        $redator->documents()->create([
            'type' => RedatorDocumentType::CV->value,
            'path' => 'p/1.pdf', 'original_name' => '1.pdf', 'mime' => 'application/pdf', 'size' => 1,
        ]);

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/profile')->assertOk();
        $magro = count(DB::getQueryLog());

        $redator->courses()->attach([
            $this->makeCourse(['name' => 'Dois'])->id,
            $this->makeCourse(['name' => 'Tres'])->id,
        ]);
        foreach ([RedatorDocumentType::REUF, RedatorDocumentType::TITULO] as $tipo) {
            $redator->documents()->create([
                'type' => $tipo->value,
                'path' => "p/{$tipo->value}.pdf", 'original_name' => 'x.pdf', 'mime' => 'application/pdf', 'size' => 1,
            ]);
        }

        DB::flushQueryLog();
        $this->getJson('/api/profile')->assertOk();
        $gordo = count(DB::getQueryLog());

        $this->assertSame($magro, $gordo, 'A leitura do perfil cresce em queries com o volume: há N+1.');
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=ProfileReadTest
```

Esperado: FAIL — as rotas devolvem 404 e `assertOk()` reprova.

- [ ] **Step 3: Criar o controller**

`backend/app/Domains/Identity/Http/Controllers/ProfileController.php`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Data\ProfileData;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Perfil do PRÓPRIO usuário. A posse é estrutural: nenhuma rota daqui carrega
 * `{id}`, toda ação opera sobre `$request->user()`, e por isso não existe
 * request capaz de endereçar outro usuário. A garantia é a forma da rota, não
 * uma checagem que alguém pode esquecer de escrever.
 *
 * Estas rotas ficam sob `auth:sanctum` e NUNCA sob
 * `permission:identity.user.update`, que é o gate do cadastro administrativo:
 * um redator não tem essa permissão e precisa editar o próprio perfil.
 */
class ProfileController extends Controller
{
    public function show(Request $request): ProfileData
    {
        return ProfileData::fromUser($request->user());
    }
}
```

- [ ] **Step 4: Registrar a rota**

Em `backend/app/Domains/Identity/routes.php`, dentro do grupo `Route::middleware('auth:sanctum')`, logo depois da linha `Route::get('/me', [AuthController::class, 'me']);`:

```php
    // Perfil próprio (spec D4): recurso próprio, fora do grupo
    // `permission:identity.user.update`. `/me` continua servindo só a sessão.
    Route::get('profile', [ProfileController::class, 'show']);
```

E o `use App\Domains\Identity\Http\Controllers\ProfileController;` no topo do arquivo, junto dos demais.

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=ProfileReadTest
```

Esperado: PASS, 4 testes. Se `test_perfil_nao_faz_n_mais_um` reprovar, o `loadMissing` de `ProfileData::fromUser` está incompleto — corrija lá, não no teste.

- [ ] **Step 6: Provar que `/api/me` não regrediu**

```bash
docker compose exec -T app php artisan test --filter=AuthTest
```

Esperado: PASS. `/api/me` é intocado por decisão (D4).

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Http/Controllers/ProfileController.php app/Domains/Identity/routes.php tests/Feature/Identity/ProfileReadTest.php
cd .. && git add backend/app/Domains/Identity backend/tests/Feature/Identity/ProfileReadTest.php
git commit -m "feat(identity): GET /api/profile le o perfil proprio"
```

---

### Task 4: `PUT /api/profile` — e a recusa dos campos proibidos

**Files:**
- Create: `backend/app/Domains/Identity/Data/ProfileUpdateData.php`
- Create: `backend/app/Domains/Identity/Actions/UpdateProfileAction.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/ProfileController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Identity/ProfileUpdateTest.php`

**Interfaces:**
- Consumes: `ProfileData::fromUser()` (Task 2), `ProfileController` (Task 3).
- Produces: `UpdateProfileAction::execute(User $user, ProfileUpdateData $data): User`; `ProfileController::update(ProfileUpdateData $data, Request $request, UpdateProfileAction $action): ProfileData`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Identity/ProfileUpdateTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_atualiza_nome_e_telefone(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile', ['name' => 'Ana Nova', 'phone' => '+56 9 2222 2222'])
            ->assertOk()
            ->assertJsonPath('name', 'Ana Nova')
            ->assertJsonPath('phone', '+56 9 2222 2222');

        $user->refresh();
        $this->assertSame('Ana Nova', $user->name);
        $this->assertSame('+56 9 2222 2222', $user->phone);
    }

    /** `name` e `phone` estão em `$auditInclude`: a trilha vem de graça. */
    public function test_a_troca_de_nome_gera_linha_de_auditoria(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile', ['name' => 'Ana Auditada'])->assertOk();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => $user->getMorphClass(),
            'auditable_id' => $user->id,
            'event' => 'updated',
        ]);
    }

    /** Omitir `phone` NÃO apaga o telefone — o campo nasce `Optional`. */
    public function test_omitir_telefone_preserva_o_valor_existente(): void
    {
        $user = $this->actingAsAdmin();
        $user->update(['phone' => '+56 9 3333 3333']);

        $this->putJson('/api/profile', ['name' => 'Ana'])->assertOk();

        $this->assertSame('+56 9 3333 3333', $user->refresh()->phone);
    }

    /** `phone: null` explícito apaga — ausente e nulo são coisas diferentes. */
    public function test_telefone_nulo_explicito_apaga(): void
    {
        $user = $this->actingAsAdmin();
        $user->update(['phone' => '+56 9 3333 3333']);

        $this->putJson('/api/profile', ['name' => 'Ana', 'phone' => null])->assertOk();

        $this->assertNull($user->refresh()->phone);
    }

    /**
     * Spec D8: campo forjado devolve 422 NOMEANDO o campo, nunca 200 em
     * silêncio. Ignorar também protegeria o dado, mas o cliente acreditaria
     * ter salvo.
     */
    #[DataProvider('camposProibidos')]
    public function test_campo_proibido_reprova_com_422(string $campo, mixed $valor): void
    {
        $user = $this->actingAsAdmin();
        $antes = $user->only(['email', 'rut', 'type', 'is_active']);

        $this->putJson('/api/profile', ['name' => 'Ana', $campo => $valor])
            ->assertStatus(422)
            ->assertJsonPath('errors.'.$campo.'.0', fn (?string $msg) => filled($msg));

        $this->assertSame($antes, $user->refresh()->only(['email', 'rut', 'type', 'is_active']));
    }

    public static function camposProibidos(): array
    {
        return [
            'email' => ['email', 'outro@lotus.cl'],
            'rut' => ['rut', '11.111.111-1'],
            'type' => ['type', 'superadmin'],
            'is_active' => ['is_active', false],
            'roles' => ['roles', ['superadmin']],
            'permissions' => ['permissions', ['identity.user.update']],
            'photo_url' => ['photo_url', 'x/y.png'],
        ];
    }

    public function test_nome_vazio_reprova(): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/profile', ['name' => ''])->assertStatus(422);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=ProfileUpdateTest
```

Esperado: FAIL — 404 na rota `PUT`.

- [ ] **Step 3: Criar `ProfileUpdateData`**

`backend/app/Domains/Identity/Data/ProfileUpdateData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Entrada do `PUT /api/profile`. É a superfície self-service INTEIRA de campos
 * de texto: nome e telefone (Drive §3). Foto tem rota própria; senha também.
 */
#[TypeScript]
class ProfileUpdateData extends Data
{
    public function __construct(
        public string $name,
        /**
         * `Optional`, não `?string = null`: campo de escrita com default
         * não-`Optional` rebaixa dado em silêncio no PUT parcial
         * (`.claude/rules/generated-types.md`). Ausente = não mexe;
         * `null` explícito = apaga.
         */
        public string|Optional|null $phone = new Optional,
    ) {}

    /**
     * Os seis campos vetados pelo Drive §3 mais `photo_url`, que tem rota
     * própria. `prohibited` faz o payload forjado devolver 422 nomeando o
     * campo (spec D8) em vez de ser ignorado em silêncio.
     *
     * Chave sem propriedade correspondente FUNCIONA e não é acidente:
     * `DataValidationRulesResolver::applyOverwrittenRules` itera as chaves
     * devolvidas por `rules()` e as adiciona ao ruleset sem checar se existe
     * propriedade com esse nome.
     */
    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['prohibited'],
            'rut' => ['prohibited'],
            'type' => ['prohibited'],
            'is_active' => ['prohibited'],
            'roles' => ['prohibited'],
            'permissions' => ['prohibited'],
            'photo_url' => ['prohibited'],
        ];
    }
}
```

- [ ] **Step 4: Criar `UpdateProfileAction`**

`backend/app/Domains/Identity/Actions/UpdateProfileAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\ProfileUpdateData;
use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Edição self-service dos campos de texto do próprio usuário. A transação
 * cobre o UPDATE e a auditoria síncrona do owen-it, que dispara dentro da
 * mesma chamada (mesma razão de `UserPhotoService::store`).
 */
class UpdateProfileAction
{
    public function execute(User $user, ProfileUpdateData $data): User
    {
        $campos = ['name' => $data->name];

        // Ausente não é nulo: `Optional` significa "não mandou", e apagar o
        // telefone de quem só omitiu o campo seria perda silenciosa.
        if (! $data->phone instanceof Optional) {
            $campos['phone'] = $data->phone;
        }

        DB::transaction(fn () => $user->update($campos));

        return $user->refresh();
    }
}
```

- [ ] **Step 5: Acrescentar o `update` ao controller**

Em `backend/app/Domains/Identity/Http/Controllers/ProfileController.php`, depois de `show`:

```php
    public function update(ProfileUpdateData $data, Request $request, UpdateProfileAction $action): ProfileData
    {
        return ProfileData::fromUser($action->execute($request->user(), $data));
    }
```

Com os `use` de `ProfileUpdateData` e `UpdateProfileAction` no topo.

- [ ] **Step 6: Registrar a rota**

Em `backend/app/Domains/Identity/routes.php`, logo abaixo da rota `GET profile`:

```php
    Route::put('profile', [ProfileController::class, 'update']);
```

- [ ] **Step 7: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=ProfileUpdateTest
```

Esperado: PASS, 11 testes (4 diretos + 7 do dataProvider).

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/ProfileUpdateData.php app/Domains/Identity/Actions/UpdateProfileAction.php app/Domains/Identity/Http/Controllers/ProfileController.php app/Domains/Identity/routes.php tests/Feature/Identity/ProfileUpdateTest.php
cd .. && git add backend/app/Domains/Identity backend/tests/Feature/Identity/ProfileUpdateTest.php
git commit -m "feat(identity): PUT /api/profile com recusa 422 dos campos administrativos"
```

---

### Task 5: Foto do próprio perfil

**Files:**
- Create: `backend/app/Domains/Identity/Http/Controllers/ProfilePhotoController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Identity/ProfilePhotoTest.php`

**Interfaces:**
- Consumes: `UserPhotoService::RULES`, `UserPhotoService::store()`, `UserPhotoService::remove()` (já existem, não mudam).
- Produces: `ProfilePhotoController::store()`, `ProfilePhotoController::destroy()`, ambos `Response` 204.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Identity/ProfilePhotoTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsRedator(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create([
            'type' => 'redator', 'is_active' => true, 'rut' => '12.345.678-5',
        ]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return $user;
    }

    public function test_grava_a_propria_foto(): void
    {
        $storage = Storage::fake('s3');
        $user = $this->actingAsAdmin();

        $this->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->image('eu.png')])
            ->assertNoContent();

        $user->refresh();
        $this->assertNotNull($user->photo_path);
        $storage->assertExists($user->photo_path);
    }

    /**
     * O redator não tem `identity.user.update` e mesmo assim troca a própria
     * foto: a rota self-service não passa pelo gate administrativo (D7).
     */
    public function test_redator_sem_permissao_administrativa_troca_a_propria_foto(): void
    {
        Storage::fake('s3');
        $user = $this->actingAsRedator();

        $this->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->image('eu.png')])
            ->assertNoContent();

        $this->assertNotNull($user->refresh()->photo_path);
    }

    public function test_remove_a_propria_foto(): void
    {
        $storage = Storage::fake('s3');
        $user = $this->actingAsAdmin();
        $this->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->image('eu.png')])->assertNoContent();
        $path = $user->refresh()->photo_path;

        $this->deleteJson('/api/profile/photo')->assertNoContent();

        $this->assertNull($user->refresh()->photo_path);
        $storage->assertMissing($path);
    }

    /** Sem foto, remover é no-op — não é erro. */
    public function test_remover_sem_foto_e_no_op(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->deleteJson('/api/profile/photo')->assertNoContent();
    }

    /** A validação é a MESMA do cadastro: `UserPhotoService::RULES`, fonte única. */
    public function test_arquivo_que_nao_e_imagem_reprova_com_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->create('curriculo.pdf', 10, 'application/pdf')])
            ->assertStatus(422)
            ->assertJsonPath('errors.photo.0', fn (?string $msg) => filled($msg));
    }

    public function test_visitante_nao_autenticado_recebe_401(): void
    {
        $this->postJson('/api/profile/photo')->assertUnauthorized();
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=ProfilePhotoTest
```

Esperado: FAIL — 404 nas rotas de foto.

- [ ] **Step 3: Criar o controller**

`backend/app/Domains/Identity/Http/Controllers/ProfilePhotoController.php`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Foto do PRÓPRIO usuário. Controller fino: valida pelas `RULES` do serviço
 * (fonte única, spec D9) e delega.
 *
 * Nenhum `abort_unless` de tipo aqui, ao contrário dos quatro controllers
 * administrativos de foto: eles precisam recusar o que não é seu porque vivem
 * sob `identity.user.update` e alcançariam entidade de outro módulo. Esta rota
 * não tem parâmetro nenhum — o alvo é sempre `$request->user()`, e só admin e
 * redator autenticam (RN-01).
 */
class ProfilePhotoController extends Controller
{
    public function store(Request $request, UserPhotoService $service): Response
    {
        $request->validate(UserPhotoService::RULES);
        $service->store($request->user(), $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(Request $request, UserPhotoService $service): Response
    {
        $service->remove($request->user());

        return response()->noContent();
    }
}
```

- [ ] **Step 4: Registrar as rotas**

Em `backend/app/Domains/Identity/routes.php`, abaixo da rota `PUT profile`:

```php
    Route::post('profile/photo', [ProfilePhotoController::class, 'store']);
    Route::delete('profile/photo', [ProfilePhotoController::class, 'destroy']);
```

Com o `use` do `ProfilePhotoController` no topo.

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=ProfilePhotoTest
```

Esperado: PASS, 6 testes.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Http/Controllers/ProfilePhotoController.php app/Domains/Identity/routes.php tests/Feature/Identity/ProfilePhotoTest.php
cd .. && git add backend/app/Domains/Identity backend/tests/Feature/Identity/ProfilePhotoTest.php
git commit -m "feat(identity): foto do proprio perfil sem gate administrativo"
```

---

### Task 6: Senha própria e encerramento das outras sessões

A task mais sensível do plano: toca o eixo de autenticação. Leia a spec §6 antes de começar.

**Files:**
- Create: `backend/app/Domains/Identity/Data/ProfilePasswordData.php`
- Create: `backend/app/Domains/Identity/Actions/PurgeOtherSessionsAction.php`
- Create: `backend/app/Domains/Identity/Http/Controllers/ProfilePasswordController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Identity/ProfilePasswordTest.php`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `PurgeOtherSessionsAction::execute(User $user, string $keepSessionId): int` (devolve quantas linhas apagou); `ProfilePasswordController::update(ProfilePasswordData $data, Request $request, PurgeOtherSessionsAction $purge): Response` 204.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Identity/ProfilePasswordTest.php`. **Os dois testes de sessão medem coisas diferentes de propósito** — sem os dois, "encerra as outras" e "não me derruba" viram a mesma asserção, e um regresso passa verde.

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\PurgeOtherSessionsAction;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfilePasswordTest extends TestCase
{
    use RefreshDatabase;

    private function linhaDeSessao(string $id, ?int $userId): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $userId,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => 'x',
            'last_activity' => 1_755_000_000,
        ]);
    }

    public function test_troca_a_propria_senha(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('senhaNova123', $user->refresh()->password));
    }

    public function test_senha_atual_errada_reprova_nomeando_o_campo(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'nao-e-essa',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.current_password.0', fn (?string $msg) => filled($msg));

        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_confirmacao_divergente_reprova(): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'senhaNova123',
            'password_confirmation' => 'outraCoisa123',
        ])->assertStatus(422);
    }

    /** Mesma força já vigente em `UserData.php:58`. Política nova não se inventa. */
    public function test_senha_curta_reprova(): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'curta',
            'password_confirmation' => 'curta',
        ])->assertStatus(422);
    }

    /** Hash nunca entra em `audits`: `password` não está em `$auditInclude`. */
    public function test_a_troca_de_senha_nao_grava_hash_na_auditoria(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])->assertNoContent();

        foreach (DB::table('audits')->where('auditable_id', $user->id)->get() as $linha) {
            $this->assertStringNotContainsString('password', (string) $linha->old_values);
            $this->assertStringNotContainsString('password', (string) $linha->new_values);
        }
    }

    /**
     * Prova 1 de 2, contra a TABELA: sobram a sessão corrente e a de terceiro.
     *
     * A ação lê `sessions` direto porque a suíte roda com
     * `SESSION_DRIVER=array` (`phpunit.xml`): sem escrever as linhas à mão, a
     * tabela ficaria vazia e o teste passaria verde sem exercitar nada —
     * cobertura fantasma.
     */
    public function test_purge_apaga_as_outras_sessoes_do_usuario_e_so_elas(): void
    {
        $user = User::factory()->create();
        $terceiro = User::factory()->create();

        $this->linhaDeSessao('corrente', $user->id);
        $this->linhaDeSessao('outra-do-mesmo', $user->id);
        $this->linhaDeSessao('mais-uma-do-mesmo', $user->id);
        $this->linhaDeSessao('de-terceiro', $terceiro->id);
        $this->linhaDeSessao('anonima', null);

        $apagadas = app(PurgeOtherSessionsAction::class)->execute($user, 'corrente');

        $this->assertSame(2, $apagadas);
        $this->assertEqualsCanonicalizing(
            ['corrente', 'de-terceiro', 'anonima'],
            DB::table('sessions')->pluck('id')->all(),
        );
    }

    /**
     * Prova 2 de 2, contra o HTTP: o controller preserva a sessão CERTA. A
     * prova 1 não sabe qual id ele passa ao purge; esta sabe.
     *
     * `config(['session.driver' => 'database'])` é obrigatório e é o ponto
     * inteiro do teste: `phpunit.xml` define `SESSION_DRIVER=array`, então sem
     * o override a tabela `sessions` fica vazia, o purge é no-op e o teste
     * passa verde sem exercitar nada. O login por HTTP é o que grava a linha
     * da sessão corrente com `user_id` preenchido — `actingAs()` não grava
     * linha nenhuma, e por isso não serve aqui.
     */
    public function test_a_sessao_corrente_sobrevive_e_a_do_outro_dispositivo_morre(): void
    {
        config(['session.driver' => 'database']);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk();

        $this->linhaDeSessao('outro-dispositivo', $user->id);

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])->assertNoContent();

        $this->assertDatabaseMissing('sessions', ['id' => 'outro-dispositivo']);
        $this->assertSame(1, DB::table('sessions')->where('user_id', $user->id)->count());

        // E quem trocou continua navegando.
        $this->getJson('/api/profile')->assertOk();
    }
}
```

> **Se `test_a_sessao_corrente_sobrevive_…` falhar em `assertSame(1, …)` com `0`:** o driver de sessão não trocou a tempo, e o login não gravou linha. Confirme com `DB::table('sessions')->count()` logo após o login, antes de investigar o controller — o bug estaria no override, não no purge.

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=ProfilePasswordTest
```

Esperado: FAIL — `Class "App\Domains\Identity\Actions\PurgeOtherSessionsAction" not found` e 404 na rota.

- [ ] **Step 3: Criar `PurgeOtherSessionsAction`**

`backend/app/Domains/Identity/Actions/PurgeOtherSessionsAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Encerra todas as sessões do usuário MENOS a informada (spec D3). A corrente
 * sobrevive: quem acabou de trocar a própria senha continua navegando.
 *
 * Lê `sessions` pelo query builder porque sessão é infra do framework, não
 * entidade de domínio — não há model e não há o que auditar nela.
 *
 * Depende de `SESSION_DRIVER=database`, que é o driver do `.env`. Com `array`
 * ou `file` a tabela está vazia e isto é no-op — é exatamente por isso que o
 * teste da tabela escreve as linhas à mão em vez de confiar na suíte.
 *
 * Não se usa `Auth::logoutOtherDevices()`: ele depende do middleware
 * `AuthenticateSession`, que NÃO está registrado em `bootstrap/app.php`.
 * Registrá-lo mexeria na autenticação da aplicação inteira, o que é decisão
 * própria e não efeito colateral de Meu Perfil.
 */
class PurgeOtherSessionsAction
{
    /** @return int quantas sessões foram encerradas */
    public function execute(User $user, string $keepSessionId): int
    {
        return DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $keepSessionId)
            ->delete();
    }
}
```

- [ ] **Step 4: Criar `ProfilePasswordData`**

`backend/app/Domains/Identity/Data/ProfilePasswordData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Entrada do `PUT /api/profile/password`. `password_confirmation` é
 * propriedade de verdade, e não só chave de payload lida pela regra
 * `confirmed`, para o tipo gerado não mentir sobre o que a rota espera.
 */
#[TypeScript]
class ProfilePasswordData extends Data
{
    public function __construct(
        public string $current_password,
        public string $password,
        public string $password_confirmation,
    ) {}

    /**
     * `current_password:web` com guard EXPLÍCITO, nunca o ambiente: o guard
     * default pode ter sido trocado para 'sanctum' por um `auth:sanctum`
     * anterior no mesmo processo — é a mesma armadilha documentada em
     * `AuthController::login`.
     *
     * `min:8` é a força já vigente em `UserData.php:58`. Política de senha
     * nova não se inventa dentro deste bloco.
     */
    public static function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:web'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ];
    }
}
```

- [ ] **Step 5: Criar o controller**

`backend/app/Domains/Identity/Http/Controllers/ProfilePasswordController.php`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\PurgeOtherSessionsAction;
use App\Domains\Identity\Data\ProfilePasswordData;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProfilePasswordController extends Controller
{
    /**
     * O hash sai do cast `'password' => 'hashed'` do model — nenhum
     * `Hash::make` aqui. `password` está fora de `$auditInclude`, então a
     * troca não deixa hash em `audits`.
     */
    public function update(ProfilePasswordData $data, Request $request, PurgeOtherSessionsAction $purge): Response
    {
        $user = $request->user();

        $user->update(['password' => $data->password]);
        $purge->execute($user, $request->session()->getId());

        return response()->noContent();
    }
}
```

- [ ] **Step 6: Registrar a rota**

Em `backend/app/Domains/Identity/routes.php`, abaixo das rotas de foto:

```php
    Route::put('profile/password', [ProfilePasswordController::class, 'update']);
```

Com o `use` do `ProfilePasswordController` no topo.

- [ ] **Step 7: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=ProfilePasswordTest
```

Esperado: PASS, 7 testes.

Se `test_senha_atual_errada_reprova_nomeando_o_campo` devolver 422 mas em `password` em vez de `current_password`, a regra está no campo errado. Se a senha CERTA também reprovar, o guard de `current_password:web` não está resolvendo o usuário — confirme com `Auth::guard('web')->user()` dentro da rota antes de trocar a regra.

- [ ] **Step 8: Provar que o login não regrediu**

```bash
docker compose exec -T app php artisan test --filter="AuthTest|LoginLogTest|RbacAuthTest"
```

Esperado: PASS.

- [ ] **Step 9: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/ProfilePasswordData.php app/Domains/Identity/Actions/PurgeOtherSessionsAction.php app/Domains/Identity/Http/Controllers/ProfilePasswordController.php app/Domains/Identity/routes.php tests/Feature/Identity/ProfilePasswordTest.php
cd .. && git add backend/app/Domains/Identity backend/tests/Feature/Identity/ProfilePasswordTest.php
git commit -m "feat(identity): troca da propria senha encerra as outras sessoes"
```

---

### Task 7: Documentação profissional pelo próprio Redator

**Files:**
- Create: `backend/app/Domains/Identity/Http/Controllers/ProfileDocumentController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Identity/ProfileDocumentTest.php`

**Interfaces:**
- Consumes: `RedatorDocumentType::selfServiceValues()` (Task 1); `StoreRedatorDocumentAction::execute()` e `RedatorDocumentData::fromModel()` (já existem, não mudam).
- Produces: `ProfileDocumentController::store(Request $request, StoreRedatorDocumentAction $action): RedatorDocumentData` (201).

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Identity/ProfileDocumentTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileDocumentTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create([
            'type' => 'redator', 'is_active' => true, 'rut' => '12.345.678-5',
        ]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return Redator::create(['user_id' => $user->id]);
    }

    public function test_redator_envia_o_proprio_cv(): void
    {
        Storage::fake('s3');
        $redator = $this->actingAsRedator();

        $this->postJson('/api/profile/documents', [
            'type' => 'CV',
            'file' => UploadedFile::fake()->create('cv.pdf', 20, 'application/pdf'),
        ])
            ->assertCreated()
            ->assertJsonPath('type', 'CV');

        $this->assertSame(1, $redator->documents()->where('type', 'CV')->count());
    }

    /** Replace (spec D2): o anterior fica soft-deletado, com rastro. */
    public function test_enviar_de_novo_substitui_e_o_anterior_fica_soft_deletado(): void
    {
        Storage::fake('s3');
        $redator = $this->actingAsRedator();

        $this->postJson('/api/profile/documents', [
            'type' => 'CV', 'file' => UploadedFile::fake()->create('velho.pdf', 20, 'application/pdf'),
        ])->assertCreated();
        $velho = $redator->documents()->where('type', 'CV')->sole();

        $this->postJson('/api/profile/documents', [
            'type' => 'CV', 'file' => UploadedFile::fake()->create('novo.pdf', 20, 'application/pdf'),
        ])->assertCreated();

        $this->assertSoftDeleted('files', ['id' => $velho->id]);
        $this->assertSame(1, $redator->documents()->count());
        $this->assertSame('novo.pdf', $redator->documents()->sole()->original_name);
    }

    /**
     * Spec D5. O REUF é a única entrada do gate da RN-09
     * (`RedatorIdoneidadeService`), e a rota aceita `valid_until` do corpo:
     * self-service nele deixaria o redator se auto-habilitar por payload.
     * É entrada inválida para esta superfície, então 422 nomeando o campo —
     * nunca 403, que diria "falta permissão".
     */
    public function test_reuf_reprova_com_422_e_nao_cria_documento(): void
    {
        Storage::fake('s3');
        $redator = $this->actingAsRedator();

        $this->postJson('/api/profile/documents', [
            'type' => 'REUF',
            'file' => UploadedFile::fake()->create('reuf.pdf', 20, 'application/pdf'),
            'valid_until' => '2099-12-31',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.type.0', fn (?string $msg) => filled($msg));

        $this->assertSame(0, $redator->documents()->count());
    }

    public function test_valid_until_e_aceito_nos_tipos_liberados(): void
    {
        Storage::fake('s3');
        $redator = $this->actingAsRedator();

        $this->postJson('/api/profile/documents', [
            'type' => 'TITULO',
            'file' => UploadedFile::fake()->create('titulo.pdf', 20, 'application/pdf'),
            'valid_until' => '2030-01-31',
        ])->assertCreated();

        $this->assertSame('2030-01-31', $redator->documents()->sole()->valid_until->toDateString());
    }

    /** Admin não é redator: não há documentação profissional dele para enviar. */
    public function test_admin_recebe_403(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->postJson('/api/profile/documents', [
            'type' => 'CV', 'file' => UploadedFile::fake()->create('cv.pdf', 20, 'application/pdf'),
        ])->assertForbidden();

        $this->assertSame(0, File::count());
    }

    /** Não existe remoção self-service (spec D2). */
    public function test_nao_existe_rota_de_remocao_self_service(): void
    {
        $redator = $this->actingAsRedator();
        $doc = $redator->documents()->create([
            'type' => 'CV', 'path' => 'p/cv.pdf', 'original_name' => 'cv.pdf',
            'mime' => 'application/pdf', 'size' => 1,
        ]);

        $this->deleteJson("/api/profile/documents/{$doc->id}")->assertNotFound();
        $this->assertNotSoftDeleted('files', ['id' => $doc->id]);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=ProfileDocumentTest
```

Esperado: FAIL — 404 em `POST /api/profile/documents`.

- [ ] **Step 3: Criar o controller**

`backend/app/Domains/Identity/Http/Controllers/ProfileDocumentController.php`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Data\RedatorDocumentData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Envio da própria documentação profissional pelo redator. Substituição sim,
 * remoção não (spec D2): não existe `destroy` aqui, e o replace já preserva o
 * anterior soft-deletado, com auditoria.
 *
 * A regra de quais tipos são self-service mora no enum, não neste controller —
 * é a mesma fonte que o DTO de perfil consulta para marcar `self_service`.
 */
class ProfileDocumentController extends Controller
{
    public function store(Request $request, StoreRedatorDocumentAction $action): RedatorDocumentData
    {
        $redator = $request->user()->redator;

        abort_unless($redator !== null, 403, 'Apenas redatores enviam documentação profissional.');

        $validated = $request->validate([
            'type' => ['required', Rule::in(RedatorDocumentType::selfServiceValues())],
            'file' => ['required', 'file', 'max:10240'],
            'valid_until' => ['nullable', 'date'],
        ]);

        $file = $action->execute(
            $redator,
            RedatorDocumentType::from($validated['type']),
            $request->file('file'),
            isset($validated['valid_until']) ? Carbon::parse($validated['valid_until']) : null,
        );

        return RedatorDocumentData::fromModel($file);
    }
}
```

- [ ] **Step 4: Registrar a rota**

Em `backend/app/Domains/Identity/routes.php`, abaixo da rota de senha:

```php
    Route::post('profile/documents', [ProfileDocumentController::class, 'store']);
```

Com o `use` do `ProfileDocumentController` no topo.

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=ProfileDocumentTest
```

Esperado: PASS, 6 testes.

- [ ] **Step 6: Provar que a RN-09 não foi afetada**

O gate de idoneidade continua lendo só o REUF, que este bloco não deixa o redator escrever.

```bash
docker compose exec -T app php artisan test --filter="Idoneidade|Habilitacao"
```

Esperado: PASS.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Http/Controllers/ProfileDocumentController.php app/Domains/Identity/routes.php tests/Feature/Identity/ProfileDocumentTest.php
cd .. && git add backend/app/Domains/Identity backend/tests/Feature/Identity/ProfileDocumentTest.php
git commit -m "feat(identity): redator envia a propria documentacao, REUF fica administrativo"
```

---

### Task 8: Regenerar `generated.ts` e fechar o bloco

**Files:**
- Modify: `frontend/src/shared/types/generated.ts` (gerado, **nunca** editado à mão)

**Interfaces:**
- Consumes: todos os DTOs `#[TypeScript]` das tasks 2, 4 e 6.
- Produces: os tipos `ProfileData`, `RedatorProfileData`, `RedatorProfileDocumentData`, `ProfileUpdateData`, `ProfilePasswordData` e `DocumentValidityStatus` disponíveis ao bloco 2 (frontend).

- [ ] **Step 1: Regenerar**

```bash
docker compose exec -T app php artisan typescript:transform
```

Esperado: `Transformed N types`. Se o comando falhar, **PARE e chame o João** — não conserte o arquivo gerado (lei §5.3).

- [ ] **Step 2: Conferir o que entrou**

```bash
git diff --stat frontend/src/shared/types/generated.ts
grep -n "ProfileData\|RedatorProfileData\|RedatorProfileDocumentData\|ProfileUpdateData\|ProfilePasswordData\|DocumentValidityStatus" frontend/src/shared/types/generated.ts
```

Esperado: as seis entradas presentes, e `DocumentValidityStatus` saindo como
`export type DocumentValidityStatus = 'vigente' | 'vence_em_breve' | 'vencido' | 'ausente';`.

O diff deve ser **aditivo**. Se alguma linha existente sumiu ou mudou, um DTO antigo foi alterado sem querer — investigue antes de commitar.

- [ ] **Step 3: Provar que o frontend continua compilando**

Nenhum consumidor TS existe ainda para os tipos novos, então a build só confirma que nada foi quebrado.

```bash
cd frontend && pnpm build
```

Esperado: build verde.

- [ ] **Step 4: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: PASS, sem falha nem skip novo. Em especial `DomainDependencyTest` verde **sem ter sido editado** — é a prova de que o corte do João (D1) segurou e nenhuma aresta nova para Operation entrou.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/types/generated.ts
git commit -m "chore(types): regenera generated.ts com o contrato de Meu Perfil"
```

---

## Handoff de execução

**executor: claude**

Duas das oito tasks tocam lei do `CLAUDE.md` §5 diretamente — a Task 6 mexe no eixo de autenticação (troca da própria senha e encerramento de sessão) e a Task 8 regenera `generated.ts` (§5.3, com a instrução explícita de parar e chamar o João se o gerador falhar). A Task 7 decide ownership de documento com a RN-09 do lado, e a Task 4 depende de um comportamento de `spatie/laravel-data` que foi verificado no código do pacote (`DataValidationRulesResolver::applyOverwrittenRules`) e não em documentação. São julgamentos fora do plano, que é o critério do `/executar-bloco` para `claude`.

**Se o João preferir dividir**, as tasks 1, 2 e 5 qualificam para `codex`: são mecânicas, com verificação executável e paths fechados. Ficaria:

```
paths_autorizados:
  - backend/app/Domains/Identity/Enums/*.php
  - backend/app/Domains/Identity/Data/Profile*.php
  - backend/app/Domains/Identity/Data/RedatorProfile*.php
  - backend/app/Domains/Identity/Http/Controllers/ProfilePhotoController.php
  - backend/app/Domains/Identity/routes.php
  - backend/tests/Unit/Identity/*.php
  - backend/tests/Feature/Identity/Profile*.php
```

A recomendação é não dividir: as tasks 3, 4, 6 e 7 consomem o contrato fixado nas tasks 1 e 2, e trocar de executor no meio entrega ao Codex justamente as tasks cuja forma as seguintes podem reabrir.

**Pendência P-03 (compose por worktree não existe):** este bloco roda no worktree `fix-frontend`, e o container `fix-frontend-app-1` monta `/home/jvbat/projetos/fix-frontend/backend` — os `docker compose exec -T app` deste plano medem **esta** branch. Confirmado na abertura do bloco; se o container não estiver de pé, `docker compose up -d` a partir de `/home/jvbat/projetos/fix-frontend`.
