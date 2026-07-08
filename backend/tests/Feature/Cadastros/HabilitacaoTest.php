<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HabilitacaoTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): void
    {
        $this->actingAs(User::factory()->create(['type' => 'admin', 'is_active' => true]));
    }

    private function redator(string $rut = '12.345.678-5'): Redator
    {
        $user = User::factory()->redator()->create(['rut' => $rut]);

        return Redator::create(['user_id' => $user->id]);
    }

    public function test_habilita_pelo_lado_do_curso_reflete_no_redator(): void
    {
        $this->actingAdmin();
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 8]);
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
        $this->actingAdmin();
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 8]);
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
        $this->actingAdmin();
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 8]);

        $this->putJson("/api/courses/{$course->id}/redatores", [
            'redator_ids' => [99999],
        ])->assertStatus(422)->assertJsonValidationErrors('redator_ids.0');
    }

    public function test_habilita_pelo_lado_do_redator_via_update(): void
    {
        $this->actingAdmin();
        $c1 = Course::create(['name' => 'C1', 'workload_hours' => 8]);
        $c2 = Course::create(['name' => 'C2', 'workload_hours' => 8]);
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
        $this->actingAdmin();
        $course = Course::create(['name' => 'C1', 'workload_hours' => 8]);
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
        $this->actingAdmin();
        $redator = $this->redator();

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => $redator->user->name,
            'rut' => $redator->user->rut,
            'email' => $redator->user->email,
            'course_ids' => [99999],
        ])->assertStatus(422)->assertJsonValidationErrors('course_ids.0');
    }
}
