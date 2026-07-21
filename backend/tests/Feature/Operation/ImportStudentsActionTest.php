<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Actions\ImportStudentsAction;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\TestCase;

class ImportStudentsActionTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private Client $otherClient;

    protected function setUp(): void
    {
        parent::setUp();
        $client = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client']);
        $this->otherClient = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'OTRA', 'type' => 'client']);
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 2, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    private function xlsx(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        $writer = new XlsxWriter;
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues(['RUT', 'Nombre', 'Email', 'Teléfono']));
        foreach ($rows as $row) {
            $writer->addRow(Row::fromValues($row));
        }
        $writer->close();

        return new UploadedFile($path, 'alunos.xlsx', null, null, true);
    }

    public function test_import_misto_reporta_e_nao_aborta(): void
    {
        // aluno pré-existente vinculado a OUTRO cliente → moved
        app(StudentResolver::class)
            ->resolveByRut('33.333.333-3', 'Pedro Lagos', 'pedro@otra.cl', null, $this->otherClient);

        $result = app(ImportStudentsAction::class)->execute($this->turma, $this->xlsx([
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '+56 9 1111'],   // novo
            ['RUT-INVALIDO', 'Mal Formado', '', ''],                       // erro rut (linha 3)
            ['33.333.333-3', 'Pedro Lagos', '', ''],                       // moved
            ['11.111.111-1', 'Juan Soto', '', ''],                         // duplicado na planilha
            ['44.444.444-4', 'Sin Correo', '', ''],                        // erro email/D9 (linha 6)
        ]));

        $this->assertSame(1, $result->created);
        $this->assertSame(0, $result->relinked);
        $this->assertSame(1, $result->already_enrolled);
        $this->assertCount(1, $result->moved);
        $this->assertSame('OTRA', $result->moved[0]->previous_client);
        $this->assertSame('ACME', $result->moved[0]->client);
        $this->assertCount(2, $result->errors);
        $this->assertSame(3, $result->errors[0]->row);
        $this->assertSame(6, $result->errors[1]->row);
        $this->assertSame(2, $result->enrolled_total);   // Juan + Pedro persistidos
        $this->assertSame(2, $result->contracted_count); // D3: informa, nunca bloqueia
    }

    public function test_reimport_e_idempotente(): void
    {
        $file = fn () => $this->xlsx([['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '']]);
        app(ImportStudentsAction::class)->execute($this->turma, $file());
        $result = app(ImportStudentsAction::class)->execute($this->turma, $file());

        $this->assertSame(0, $result->created);
        $this->assertSame(1, $result->already_enrolled);
        $this->assertSame(1, $result->enrolled_total);
    }

    public function test_turma_fora_de_andamento_recusa_422(): void
    {
        $this->turma->update(['status' => TurmaStatus::Concluida]);

        $this->expectException(ValidationException::class);
        app(ImportStudentsAction::class)->execute($this->turma, $this->xlsx([]));
    }
}
