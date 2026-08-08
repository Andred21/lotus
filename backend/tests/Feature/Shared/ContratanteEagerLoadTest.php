<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Companheiro de RUNTIME da catraca `ContratanteSeamTest` (que é estática).
 *
 * O seam do B4 (`Client::contratante()`) lê `user->rut`, e antes dele estas
 * projeções liam só `clients.legal_name` — nunca tocavam o `User`. Quem
 * concentra a travessia num VO precisa concentrar a CARGA junto, senão o seam
 * troca uma duplicação visível por um N+1 invisível: medido em 2026-08-08,
 * 4 turmas custavam 4 SELECTs extras em `users`, um por turma.
 *
 * `Model::preventLazyLoading()` só marca a instância quando ela vem de um
 * `hydrate()` com MAIS de uma linha (`Builder::hydrate()`, condicional a
 * `count($items) > 1`) — por isso cada cenário aqui materializa DUAS cadeias
 * completas e distintas, e não uma.
 */
class ContratanteEagerLoadTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private int $seq = 0;

    protected function tearDown(): void
    {
        Model::preventLazyLoading(false);

        parent::tearDown();
    }

    public function test_listagem_de_turmas_nao_lazy_loada_o_user_do_contratante(): void
    {
        $this->actingAsAdmin();
        $this->makeCadeia();
        $this->makeCadeia();

        Model::preventLazyLoading();

        $this->getJson('/api/turmas')->assertOk()->assertJsonCount(2);
    }

    public function test_cotacoes_pendentes_nao_lazy_loadam_o_user_do_contratante(): void
    {
        $this->actingAsAdmin();
        $this->makeCadeia(comTurma: false);
        $this->makeCadeia(comTurma: false);

        Model::preventLazyLoading();

        $this->getJson('/api/turmas/pendientes-configuracion')->assertOk()->assertJsonCount(2);
    }

    public function test_lista_de_emitiveis_nao_lazy_loada_o_user_do_contratante(): void
    {
        $this->actingAsAdmin();
        $this->makeEmitivel();
        $this->makeEmitivel();

        Model::preventLazyLoading();

        $this->getJson('/api/certificates/issuable')->assertOk()->assertJsonCount(2);
    }

    /** Cadeia comercial completa e distinta das demais (RUT é `unique`). */
    private function makeCadeia(bool $comTurma = true): void
    {
        $n = ++$this->seq;
        $client = $this->makeClientWithUser(
            ['legal_name' => "Empresa Legal {$n} SpA"],
            ['name' => "Empresa Cliente {$n}", 'rut' => $this->nextRut()],
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => "Scap {$n}"]);
        $course = $this->makeCourse(['name' => "Curso {$n}"]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 1, 'value_uf' => 10, 'status' => 'approved',
        ]);

        if (! $comTurma) {
            return;
        }

        Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-07-20', 'end_date' => '2026-07-24',
            'status' => TurmaStatus::Concluida,
        ]);
    }

    /** Cadeia que passa nas seis portas do `CertificateEligibility`. */
    private function makeEmitivel(): void
    {
        $n = ++$this->seq;

        IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa Legal {$n} SpA"], ['rut' => $this->nextRut()])
            ->course(['name' => "Curso {$n}"])
            ->student(['rut' => $this->nextRut()])
            ->redatorUser(['rut' => $this->nextRut()])
            ->create();
    }

    private function nextRut(): string
    {
        return '1.000.'.str_pad((string) ++$this->seq, 3, '0', STR_PAD_LEFT).'-0';
    }
}
