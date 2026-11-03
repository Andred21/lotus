<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Data\EnrollmentResultData;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Services\ResultLock;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Registra/corrige o resultado acadêmico da matrícula.
 *
 * Turma concluída: o redator segue recusado (RN-15, `assertAcademicallyWritable`);
 * quem gerencia matrículas (`operation.enrollment.manage`, o admin) ainda
 * corrige — até a matrícula ter certificado VIGENTE, que tranca (revogado
 * destranca). Turma arquivada nem chega aqui: o binding responde 404.
 * Matricular/importar/remover/restaurar não mudam: seguem com
 * `assertAcademicallyWritable()`.
 *
 * Os dois lados da corrida com a emissão travam a MATRÍCULA primeiro (P-103,
 * `lockForUpdate` relendo-a dentro da transação) e só depois olham o
 * certificado. A emissão relê a matrícula antes de decidir a porta 2 e montar o
 * snapshot, então vê o resultado corrigido; a correção, depois de esperar a
 * emissão, lê o certificado vigente e recebe 422. `isLockedForUpdate` segue
 * sendo a leitura (com `lockForUpdate`) da porta 3. Em sqlite o lock é no-op:
 * a prova da ordem é `EmissionResultRaceTest`, só em MySQL.
 */
class RecordEnrollmentResultAction
{
    public function __construct(private readonly ResultLock $resultLock) {}

    public function execute(Enrollment $enrollment, EnrollmentResultData $data, User $actor): Enrollment
    {
        return DB::transaction(function () use ($enrollment, $data, $actor): Enrollment {
            // P-103: a matrícula é relida com lock ANTES de qualquer decisão — o
            // mesmo primeiro passo da emissão. O `$enrollment` do chamador pode
            // estar velho se uma emissão commitou entre a leitura dele e aqui.
            $enrollment = Enrollment::query()
                ->with('turma')
                ->whereKey($enrollment->id)
                ->lockForUpdate()
                ->firstOrFail();

            $turma = $enrollment->turma;

            if ($turma->status !== TurmaStatus::EmAndamento && ! $actor->can('operation.enrollment.manage')) {
                $turma->assertAcademicallyWritable();
            }

            if ($this->resultLock->isLockedForUpdate($enrollment->id)) {
                throw ValidationException::withMessages([
                    'enrollment' => __('operation.enrollment.result_locked'),
                ]);
            }

            $enrollment->fill([
                'grades' => $data->grades,
                'attendance_pct' => $data->attendance_pct,
                'approval_status' => $data->approval_status,
            ])->save();

            return $enrollment->refresh();
        });
    }
}
