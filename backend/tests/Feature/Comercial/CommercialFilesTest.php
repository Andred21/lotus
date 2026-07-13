<?php

namespace Tests\Feature\Comercial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CommercialFilesTest extends TestCase
{
    use RefreshDatabase;

    private int $budgetCounter = 0;

    private function budget(): Budget
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $this->budgetCounter++;

        return Budget::create(['client_id' => $clientId, 'code' => "Scap {$this->budgetCounter}"]);
    }

    public function test_upload_fatura_no_orcamento(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'invoice',
            'file' => UploadedFile::fake()->create('fatura.pdf', 20, 'application/pdf'),
        ])->assertCreated()->assertJsonPath('type', 'invoice')->assertJsonPath('original_name', 'fatura.pdf');

        $this->assertDatabaseHas('files', [
            'fileable_type' => 'budget', 'fileable_id' => $budget->id, 'type' => 'invoice',
        ]);
    }

    public function test_upload_documento_na_cotacao(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'pending',
        ]);

        $this->postJson("/api/quotes/{$quote->id}/files", [
            'type' => 'quote_document',
            'file' => UploadedFile::fake()->create('aceite.pdf', 10, 'application/pdf'),
        ])->assertCreated()->assertJsonPath('type', 'quote_document');

        $this->assertDatabaseHas('files', [
            'fileable_type' => 'quote', 'fileable_id' => $quote->id, 'type' => 'quote_document',
        ]);
    }

    public function test_tipo_invalido_rejeitado(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'random',
            'file' => UploadedFile::fake()->create('x.pdf', 1, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('type');
    }

    public function test_delete_cross_orcamento_404(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $b1 = $this->budget();
        $b2 = $this->budget();

        $fileId = $this->postJson("/api/budgets/{$b1->id}/files", [
            'type' => 'invoice',
            'file' => UploadedFile::fake()->create('f.pdf', 1, 'application/pdf'),
        ])->json('id');

        // tentar deletar pelo orçamento errado → 404 (posse)
        $this->deleteJson("/api/budgets/{$b2->id}/files/{$fileId}")->assertNotFound();
        // pelo dono → 204
        $this->deleteJson("/api/budgets/{$b1->id}/files/{$fileId}")->assertNoContent();
    }

    public function test_delete_cross_tipo_arquivo_de_budget_pela_rota_de_quote_404(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'pending',
        ]);

        $fileId = $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'invoice',
            'file' => UploadedFile::fake()->create('f.pdf', 1, 'application/pdf'),
        ])->json('id');

        // arquivo pertence ao budget (fileable_type='budget'); a rota de quote
        // deve dar 404 pelo TIPO, não só pela posse (mesmo id do arquivo).
        $this->deleteJson("/api/quotes/{$quote->id}/files/{$fileId}")->assertNotFound();
        $this->assertDatabaseHas('files', ['id' => $fileId, 'deleted_at' => null]);
    }

    public function test_upload_no_budget_aparece_no_get(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'invoice',
            'file' => UploadedFile::fake()->create('fatura.pdf', 20, 'application/pdf'),
        ])->assertCreated();

        $response = $this->getJson("/api/budgets/{$budget->id}")->assertOk();
        $response->assertJsonPath('files.0.type', 'invoice')
            ->assertJsonPath('files.0.original_name', 'fatura.pdf');
        $this->assertNotEmpty($response->json('files.0.id'));
        $this->assertStringContainsString('http', $response->json('files.0.download_url'));
    }

    public function test_upload_na_cotacao_aparece_no_get(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'pending',
        ]);

        $this->postJson("/api/quotes/{$quote->id}/files", [
            'type' => 'quote_document',
            'file' => UploadedFile::fake()->create('aceite.pdf', 10, 'application/pdf'),
        ])->assertCreated();

        $response = $this->getJson("/api/quotes/{$quote->id}")->assertOk();
        $response->assertJsonPath('files.0.type', 'quote_document')
            ->assertJsonPath('files.0.original_name', 'aceite.pdf');
        $this->assertNotEmpty($response->json('files.0.id'));
        $this->assertStringContainsString('http', $response->json('files.0.download_url'));
    }
}
