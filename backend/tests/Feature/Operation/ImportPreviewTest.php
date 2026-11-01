<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ImportPreviewTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    private Client $client;

    private Client $otherClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = $this->makeClientWithUser([], ['rut' => '22.333.444-K']);
        $this->otherClient = $this->makeClientWithUser(['legal_name' => 'OTRA']);
        $budget = Budget::create(['client_id' => $this->client->id, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    private function aluno(string $rut, string $name, string $email, ?string $phone, ?Client $client = null): Student
    {
        return app(StudentResolver::class)
            ->resolveByRut($rut, $name, $email, $phone, $client ?? $this->client)->student;
    }

    private function xlsx(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'prev').'.xlsx';
        $writer = new XlsxWriter;
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues(['RUT', 'Nombre', 'Email', 'Teléfono']));
        foreach ($rows as $row) {
            $writer->addRow(Row::fromValues($row));
        }
        $writer->close();

        return new UploadedFile($path, 'alunos.xlsx', null, null, true);
    }

    private function previa(array $rows)
    {
        return $this->postJson(
            "/api/turmas/{$this->turma->id}/alunos/importar/previa",
            ['file' => $this->xlsx($rows)],
        );
    }

    /** @return array<string,int> */
    private function contagens(): array
    {
        return collect(['users', 'students', 'enrollments', 'student_client_logs', 'audits'])
            ->mapWithKeys(fn (string $t) => [$t => DB::table($t)->count()])
            ->all();
    }

    public function test_previa_nao_escreve_nada(): void
    {
        $this->actingAsAdmin();
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', null);
        $this->aluno('44.444.444-4', 'Ana Mora', 'ana@otra.cl', null, $this->otherClient);
        $antes = $this->contagens();

        $this->previa([
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', ''],      // new
            ['33.333.333-3', 'Pedro Lagos', '', ''],                // registered
            ['44.444.444-4', 'Ana Mora', '', ''],                   // moves
        ])->assertOk()->assertJsonCount(3, 'rows');

        $this->assertSame($antes, $this->contagens());
    }

    public function test_classifica_as_cinco_situacoes(): void
    {
        $this->actingAsAdmin();
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', null);
        $this->aluno('44.444.444-4', 'Ana Mora', 'ana@otra.cl', null, $this->otherClient);
        $matriculado = $this->aluno('55.555.555-5', 'Rosa Vera', 'rosa@acme.cl', null);
        app(EnrollStudentAction::class)->execute($this->turma, '55.555.555-5', 'Rosa Vera', null, null);

        $response = $this->previa([
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', ''],
            ['33.333.333-3', 'Pedro Lagos', '', ''],
            ['44.444.444-4', 'Ana Mora', '', ''],
            ['55.555.555-5', 'Rosa Vera', '', ''],
            ['RUT-INVALIDO', 'Mal Formado', '', ''],
        ])->assertOk();

        $response
            ->assertJsonPath('rows.0.row', 2)
            ->assertJsonPath('rows.0.status', 'new')
            ->assertJsonPath('rows.0.current_client', null)
            ->assertJsonPath('rows.1.status', 'registered')
            ->assertJsonPath('rows.1.current_client', 'ACME')
            ->assertJsonPath('rows.1.registered_name', 'Pedro Lagos')
            ->assertJsonPath('rows.1.registered_email', 'pedro@acme.cl')
            ->assertJsonPath('rows.2.status', 'moves')
            ->assertJsonPath('rows.2.current_client', 'OTRA')
            ->assertJsonPath('rows.3.status', 'already_enrolled')
            ->assertJsonPath('rows.4.status', 'error')
            ->assertJsonPath('rows.4.row', 6);
        $this->assertNotEmpty($response->json('rows.4.message'));
        $this->assertNotNull($matriculado);
    }

    public function test_divergencia_ignora_celula_vazia(): void
    {
        $this->actingAsAdmin();
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', '+56 9 1111');
        $this->aluno('44.444.444-4', 'Ana Mora', 'ana@acme.cl', '+56 9 2222');

        $response = $this->previa([
            ['33.333.333-3', 'Pedro Lagos', '', ''],       // vazio não diverge
            ['44.444.444-4', 'Ana Mora Díaz', '', ''],      // nome difere
        ])->assertOk();

        $response
            ->assertJsonPath('rows.0.status', 'registered')
            ->assertJsonPath('rows.0.divergent', [])
            ->assertJsonPath('rows.0.registered_phone', '+56 9 1111')
            ->assertJsonPath('rows.1.divergent', ['name']);
    }

    public function test_rut_repetido_em_formatos_diferentes_vira_erro_na_segunda(): void
    {
        $this->actingAsAdmin();

        $this->previa([
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', ''],
            ['11111111-1', 'Juan Soto', 'otro@acme.cl', ''],
        ])->assertOk()
            ->assertJsonPath('rows.0.status', 'new')
            ->assertJsonPath('rows.1.status', 'error')
            ->assertJsonPath('rows.1.message', __('operation.enrollment.import.duplicate_rut'));
    }

    public function test_email_repetido_entre_novos_vira_erro_no_segundo(): void
    {
        $this->actingAsAdmin();

        $this->previa([
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', ''],
            ['33.333.333-3', 'Pedro Lagos', 'JUAN@acme.cl', ''],
        ])->assertOk()
            ->assertJsonPath('rows.0.status', 'new')
            ->assertJsonPath('rows.1.status', 'error')
            ->assertJsonPath('rows.1.message', __('operation.enrollment.import.duplicate_email'));
    }

    public function test_nome_vazio_vira_erro_em_linha_nova_e_cadastrada(): void
    {
        $this->actingAsAdmin();
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', null);

        $nomeObrigatorio = __('validation.required', ['attribute' => __('validation.attributes.name')]);

        $this->previa([
            ['11.111.111-1', '', 'juan@acme.cl', ''],      // nova
            ['33.333.333-3', '', '', ''],                  // cadastrada
        ])->assertOk()
            ->assertJsonPath('rows.0.status', 'error')
            ->assertJsonPath('rows.0.message', $nomeObrigatorio)
            ->assertJsonPath('rows.1.status', 'error')
            ->assertJsonPath('rows.1.message', $nomeObrigatorio);
    }

    public function test_telefone_ou_email_acima_do_teto_da_coluna_vira_erro_na_linha_nova(): void
    {
        $this->actingAsAdmin();

        $this->previa([
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', str_repeat('9', 31)],
            ['22.222.222-2', 'Pedro Lagos', str_repeat('a', 250).'@acme.cl', ''],
            ['33.333.333-3', 'Ana Mora', 'ana@acme.cl', str_repeat('9', 30)],
        ])->assertOk()
            ->assertJsonPath('rows.0.status', 'error')
            ->assertJsonPath('rows.0.message', __('validation.max.string', [
                'attribute' => __('validation.attributes.phone'), 'max' => 30,
            ]))
            ->assertJsonPath('rows.1.status', 'error')
            ->assertJsonPath('rows.1.message', __('validation.max.string', [
                'attribute' => __('validation.attributes.email'), 'max' => 255,
            ]))
            ->assertJsonPath('rows.2.status', 'new');
    }

    public function test_email_com_formato_invalido_vira_erro_na_linha_nova(): void
    {
        $this->actingAsAdmin();

        $this->previa([
            ['11.111.111-1', 'Juan Soto', 'juan@', ''],
            ['22.222.222-2', 'Ana Mora', 'ana@acme.cl', ''],
        ])->assertOk()
            ->assertJsonPath('rows.0.status', 'error')
            ->assertJsonPath('rows.0.message', __('validation.email', [
                'attribute' => __('validation.attributes.email'),
            ]))
            ->assertJsonPath('rows.1.status', 'new');
    }

    public function test_aluno_arquivado_sai_com_archived_true(): void
    {
        $this->actingAsAdmin();
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', null)->delete();
        $this->aluno('44.444.444-4', 'Ana Mora', 'ana@acme.cl', null);

        $this->previa([
            ['33.333.333-3', 'Pedro Lagos', '', ''],
            ['44.444.444-4', 'Ana Mora', '', ''],
        ])->assertOk()
            ->assertJsonPath('rows.0.status', 'registered')
            ->assertJsonPath('rows.0.archived', true)
            ->assertJsonPath('rows.1.archived', false);
    }

    public function test_can_update_registration_reflete_a_permissao(): void
    {
        $this->actingAsAdmin();
        $this->previa([])->assertOk()->assertJsonPath('can_update_registration', true);

        $semEdicao = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $semEdicao->givePermissionTo('operation.enrollment.manage');
        // `auth:sanctum` guarda o usuário entre chamadas do mesmo teste.
        $this->app['auth']->forgetGuards();
        $this->actingAs($semEdicao, 'web');

        $this->previa([])->assertOk()->assertJsonPath('can_update_registration', false);
    }

    public function test_planilha_so_com_cabecalho_devolve_rows_vazio(): void
    {
        $this->actingAsAdmin();

        $this->previa([])->assertOk()->assertExactJson(['rows' => [], 'can_update_registration' => true]);
    }

    public function test_turma_nao_gravavel_recusa_previa_422(): void
    {
        $this->actingAsAdmin();
        $this->turma->update(['status' => TurmaStatus::Concluida, 'concluded_at' => now()]);

        $this->previa([['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '']])
            ->assertStatus(422)
            ->assertJsonPath('errors.turma.0', __('operation.turma.concluded_locked'));
    }

    public function test_redator_recebe_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $redator = $user->redator()->create([]);
        $this->turma->redatores()->attach($redator->id);
        $this->actingAs($user, 'web');

        $this->previa([['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '']])->assertForbidden();
    }
}
