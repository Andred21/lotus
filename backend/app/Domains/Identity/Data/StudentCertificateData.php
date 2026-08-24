<?php

namespace App\Domains\Identity\Data;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Services\StudentCertificateSummary;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O certificado de uma matrícula, na linha do histórico de turmas do aluno.
 * Só saída.
 *
 * Mora em `Identity` porque é projeção de Identity: quem cruza a fronteira é o
 * `StudentCertificateSummary`, VO da camada pública de Certification. O
 * documento em si — `Certificate`, `CertificateStatus`, o snapshot — não sai
 * do domínio dele (spec D3).
 *
 * `display_status` é o ENUM, não `string`: o front precisa da união fechada
 * para casar severidade e rótulo sem um fallback que engula estado novo —
 * mesma razão do `approval_status` em `StudentTurmaData`.
 */
#[TypeScript]
class StudentCertificateData extends Data
{
    public function __construct(
        public int $id,
        public string $codigo,
        public CertificateDisplayStatus $display_status,
        /** `null` quando a vigência é indeterminada — o caso comum. A célula
         * só imprime data quando este campo existe (spec D5/D6). */
        public ?string $valido_ate,
        /** Documento corrompido não tem estado a afirmar: a célula troca a tag
         * de estado pela de defeito (política herdada do Historial). */
        public bool $snapshot_ok,
    ) {}

    public static function fromSummary(StudentCertificateSummary $summary): self
    {
        return new self(
            id: $summary->id,
            codigo: $summary->codigo,
            display_status: $summary->displayStatus,
            valido_ate: $summary->validoAte,
            snapshot_ok: $summary->snapshotOk,
        );
    }
}
