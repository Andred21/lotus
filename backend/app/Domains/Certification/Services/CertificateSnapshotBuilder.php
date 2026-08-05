<?php

namespace App\Domains\Certification\Services;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;

class CertificateSnapshotBuilder
{
    public function build(Enrollment $enrollment, Redator $redator): array
    {
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
            ],
            'redator' => [
                'name' => $redator->user->name,
                'rut' => $redator->user->rut,
            ],
            'resultado' => [
                'approval_status' => $enrollment->approval_status->value,
                'attendance_pct' => $enrollment->attendance_pct,
            ],
            'emitido_em' => now()->toDateString(),
        ];
    }
}
