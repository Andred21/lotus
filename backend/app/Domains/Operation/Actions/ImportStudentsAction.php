<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Operation\Data\ImportResultData;
use App\Domains\Operation\Data\ImportRowErrorData;
use App\Domains\Operation\Data\MovedStudentData;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\SpreadsheetRowReader;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Orquestra o import: transação POR LINHA (a do EnrollStudentAction), nunca
 * global — linha com erro é reportada no resumo e a planilha segue (tela-turmas).
 */
class ImportStudentsAction
{
    public function __construct(
        private readonly SpreadsheetRowReader $reader,
        private readonly EnrollStudentAction $enroll,
    ) {}

    public function execute(Turma $turma, UploadedFile $file): ImportResultData
    {
        if ($turma->status !== TurmaStatus::EmAndamento) {
            throw ValidationException::withMessages([
                'turma' => 'Importação só é permitida com a turma em andamento.',
            ]);
        }

        $created = $relinked = $already = 0;
        $moved = [];
        $errors = [];

        foreach ($this->reader->rows($file) as $line) {
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
                        client: $turma->quote->budget->client->legal_name,
                    ),
                };
            } catch (ValidationException $e) {
                $errors[] = new ImportRowErrorData(
                    row: $line['row'],
                    message: collect($e->errors())->flatten()->implode(' '),
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
