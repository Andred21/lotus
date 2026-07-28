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
        public int $enrollments_count,
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
            // Deriva das matrículas já carregadas quando o `show` não pediu o
            // loadCount — a relação está em memória, então não gera query extra.
            enrollments_count: $student->enrollments_count ?? $student->enrollments->count(),
            links: $student->logs
                ->sortBy([
                    ['started_on', 'desc'],
                    ['id', 'desc'],
                ])
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
