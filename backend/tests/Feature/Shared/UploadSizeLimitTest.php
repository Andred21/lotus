<?php

namespace Tests\Feature\Shared;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
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

    private int $budgetCounter = 0;

    private function budget(): Budget
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $this->budgetCounter++;

        return Budget::create(['client_id' => $clientId, 'code' => "Scap {$this->budgetCounter}"]);
    }

    private function quote(): Quote
    {
        return Quote::create([
            'budget_id' => $this->budget()->id,
            'course_id' => Course::create(['name' => 'C', 'workload_hours' => 8])->id,
            'seq_in_budget' => 1,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'pending',
        ]);
    }

    private function turma(): Turma
    {
        $quote = $this->quote();

        return Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-10',
        ]);
    }

    /** Redator autentica (RN-01) e a role dele TEM submit_docs — admin comum não tem (D9). */
    private function actingAsRedatorRole(): User
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return $user;
    }

    public function test_anexo_de_cotacao_acima_de_10mb_e_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $quote = $this->quote();

        $this->postJson("/api/quotes/{$quote->id}/files", [
            'type' => 'quote_document',
            'file' => UploadedFile::fake()->create('grande.pdf', self::OVERSIZED_KB, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_anexo_de_orcamento_acima_de_10mb_e_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $budget = $this->budget();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'invoice',
            'file' => UploadedFile::fake()->create('grande.pdf', self::OVERSIZED_KB, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_anexo_no_limite_e_aceito(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $quote = $this->quote();

        $this->postJson("/api/quotes/{$quote->id}/files", [
            'type' => 'quote_document',
            'file' => UploadedFile::fake()->create('no-limite.pdf', 10240, 'application/pdf'),
        ])->assertCreated();
    }

    public function test_documento_de_turma_acima_de_10mb_e_422(): void
    {
        Storage::fake('s3');
        $this->actingAsRedatorRole();

        $turma = $this->turma();

        $this->postJson("/api/turmas/{$turma->id}/documents", [
            'type' => 'MANUAL',
            'file' => UploadedFile::fake()->create('grande.pdf', self::OVERSIZED_KB, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_documento_do_redator_acima_de_10mb_e_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan Morales', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf')],
        ])->json('id');

        $this->postJson("/api/redatores/{$id}/documents", [
            'type' => 'CV',
            'file' => UploadedFile::fake()->create('grande.pdf', self::OVERSIZED_KB, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_import_de_matricula_acima_de_10mb_e_422(): void
    {
        $this->actingAsAdmin();

        $turma = $this->turma();

        $this->postJson("/api/turmas/{$turma->id}/alunos/importar", [
            'file' => UploadedFile::fake()->create('grande.xlsx', self::OVERSIZED_KB),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }
}
