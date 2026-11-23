<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Bloco 60 (spec §4.1, §4.2): `code` "C-<id>" do curso é derivado e imutável;
 * `sence_code` é digitado (só dígitos), único inclusive entre arquivados.
 */
class CourseCodeTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string,mixed> */
    private function payload(array $extra = []): array
    {
        return [
            'name' => 'Alta Tensão NR-10',
            'workload_hours' => 40,
            ...$extra,
        ];
    }

    public function test_curso_criado_recebe_code_c_id(): void
    {
        $this->actingAsAdmin();

        $resposta = $this->postJson('/api/courses', $this->payload())->assertCreated();
        $id = $resposta->json('id');

        $this->assertSame("C-{$id}", Course::find($id)->code);
        $resposta->assertJsonPath('code', "C-{$id}");
    }

    public function test_code_no_corpo_de_escrita_e_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', $this->payload(['code' => 'C-999']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_code_no_corpo_do_update_tambem_e_422(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/courses', $this->payload())->assertCreated()->json('id');

        $this->putJson("/api/courses/{$id}", $this->payload(['code' => 'C-999']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_sence_code_aceita_so_digitos(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', $this->payload(['sence_code' => '12-AB']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('sence_code');
    }

    public function test_sence_code_acima_de_20_digitos_e_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', $this->payload(['sence_code' => str_repeat('1', 21)]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('sence_code');
    }

    public function test_sence_code_valido_e_gravado_e_devolvido(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', $this->payload(['sence_code' => '1234567890']))
            ->assertCreated()
            ->assertJsonPath('sence_code', '1234567890')
            ->json('id');

        $this->assertSame('1234567890', Course::find($id)->sence_code);
    }

    public function test_sence_code_e_opcional_e_nulo_nao_colide(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', $this->payload())->assertCreated()->assertJsonPath('sence_code', null);
        $this->postJson('/api/courses', $this->payload(['name' => 'Outro', 'sence_code' => null]))->assertCreated();
        $this->postJson('/api/courses', $this->payload(['name' => 'Mais um']))->assertCreated();
    }

    public function test_sence_code_unico_inclusive_contra_arquivado(): void
    {
        $this->actingAsAdmin();
        $a = $this->postJson('/api/courses', $this->payload(['sence_code' => '1234567890']))->assertCreated()->json('id');
        $this->deleteJson("/api/courses/{$a}")->assertNoContent();
        $this->assertSoftDeleted('courses', ['id' => $a]);

        $this->postJson('/api/courses', $this->payload(['name' => 'Curso B', 'sence_code' => '1234567890']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('sence_code');
    }

    public function test_sence_code_unico_contra_curso_ativo(): void
    {
        $this->actingAsAdmin();
        $this->postJson('/api/courses', $this->payload(['sence_code' => '555']))->assertCreated();

        $this->postJson('/api/courses', $this->payload(['name' => 'Curso B', 'sence_code' => '555']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('sence_code');
    }

    public function test_update_mantem_o_proprio_sence_code(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/courses', $this->payload(['sence_code' => '1234567890']))->assertCreated()->json('id');

        $this->putJson("/api/courses/{$id}", $this->payload(['name' => 'Renomeado', 'sence_code' => '1234567890']))
            ->assertOk()
            ->assertJsonPath('sence_code', '1234567890');
    }

    public function test_update_para_sence_code_de_outro_curso_e_422(): void
    {
        $this->actingAsAdmin();
        $this->postJson('/api/courses', $this->payload(['sence_code' => '111']))->assertCreated();
        $b = $this->postJson('/api/courses', $this->payload(['name' => 'Curso B', 'sence_code' => '222']))->assertCreated()->json('id');

        $this->putJson("/api/courses/{$b}", $this->payload(['name' => 'Curso B', 'sence_code' => '111']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('sence_code');
    }

    public function test_update_sem_sence_code_preserva_e_com_null_limpa(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/courses', $this->payload(['sence_code' => '777']))->assertCreated()->json('id');

        $this->putJson("/api/courses/{$id}", $this->payload())->assertOk()->assertJsonPath('sence_code', '777');
        $this->assertSame('777', Course::find($id)->sence_code);

        $this->putJson("/api/courses/{$id}", $this->payload(['sence_code' => null]))->assertOk()->assertJsonPath('sence_code', null);
        $this->assertNull(Course::find($id)->sence_code);
    }

    public function test_code_e_imutavel_no_update(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/courses', $this->payload())->assertCreated()->json('id');

        $this->putJson("/api/courses/{$id}", $this->payload(['name' => 'Renomeado']))
            ->assertOk()
            ->assertJsonPath('code', "C-{$id}");

        $this->assertSame("C-{$id}", Course::find($id)->code);
    }

    public function test_code_e_sence_code_entram_na_auditoria(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/courses', $this->payload(['sence_code' => '9876']))->assertCreated()->json('id');

        $novos = Course::find($id)->audits()->get()->map(fn ($a) => $a->new_values);

        $this->assertContains("C-{$id}", $novos->pluck('code')->all());
        $this->assertContains('9876', $novos->pluck('sence_code')->all());
    }

    public function test_backfill_da_migration_preenche_code_dos_existentes(): void
    {
        $migration = require base_path('database/migrations/2026_11_22_000001_add_code_and_sence_code_to_courses.php');
        $migration->down();

        $agora = now();
        $ids = [];
        foreach (['Curso 1', 'Curso 2'] as $nome) {
            $ids[] = DB::table('courses')->insertGetId([
                'name' => $nome, 'workload_hours' => 8, 'created_at' => $agora, 'updated_at' => $agora,
            ]);
        }
        // Arquivado também recebe: o código é do registro, não do estado dele.
        DB::table('courses')->where('id', $ids[1])->update(['deleted_at' => $agora]);

        $migration->up();

        foreach ($ids as $id) {
            $this->assertSame("C-{$id}", DB::table('courses')->where('id', $id)->value('code'));
        }
    }

    /**
     * Review Q-1 do bloco 60: o backfill altera o próprio filtro (`whereNull('code')`).
     * Paginação por offset (`each()` = `chunk(1000)`) pula da página 2 em diante;
     * com 1001 cursos sobrava um sem código.
     */
    public function test_backfill_preenche_todos_alem_de_um_lote(): void
    {
        $migration = require base_path('database/migrations/2026_11_22_000001_add_code_and_sence_code_to_courses.php');
        $migration->down();

        $agora = now();
        $linhas = array_map(
            fn (int $i) => ['name' => "Curso {$i}", 'workload_hours' => 8, 'created_at' => $agora, 'updated_at' => $agora],
            range(1, 1001),
        );
        foreach (array_chunk($linhas, 200) as $lote) {
            DB::table('courses')->insert($lote);
        }

        $migration->up();

        $this->assertSame(0, DB::table('courses')->whereNull('code')->count());
        $this->assertSame(1001, DB::table('courses')->whereColumn('code', DB::raw("'C-' || id"))->count());
    }
}
