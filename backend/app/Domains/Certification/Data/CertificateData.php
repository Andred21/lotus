<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Data\Snapshot\CertificateSnapshotData;
use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Carbon\CarbonInterface;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * `snapshot_ok` diz se o documento é APRESENTÁVEL, não se ele existe —
 * `snapshot` continua não-nulo e continua sendo a leitura tolerante do JSON
 * congelado. Só a listagem consome o campo: `show`, `pdf` e a rota pública do
 * QR recusam o documento corrompido antes de projetá-lo.
 */
#[TypeScript]
class CertificateData extends Data
{
    public function __construct(
        public int $id,
        public string $uuid,
        public string $codigo,
        public int $enrollment_id,
        public int $course_id,
        public int $redator_id,
        public CertificateStatus $status,
        public ?string $valido_ate,
        public ?string $revoked_at,
        public ?string $revocation_reason,
        public CertificateSnapshotData $snapshot,
        public bool $snapshot_ok,
        public string $created_at,
        /** O estado de EXIBIÇÃO, derivado no servidor (spec D4). O React
         * consumia `status` + `valido_ate` e refazia esta conta — regra de
         * domínio reconstruída no cliente, num documento de peso legal. */
        #[Computed]
        public CertificateDisplayStatus $display_status,
        /** Foto VIVA do aluno, deliberadamente fora do snapshot: é identidade
         * visual da listagem, não dado do documento congelado. */
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $aluno_photo_url = null,
    ) {}

    /**
     * `$hoje` é OPCIONAL para quem projeta um certificado avulso (`show`,
     * `store`, `revoke`). A listagem passa o `hoje` calculado uma vez em
     * `CertificateController::index` — sem isso, cada linha da página
     * recalcularia o próprio `hoje`, e um request que atravessasse a meia-noite
     * de Santiago entre a primeira e a última linha devolveria página cujo
     * `display_status` contradiz o filtro ou o resumo que a acompanha (achado
     * de review da Task 6).
     */
    public static function fromModel(Certificate $certificate, ?CarbonInterface $hoje = null): self
    {
        // Lido UMA vez: o cast do snapshot tem `withoutObjectCaching` (para
        // que nenhum `save()` reescreva o documento congelado), então cada
        // acesso à propriedade decodifica o JSON e remonta a árvore de DTOs de
        // novo. A listagem pagina desde o bloco `hardening-performance-e-dados`,
        // mas cada página são até 100 decodes, e ler duas vezes aqui dobrava isso.
        $snapshot = $certificate->snapshot;

        return new self(
            id: $certificate->id,
            uuid: $certificate->uuid,
            codigo: $certificate->codigo,
            enrollment_id: $certificate->enrollment_id,
            course_id: $certificate->course_id,
            redator_id: $certificate->redator_id,
            status: $certificate->status,
            valido_ate: $certificate->valido_ate?->toDateString(),
            revoked_at: $certificate->revoked_at?->toISOString(),
            revocation_reason: $certificate->revocation_reason,
            snapshot: $snapshot,
            snapshot_ok: $snapshot->isPresentable(),
            created_at: $certificate->created_at->toISOString(),
            display_status: CertificateDisplayStatus::for(
                $certificate->status,
                $certificate->valido_ate,
                $hoje ?? CertificateDisplayStatus::hoje(),
            ),
            aluno_photo_url: $certificate->enrollment->student->user->photo_path,
        );
    }
}
