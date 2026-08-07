<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Catalog\Models\CourseModule;
use App\Domains\Certification\Data\Snapshot\CertificateSnapshotData;
use App\Domains\Certification\Data\Snapshot\SnapshotCourseData;
use App\Domains\Certification\Data\Snapshot\SnapshotModuleData;
use App\Domains\Certification\Data\Snapshot\SnapshotPartyData;
use App\Domains\Certification\Data\Snapshot\SnapshotResultData;
use App\Domains\Certification\Data\Snapshot\SnapshotTemplateData;
use App\Domains\Certification\Data\Snapshot\SnapshotTurmaData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use Carbon\CarbonInterface;

class CertificateSnapshotBuilder
{
    /**
     * `$emitidoEm` e `$ciudadEmision` chegam de fora de propósito: quem emite
     * fixa o instante uma vez (todos os campos datados derivam dele) e já
     * resolveu a cidade pelo `CertificateTemplateResolver`, que é a fonte única
     * dessa regra — duplicá-la aqui deixaria a lista e a emissão discordarem.
     */
    public function build(
        Enrollment $enrollment,
        Redator $redator,
        CourseCertificateTemplate $template,
        CarbonInterface $emitidoEm,
        string $ciudadEmision,
    ): CertificateSnapshotData {
        $turma = $enrollment->turma;
        $course = $turma->course;

        return new CertificateSnapshotData(
            schema_version: CertificateSnapshotData::CURRENT_VERSION,
            aluno: new SnapshotPartyData(
                name: $enrollment->student->user->name,
                rut: $enrollment->student->user->rut,
            ),
            // `description` e `modules` são a narrativa e o temário do documento
            // oficial (D-P9). Congelam aqui pelo mesmo motivo do template: o
            // certificado reimpresso em 2028 descreve a atividade de 2026, não
            // o curso que o catálogo virou depois.
            curso: new SnapshotCourseData(
                name: $course->name,
                technical_name: $course->technical_name,
                workload_hours: (int) $course->workload_hours,
                description: $course->description,
                modules: $course->modules
                    ->sortBy('sort_order')
                    ->map(fn (CourseModule $module) => new SnapshotModuleData(
                        sort_order: (int) $module->sort_order,
                        name: $module->name,
                        contents: $module->contents,
                    ))
                    ->values()
                    ->all(),
            ),
            turma: new SnapshotTurmaData(
                id: $turma->id,
                start_date: $turma->start_date->format('Y-m-d'),
                end_date: $turma->end_date->format('Y-m-d'),
                modalidade: $turma->modalidade->value,
            ),
            // Razão social (D12), não o nome do User de cadastro: é o
            // `{{EMPRESA}}` do documento oficial, e é o que TurmaData,
            // PendingQuoteData e IssuableTurmaData já projetam.
            cliente: new SnapshotPartyData(
                name: $turma->quote->budget->client->legal_name,
                rut: $turma->quote->budget->client->user->rut,
            ),
            emissor: new SnapshotPartyData(
                name: (string) config('app.certificate_issuer.name'),
                rut: (string) config('app.certificate_issuer.rut'),
            ),
            redator: new SnapshotPartyData(
                name: $redator->user->name,
                rut: $redator->user->rut,
            ),
            resultado: new SnapshotResultData(
                grades: $enrollment->grades,
                approval_status: $enrollment->approval_status->value,
                attendance_pct: $enrollment->attendance_pct,
            ),
            template: new SnapshotTemplateData(
                version: (int) $template->version,
                city: data_get($template->layout_config, 'city'),
            ),
            ciudad_emision: $ciudadEmision,
            emitido_em: $emitidoEm->toDateString(),
        );
    }
}
