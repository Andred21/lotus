<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\SpreadsheetRowReader;
use App\Domains\Operation\Services\SpreadsheetTemplate;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class SpreadsheetTemplateTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    /** @var list<string> */
    private array $temporarios = [];

    protected function tearDown(): void
    {
        foreach ($this->temporarios as $path) {
            @unlink($path);
        }
        parent::tearDown();
    }

    private function caminhoTemporario(): string
    {
        $base = tempnam(sys_get_temp_dir(), 'tpl');
        $path = $base.'.xlsx';
        $this->temporarios[] = $base;
        $this->temporarios[] = $path;

        return $path;
    }

    private function modelo(): string
    {
        $path = $this->caminhoTemporario();
        (new SpreadsheetTemplate)->write($path);

        return $path;
    }

    private function upload(string $path): UploadedFile
    {
        return new UploadedFile($path, 'alunos.xlsx', self::XLSX_MIME, null, true);
    }

    private function turma(): Turma
    {
        $clientId = $this->makeClientWithUser()->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    public function test_modelo_tem_o_cabecalho_do_leitor(): void
    {
        $reader = new XlsxReader;
        $reader->open($this->modelo());

        $linhas = [];
        foreach ($reader->getSheetIterator() as $sheet) {
            foreach ($sheet->getRowIterator() as $row) {
                $linhas[] = $row->toArray();
            }
            break;
        }
        $reader->close();

        $this->assertSame(['RUT', 'Nombre', 'Email', 'Teléfono'], SpreadsheetRowReader::HEADER);
        $this->assertSame(SpreadsheetRowReader::HEADER, $linhas[0]);
    }

    public function test_modelo_volta_pelo_leitor_sem_linhas(): void
    {
        $linhas = iterator_to_array((new SpreadsheetRowReader)->rows($this->upload($this->modelo()), 100));

        $this->assertSame([], $linhas);
    }

    public function test_modelo_preenchido_volta_pelo_leitor(): void
    {
        $preenchido = $this->caminhoTemporario();
        $writer = new XlsxWriter;
        $writer->openToFile($preenchido);
        $writer->addRow(Row::fromValues(SpreadsheetRowReader::HEADER));
        $writer->addRow(Row::fromValues(['12.345.678-5', 'Ana Pérez', 'ana@x.cl', '']));
        $writer->close();

        $linhas = iterator_to_array((new SpreadsheetRowReader)->rows($this->upload($preenchido), 100), false);

        $this->assertCount(1, $linhas);
        $this->assertSame('12.345.678-5', $linhas[0]['rut']);
        $this->assertSame('Ana Pérez', $linhas[0]['name']);
        $this->assertSame('ana@x.cl', $linhas[0]['email']);
        $this->assertNull($linhas[0]['phone']);
    }

    public function test_rota_entrega_xlsx_para_admin(): void
    {
        $turma = $this->turma();
        $this->actingAsAdmin();

        $resposta = $this->get("/api/turmas/{$turma->id}/alunos/importar/plantilla");

        $resposta->assertOk();
        $resposta->assertHeader('Content-Type', self::XLSX_MIME);
        $this->assertStringContainsString(
            'attachment; filename=plantilla-alumnos.xlsx',
            str_replace('"', '', (string) $resposta->headers->get('Content-Disposition')),
        );
    }

    public function test_rota_recusa_redator_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $turma = $this->turma();
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $turma->redatores()->attach($user->redator()->create([])->id);
        $this->actingAs($user, 'web');

        $this->get("/api/turmas/{$turma->id}/alunos/importar/plantilla")->assertForbidden();
    }
}
