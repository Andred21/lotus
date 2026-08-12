<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CourseTemplateTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_gerencia_template_individual_do_curso(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        $templateId = $this->postJson("/api/courses/{$course->id}/templates", [
            'version' => 1,
            'layout_config' => ['orientation' => 'portrait'],
            'validity_months' => 12,
        ])->assertCreated()->assertJsonPath('version', 1)->json('id');

        $this->assertDatabaseHas('course_certificate_templates', [
            'id' => $templateId, 'course_id' => $course->id, 'version' => 1,
        ]);

        // `version` no payload é ignorado (D9): o PUT edita a mesma linha e o
        // número nasce no create.
        $this->putJson("/api/templates/{$templateId}", [
            'version' => 2,
            'layout_config' => ['orientation' => 'landscape'],
        ])->assertOk()->assertJsonPath('version', 1)
            ->assertJsonPath('layout_config.orientation', 'landscape');

        $this->deleteJson("/api/templates/{$templateId}")->assertNoContent();
        $this->assertSoftDeleted('course_certificate_templates', ['id' => $templateId]);
    }

    public function test_replace_de_templates_via_update_do_curso_registra_auditoria(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 1, 'layout_config' => ['orientation' => 'portrait']]],
        ])->json('id');

        $antigo = Course::find($id)->certificateTemplates()->firstOrFail();

        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 2, 'layout_config' => ['orientation' => 'landscape']]],
        ])->assertOk();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course_certificate_template',
            'auditable_id' => $antigo->id,
            'event' => 'deleted',
        ]);
    }

    public function test_update_sem_o_campo_templates_preserva_os_templates(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 1, 'layout_config' => ['orientation' => 'portrait']]],
        ])->json('id');

        $template = Course::find($id)->certificateTemplates()->firstOrFail();

        // Payload da tela de curso: não manda `templates`. Não pedir para mexer
        // na coleção não pode apagá-la (peso legal).
        $this->putJson("/api/courses/{$id}", ['name' => 'Curso Y', 'workload_hours' => 8])
            ->assertOk()
            ->assertJsonPath('name', 'Curso Y')
            ->assertJsonPath('templates.0.id', $template->id)
            ->assertJsonPath('templates.0.version', 1);

        $this->assertDatabaseHas('course_certificate_templates', [
            'id' => $template->id, 'deleted_at' => null,
        ]);
    }

    public function test_update_com_templates_vazio_apaga_explicitamente(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 1, 'layout_config' => ['orientation' => 'portrait']]],
        ])->json('id');

        $template = Course::find($id)->certificateTemplates()->firstOrFail();

        // `[]` é ordem explícita de esvaziar — segue apagando.
        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X', 'workload_hours' => 8, 'templates' => [],
        ])->assertOk()->assertJsonCount(0, 'templates');

        $this->assertSoftDeleted('course_certificate_templates', ['id' => $template->id]);
    }

    public function test_delete_de_curso_audita_o_soft_delete_dos_templates(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 1, 'layout_config' => ['orientation' => 'portrait']]],
        ])->json('id');

        $template = Course::find($id)->certificateTemplates()->firstOrFail();

        $this->deleteJson("/api/courses/{$id}")->assertNoContent();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course_certificate_template',
            'auditable_id' => $template->id,
            'event' => 'deleted',
        ]);
    }

    /**
     * O duplicado entra por INSERT DIRETO, não pela API: pela API a derivação
     * (D4/D11) torna a duplicata inalcançável, e é exatamente esse o ponto —
     * o índice é a defesa de integridade que sobrevive a um caminho novo.
     */
    public function test_banco_recusa_par_course_id_version_duplicado(): void
    {
        $course = $this->makeCourse();

        $linha = [
            'course_id' => $course->id,
            'version' => 1,
            'layout_config' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::table('course_certificate_templates')->insert($linha);

        $this->expectException(QueryException::class);
        DB::table('course_certificate_templates')->insert($linha);
    }

    public function test_version_e_derivada_e_o_payload_e_ignorado(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        $this->postJson("/api/courses/{$course->id}/templates", [
            'version' => 99,
            'layout_config' => ['orientation' => 'portrait'],
        ])->assertCreated()->assertJsonPath('version', 1);

        $this->postJson("/api/courses/{$course->id}/templates", [
            'layout_config' => ['orientation' => 'portrait'],
        ])->assertCreated()->assertJsonPath('version', 2);

        $this->postJson("/api/courses/{$course->id}/templates", [
            'layout_config' => ['orientation' => 'portrait'],
        ])->assertCreated()->assertJsonPath('version', 3);
    }

    /**
     * O caso que discrimina o `withTrashed()` (D11): sem ele o MAX volta a 1
     * depois do arquivamento, e o `unique` cru recusa a próxima criação. É o
     * caminho real do `UpdateCourseAction`, que soft-deleta todos e recria.
     */
    public function test_derivacao_conta_os_arquivados(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        // `layout_config` não vai vazio: a regra `required` do DTO (anterior a
        // esta task) recusa array vazio com 422, e o que está sob teste aqui é a
        // derivação, não a validação do layout.
        foreach (range(1, 3) as $esperado) {
            $id = $this->postJson("/api/courses/{$course->id}/templates", [
                'layout_config' => ['orientation' => 'portrait'],
            ])->assertCreated()->assertJsonPath('version', $esperado)->json('id');

            $this->deleteJson("/api/templates/{$id}")->assertNoContent();
        }

        $this->postJson("/api/courses/{$course->id}/templates", [
            'layout_config' => ['orientation' => 'portrait'],
        ])->assertCreated()->assertJsonPath('version', 4);
    }

    public function test_put_edita_in_place_e_nao_muda_a_version(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        $id = $this->postJson("/api/courses/{$course->id}/templates", [
            'layout_config' => ['orientation' => 'portrait'],
        ])->assertCreated()->json('id');

        $this->putJson("/api/templates/{$id}", [
            'version' => 7,
            'layout_config' => ['orientation' => 'landscape'],
        ])->assertOk()
            ->assertJsonPath('id', $id)
            ->assertJsonPath('version', 1)
            ->assertJsonPath('layout_config.orientation', 'landscape');

        $this->assertDatabaseHas('course_certificate_templates', [
            'id' => $id, 'version' => 1,
        ]);
    }
}
