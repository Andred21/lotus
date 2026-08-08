<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ManualTurmaTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = $this->makeClientWithUser(['legal_name' => 'ACME Chile'], ['rut' => '33.444.555-0'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = $this->makeCourse(['name' => 'Alta Tensión', 'workload_hours' => 8]);
        $course->modules()->create([
            'sort_order' => 0, 'name' => 'Módulo Seguridad', 'learnings' => 'L',
            'contents' => 'C', 'theory_hours' => 4, 'practice_hours' => 4,
        ]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
    }

    public function test_manual_devolve_pdf_do_gotenberg(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF-fake')]);

        $response = $this->get("/api/turmas/{$this->turma->id}/manual");

        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->getContent());

        // O HTML enviado ao Gotenberg leva os dados reais da turma (RF-TUR-04)
        Http::assertSent(function ($request) {
            $body = (string) $request->body();

            return str_contains($body, 'Alta Tensión')
                && str_contains($body, 'ACME Chile')
                && str_contains($body, 'Módulo Seguridad')
                && str_contains($body, 'Santiago');
        });
    }

    public function test_gotenberg_fora_do_ar_500_rfc7807(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('boom', 503)]);

        $this->getJson("/api/turmas/{$this->turma->id}/manual")->assertStatus(500);
    }

    public function test_manual_exige_turma_view(): void
    {
        // autenticado sem nenhuma permissão → 403
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($user, 'web');

        $this->getJson("/api/turmas/{$this->turma->id}/manual")->assertForbidden();
    }
}
