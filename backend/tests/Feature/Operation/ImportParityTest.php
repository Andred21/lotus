<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentIdentity;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Catraca de paridade da importação (spec D2-D7, molde `EnrollmentEmissionStateParityTest`):
 * a PRÉVIA de uma planilha e a CONFIRMAÇÃO do que o front mandaria decidem pelo
 * mesmo código. Cada cenário é uma planilha mais a escolha por linha, e a asserção
 * é uma só:
 *
 *  - a prévia aponta recusa (`message` numa linha enviada, ou `update_refusal`
 *    numa linha com Actualizar) => a confirmação devolve 422 com EXATAMENTE as
 *    chaves `import.<row>` / `import.<row>.update` e não escreve nada;
 *  - senão => 200, e o resultado bate com a prévia (`new` criou, `registered`
 *    revinculou, `moves` moveu).
 */
class ImportParityTest extends TestCase
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
        $this->actingAsAdmin();
    }

    private function aluno(string $rut, string $name, string $email, ?Client $client = null): Student
    {
        return app(StudentResolver::class)
            ->resolveByRut(new StudentIdentity($rut, $name, $email, null), $client ?? $this->client)->student;
    }

    private function emailDe(string $rut): ?string
    {
        return User::where('rut', $rut)->value('email');
    }

    /** @param  list<list<string>>  $rows */
    private function xlsx(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'par').'.xlsx';
        $writer = new XlsxWriter;
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues(['RUT', 'Nombre', 'Email', 'Teléfono']));
        foreach ($rows as $row) {
            $writer->addRow(Row::fromValues($row));
        }
        $writer->close();

        return new UploadedFile($path, 'alunos.xlsx', null, null, true);
    }

    /** @return array<string,int> */
    private function contagens(): array
    {
        return collect(['users', 'students', 'enrollments', 'audits'])
            ->mapWithKeys(fn (string $t) => [$t => DB::table($t)->count()])
            ->all();
    }

    /**
     * @param  list<list<string>>  $planilha  RUT, nome, e-mail, telefone (linha 2 em diante)
     * @param  list<int>  $actualizar  linhas em que o admin escolheu Actualizar
     * @param  list<string>  $esperadas  chaves de erro do 422 ([] = a confirmação passa)
     * @param  bool  $mandarRecusadas  adultera o corpo: manda também as linhas que a prévia recusou
     */
    private function cenario(array $planilha, array $actualizar, array $esperadas, bool $mandarRecusadas = false): TestResponse
    {
        $previa = $this->postJson(
            "/api/turmas/{$this->turma->id}/alunos/importar/previa",
            ['file' => $this->xlsx($planilha)],
        )->assertOk()->json('rows');

        // O que o front manda: sem `error` nem `already_enrolled`, com a escolha.
        $enviadas = array_values(array_filter(
            $previa,
            fn (array $r) => $mandarRecusadas || ! in_array($r['status'], ['error', 'already_enrolled'], true),
        ));
        $corpo = array_map(fn (array $r) => [
            'row' => $r['row'], 'rut' => $r['rut'], 'name' => $r['name'],
            'email' => $r['email'], 'phone' => $r['phone'],
            'update_registration' => in_array($r['row'], $actualizar, true),
        ], $enviadas);

        // A recusa que a prévia anuncia, na forma das chaves do 422.
        $anunciadas = [];
        foreach ($enviadas as $r) {
            if ($r['message'] !== null) {
                $anunciadas[] = "import.{$r['row']}";
            } elseif ($r['update_refusal'] !== null && in_array($r['row'], $actualizar, true)) {
                $anunciadas[] = "import.{$r['row']}.update";
            }
        }
        sort($anunciadas);
        sort($esperadas);
        $this->assertSame($esperadas, $anunciadas, 'a prévia tem de apontar as recusas esperadas do cenário');

        $antes = $this->contagens();
        $resposta = $this->postJson("/api/turmas/{$this->turma->id}/alunos/importar", ['rows' => $corpo]);

        if ($anunciadas !== []) {
            $resposta->assertStatus(422);
            $chaves = array_keys($resposta->json('errors'));
            sort($chaves);
            $this->assertSame($anunciadas, $chaves);
            $this->assertSame($antes, $this->contagens(), 'o 422 não escreve nada');

            return $resposta;
        }

        $porStatus = collect($enviadas)->countBy('status');
        $resposta->assertOk()
            ->assertJsonPath('errors', [])
            ->assertJsonPath('created', $porStatus->get('new', 0))
            ->assertJsonPath('relinked', $porStatus->get('registered', 0))
            ->assertJsonCount($porStatus->get('moves', 0), 'moved');

        return $resposta;
    }

    public function test_paridade_actualizar_com_email_repetido_por_linha_nova(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        // A linha nova reserva o e-mail primeiro; o cadastrado que o Actualizar
        // gravaria igual perde. A prévia já sabe, a confirmação tem de recusar.
        $this->cenario([
            ['11.111.111-1', 'Juan Soto', 'nuevo@acme.cl', ''],
            ['33.333.333-3', 'Pedro Lagos', 'Nuevo@acme.cl', ''],
        ], actualizar: [3], esperadas: ['import.3.update']);

        $this->assertSame('pedro@acme.cl', $this->emailDe('33.333.333-3'));
        $this->assertNull($this->emailDe('11.111.111-1'));
    }

    public function test_paridade_mantener_com_email_repetido_por_linha_nova_segue(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        $this->cenario([
            ['11.111.111-1', 'Juan Soto', 'nuevo@acme.cl', ''],
            ['33.333.333-3', 'Pedro Lagos', 'Nuevo@acme.cl', ''],
        ], actualizar: [], esperadas: [])
            ->assertJsonPath('created', 1)
            ->assertJsonPath('relinked', 1);

        $this->assertSame('pedro@acme.cl', $this->emailDe('33.333.333-3'));
    }

    public function test_paridade_lote_limpo_misto(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');
        $this->aluno('44.444.444-4', 'Ana Mora', 'ana@otra.cl', $this->otherClient);

        $this->cenario([
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', ''],   // new
            ['33.333.333-3', 'Pedro Lagos', '', ''],             // registered
            ['44.444.444-4', 'Ana Mora', '', ''],                // moves
        ], actualizar: [], esperadas: [])
            ->assertJsonPath('created', 1)
            ->assertJsonPath('relinked', 1)
            ->assertJsonPath('moved.0.previous_client', 'OTRA');
    }

    public function test_paridade_actualizar_com_email_de_outro_aluno(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');
        $this->aluno('44.444.444-4', 'Ana Mora', 'ana@acme.cl');

        $this->cenario([
            ['33.333.333-3', 'Pedro Lagos', 'ana@acme.cl', ''],
        ], actualizar: [2], esperadas: ['import.2.update']);

        $this->assertSame('pedro@acme.cl', $this->emailDe('33.333.333-3'));
    }

    public function test_paridade_mantener_com_email_malformado(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        // Mantener não grava o e-mail da planilha: a forma dele não recusa a linha.
        $this->cenario([
            ['33.333.333-3', 'Pedro Lagos', 'pedro arroba acme', ''],
        ], actualizar: [], esperadas: [])
            ->assertJsonPath('relinked', 1);
    }

    public function test_paridade_actualizar_com_email_malformado(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        $this->cenario([
            ['33.333.333-3', 'Pedro Lagos', 'pedro arroba acme', ''],
        ], actualizar: [2], esperadas: ['import.2.update']);
    }

    public function test_paridade_linha_recusada_enviada_a_forca_recusa_o_lote(): void
    {
        $this->aluno('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl');

        // Corpo adulterado: o front não manda a linha `error`, mas o servidor
        // revalida, recusa a linha e não grava as boas do mesmo lote.
        $this->cenario([
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', ''],
            ['RUT-INVALIDO', 'Mal Formado', '', ''],
            ['33.333.333-3', 'Pedro Lagos', '', ''],
        ], actualizar: [], esperadas: ['import.3'], mandarRecusadas: true);
    }
}
