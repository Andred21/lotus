<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseModuleCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_cria_curso_com_modulos_ordenados_pelo_indice_do_array(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/courses', [
            'name' => 'Alta Tensão NR-10',
            'workload_hours' => 40,
            'modules' => [
                ['name' => 'Introducción a los Riesgos Eléctricos', 'learnings' => 'Identificar riscos', 'contents' => "1.1 Riscos\n1.2 EPP", 'theory_hours' => 6, 'practice_hours' => 2],
                ['name' => 'Maniobras en Terreno', 'theory_hours' => 4, 'practice_hours' => 8],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('modules.0.name', 'Introducción a los Riesgos Eléctricos')
            ->assertJsonPath('modules.0.sort_order', 1)
            ->assertJsonPath('modules.0.total_hours', 8)
            ->assertJsonPath('modules.0.learnings', 'Identificar riscos')
            ->assertJsonPath('modules.0.contents', "1.1 Riscos\n1.2 EPP")
            ->assertJsonPath('modules.1.sort_order', 2)
            ->assertJsonPath('modules.1.total_hours', 12)
            ->assertJsonPath('modules_total_hours', 20);

        $this->assertDatabaseHas('course_modules', [
            'name' => 'Introducción a los Riesgos Eléctricos', 'sort_order' => 1,
            'learnings' => 'Identificar riscos', 'contents' => "1.1 Riscos\n1.2 EPP",
        ]);
        $this->assertDatabaseHas('course_modules', [
            'name' => 'Maniobras en Terreno', 'sort_order' => 2, 'theory_hours' => 4, 'practice_hours' => 8,
        ]);
    }

    public function test_sort_order_do_payload_e_ignorado(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [
                ['name' => 'Primeiro', 'sort_order' => 99],
                ['name' => 'Segundo', 'sort_order' => 1],
            ],
        ])->assertCreated()
            ->assertJsonPath('modules.0.name', 'Primeiro')
            ->assertJsonPath('modules.0.sort_order', 1)
            ->assertJsonPath('modules.1.sort_order', 2);
    }

    public function test_update_reordena_reescrevendo_sort_order(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [
                ['name' => 'A', 'theory_hours' => 2],
                ['name' => 'B', 'theory_hours' => 3],
            ],
        ])->json('id');

        // Array invertido = reordenação.
        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [
                ['name' => 'B', 'theory_hours' => 3],
                ['name' => 'A', 'theory_hours' => 2],
            ],
        ])->assertOk()
            ->assertJsonPath('modules.0.name', 'B')
            ->assertJsonPath('modules.0.sort_order', 1)
            ->assertJsonPath('modules.1.name', 'A')
            ->assertJsonPath('modules.1.sort_order', 2);

        // Replace não deixa módulo ativo órfão.
        $this->assertSame(2, Course::find($id)->modules()->count());
    }

    public function test_update_que_remove_modulos_audita_a_saida(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [['name' => 'A'], ['name' => 'B']],
        ])->json('id');

        $antigo = Course::find($id)->modules()->firstOrFail();

        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [['name' => 'Único']],
        ])->assertOk()->assertJsonCount(1, 'modules');

        $this->assertSame(1, Course::find($id)->modules()->count());
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course_module',
            'auditable_id' => $antigo->id,
            'event' => 'deleted',
        ]);
    }

    public function test_modulo_cem_por_cento_teorico_ou_pratico_e_valido(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 10,
            'modules' => [
                ['name' => 'Só teoria', 'theory_hours' => 6, 'practice_hours' => 0],
                ['name' => 'Só prática', 'theory_hours' => 0, 'practice_hours' => 4],
            ],
        ])->assertCreated()->assertJsonPath('modules_total_hours', 10);
    }

    public function test_soma_divergente_da_carga_do_curso_nao_bloqueia(): void
    {
        $this->actingAsAdmin();

        // workload_hours 40 vs. 2h de módulos: é aviso do front, nunca gate (§5.7).
        $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 40,
            'modules' => [['name' => 'A', 'theory_hours' => 2]],
        ])->assertCreated()
            ->assertJsonPath('workload_hours', 40)
            ->assertJsonPath('modules_total_hours', 2);
    }

    public function test_nome_do_modulo_e_obrigatorio(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [['theory_hours' => 2]],
        ])->assertStatus(422)->assertJsonValidationErrors('modules.0.name');
    }

    public function test_theory_hours_negativo_e_invalido(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [['name' => 'A', 'theory_hours' => -1]],
        ])->assertStatus(422)->assertJsonValidationErrors('modules.0.theory_hours');
    }

    public function test_curso_sem_modulos_continua_valido(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', ['name' => 'Curso X', 'workload_hours' => 8])
            ->assertCreated()
            ->assertJsonPath('modules', [])
            ->assertJsonPath('modules_total_hours', 0);
    }
}
