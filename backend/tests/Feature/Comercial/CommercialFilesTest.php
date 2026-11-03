<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Shared\Files\MalwareScanner;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CommercialFilesTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private int $budgetCounter = 0;

    private function budget(): Budget
    {
        $clientId = $this->makeClientWithUser()->id;
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
        $courseId = $this->makeCourse()->id;
        $quote = Quote::forceCreate([
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

    public function test_tipo_invalido_nao_escaneia(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'xxx',
            'file' => UploadedFile::fake()->create('x.pdf', 1, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('type');

        $this->assertSame([], app(MalwareScanner::class)->escaneados);
    }

    public function test_cotizacion_aceita_so_quote_document(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $this->makeCourse()->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'pending',
        ]);

        $this->postJson("/api/quotes/{$quote->id}/files", [
            'type' => 'invoice',
            'file' => UploadedFile::fake()->create('x.pdf', 1, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('type');
    }

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
        $courseId = $this->makeCourse()->id;
        $quote = Quote::forceCreate([
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
        $courseId = $this->makeCourse()->id;
        $quote = Quote::forceCreate([
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

    private function quote(Budget $budget): Quote
    {
        return Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $this->makeCourse()->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'pending',
        ]);
    }

    private function sobe(string $rota, string $tipo, string $nome): int
    {
        return $this->postJson($rota, [
            'type' => $tipo,
            'file' => UploadedFile::fake()->create($nome, 5, 'application/pdf'),
        ])->assertCreated()->json('id');
    }

    private function assertAuditoriaDeDelecao(int $fileId): void
    {
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file', 'auditable_id' => $fileId, 'event' => 'deleted',
        ]);
    }

    public function test_novo_upload_do_mesmo_tipo_substitui_no_orcamento(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $primeiro = $this->sobe("/api/budgets/{$budget->id}/files", 'invoice', 'a.pdf');
        $segundo = $this->sobe("/api/budgets/{$budget->id}/files", 'invoice', 'b.pdf');

        $this->assertTrue(File::withTrashed()->findOrFail($primeiro)->trashed());
        $this->assertAuditoriaDeDelecao($primeiro);
        $vivos = $budget->files()->where('type', 'invoice')->get();
        $this->assertCount(1, $vivos);
        $this->assertSame($segundo, $vivos->first()->id);
    }

    public function test_substituir_nao_toca_outro_tipo(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $this->sobe("/api/budgets/{$budget->id}/files", 'invoice', 'a.pdf');
        $recibo = $this->sobe("/api/budgets/{$budget->id}/files", 'receipt', 'r.pdf');
        $this->sobe("/api/budgets/{$budget->id}/files", 'invoice', 'b.pdf');

        $this->assertFalse(File::withTrashed()->findOrFail($recibo)->trashed());
    }

    public function test_novo_upload_substitui_na_cotacao(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $quote = $this->quote($this->budget());

        $primeiro = $this->sobe("/api/quotes/{$quote->id}/files", 'quote_document', 'a.pdf');
        $segundo = $this->sobe("/api/quotes/{$quote->id}/files", 'quote_document', 'b.pdf');

        $this->assertTrue(File::withTrashed()->findOrFail($primeiro)->trashed());
        $this->assertAuditoriaDeDelecao($primeiro);
        $vivos = $quote->files()->where('type', 'quote_document')->get();
        $this->assertCount(1, $vivos);
        $this->assertSame($segundo, $vivos->first()->id);
    }

    public function test_duplicados_antigos_saem_todos_no_proximo_upload(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $antigos = collect([1, 2])->map(fn (int $n) => $budget->files()->create([
            'type' => 'invoice', 'path' => "budget/{$budget->id}/{$n}.pdf",
            'original_name' => "{$n}.pdf", 'mime' => 'application/pdf', 'size' => 10,
        ])->id);

        $novo = $this->sobe("/api/budgets/{$budget->id}/files", 'invoice', 'c.pdf');

        $this->assertSame([$novo], $budget->files()->where('type', 'invoice')->pluck('id')->all());
        $antigos->each(function (int $id) {
            $this->assertTrue(File::withTrashed()->findOrFail($id)->trashed());
            $this->assertAuditoriaDeDelecao($id);
        });
    }

    public function test_arquivar_e_restaurar_nao_ressuscita_o_substituido(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $primeiro = $this->sobe("/api/budgets/{$budget->id}/files", 'invoice', 'a.pdf');
        $segundo = $this->sobe("/api/budgets/{$budget->id}/files", 'invoice', 'b.pdf');

        $this->deleteJson("/api/budgets/{$budget->id}")->assertNoContent();
        $this->postJson("/api/budgets/{$budget->id}/restore")->assertOk();

        $this->assertTrue(File::withTrashed()->findOrFail($primeiro)->trashed());
        $this->assertSame([$segundo], $budget->files()->where('type', 'invoice')->pluck('id')->all());
    }

    /** Mesmo mecanismo do orçamento (`Quote::booted`): o substituído não volta. */
    public function test_arquivar_e_restaurar_a_cotacao_nao_ressuscita_o_substituido(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $quote = $this->quote($this->budget());

        $primeiro = $this->sobe("/api/quotes/{$quote->id}/files", 'quote_document', 'a.pdf');
        $segundo = $this->sobe("/api/quotes/{$quote->id}/files", 'quote_document', 'b.pdf');

        $this->deleteJson("/api/quotes/{$quote->id}")->assertNoContent();
        $this->postJson("/api/quotes/{$quote->id}/restore")->assertOk();

        $this->assertTrue(File::withTrashed()->findOrFail($primeiro)->trashed());
        $this->assertSame([$segundo], $quote->files()->where('type', 'quote_document')->pluck('id')->all());
    }
}
