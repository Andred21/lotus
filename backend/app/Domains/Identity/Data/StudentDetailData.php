<?php

namespace App\Domains\Identity\Data;

use App\Domains\Certification\Services\StudentCertificateSummary;
use App\Domains\Identity\Models\Student;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Illuminate\Support\Collection;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Projeção de leitura do detalhe do aluno — só saída, usada pelo `show`.
 * Separada de StudentData para que a listagem não carregue logs e matrículas de
 * todos os alunos. Mesmo papel de EnrollPreviewData e PendingQuoteData.
 *
 * Os certificados entram por COLUNA da linha de turma (`StudentTurmaData`), a
 * partir da coleção que o controller resolve: o DTO não toca o container. A
 * frase que aqui dizia "Certification não existe (Bloco 7)" era falsa desde o
 * Bloco 7 e sustentou a P-15 por um mês.
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
        /** A mesma foto viva de `StudentData`: o `useOne` da lista lê este
         * endpoint quando o aluno aberto não está na página carregada (D14),
         * e o dialog precisa da mesma forma nos dois caminhos. */
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url = null,
    ) {}

    /**
     * @param  Collection<int, StudentCertificateSummary>  $certificates
     *                                                                    indexada por `enrollment_id`, já resolvida pelo controller
     */
    public static function fromModel(Student $student, Collection $certificates): self
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
                ->map(fn ($enrollment) => StudentTurmaData::fromModel(
                    $enrollment,
                    $certificates->get($enrollment->id),
                ))
                ->all(),
            photo_url: $student->user->photo_path,
        );
    }
}
