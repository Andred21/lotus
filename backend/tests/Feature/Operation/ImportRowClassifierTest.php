<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Services\StudentIdentity;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Data\ImportConfirmRowData;
use App\Domains\Operation\Enums\ImportField;
use App\Domains\Operation\Enums\ImportRowStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\ImportRowClassifier;
use App\Domains\Operation\Services\ImportRowDecision;
use App\Shared\Support\TetosImpressos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O classificador é a regra única de uma linha da planilha: a prévia e a
 * confirmação decidem pelo mesmo código. Cada teste prova UMA regra, com a
 * mensagem asserida, para que o mesmo texto não saia de duas portas diferentes.
 */
class ImportRowClassifierTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = $this->makeClientWithUser([], ['rut' => '22.333.444-K']);
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

    private function aluno(string $rut, string $name, string $email, ?string $phone = null): Student
    {
        return app(StudentResolver::class)
            ->resolveByRut(new StudentIdentity($rut, $name, $email, $phone), $this->client)->student;
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

    /**
     * @param  list<ImportConfirmRowData>  $linhas
     * @return list<ImportRowDecision>
     */
    private function classificar(array $linhas, bool $podeAtualizar = true): array
    {
        return app(ImportRowClassifier::class)->classify($this->turma, $linhas, $podeAtualizar);
    }

    public function test_email_divergente_de_cadastrado_reserva_antes_do_aluno_novo(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        $d = $this->classificar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos', 'x@acme.cl'),   // cadastrada, e-mail X diverge
            $this->linha(3, '11.111.111-1', 'Juan Soto', 'X@acme.cl'),     // nova com X
        ]);

        $this->assertSame(ImportRowStatus::Registered, $d[0]->status);
        $this->assertSame([ImportField::Email], $d[0]->divergent);
        $this->assertNull($d[0]->updateRefusal);
        $this->assertSame(ImportRowStatus::Error, $d[1]->status);
        $this->assertSame(__('operation.enrollment.import.duplicate_email', ['row' => 2]), $d[1]->refusal);
        $this->assertTrue($d[1]->rowRefused());
    }

    public function test_cadastrado_que_perde_a_reserva_perde_so_o_actualizar(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        $d = $this->classificar([
            $this->linha(2, '11.111.111-1', 'Juan Soto', 'x@acme.cl'),     // nova reserva X
            $this->linha(3, '33.333.333-3', 'Pedro Lagos', 'X@acme.cl', atualizar: true),
        ]);

        $this->assertSame(ImportRowStatus::New, $d[0]->status);
        $this->assertSame(ImportRowStatus::Registered, $d[1]->status);
        $this->assertNull($d[1]->refusal);
        $this->assertFalse($d[1]->rowRefused());
        $this->assertSame(__('operation.enrollment.import.duplicate_email', ['row' => 2]), $d[1]->updateRefusal);
        $this->assertTrue($d[1]->updateRefused());
        $this->assertFalse($d[1]->updates());
    }

    public function test_linha_com_erro_nao_reserva_email(): void
    {
        $d = $this->classificar([
            $this->linha(2, '11.111.111-1', str_repeat('A', TetosImpressos::NOME_ALUNO + 1), 'x@acme.cl'),
            $this->linha(3, '33.333.333-3', 'Pedro Lagos', 'x@acme.cl'),
        ]);

        $this->assertSame(ImportRowStatus::Error, $d[0]->status);
        $this->assertSame(ImportRowStatus::New, $d[1]->status);
        $this->assertNull($d[1]->refusal);
    }

    public function test_mantener_nao_valida_o_que_nao_grava(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        $d = $this->classificar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos', 'no-es-un-correo'),
        ]);

        $this->assertSame(ImportRowStatus::Registered, $d[0]->status);
        $this->assertNull($d[0]->refusal);
        $this->assertNotNull($d[0]->updateRefusal);
        $this->assertSame(
            __('validation.email', ['attribute' => __('validation.attributes.email')]),
            $d[0]->updateRefusal,
        );
        $this->assertFalse($d[0]->updates()); // flag desligada
        $this->assertSame('pedro@acme.cl', $d[0]->identity->email); // a execução matricula com o cadastro
    }

    public function test_actualizar_em_branco_preserva_e_nao_reserva(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', '+56 9 1111');

        $d = $this->classificar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos Díaz', null, null, atualizar: true),
            $this->linha(3, '11.111.111-1', 'Juan Soto', 'pedro@acme.cl'), // e-mail do cadastro: o branco não o reservou
        ]);

        $this->assertSame([ImportField::Name], $d[0]->divergent);
        $this->assertNull($d[0]->updateRefusal);
        $this->assertTrue($d[0]->updates());
        $this->assertSame('pedro@acme.cl', $d[0]->updatedIdentity->email);
        $this->assertSame('+56 9 1111', $d[0]->updatedIdentity->phone);
        $this->assertSame('33.333.333-3', $d[0]->updatedIdentity->rut);
        // A linha 3 cai pela identidade que já existe no banco, NÃO por duplicidade na planilha.
        $this->assertSame(ImportRowStatus::Error, $d[1]->status);
        $this->assertNotSame(__('operation.enrollment.import.duplicate_email', ['row' => 2]), $d[1]->refusal);
    }

    public function test_email_com_caixa_diferente_e_duplicidade_e_nao_divergencia(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        $d = $this->classificar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos', 'PEDRO@ACME.CL'),
            $this->linha(3, '11.111.111-1', 'Juan Soto', 'juan@acme.cl'),
            $this->linha(4, '44.444.444-4', 'Ana Mora', 'JUAN@acme.cl'),
        ]);

        $this->assertSame([], $d[0]->divergent);   // caixa não diverge
        $this->assertNull($d[0]->updateRefusal);
        $this->assertSame(ImportRowStatus::Error, $d[2]->status); // mas é duplicidade entre as linhas
        $this->assertSame(__('operation.enrollment.import.duplicate_email', ['row' => 3]), $d[2]->refusal);
    }

    public function test_ja_matriculado_ignora_a_flag(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');
        app(EnrollStudentAction::class)->execute($this->turma, new StudentIdentity('33.333.333-3', 'Pedro Lagos', null, null));

        $d = $this->classificar([
            $this->linha(2, '33.333.333-3', 'Pedro Otro', 'otro@acme.cl', atualizar: true),
            $this->linha(3, '11.111.111-1', 'Juan Soto', 'otro@acme.cl'), // nada foi reservado pela linha 2
        ]);

        $this->assertSame(ImportRowStatus::AlreadyEnrolled, $d[0]->status);
        $this->assertFalse($d[0]->updates());
        $this->assertFalse($d[0]->updateRefused());
        $this->assertNull($d[0]->updateRefusal);
        $this->assertSame(ImportRowStatus::New, $d[1]->status);
    }

    public function test_sem_permissao_actualizar_recusado_com_update_forbidden(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        $d = $this->classificar([
            $this->linha(2, '33.333.333-3', 'Pedro Lagos', null, null, atualizar: true),
        ], podeAtualizar: false);

        $this->assertSame(ImportRowStatus::Registered, $d[0]->status);
        $this->assertNull($d[0]->refusal);
        $this->assertSame(__('operation.enrollment.import.update_forbidden'), $d[0]->updateRefusal);
        $this->assertTrue($d[0]->updateRefused());
        $this->assertFalse($d[0]->updates());
    }
}
