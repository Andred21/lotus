<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\Course;
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
use App\Domains\Operation\Services\AcademicResult;
use Carbon\CarbonInterface;

class CertificateSnapshotBuilder
{
    /**
     * `$emitidoEm` e `$ciudadEmision` chegam de fora de propósito: quem emite
     * fixa o instante uma vez (todos os campos datados derivam dele) e já
     * resolveu a cidade pelo `EmissionCityResolver`, que é a fonte única
     * dessa regra — duplicá-la aqui deixaria a lista e a emissão discordarem.
     */
    public function build(
        Enrollment $enrollment,
        Redator $redator,
        CarbonInterface $emitidoEm,
        string $ciudadEmision,
    ): CertificateSnapshotData {
        $turma = $enrollment->turma;
        $course = $turma->course;
        $contratante = $turma->contratante();

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
            curso: $this->curso($course),
            turma: new SnapshotTurmaData(
                id: $turma->id,
                start_date: $turma->start_date->format('Y-m-d'),
                end_date: $turma->end_date->format('Y-m-d'),
                modalidade: $turma->modalidade->value,
            ),
            cliente: new SnapshotPartyData(
                name: $contratante->name,
                rut: $contratante->rut,
            ),
            emissor: new SnapshotPartyData(
                name: (string) config('app.certificate_issuer.name'),
                rut: (string) config('app.certificate_issuer.rut'),
            ),
            redator: new SnapshotPartyData(
                name: $redator->user->name,
                rut: $redator->user->rut,
            ),
            resultado: $this->resultadoSnapshot($enrollment->academicResult()),
            // Bloco 39: o template deixou de existir na emissão. A chave segue no
            // snapshot (schema 2) com os dois campos nulos, para os certificados
            // novos e os antigos terem um leitor só.
            template: new SnapshotTemplateData(version: null, city: null),
            ciudad_emision: $ciudadEmision,
            emitido_em: $emitidoEm->toDateString(),
        );
    }

    /**
     * A projeção do curso para o documento, uma só: a emissão e a amostra do
     * curso leem o mesmo SnapshotCourseData, senão a amostra mostraria um
     * temário que o certificado real não tem.
     */
    public function curso(Course $course): SnapshotCourseData
    {
        return new SnapshotCourseData(
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
        );
    }

    /**
     * B6: o resultado congela a partir do VO tipado (`Enrollment::academicResult()`),
     * não das colunas cruas da matrícula — é a aresta que a matriz de
     * `DomainDependencyTest` abre para `Operation\Services\AcademicResult`.
     */
    private function resultadoSnapshot(AcademicResult $resultado): SnapshotResultData
    {
        return new SnapshotResultData(
            grades: $resultado->grades,
            approval_status: $resultado->approvalStatus->value,
            attendance_pct: $resultado->attendancePct,
        );
    }
}
