<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Data\Snapshot\CertificateSnapshotData;
use App\Domains\Certification\Data\Snapshot\SnapshotPartyData;
use App\Domains\Certification\Data\Snapshot\SnapshotResultData;
use App\Domains\Certification\Data\Snapshot\SnapshotTemplateData;
use App\Domains\Certification\Data\Snapshot\SnapshotTurmaData;
use App\Domains\Certification\Models\Certificate;
use App\Shared\Support\FusoDoNegocio;

/**
 * Monta o certificado FICTÍCIO de um curso, para a amostra (bloco 39). Devolve
 * um model nunca persistido: sem `create`, sem auditoria, sem número da série.
 * O curso é o único dado real; aluno, cliente, relator e turma são marcadores
 * de exemplo, para ninguém confundir a amostra com um documento emitido.
 */
class CertificatePreviewBuilder
{
    /** Código impresso na amostra — nunca sai da série `LOT-AAAA-NNNN`. */
    public const CODIGO = 'MUESTRA';

    public function __construct(
        private readonly CertificateSnapshotBuilder $snapshot,
        private readonly EmissionCityResolver $city,
    ) {}

    public function build(Course $course): Certificate
    {
        $course->loadMissing('modules');
        $hoje = FusoDoNegocio::hoje()->toDateString();

        $snapshot = new CertificateSnapshotData(
            schema_version: CertificateSnapshotData::CURRENT_VERSION,
            aluno: new SnapshotPartyData(name: 'NOMBRE APELLIDO DEL ALUMNO', rut: '11.111.111-1'),
            curso: $this->snapshot->curso($course),
            turma: new SnapshotTurmaData(
                id: null,
                start_date: $hoje,
                end_date: $hoje,
                modalidade: 'online',
            ),
            cliente: new SnapshotPartyData(name: 'EMPRESA DE EJEMPLO SpA', rut: '33.333.333-3'),
            emissor: new SnapshotPartyData(
                name: (string) config('app.certificate_issuer.name'),
                rut: (string) config('app.certificate_issuer.rut'),
            ),
            redator: new SnapshotPartyData(name: 'NOMBRE DEL RELATOR', rut: '22.222.222-2'),
            resultado: new SnapshotResultData(
                grades: ['final' => 7.0],
                approval_status: 'aprobado',
                attendance_pct: '100.00',
            ),
            template: new SnapshotTemplateData(version: null, city: null),
            ciudad_emision: $this->city->issuerCity(),
            emitido_em: $hoje,
        );

        return new Certificate([
            'codigo' => self::CODIGO,
            'snapshot' => $snapshot,
            'valido_ate' => null,
        ]);
    }
}
