<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Catalog\Models\CourseModule;
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
    ): array {
        return [
            'aluno' => [
                'name' => $enrollment->student->user->name,
                'rut' => $enrollment->student->user->rut,
            ],
            // `description` e `modules` são a narrativa e o temário do documento
            // oficial (D-P9). Congelam aqui pelo mesmo motivo do template: o
            // certificado reimpresso em 2028 descreve a atividade de 2026, não
            // o curso que o catálogo virou depois.
            'curso' => [
                'name' => $enrollment->turma->course->name,
                'technical_name' => $enrollment->turma->course->technical_name,
                'workload_hours' => $enrollment->turma->course->workload_hours,
                'description' => $enrollment->turma->course->description,
                'modules' => $enrollment->turma->course->modules
                    ->sortBy('sort_order')
                    ->map(fn (CourseModule $module) => [
                        'sort_order' => $module->sort_order,
                        'name' => $module->name,
                        'contents' => $module->contents,
                    ])
                    ->values()
                    ->all(),
            ],
            'turma' => [
                'id' => $enrollment->turma->id,
                'start_date' => $enrollment->turma->start_date->format('Y-m-d'),
                'end_date' => $enrollment->turma->end_date->format('Y-m-d'),
                'modalidade' => $enrollment->turma->modalidade->value,
            ],
            // Razão social (D12), não o nome do User de cadastro: é o
            // `{{EMPRESA}}` do documento oficial, e é o que TurmaData,
            // PendingQuoteData e IssuableTurmaData já projetam.
            'cliente' => [
                'name' => $enrollment->turma->quote->budget->client->legal_name,
                'rut' => $enrollment->turma->quote->budget->client->user->rut,
            ],
            'emissor' => [
                'name' => (string) config('app.certificate_issuer.name'),
                'rut' => (string) config('app.certificate_issuer.rut'),
            ],
            'redator' => [
                'name' => $redator->user->name,
                'rut' => $redator->user->rut,
            ],
            'resultado' => [
                'grades' => $enrollment->grades,
                'approval_status' => $enrollment->approval_status->value,
                'attendance_pct' => $enrollment->attendance_pct,
            ],
            'template' => [
                'version' => $template->version,
                'layout_config' => $template->layout_config,
            ],
            'ciudad_emision' => $ciudadEmision,
            'emitido_em' => $emitidoEm->toDateString(),
        ];
    }
}
