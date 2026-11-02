<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Actions\ImportStudentsAction;
use App\Domains\Operation\Data\ImportConfirmData;
use App\Domains\Operation\Data\ImportConfirmRowData;
use App\Domains\Operation\Data\ImportResultData;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Support\TetosImpressos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * A confirmação revalida CADA linha no servidor (D13): ela recebe só os campos
 * que o admin digitou e recalcula tudo o mais. É a rota que grava vínculo e
 * cadastro de aluno, que têm peso legal.
 */
class ImportStudentsActionTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    private Client $client;

    private Client $otherClient;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = $this->makeClientWithUser([], ['rut' => '22.333.444-K']);
        $this->otherClient = $this->makeClientWithUser(['legal_name' => 'OTRA']);
        $budget = Budget::create(['client_id' => $this->client->id, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 2, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        $this->admin = $this->actingAsAdmin();
    }

    private function linha(
        int $row,
        string $rut,
        string $name,
        ?string $email = null,
        ?string $phone = null,
        bool $atualizar = false,
    ): ImportConfirmRowData {
        return new ImportConfirmRowData($row, $rut, $name, $email, $phone, $atualizar);
    }

    /** @param  array<ImportConfirmRowData>  $linhas */
    private function confirmar(array $linhas, ?User $ator = null): ImportResultData
    {
        return app(ImportStudentsAction::class)
            ->execute($this->turma, new ImportConfirmData($linhas), $ator ?? $this->admin);
    }

    private function aluno(string $rut, string $name, string $email, ?string $phone = null, ?Client $client = null): Student
    {
        return app(StudentResolver::class)
            ->resolveByRut($rut, $name, $email, $phone, $client ?? $this->client)->student;
    }

    private function semPermissaoDeEdicao(): User
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.enrollment.manage');

        return $user;
    }

    public function test_grava_linhas_boas_e_devolve_as_ruins(): void
    {
        $this->aluno('44.444.444-4', 'Ana Mora', 'ana@otra.cl', null, $this->otherClient);

        $result = $this->confirmar([
            $this->linha(2, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', '+56 9 1111'),   // novo
            $this->linha(3, 'RUT-INVALIDO', 'Mal Formado'),                                // RUT inválido
            $this->linha(4, '44.444.444-4', 'Ana Mora'),                                   // moved
            $this->linha(5, '55.555.555-5', 'Colide', 'JUAN@acme.cl'),                     // e-mail repetido no lote
            $this->linha(6, '66.666.666-6', 'Sin Correo'),                                 // sem e-mail
        ]);

        $this->assertSame(1, $result->created);
        $this->assertSame(0, $result->relinked);
        $this->assertSame(0, $result->already_enrolled);
        $this->assertCount(1, $result->moved);
        $this->assertSame('OTRA', $result->moved[0]->previous_client);
        $this->assertSame('ACME', $result->moved[0]->client);
        $this->assertSame([3, 5, 6], array_map(fn ($e) => $e->row, $result->errors));
        $this->assertSame(__('operation.enrollment.import.duplicate_email'), $result->errors[1]->message);
        $this->assertSame(2, $result->enrolled_total);
        $this->assertSame(2, $result->contracted_count); // D3: informa, nunca bloqueia
        $this->assertDatabaseMissing('users', ['rut' => '55.555.555-5']);
    }

    public function test_troca_de_empresa_fecha_log_e_abre_novo(): void
    {
        $student = $this->aluno('44.444.444-4', 'Ana Mora', 'ana@otra.cl', null, $this->otherClient);

        $this->confirmar([$this->linha(2, '44.444.444-4', 'Ana Mora')]);

        $logs = $student->logs()->orderBy('id')->get();
        $this->assertCount(2, $logs);
        $this->assertSame($this->otherClient->id, $logs[0]->client_id);
        $this->assertNotNull($logs[0]->ended_on);
        $this->assertSame($this->client->id, $logs[1]->client_id);
        $this->assertNull($logs[1]->ended_on);
    }

    public function test_actualizar_altera_cadastro_e_audita(): void
    {
        $student = $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', '+56 9 0000');

        $result = $this->confirmar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos Rojas', 'pedro.lagos@acme.cl', '+56 9 2222', atualizar: true),
        ]);

        $this->assertSame([], $result->errors);
        $this->assertSame(1, $result->relinked);
        $user = $student->user()->withTrashed()->first();
        $this->assertSame('Pedro Lagos Rojas', $user->name);
        $this->assertSame('pedro.lagos@acme.cl', $user->email);
        $this->assertSame('+56 9 2222', $user->phone);

        $auditoria = $user->audits()->where('event', 'updated')->latest('id')->first();
        $this->assertNotNull($auditoria);
        $this->assertSame($this->admin->id, $auditoria->user_id);
    }

    public function test_mantener_nao_altera_cadastro(): void
    {
        $student = $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', '+56 9 0000');

        $result = $this->confirmar([
            $this->linha(2, '33.333.333-3', 'Outro Nome', 'outro@acme.cl', '+56 9 9999'),
        ]);

        $this->assertSame(1, $result->relinked);
        $user = $student->user()->withTrashed()->first();
        $this->assertSame('Pedro Lagos', $user->name);
        $this->assertSame('pedro@acme.cl', $user->email);
        $this->assertSame('+56 9 0000', $user->phone);
        $this->assertSame(0, $user->audits()->where('event', 'updated')->count());
    }

    public function test_actualizar_com_celula_vazia_preserva_valor(): void
    {
        $student = $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', '+56 9 0000');

        $result = $this->confirmar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos Rojas', null, null, atualizar: true),
        ]);

        $this->assertSame([], $result->errors);
        $user = $student->user()->withTrashed()->first();
        $this->assertSame('Pedro Lagos Rojas', $user->name);
        $this->assertSame('pedro@acme.cl', $user->email);
        $this->assertSame('+56 9 0000', $user->phone);
    }

    public function test_actualizar_falho_nao_deixa_matricula(): void
    {
        $student = $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');
        $this->aluno('44.444.444-4', 'Ana Mora', 'ana@acme.cl');

        $result = $this->confirmar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos', 'ana@acme.cl', atualizar: true),
        ]);

        $this->assertCount(1, $result->errors);
        $this->assertSame(2, $result->errors[0]->row);
        $this->assertSame(0, $result->relinked);
        $this->assertSame('pedro@acme.cl', $student->user()->first()->email);
        $this->assertSame(0, $this->turma->enrollments()->count());
    }

    public function test_actualizar_com_nome_acima_do_teto_vira_erro_da_linha(): void
    {
        $student = $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        $result = $this->confirmar([
            $this->linha(2, '33.333.333-3', str_repeat('a', TetosImpressos::NOME_ALUNO + 1), atualizar: true),
        ]);

        $this->assertCount(1, $result->errors);
        $this->assertSame('Pedro Lagos', $student->user()->first()->name);
        $this->assertSame(0, $this->turma->enrollments()->count());
    }

    public function test_sem_permissao_de_update_recusa_so_a_linha(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');
        $this->aluno('44.444.444-4', 'Ana Mora', 'ana@acme.cl');

        $result = $this->confirmar([
            $this->linha(2, '33.333.333-3', 'Pedro Alterado', atualizar: true),   // pede update: recusada
            $this->linha(3, '44.444.444-4', 'Ana Mora'),                          // mantener: segue
            $this->linha(4, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', atualizar: true), // aluno novo: flag ignorada
        ], $this->semPermissaoDeEdicao());

        $this->assertCount(1, $result->errors);
        $this->assertSame(2, $result->errors[0]->row);
        $this->assertSame(__('operation.enrollment.import.update_forbidden'), $result->errors[0]->message);
        $this->assertSame(1, $result->relinked);
        $this->assertSame(1, $result->created);
        $this->assertSame('Pedro Lagos', User::where('rut', '33.333.333-3')->value('name'));
        $this->assertSame(2, $this->turma->enrollments()->count());
    }

    public function test_linha_ja_matriculada_conta_e_nao_duplica(): void
    {
        $this->confirmar([$this->linha(2, '11.111.111-1', 'Juan Soto', 'juan@acme.cl')]);

        $result = $this->confirmar([$this->linha(2, '11.111.111-1', 'Juan Soto', 'juan@acme.cl')]);

        $this->assertSame(0, $result->created);
        $this->assertSame(1, $result->already_enrolled);
        $this->assertSame(1, $result->enrolled_total);
    }

    public function test_confirmar_duas_vezes_nao_duplica(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');
        $linhas = fn () => [
            $this->linha(2, '11.111.111-1', 'Juan Soto', 'juan@acme.cl'),
            $this->linha(3, '33.333.333-3', 'Pedro Lagos', atualizar: true),
        ];

        $this->confirmar($linhas());
        $segunda = $this->confirmar($linhas());

        $this->assertSame(0, $segunda->created);
        $this->assertSame(0, $segunda->relinked);
        $this->assertSame(2, $segunda->already_enrolled);
        $this->assertSame([], $segunda->errors);
        $this->assertSame(2, $this->turma->enrollments()->count());
        $this->assertSame(2, Student::count()); // Pedro já existia, Juan nasceu uma vez só
    }

    public function test_rut_repetido_em_formatos_diferentes_recusa_o_segundo(): void
    {
        $result = $this->confirmar([
            $this->linha(2, '11.111.111-1', 'Juan Soto', 'juan@acme.cl'),
            $this->linha(3, '11111111-1', 'Juan Soto', 'otro@acme.cl'),
        ]);

        $this->assertSame(1, $result->created);
        $this->assertCount(1, $result->errors);
        $this->assertSame(3, $result->errors[0]->row);
        $this->assertSame(__('operation.enrollment.import.duplicate_rut'), $result->errors[0]->message);
        $this->assertDatabaseMissing('users', ['email' => 'otro@acme.cl']);
    }

    public function test_email_repetido_entre_novos_recusa_o_segundo(): void
    {
        $result = $this->confirmar([
            $this->linha(2, '11.111.111-1', 'Juan Soto', 'juan@acme.cl'),
            $this->linha(3, '33.333.333-3', 'Pedro Lagos', 'JUAN@acme.cl'),
        ]);

        $this->assertSame(1, $result->created);
        $this->assertSame(3, $result->errors[0]->row);
        $this->assertSame(__('operation.enrollment.import.duplicate_email'), $result->errors[0]->message);
    }

    public function test_email_de_actualizar_repetido_em_linha_nova_recusa_a_segunda(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        $result = $this->confirmar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos', 'Nuevo@acme.cl', atualizar: true),
            $this->linha(3, '11.111.111-1', 'Juan Soto', 'nuevo@acme.cl'),
        ]);

        $this->assertSame(1, $result->relinked);
        $this->assertSame(0, $result->created);
        $this->assertCount(1, $result->errors);
        $this->assertSame(3, $result->errors[0]->row);
        $this->assertSame(__('operation.enrollment.import.duplicate_email'), $result->errors[0]->message);
        $this->assertDatabaseMissing('users', ['rut' => '11.111.111-1']);
    }

    public function test_nome_vazio_recusa_a_linha_mesmo_de_aluno_cadastrado(): void
    {
        $student = $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');
        $nomeObrigatorio = __('validation.required', ['attribute' => __('validation.attributes.name')]);

        $result = $this->confirmar([
            $this->linha(2, '33.333.333-3', ''),
            $this->linha(3, '11.111.111-1', '   ', 'juan@acme.cl'),
        ]);

        $this->assertCount(2, $result->errors);
        $this->assertSame($nomeObrigatorio, $result->errors[0]->message);
        $this->assertSame($nomeObrigatorio, $result->errors[1]->message);
        $this->assertSame(0, $this->turma->enrollments()->count());
        $this->assertSame('Pedro Lagos', $student->user()->first()->name);
    }

    public function test_linha_com_nome_acima_do_teto_vira_erro_da_linha(): void
    {
        $result = $this->confirmar([
            $this->linha(2, '11.111.111-1', str_repeat('a', TetosImpressos::NOME_ALUNO + 1), 'largo@acme.cl'),
            $this->linha(3, '44.444.444-4', str_repeat('a', TetosImpressos::NOME_ALUNO), 'justo@acme.cl'),
        ]);

        $this->assertSame(1, $result->created);
        $this->assertCount(1, $result->errors);
        $this->assertSame(2, $result->errors[0]->row);
        $this->assertDatabaseMissing('users', ['email' => 'largo@acme.cl']);
        $this->assertDatabaseHas('users', ['email' => 'justo@acme.cl']);
    }

    public function test_aluno_arquivado_e_restaurado_e_atualizado(): void
    {
        $student = $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');
        $student->delete();

        $result = $this->confirmar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos Rojas', atualizar: true),
        ]);

        $this->assertSame([], $result->errors);
        $user = User::where('rut', '33.333.333-3')->firstOrFail();
        $this->assertSame('Pedro Lagos Rojas', $user->name);
        $this->assertNull($user->deleted_at);
        $this->assertSame(1, $this->turma->enrollments()->count());
    }

    public function test_rows_vazio_ou_acima_de_100_recusa_sem_escrever(): void
    {
        foreach ([[], array_map(
            fn (int $i) => $this->linha($i + 2, '11.111.111-1', "Aluno {$i}", "a{$i}@acme.cl"),
            range(1, ImportStudentsAction::MAX_LINHAS + 1),
        ), new Optional] as $rows) {
            try {
                $data = $rows instanceof Optional ? new ImportConfirmData : new ImportConfirmData($rows);
                app(ImportStudentsAction::class)->execute($this->turma, $data, $this->admin);
                $this->fail('A confirmação sem linhas ou acima do teto tinha de ser recusada.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('rows', $e->errors());
            }
        }

        $this->assertSame(0, $this->turma->enrollments()->count());
        $this->assertDatabaseMissing('users', ['rut' => '11.111.111-1']);
    }

    public function test_turma_nao_gravavel_recusa_422(): void
    {
        $this->turma->update(['status' => TurmaStatus::Concluida, 'concluded_at' => now()]);

        try {
            $this->confirmar([$this->linha(2, '11.111.111-1', 'Juan Soto', 'juan@acme.cl')]);
            $this->fail('Turma concluída tinha de recusar a confirmação.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('turma', $e->errors());
        }

        $this->assertDatabaseMissing('users', ['rut' => '11.111.111-1']);
    }
}
