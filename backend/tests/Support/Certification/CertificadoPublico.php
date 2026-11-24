<?php

namespace Tests\Support\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Support\Str;

/**
 * Certificado para os testes das rotas públicas (consulta e PDF do bloco 61).
 *
 * A cadeia viva só existe para satisfazer as FKs: o PDF e o payload saem do
 * snapshot congelado, apresentável (`assertPresentable`) e com o RUT do aluno
 * parametrizado. `null` grava o aluno SEM a chave `rut`, o caso do documento
 * emitido antes de o RUT entrar no snapshot.
 */
trait CertificadoPublico
{
    /**
     * @param  array<string, mixed>  $atributos  sobrescreve `status`, `valido_ate`, `revoked_at`...
     */
    protected function certificadoPublico(
        string $codigo = 'LOT-2026-1000',
        ?string $rutDoAluno = '12.345.678-5',
        array $atributos = [],
    ): Certificate {
        $builder = IssuableEnrollmentBuilder::make()->create();

        $aluno = ['name' => 'Juan Pérez Congelado'];
        if ($rutDoAluno !== null) {
            $aluno['rut'] = $rutDoAluno;
        }

        return Certificate::create(array_merge([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => $codigo,
            'snapshot' => [
                'aluno' => $aluno,
                'curso' => [
                    'name' => 'Seguridad Congelada',
                    'technical_name' => 'Operación Segura AT',
                    'workload_hours' => 16,
                    'description' => 'abordó la narrativa congelada del curso.',
                    'modules' => [
                        [
                            'sort_order' => 1,
                            'name' => '1. Introducción Congelada',
                            'contents' => "Objetivos congelados\nMarco congelado",
                        ],
                    ],
                ],
                'turma' => [
                    'id' => $builder->turmaModel()->id,
                    'start_date' => '2026-07-20',
                    'end_date' => '2026-07-24',
                    'modalidade' => 'presencial',
                ],
                'cliente' => ['name' => 'Empresa Congelada', 'rut' => '76.123.456-7'],
                'redator' => ['name' => 'María Relatora Congelada', 'rut' => '9.876.543-3'],
                'resultado' => [
                    'grades' => null,
                    'approval_status' => 'aprobado',
                    'attendance_pct' => null,
                ],
                'template' => [
                    'version' => 2,
                    'layout_config' => [
                        'orientation' => 'landscape',
                        'city' => 'Valparaíso',
                    ],
                ],
                'ciudad_emision' => 'Santiago',
                'emitido_em' => '2026-08-05',
            ],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ], $atributos));
    }
}
