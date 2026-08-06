<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class PublicCertificateData extends Data
{
    public function __construct(
        public string $codigo,
        public CertificateStatus $status,
        public ?string $valido_ate,
        public ?string $revoked_at,
        /** @var array{name: string} */
        public array $aluno,
        /** @var array{name: string, workload_hours: int} */
        public array $curso,
        /** @var array{end_date: string} */
        public array $turma,
        /** @var array{name: string} */
        public array $cliente,
        /** @var array{name: string} */
        public array $redator,
    ) {}

    public static function fromModel(Certificate $certificate): self
    {
        $snapshot = $certificate->snapshot;

        return new self(
            codigo: $certificate->codigo,
            status: $certificate->status,
            valido_ate: $certificate->valido_ate?->toDateString(),
            revoked_at: $certificate->revoked_at?->toISOString(),
            aluno: ['name' => $snapshot['aluno']['name']],
            curso: [
                'name' => $snapshot['curso']['name'],
                'workload_hours' => $snapshot['curso']['workload_hours'],
            ],
            turma: ['end_date' => $snapshot['turma']['end_date']],
            cliente: ['name' => $snapshot['cliente']['name']],
            redator: ['name' => $snapshot['redator']['name']],
        );
    }
}
