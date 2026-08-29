<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserPhotoService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Ciclo de vida do objeto de foto. A ordem de escrita é a decisão D4 da spec:
 * banco primeiro, delete do objeto anterior por último. Apagar o antigo antes
 * do update deixaria a linha apontando para objeto morto se o update falhasse.
 */
class UserPhotoTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    /** Redator autenticado: não tem identity.user.* nem commercial.client.*. */
    private function actingAsRedator(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create([
            'type' => 'redator',
            'is_active' => true,
            'rut' => '12.345.678-5',
        ]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return $user;
    }

    public function test_store_grava_photo_path_e_o_objeto_existe(): void
    {
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);

        app(UserPhotoService::class)->store($user, UploadedFile::fake()->image('foto.png'));

        $user->refresh();
        $this->assertNotNull($user->photo_path);
        $storage->assertExists($user->photo_path);
    }

    public function test_substituir_foto_apaga_o_objeto_anterior(): void
    {
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);

        $service->store($user, UploadedFile::fake()->image('primeira.png'));
        $old = $user->refresh()->photo_path;

        $service->store($user, UploadedFile::fake()->image('segunda.png'));
        $new = $user->refresh()->photo_path;

        $this->assertNotSame($old, $new);
        $storage->assertExists($new);
        $storage->assertMissing($old);
    }

    public function test_remove_zera_photo_path_e_apaga_o_objeto(): void
    {
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);

        $service->store($user, UploadedFile::fake()->image('foto.png'));
        $path = $user->refresh()->photo_path;

        $service->remove($user);

        $this->assertNull($user->refresh()->photo_path);
        $storage->assertMissing($path);
    }

    public function test_remove_sem_foto_e_no_op(): void
    {
        Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);

        app(UserPhotoService::class)->remove($user);

        $this->assertNull($user->refresh()->photo_path);
    }

    public function test_troca_de_foto_gera_registro_de_auditoria(): void
    {
        Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);

        app(UserPhotoService::class)->store($user, UploadedFile::fake()->image('foto.png'));

        // `User` é Auditable — a troca de photo_path entra em `audits` sem
        // código de auditoria próprio (spec D3, lei §5.2).
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'user',
            'auditable_id' => $user->id,
            'event' => 'updated',
        ]);

        // O registro existir não basta: `$auditInclude` filtra o diff, então
        // um `photo_path` fora da lista gera um audit de `new_values` VAZIO —
        // sabe-se que algo mudou, não O QUE mudou. Num domínio com peso legal,
        // "trocou a foto" sem dizer qual objeto foi desvinculado não é rastro.
        $audit = $user->audits()->latest('id')->first();
        $this->assertArrayHasKey('photo_path', $audit->new_values);
        $this->assertSame($user->refresh()->photo_path, $audit->new_values['photo_path']);
    }

    /**
     * O que precisa de rastro não é "mudou a foto" — é QUAL objeto deixou de
     * ser referenciado, porque a substituição o apaga do bucket de forma
     * irreversível (spec D4). Esse dado vive em `old_values`, e só existe na
     * SUBSTITUIÇÃO e na REMOÇÃO: o teste do primeiro upload sozinho passaria
     * mesmo se o rastro do objeto apagado se perdesse.
     */
    public function test_substituir_e_remover_registram_o_objeto_desvinculado(): void
    {
        Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);

        $service->store($user, UploadedFile::fake()->image('primeira.png'));
        $primeira = $user->refresh()->photo_path;

        $service->store($user, UploadedFile::fake()->image('segunda.png'));
        $segunda = $user->refresh()->photo_path;

        // Sem estas duas, o teste passa VAZIO: com `photo_path` fora do diff da
        // auditoria, os caminhos e os valores do audit são todos `null`, e
        // `null === null` aprova tudo. Provado na revisão de 2026-08-01.
        $this->assertNotNull($primeira);
        $this->assertNotSame($primeira, $segunda);

        $troca = $user->audits()->latest('id')->first();
        $this->assertSame($primeira, $troca->old_values['photo_path'] ?? null);
        $this->assertSame($segunda, $troca->new_values['photo_path'] ?? null);

        $service->remove($user);

        // Na remoção o rastro que importa é o `old_values`: é ele que diz qual
        // objeto foi apagado do bucket. O `new_values` do owen-it não carrega
        // a chave nesse caso (o valor novo é `null`) — asserir presença ali
        // reprovaria por um detalhe do pacote, não pela garantia.
        $remocao = $user->audits()->latest('id')->first();
        $this->assertSame($segunda, $remocao->old_values['photo_path'] ?? null);
        $this->assertNull($remocao->new_values['photo_path'] ?? null);
        $this->assertNull($user->refresh()->photo_path);
    }

    /**
     * `/api/users/{user}/photo` é a rota de foto do STAFF, sob
     * `identity.user.update`. Sem a guarda de `type`, quem administra staff
     * alcança a foto de cliente/aluno/redator por ela, driblando a permissão
     * do módulo dono (`commercial.client.update` etc.) — exatamente o
     * acoplamento RBAC cross-módulo que a spec D1 evita ao ter 4 controllers.
     * `UserController::show/update/destroy` já usa a mesma guarda.
     */
    public function test_rota_de_foto_do_staff_recusa_user_que_nao_e_admin(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $clientUser = $this->makeClientWithUser([], ['rut' => '12.345.688-2'])->user;
        app(UserPhotoService::class)->store($clientUser, UploadedFile::fake()->image('logo.png'));
        $path = $clientUser->refresh()->photo_path;

        $this->post("/api/users/{$clientUser->id}/photo", [
            'photo' => UploadedFile::fake()->image('outra.png'),
        ])->assertNotFound();

        $this->deleteJson("/api/users/{$clientUser->id}/photo")->assertNotFound();

        $this->assertSame($path, $clientUser->refresh()->photo_path);
    }

    public function test_post_photo_do_usuario_devolve_204_e_grava(): void
    {
        $storage = Storage::fake('s3');
        $this->actingAsAdmin();
        $target = User::factory()->create(['type' => 'admin']);

        $this->post("/api/users/{$target->id}/photo", [
            'photo' => UploadedFile::fake()->image('foto.png'),
        ])->assertNoContent();

        $target->refresh();
        $this->assertNotNull($target->photo_path);
        $storage->assertExists($target->photo_path);
    }

    public function test_delete_photo_do_usuario_devolve_204(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $target = User::factory()->create(['type' => 'admin']);
        app(UserPhotoService::class)->store($target, UploadedFile::fake()->image('foto.png'));

        $this->deleteJson("/api/users/{$target->id}/photo")->assertNoContent();

        $this->assertNull($target->refresh()->photo_path);
    }

    public function test_photo_com_mime_invalido_da_422_com_envelope_rfc7807(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $target = User::factory()->create(['type' => 'admin']);

        $this->post("/api/users/{$target->id}/photo", [
            'photo' => UploadedFile::fake()->create('contrato.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertHeader('content-type', 'application/problem+json')
            ->assertJsonPath('errors.photo.0', fn ($m) => is_string($m));
    }

    public function test_photo_acima_de_5mb_da_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $target = User::factory()->create(['type' => 'admin']);

        // 6 MB em kilobytes — acima do teto de 5120 KB, abaixo dos 12 MB de
        // transporte do nginx/PHP, para que quem rejeite seja o Laravel.
        $this->post("/api/users/{$target->id}/photo", [
            'photo' => UploadedFile::fake()->create('grande.jpg', 6144, 'image/jpeg'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.photo.0', fn ($m) => is_string($m));
    }

    public function test_redator_nao_gerencia_foto_de_nenhuma_entidade(): void
    {
        Storage::fake('s3');
        $this->actingAsRedator();

        $target = User::factory()->create(['type' => 'admin']);
        $redator = User::factory()->create(['type' => 'redator', 'rut' => '12.345.679-3'])
            ->redator()->create([]);
        $student = User::factory()->create(['type' => 'aluno', 'rut' => '12.345.680-7'])
            ->student()->create([]);
        $client = $this->makeClientWithUser([], ['rut' => '12.345.681-5']);

        $photo = ['photo' => UploadedFile::fake()->image('foto.png')];

        $this->post("/api/users/{$target->id}/photo", $photo)->assertForbidden();
        $this->post("/api/redatores/{$redator->id}/photo", $photo)->assertForbidden();
        $this->post("/api/students/{$student->id}/photo", $photo)->assertForbidden();
        $this->post("/api/clients/{$client->id}/photo", $photo)->assertForbidden();

        $this->deleteJson("/api/users/{$target->id}/photo")->assertForbidden();
        $this->deleteJson("/api/clients/{$client->id}/photo")->assertForbidden();
    }

    public function test_post_photo_das_outras_tres_entidades_grava_no_user_da_entidade(): void
    {
        $storage = Storage::fake('s3');
        $this->actingAsAdmin();

        $redator = User::factory()->create(['type' => 'redator', 'rut' => '12.345.682-3'])
            ->redator()->create([]);
        $student = User::factory()->create(['type' => 'aluno', 'rut' => '12.345.683-1'])
            ->student()->create([]);
        $client = $this->makeClientWithUser([], ['rut' => '12.345.684-K']);

        foreach ([
            "/api/redatores/{$redator->id}/photo" => $redator,
            "/api/students/{$student->id}/photo" => $student,
            "/api/clients/{$client->id}/photo" => $client,
        ] as $url => $entity) {
            $this->post($url, ['photo' => UploadedFile::fake()->image('foto.png')])
                ->assertNoContent();

            $path = $entity->user()->first()->photo_path;
            $this->assertNotNull($path, "photo_path nulo depois de POST em {$url}");
            $storage->assertExists($path);
        }
    }

    public function test_photo_url_e_null_sem_foto_e_string_com_foto(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $target = User::factory()->create(['type' => 'admin']);
        $target->assignRole('admin');

        $this->getJson("/api/users/{$target->id}")
            ->assertOk()
            ->assertJsonPath('photo_url', null);

        $this->post("/api/users/{$target->id}/photo", [
            'photo' => UploadedFile::fake()->image('foto.png'),
        ])->assertNoContent();

        $url = $this->getJson("/api/users/{$target->id}")->assertOk()->json('photo_url');
        $this->assertIsString($url);
    }

    public function test_photo_url_aparece_nas_outras_tres_entidades(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $redator = User::factory()->create(['type' => 'redator', 'rut' => '12.345.685-8'])
            ->redator()->create([]);
        $student = User::factory()->create(['type' => 'aluno', 'rut' => '12.345.686-6'])
            ->student()->create([]);
        $client = $this->makeClientWithUser([], ['rut' => '12.345.687-4']);

        foreach ([
            "/api/redatores/{$redator->id}" => "/api/redatores/{$redator->id}/photo",
            "/api/clients/{$client->id}" => "/api/clients/{$client->id}/photo",
        ] as $showUrl => $photoUrl) {
            $this->getJson($showUrl)->assertOk()->assertJsonPath('photo_url', null);

            $this->post($photoUrl, ['photo' => UploadedFile::fake()->image('foto.png')])
                ->assertNoContent();

            $this->assertIsString(
                $this->getJson($showUrl)->assertOk()->json('photo_url'),
                "photo_url ausente em {$showUrl} depois do upload",
            );
        }

        $studentFromIndex = function () use ($student): array {
            $item = collect($this->getJson('/api/students')->assertOk()->json('data'))
                ->firstWhere('id', $student->id);

            $this->assertIsArray($item);

            return $item;
        };

        $this->assertNull($studentFromIndex()['photo_url']);

        $this->post("/api/students/{$student->id}/photo", [
            'photo' => UploadedFile::fake()->image('foto.png'),
        ])->assertNoContent();

        $this->assertIsString($studentFromIndex()['photo_url']);
    }

    /**
     * Achado real de produção (2026-07-31): uma falha silenciosa de escrita
     * (MinIO/S3 indisponível, permissão, disco cheio) faz `UploadedFile::store()`
     * devolver `false` em vez de lançar. O código antigo não checava isso: o
     * `false` virava `photo_path = '0'` no banco (coerção de tipo) e, pior, o
     * objeto ANTIGO (que ainda funcionava) era apagado, porque o service achava
     * que o update tinha ido bem. Resultado real observado: cliente perdeu a
     * foto que tinha e ficou com uma URL pré-assinada apontando para um objeto
     * "0" que nunca existiu.
     */
    public function test_falha_no_upload_nao_corrompe_photo_path_nem_apaga_o_antigo(): void
    {
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);

        $service->store($user, UploadedFile::fake()->image('primeira.png'));
        $old = $user->refresh()->photo_path;
        $storage->assertExists($old);

        // Simula falha real de escrita (não mock): remove permissão de escrita
        // do diretório ONDE O ARQUIVO JÁ EXISTE — igual ao caso real, em que o
        // diretório do usuário já existe da foto anterior e só a escrita do
        // arquivo NOVO falha. `chmod` na raiz do disco fake não reproduz a
        // falha (a raiz tem outros efeitos colaterais); no diretório-folha
        // real, força `UploadedFile::store()` a devolver `false`, como uma
        // falha real de permissão/disco cheio/S3 indisponível faria.
        $leafDir = dirname(Storage::disk('s3')->path($old));
        chmod($leafDir, 0555);

        // A exceção é capturada À MÃO, não por `expectException`: com
        // `expectException`, a exceção sai do método de teste e as asserções
        // abaixo — que são as que provam a garantia real — nunca rodam, mas o
        // teste passa mesmo assim.
        try {
            $service->store($user, UploadedFile::fake()->image('segunda.png'));
            $this->fail('store() deveria abortar quando a escrita no disco falha');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('Falha ao gravar a foto', $e->getMessage());
        } finally {
            chmod($leafDir, 0755);
        }

        $user->refresh();
        $this->assertSame($old, $user->photo_path, 'photo_path não pode corromper numa falha de upload');
        // Sem mensagem: o 2º argumento de `assertExists` é o CONTEÚDO esperado
        // do arquivo, não uma descrição — passar texto aqui compara o texto com
        // os bytes do PNG e reprova por motivo errado.
        $storage->assertExists($old);
    }

    /**
     * P-24. O evento `updated` do owen-it dispara DEPOIS do SQL UPDATE, dentro
     * da mesma chamada. Sem transação, uma auditoria que lança deixa a coluna
     * já gravada e a compensação apaga um objeto que o banco REFERENCIA — o
     * comentário "ninguém aponta para ele" vira falso. Com transação, o
     * rollback desfaz o UPDATE e a compensação volta a ser verdadeira.
     */
    public function test_falha_na_auditoria_desfaz_o_update_e_apaga_o_objeto_novo(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        Event::listen('eloquent.updated: '.User::class, function (): void {
            throw new RuntimeException('auditoria fora do ar');
        });

        try {
            app(UserPhotoService::class)->store($user, UploadedFile::fake()->image('foto.png'));
            $this->fail('esperava RuntimeException');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertNull($user->fresh()->photo_path);
        $this->assertSame([], $storage->allFiles(), 'objeto novo ficou no bucket sem ninguém apontar para ele');
    }

    public function test_falha_na_auditoria_preserva_a_foto_anterior(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);

        $service->store($user, UploadedFile::fake()->image('primeira.png'));
        $old = $user->fresh()->photo_path;

        Event::listen('eloquent.updated: '.User::class, function (): void {
            throw new RuntimeException('auditoria fora do ar');
        });

        try {
            $service->store($user->fresh(), UploadedFile::fake()->image('segunda.png'));
            $this->fail('esperava RuntimeException');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertSame($old, $user->fresh()->photo_path);
        $storage->assertExists($old);
        $this->assertCount(1, $storage->allFiles(), 'sobrou objeto além da foto anterior');
    }
}
