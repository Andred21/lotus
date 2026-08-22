<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Ownership por DADO, não por permissão. `operation.turma.view` concede o
 * direito de ver turmas; quais turmas é escopo de query (spec D1) — Policy
 * não filtra `index`, e ter as duas fontes divergiria.
 */
class TurmaOwnershipTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private int $seq = 0;

    /** Redator ativo, com a role, designado às turmas passadas. */
    private function redatorCom(Turma ...$turmas): User
    {
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $redator = $user->redator()->create([]);

        foreach ($turmas as $turma) {
            $turma->redatores()->attach($redator->id);
        }

        return $user;
    }

    /**
     * Cadeia comercial completa e distinta das demais (`users.rut` e
     * `budgets.code` são `unique`) — molde de `TurmaQueryBuilderTest::makeTurmaComDocs`,
     * já que `Turma`, `Quote` e `Budget` não têm factory (H.4.9 — só entra na
     * trait o que se repete; a cadeia comercial tem pai obrigatório).
     */
    private function turma(): Turma
    {
        $n = ++$this->seq;
        $client = $this->makeClientWithUser(
            ['legal_name' => "Empresa Legal {$n} SpA"],
            ['rut' => '2.000.'.str_pad((string) $n, 3, '0', STR_PAD_LEFT).'-0'],
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => "Scap Ownership {$n}"]);
        $course = $this->makeCourse(['name' => "Curso Ownership {$n}"]);
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => 'presencial', 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);
    }

    public function test_redator_lista_somente_as_turmas_em_que_esta_designado(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $alheia = $this->turma();
        $user = $this->redatorCom($minha);

        $ids = $this->actingAs($user, 'web')
            ->getJson('/api/turmas')
            ->assertOk()
            ->json('*.id');

        $this->assertSame([$minha->id], $ids);
        $this->assertNotContains($alheia->id, $ids);
    }

    public function test_admin_continua_listando_todas(): void
    {
        $this->actingAsAdmin();
        $a = $this->turma();
        $b = $this->turma();

        $ids = $this->getJson('/api/turmas')->assertOk()->json('*.id');

        $this->assertContains($a->id, $ids);
        $this->assertContains($b->id, $ids);
    }

    public function test_a_lista_de_arquivadas_usa_o_mesmo_escopo(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $alheia = $this->turma();
        $user = $this->redatorCom($minha);

        $minha->delete();
        $alheia->delete();

        $ids = $this->actingAs($user, 'web')
            ->getJson('/api/turmas/archived')
            ->assertOk()
            ->json('*.turma.id');

        $this->assertSame([$minha->id], $ids);
    }
}
