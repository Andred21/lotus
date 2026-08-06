<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;

class CertificateSnapshotBuilder
{
    public function build(
        Enrollment $enrollment,
        Redator $redator,
        CourseCertificateTemplate $template,
    ): array {
        return [
            'aluno' => [
                'name' => $enrollment->student->user->name,
                'rut' => $enrollment->student->user->rut,
            ],
            'curso' => [
                'name' => $enrollment->turma->course->name,
                'technical_name' => $enrollment->turma->course->technical_name,
                'workload_hours' => $enrollment->turma->course->workload_hours,
            ],
            'turma' => [
                'id' => $enrollment->turma->id,
                'start_date' => $enrollment->turma->start_date->format('Y-m-d'),
                'end_date' => $enrollment->turma->end_date->format('Y-m-d'),
                'modalidade' => $enrollment->turma->modalidade->value,
            ],
            'cliente' => [
                'name' => $enrollment->turma->quote->budget->client->user->name,
                'rut' => $enrollment->turma->quote->budget->client->user->rut,
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
            'ciudad_emision' => $enrollment->turma->local_aplicacao
                ?? $template->layout_config['city'],
            'emitido_em' => now()->toDateString(),
        ];
    }
}
