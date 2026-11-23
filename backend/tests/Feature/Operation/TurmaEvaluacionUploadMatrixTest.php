<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Support\PermissionCatalog;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Role;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Matriz de quem anexa e quem remove cada tipo de documento da turma (spec
 * §4.6): MANUAL/EVALUACION_REDATOR e EVALUACION_ALUNO são do redator em
 * andamento; EVALUACION_CLIENTE é do admin (`submit_client_evaluation`) em
 * qualquer status; turma concluída só reabre com `manage_concluded_docs`,
 * exceto EVALUACION_ALUNO, que o redator ainda anexa.
 */
class TurmaEvaluacionUploadMatrixTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private const PERMISSAO_CLIENTE = 'operation.turma.submit_client_evaluation';

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        $this->seed(RolePermissionSeeder::class);

        $clientId = $this->makeClientWithUser()->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->create('doc.pdf', 20, 'application/pdf');
    }

    private function concluir(): void
    {
        $this->turma->update(['status' => TurmaStatus::Concluida, 'concluded_at' => now()]);
    }

    private function entrar(string $papel): void
    {
        if ($papel === 'redator') {
            $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
            $user->assignRole('redator');
            $this->turma->redatores()->attach($user->redator()->create([])->id);
            $this->actingAs($user, 'web');

            return;
        }

        $papel === 'superadmin' ? $this->actingAsSuperadmin() : $this->actingAsAdmin();
    }

    private function anexado(TurmaDocumentType $tipo): int
    {
        return app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, $tipo, $this->pdf(), $this->superadminDeFundo())
            ->id;
    }

    /** Ator de fundo: o gate recusa qualquer outro, então o arquivo semeado sai do superadmin. */
    private function superadminDeFundo(): User
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('superadmin');

        return $user;
    }

    /** @return array<string,array{string,string,string,int}> */
    public static function anexar(): array
    {
        $linhas = [];
        $tipos = ['MANUAL', 'EVALUACION_REDATOR', 'EVALUACION_ALUNO', 'EVALUACION_CLIENTE'];
        $esperado = [
            'em_andamento' => [
                'redator' => [201, 201, 201, 403],
                'admin' => [403, 403, 403, 201],
                'superadmin' => [201, 201, 201, 201],
            ],
            'concluida' => [
                'redator' => [422, 422, 201, 403],
                'admin' => [403, 403, 403, 201],
                'superadmin' => [201, 201, 201, 201],
            ],
        ];

        foreach ($esperado as $status => $porPapel) {
            foreach ($porPapel as $papel => $codigos) {
                foreach ($tipos as $i => $tipo) {
                    $linhas["$papel anexa $tipo em $status"] = [$papel, $status, $tipo, $codigos[$i]];
                }
            }
        }

        return $linhas;
    }

    /** @return array<string,array{string,string,string,int}> */
    public static function remover(): array
    {
        $linhas = [];
        $tipos = ['MANUAL', 'EVALUACION_REDATOR', 'EVALUACION_ALUNO', 'EVALUACION_CLIENTE'];
        $esperado = [
            'em_andamento' => [
                'redator' => [204, 204, 204, 403],
                'admin' => [403, 403, 403, 204],
                'superadmin' => [204, 204, 204, 204],
            ],
            'concluida' => [
                'redator' => [422, 422, 422, 403],
                'admin' => [403, 403, 403, 422],
                'superadmin' => [204, 204, 204, 204],
            ],
        ];

        foreach ($esperado as $status => $porPapel) {
            foreach ($porPapel as $papel => $codigos) {
                foreach ($tipos as $i => $tipo) {
                    $linhas["$papel remove $tipo em $status"] = [$papel, $status, $tipo, $codigos[$i]];
                }
            }
        }

        return $linhas;
    }

    #[DataProvider('anexar')]
    public function test_matriz_de_anexar(string $papel, string $status, string $tipo, int $esperado): void
    {
        $status === 'concluida' && $this->concluir();
        $this->entrar($papel);

        $resposta = $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => $tipo, 'file' => $this->pdf(),
        ])->assertStatus($esperado);

        if ($esperado === 201) {
            $resposta->assertJsonPath('type', $tipo);
        } else {
            $this->assertSame([], Storage::disk('s3')->allFiles(), 'recusa antes de subir o binário');
        }
    }

    #[DataProvider('remover')]
    public function test_matriz_de_remover(string $papel, string $status, string $tipo, int $esperado): void
    {
        $fileId = $this->anexado(TurmaDocumentType::from($tipo));
        $status === 'concluida' && $this->concluir();
        $this->entrar($papel);

        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")->assertStatus($esperado);

        $esperado === 204
            ? $this->assertSoftDeleted('files', ['id' => $fileId])
            : $this->assertNotSoftDeleted('files', ['id' => $fileId]);
    }

    public function test_redator_anexa_alumnos_em_turma_concluida(): void
    {
        $this->concluir();
        $this->entrar('redator');

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'EVALUACION_ALUNO', 'file' => $this->pdf(),
        ])->assertCreated()->assertJsonPath('type', 'EVALUACION_ALUNO');
    }

    public function test_redator_manual_em_turma_concluida_recusa_concluded_locked(): void
    {
        $this->concluir();
        $this->entrar('redator');

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->assertStatus(422)
            ->assertJsonPath('errors.turma.0', __('operation.turma.concluded_locked'));
    }

    public function test_admin_manual_em_turma_em_andamento_e_403(): void
    {
        $this->entrar('admin');

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->assertForbidden()
            ->assertJsonPath('detail', __('operation.turma.document_type_forbidden'));
    }

    public function test_admin_anexa_cliente_em_andamento_e_concluida(): void
    {
        $this->entrar('admin');

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'EVALUACION_CLIENTE', 'file' => $this->pdf(),
        ])->assertCreated();

        $this->concluir();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'EVALUACION_CLIENTE', 'file' => $this->pdf(),
        ])->assertCreated();
    }

    public function test_redator_cliente_e_403(): void
    {
        $this->entrar('redator');

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'EVALUACION_CLIENTE', 'file' => $this->pdf(),
        ])->assertForbidden()
            ->assertJsonPath('detail', __('operation.turma.document_type_forbidden'));
    }

    /** Só o superadmin (`manage_concluded_docs`) remove em concluída: a linha dele está em `remover()`. */
    public function test_admin_remove_cliente_de_concluida_recusa(): void
    {
        $fileId = $this->anexado(TurmaDocumentType::EVALUACION_CLIENTE);
        $this->concluir();
        $this->entrar('admin');

        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")
            ->assertStatus(422)
            ->assertJsonPath('errors.turma.0', __('operation.turma.concluded_locked'));
        $this->assertNotSoftDeleted('files', ['id' => $fileId]);
    }

    public function test_submit_client_evaluation_e_do_admin_e_do_superadmin_nao_do_redator(): void
    {
        $this->assertTrue(Role::findByName('superadmin', 'web')->hasPermissionTo(self::PERMISSAO_CLIENTE));
        $this->assertTrue(Role::findByName('admin', 'web')->hasPermissionTo(self::PERMISSAO_CLIENTE));
        $this->assertFalse(Role::findByName('redator', 'web')->hasPermissionTo(self::PERMISSAO_CLIENTE));
        $this->assertNotContains(self::PERMISSAO_CLIENTE, PermissionCatalog::SEGREGATED);
    }
}
