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
 * `isLockedForUpdate` é a mesma leitura (com `lockForUpdate`) da porta 3 da
 * emissão, e o lock só garante UM sentido: com a emissão já dentro da sua
 * transação, a correção espera e, ao ler o certificado vigente, recebe 422.
 * O sentido inverso fica com uma janela: o `IssueCertificateAction` decide a
 * porta 2 (`approval_status`) e monta o snapshot a partir do `$enrollment`
 * carregado ANTES da transação; se a correção commitar nessa janela, a emissão
 * espera o lock, não vê certificado e emite com o resultado antigo. Fechar a
 * janela exige reler a matrícula com `lockForUpdate` dentro da transação da
 * emissão — fora do bloco 41, pendência registrada. Em sqlite o lock é no-op,
 * então a corrida não tem teste automatizado.
 */
class RecordEnrollmentResultAction
{
    public function __construct(private readonly ResultLock $resultLock) {}

    public function execute(Enrollment $enrollment, EnrollmentResultData $data, User $actor): Enrollment
    {
        return DB::transaction(function () use ($enrollment, $data, $actor): Enrollment {
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
