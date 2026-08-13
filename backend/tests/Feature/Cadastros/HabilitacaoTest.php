<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class HabilitacaoTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function redator(string $rut = '12.345.678-5'): Redator
    {
        $user = User::factory()->redator()->create(['rut' => $rut]);

        return Redator::create(['user_id' => $user->id]);
    }

    public function test_habilita_pelo_lado_do_curso_reflete_no_redator(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $redator = $this->redator();

        $this->putJson("/api/courses/{$course->id}/redatores", [
            'redator_ids' => [$redator->id],
        ])->assertOk()->assertJsonPath('redator_ids.0', $redator->id);

        $this->assertDatabaseHas('course_redator', [
            'course_id' => $course->id, 'redator_id' => $redator->id,
        ]);

        // reflete no lado do redator
        $this->getJson("/api/redatores/{$redator->id}")
            ->assertOk()->assertJsonPath('course_ids.0', $course->id);
    }

    public function test_sync_pelo_lado_do_curso_substitui(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $r1 = $this->redator('12.345.678-5');
        $r2 = $this->redator('20.347.878-K');

        $course->redatores()->attach($r1->id);

        $this->putJson("/api/courses/{$course->id}/redatores", [
            'redator_ids' => [$r2->id],
        ])->assertOk();

        $this->assertDatabaseMissing('course_redator', ['course_id' => $course->id, 'redator_id' => $r1->id]);
        $this->assertDatabaseHas('course_redator', ['course_id' => $course->id, 'redator_id' => $r2->id]);
    }

    public function test_redator_id_inexistente_rejeitado(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        $this->putJson("/api/courses/{$course->id}/redatores", [
            'redator_ids' => [99999],
        ])->assertStatus(422)->assertJsonValidationErrors('redator_ids.0');
    }

    public function test_habilita_pelo_lado_do_redator_via_update(): void
    {
        $this->actingAsAdmin();
        $c1 = $this->makeCourse();
        $c2 = $this->makeCourse(['name' => 'C2', 'workload_hours' => 8]);
        $redator = $this->redator();

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => $redator->user->name,
            'rut' => $redator->user->rut,
            'email' => $redator->user->email,
            'course_ids' => [$c1->id, $c2->id],
        ])->assertOk()->assertJsonCount(2, 'course_ids');

        $this->assertDatabaseHas('course_redator', ['redator_id' => $redator->id, 'course_id' => $c1->id]);
        $this->assertDatabaseHas('course_redator', ['redator_id' => $redator->id, 'course_id' => $c2->id]);
    }

    public function test_update_sem_course_ids_preserva_habilitacao(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $redator = $this->redator();
        $redator->courses()->attach($course->id);

        // update parcial (só nome) sem course_ids NÃO pode apagar a habilitação.
        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Nome Novo',
            'rut' => $redator->user->rut,
            'email' => $redator->user->email,
        ])->assertOk()->assertJsonPath('course_ids.0', $course->id);

        $this->assertDatabaseHas('course_redator', [
            'redator_id' => $redator->id, 'course_id' => $course->id,
        ]);
    }

    public function test_course_id_inexistente_no_update_rejeitado(): void
    {
        $this->actingAsAdmin();
        $redator = $this->redator();

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => $redator->user->name,
            'rut' => $redator->user->rut,
            'email' => $redator->user->email,
            'course_ids' => [99999],
        ])->assertStatus(422)->assertJsonValidationErrors('course_ids.0');
    }

    public function test_habilitacao_pelo_lado_do_curso_grava_audit_no_curso(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $redator = $this->redator();

        $this->putJson("/api/courses/{$course->id}/redatores", [
            'redator_ids' => [$redator->id],
        ])->assertOk();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course',
            'auditable_id' => $course->id,
            'event' => 'sync',
        ]);
    }

    public function test_habilitacao_pelo_lado_do_redator_grava_audit_no_redator(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $redator = $this->redator();

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Fabián Cifuentes',
            'rut' => '12.345.678-5',
            'email' => 'fc@lotus.cl',
            'course_ids' => [$course->id],
        ])->assertOk();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'redator',
            'auditable_id' => $redator->id,
            'event' => 'sync',
        ]);
    }

    /**
     * O caso mede o D12 — o helper compara antes de gravar —, e por isso a
     * PRIMEIRA edição tem de mudar a habilitação de verdade.
     *
     * A primeira escrita partia do pivot já ligado e afirmava só o zero: com
     * `$redator->courses()->sync(...)` cru de volta na Action, o zero continuava
     * verdadeiro (pivot cru não audita nada) e o caso passava com o regresso
     * presente — provado por sonda no review de 2026-08-12 (Q-4). Duas edições,
     * a segunda idêntica à primeira, prendem os dois lados: a de número 1 prova
     * que a mudança GRAVA, a de número 2 prova que a repetição NÃO grava.
     */
    public function test_edicao_de_redator_sem_mudar_curso_nao_grava_audit_de_sync(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $redator = $this->redator();

        $payload = [
            'name' => 'Fabián Cifuentes',
            'rut' => '12.345.678-5',
            'email' => 'fc@lotus.cl',
            'course_ids' => [$course->id],
        ];

        $this->putJson("/api/redatores/{$redator->id}", $payload)->assertOk();
        $this->assertSame(1, $this->auditsDeSync($redator), 'a habilitacao mudou: tinha de gravar audit');

        $this->putJson("/api/redatores/{$redator->id}", $payload)->assertOk();
        $this->assertSame(1, $this->auditsDeSync($redator), 'edicao identica nao pode gravar audit nova');
    }

    /**
     * A audit de pivot carrega o CONJUNTO dos dois lados, não o delta — é o que
     * torna o estado anterior reconstruível quando a designação decide quem
     * pode assinar certificado (review de 2026-08-12, Q-2). Com o `auditSync`
     * do pacote, `old_values` vinha `{"courses":[]}` no acréscimo.
     */
    public function test_audit_de_habilitacao_grava_o_conjunto_e_nao_o_delta(): void
    {
        $this->actingAsAdmin();
        $c1 = $this->makeCourse();
        $c2 = $this->makeCourse(['name' => 'C2', 'workload_hours' => 8]);
        $redator = $this->redator();

        $base = ['name' => $redator->user->name, 'rut' => $redator->user->rut, 'email' => $redator->user->email];

        $this->putJson("/api/redatores/{$redator->id}", $base + ['course_ids' => [$c1->id]])->assertOk();
        $this->putJson("/api/redatores/{$redator->id}", $base + ['course_ids' => [$c1->id, $c2->id]])->assertOk();

        $audit = DB::table('audits')
            ->where('auditable_type', 'redator')
            ->where('auditable_id', $redator->id)
            ->where('event', 'sync')
            ->latest('id')
            ->first();

        $this->assertSame([$c1->id], json_decode((string) $audit->old_values, true)['courses']);
        $this->assertSame([$c1->id, $c2->id], json_decode((string) $audit->new_values, true)['courses']);
    }

    private function auditsDeSync(Redator $redator): int
    {
        return DB::table('audits')
            ->where('auditable_type', 'redator')
            ->where('auditable_id', $redator->id)
            ->where('event', 'sync')
            ->count();
    }
}
