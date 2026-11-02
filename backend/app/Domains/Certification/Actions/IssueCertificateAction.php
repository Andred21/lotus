<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateEligibility;
use App\Domains\Certification\Services\CertificateNumberService;
use App\Domains\Certification\Services\CertificateSnapshotBuilder;
use App\Domains\Certification\Services\CertificateValidationUrl;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use App\Shared\Support\FusoDoNegocio;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IssueCertificateAction
{
    public function __construct(
        private readonly CertificateNumberService $numbers,
        private readonly CertificateSnapshotBuilder $snapshots,
        private readonly CertificateEligibility $eligibility,
        private readonly CertificateValidationUrl $validationUrl,
    ) {}

    public function execute(Enrollment $enrollment, Redator $redator): Certificate
    {
        // P-79: certificado que ninguém consegue baixar não nasce. A recusa
        // vem antes da transação — nada é gravado, nenhum número é tocado.
        $this->validationUrl->base();

        return DB::transaction(function () use ($enrollment, $redator) {
            // P-103, ordem de lock: MATRÍCULA primeiro, certificado depois. A
            // correção do resultado (`RecordEnrollmentResultAction`) faz o mesmo,
            // então as duas serializam aqui e ninguém trava na ordem inversa.
            // A matrícula que chegou por parâmetro foi lida ANTES da transação:
            // decidir a porta 2 e congelar o snapshot nela deixava sair
            // certificado `aprobado` de um aluno que a correção acabara de
            // reprovar. A relida, com lock, é a que portas e snapshot veem.
            $enrollment = Enrollment::query()
                ->with(['turma.course.modules', 'turma.quote.budget.client.user', 'student.user'])
                ->whereKey($enrollment->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Um instante para a emissão inteira. A sequência espera pelo lock,
            // e três `now()` separados deixam uma emissão da virada do ano
            // gravar data de 2027 num código LOT-2026.
            //
            // E o instante no fuso de SANTIAGO (P-59): `->year`, o `emitido_em`
            // do snapshot e o `valido_ate` são datas do documento, e o relógio
            // UTC as adiantava um dia das 21h à meia-noite locais.
            $now = FusoDoNegocio::agora();

            // As cinco portas. A decisão mora nelas; o painel de emissão só
            // REPORTA os mesmos motivos (`EmissionPanelQuery`), e por isso a
            // tela não promete o que aqui se recusa.
            $context = $this->eligibility->assert($enrollment, $redator);

            return Certificate::create([
                'uuid' => (string) Str::uuid(),
                'enrollment_id' => $enrollment->id,
                'course_id' => $context->turma->course_id,
                'redator_id' => $redator->id,
                'codigo' => $this->numbers->next((int) $now->year),
                'snapshot' => $this->snapshots->build(
                    $enrollment,
                    $redator,
                    $now,
                    $context->ciudadEmision,
                ),
                'valido_ate' => null,
                'status' => CertificateStatus::Emitido,
                'revoked_at' => null,
                'revocation_reason' => null,
            ]);
        });
    }
}
