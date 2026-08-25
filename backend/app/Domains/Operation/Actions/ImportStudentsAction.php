<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Operation\Data\ImportResultData;
use App\Domains\Operation\Data\ImportRowErrorData;
use App\Domains\Operation\Data\MovedStudentData;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\SpreadsheetRowReader;
use App\Shared\Validation\ValidationMessages;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Orquestra o import: transação POR LINHA (a do EnrollStudentAction), nunca
 * global — linha com erro é reportada no resumo e a planilha segue (tela-turmas).
 */
class ImportStudentsAction
{
    /**
     * Teto de linhas por planilha. Turma real tem 8 a 15 alunos
     * (`OperationDemoSeeder`), então 500 é ~33× a maior. Sem ele, o único
     * limite era o tamanho do arquivo — um CSV de 10 MB passa de cem mil
     * linhas, e cada linha é uma transação de matrícula.
     */
    public const MAX_LINHAS = 500;

    public function __construct(
        private readonly SpreadsheetRowReader $reader,
        private readonly EnrollStudentAction $enroll,
    ) {}

    public function execute(Turma $turma, UploadedFile $file): ImportResultData
    {
        // O gate fica no topo mesmo com o EnrollStudentAction gateando por
        // linha: recusar a planilha inteira de uma vez é a resposta certa, e
        // não é o mesmo que recusar 40 linhas uma a uma.
        $turma->assertAcademicallyWritable();

        // Materializa ANTES de matricular, e para de ler na primeira linha
        // acima do teto. O leitor é um gerador e o laço abaixo escreve por
        // linha: teto aplicado durante o laço recusaria a planilha DEPOIS de
        // já ter matriculado parte dela — o que não é recusa, é meia importação.
        // Memória: 500 linhas de quatro campos curtos, contra os 256M do pool.
        $linhas = [];

        foreach ($this->reader->rows($file) as $linha) {
            if (count($linhas) >= self::MAX_LINHAS) {
                throw ValidationException::withMessages([
                    'file' => 'La planilla supera el máximo de '.self::MAX_LINHAS.' filas. Divídala y vuelva a enviarla.',
                ]);
            }

            $linhas[] = $linha;
        }

        $created = $relinked = $already = 0;
        $moved = [];
        $errors = [];

        foreach ($linhas as $line) {
            try {
                $outcome = $this->enroll->execute(
                    $turma, $line['rut'], $line['name'], $line['email'], $line['phone'],
                );

                if ($outcome->alreadyEnrolled) {
                    $already++;

                    continue;
                }

                match ($outcome->resolution->outcome) {
                    StudentResolutionOutcome::Created => $created++,
                    StudentResolutionOutcome::AlreadyLinked => $relinked++,
                    StudentResolutionOutcome::Moved => $moved[] = new MovedStudentData(
                        rut: $outcome->resolution->student->user->rut,
                        name: $outcome->resolution->student->user->name,
                        previous_client: $outcome->resolution->previousClient?->legal_name,
                        client: $turma->contratante()->name,
                    ),
                };
            } catch (ValidationException $e) {
                $errors[] = new ImportRowErrorData(
                    row: $line['row'],
                    message: ValidationMessages::squash($e),
                );
            }
        }

        return new ImportResultData(
            created: $created,
            relinked: $relinked,
            already_enrolled: $already,
            moved: $moved,
            errors: $errors,
            enrolled_total: $turma->enrollments()->count(),
            contracted_count: $turma->quote->student_count,
        );
    }
}
