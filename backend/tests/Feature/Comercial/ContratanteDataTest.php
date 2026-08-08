<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Operation\Models\Turma;
use App\Shared\Data\ContratanteData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ContratanteDataTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    /**
     * ContratanteData deve projetar razão social (legal_name) do Client,
     * não o nome do User de cadastro.
     */
    public function test_contratante_returns_legal_name_not_user_name(): void
    {
        $client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Legal SpA'],
            ['name' => 'Empresa Cliente', 'rut' => '12345678-K']
        );

        $contratante = $client->contratante();

        $this->assertInstanceOf(ContratanteData::class, $contratante);
        $this->assertSame('Empresa Legal SpA', $contratante->name);
        $this->assertSame('12345678-K', $contratante->rut);
    }

    /**
     * Turma::contratante() retorna ContratanteData derivada da cadeia
     * de travessia (quote -> budget -> client).
     */
    public function test_turma_contratante_returns_legal_name_from_client(): void
    {
        $client = $this->makeClientWithUser(
            ['legal_name' => 'Turma Empresa SpA'],
            ['rut' => '87654321-J']
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'TEST-001']);
        $quote = $budget->quotes()->create([
            'course_id' => $this->makeCourse()->id,
            'seq_in_budget' => 1,
            'student_count' => 5,
            'value_uf' => 100,
            'status' => 'approved',
        ]);
        $turma = $quote->turma()->create([
            'course_id' => $quote->course_id,
            'modalidade' => 'presencial',
            'start_date' => now()->addDays(7),
            'end_date' => now()->addDays(14),
            'status' => 'em_andamento',
        ]);

        $contratante = $turma->contratante();

        $this->assertInstanceOf(ContratanteData::class, $contratante);
        $this->assertSame('Turma Empresa SpA', $contratante->name);
        $this->assertSame('87654321-J', $contratante->rut);
    }

    /**
     * Turma::contratanteClient() retorna a instância do Client,
     * permitindo verificação de identidade.
     */
    public function test_turma_contratante_client_returns_client_instance(): void
    {
        $client = $this->makeClientWithUser(
            ['legal_name' => 'Identity Empresa SpA'],
            ['rut' => '11111111-1']
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'TEST-002']);
        $quote = $budget->quotes()->create([
            'course_id' => $this->makeCourse()->id,
            'seq_in_budget' => 1,
            'student_count' => 5,
            'value_uf' => 100,
            'status' => 'approved',
        ]);
        $turma = $quote->turma()->create([
            'course_id' => $quote->course_id,
            'modalidade' => 'presencial',
            'start_date' => now()->addDays(7),
            'end_date' => now()->addDays(14),
            'status' => 'em_andamento',
        ]);

        $contratanteClient = $turma->contratanteClient();

        $this->assertTrue($contratanteClient->is($client));
    }

    /**
     * Quote::contratante() retorna ContratanteData derivada do cliente
     * do orçamento.
     */
    public function test_quote_contratante_returns_legal_name_from_budget_client(): void
    {
        $client = $this->makeClientWithUser(
            ['legal_name' => 'Quote Empresa SpA'],
            ['rut' => '22222222-2']
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'TEST-003']);
        $quote = $budget->quotes()->create([
            'course_id' => $this->makeCourse()->id,
            'seq_in_budget' => 1,
            'student_count' => 5,
            'value_uf' => 100,
            'status' => 'approved',
        ]);

        $contratante = $quote->contratante();

        $this->assertInstanceOf(ContratanteData::class, $contratante);
        $this->assertSame('Quote Empresa SpA', $contratante->name);
        $this->assertSame('22222222-2', $contratante->rut);
    }

    /**
     * `users.rut` é nullable no schema, e a razão social é legível sem ele. O
     * seam não pode transformar RUT ausente em TypeError: quem lê só o `name`
     * (TurmaData, PendingQuoteData, IssuableTurmaData, ImportStudentsAction e
     * o Blade do manual) passou a atravessar o `User` por causa do B4, e antes
     * dele essas cinco projeções nunca o tocavam.
     */
    public function test_contratante_sobrevive_a_rut_ausente_no_cadastro(): void
    {
        $client = $this->makeClientWithUser(
            ['legal_name' => 'Sin RUT SpA'],
            ['rut' => null],
        );

        $contratante = $client->contratante();

        $this->assertSame('Sin RUT SpA', $contratante->name);
        $this->assertNull($contratante->rut);
    }
}
