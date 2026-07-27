<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\Student;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Projeção de leitura do detalhe do aluno — só saída, usada pelo `show`.
 * Separada de StudentData para que a listagem não carregue logs e matrículas de
 * todos os alunos. Mesmo papel de EnrollPreviewData e PendingQuoteData.
 *
 * Certificados não entram: o domínio Certification não existe (Bloco 7).
 */
#[TypeScript]
class StudentDetailData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public string $rut,
        public string $email,
        public ?string $phone,
        public ?int $current_client_id,
        public ?string $current_client_name,
        /** @var array<StudentClientLogData> */
        public array $links,
        /** @var array<StudentTurmaData> */
        public array $turmas,
    ) {}

    public static function fromModel(Student $student): self
    {
        return new self(
            id: $student->id,
            name: $student->user->name,
            rut: $student->user->rut,
            email: $student->user->email,
            phone: $student->user->phone,
            current_client_id: $student->current_client_id,
            current_client_name: $student->currentClient?->legal_name,
            links: $student->logs
                ->sortByDesc('started_on')
                ->values()
                ->map(fn ($log) => StudentClientLogData::fromModel($log))
                ->all(),
            turmas: $student->enrollments
                ->sortByDesc(fn ($enrollment) => $enrollment->turma->start_date)
                ->values()
                ->map(fn ($enrollment) => StudentTurmaData::fromModel($enrollment))
                ->all(),
        );
    }
}
