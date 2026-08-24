<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Models\Enrollment;
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

    public function test_turma_alheia_da_404_no_show(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $alheia = $this->turma();
        $user = $this->redatorCom($minha);

        $this->actingAs($user, 'web')->getJson("/api/turmas/{$alheia->id}")->assertNotFound();
        $this->actingAs($user, 'web')->getJson("/api/turmas/{$minha->id}")->assertOk();
    }

    public function test_turma_alheia_da_404_e_nao_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $alheia = $this->turma();
        $user = $this->redatorCom();

        // 403 confirmaria que a turma existe. O redator nao deve distinguir
        // "turma alheia" de "turma inexistente" (spec D3).
        $this->actingAs($user, 'web')
            ->getJson("/api/turmas/{$alheia->id}")
            ->assertNotFound();
    }

    public function test_turma_alheia_da_404_nas_rotas_derivadas_que_o_redator_alcanca(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $alheia = $this->turma();
        $user = $this->redatorCom();

        $this->actingAs($user, 'web')->getJson("/api/turmas/{$alheia->id}/alunos")->assertNotFound();
        $this->actingAs($user, 'web')->getJson("/api/turmas/{$alheia->id}/documents")->assertNotFound();
        $this->actingAs($user, 'web')->postJson("/api/turmas/{$alheia->id}/documents", [])->assertNotFound();
    }

    public function test_admin_nao_e_afetado_pelo_binding(): void
    {
        $this->actingAsAdmin();
        $turma = $this->turma();

        $this->getJson("/api/turmas/{$turma->id}")->assertOk();
        $this->getJson("/api/turmas/{$turma->id}/alunos")->assertOk();
    }

    public function test_redator_lanca_resultado_na_turma_dele(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $user = $this->redatorCom($minha);
        $enrollment = $this->matricula($minha);

        $this->actingAs($user, 'web')
            ->putJson("/api/turmas/{$minha->id}/alunos/{$enrollment->id}/resultado", [
                'grades' => ['final' => 6.0],
                'attendance_pct' => '100',
                'approval_status' => 'aprobado',
            ])
            ->assertOk();
    }

    public function test_redator_nao_lanca_resultado_em_turma_alheia(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $alheia = $this->turma();
        $user = $this->redatorCom();
        $enrollment = $this->matricula($alheia);

        $this->actingAs($user, 'web')
            ->putJson("/api/turmas/{$alheia->id}/alunos/{$enrollment->id}/resultado", [
                'grade' => 6.0,
                'attendance_pct' => 100,
            ])
            ->assertNotFound();
    }

    public function test_redator_continua_sem_o_fluxo_3(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $user = $this->redatorCom($minha);

        // A permissao nova cobre SO o resultado. Matricular, importar planilha
        // e remover matricula seguem no `enrollment.manage`, que e do admin.
        $this->actingAs($user, 'web')
            ->postJson("/api/turmas/{$minha->id}/alunos", [
                'rut' => '11.111.111-1', 'name' => 'Aluno', 'email' => null, 'phone' => null,
            ])
            ->assertForbidden();
    }

    private function matricula(Turma $turma): Enrollment
    {
        static $rutCounter = 11;
        // Create sequential RUTs with valid check digits: use actual format 12.345.678-9
        // Calculate a valid check digit using the module 11 algorithm
        $base = 10000000 + ($rutCounter * 123);  // Sequential base numbers
        $number = (string) $base;
        $sum = 0;
        $factor = 2;
        for ($i = strlen($number) - 1; $i >= 0; $i--) {
            $sum += (int) $number[$i] * $factor;
            $factor = $factor === 7 ? 2 : $factor + 1;
        }
        $dv = (11 - ($sum % 11)) % 11;
        $dv = $dv === 10 ? 'K' : (string) $dv;
        $rut = number_format((int) $number, 0, '', '.').'-'.$dv;
        $email = 'aluno'.($rutCounter++).'@test.local';

        return app(EnrollStudentAction::class)->execute(
            $turma,
            $rut,
            'Aluno Teste',
            $email,
            null,
        )->enrollment;
    }
}
