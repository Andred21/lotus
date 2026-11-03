<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Services\StudentIdentity;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\EnrollOutcome;
use Illuminate\Support\Facades\DB;

/**
 * Fonte única da matrícula: o individual e CADA linha do import passam aqui.
 * Turma fora de em_andamento recusa (D4). Reincidência é idempotente; matrícula
 * soft-deletada RESTAURA (o unique inclui removidos — D7/lição #8).
 */
class EnrollStudentAction
{
    public function __construct(private readonly StudentResolver $resolver) {}

    /**
     * Pré-condição: a `StudentIdentity` chega com a forma já validada
     * (`StudentIdentity::rules()`); a action não revalida nome, e-mail nem telefone.
     */
    public function execute(Turma $turma, StudentIdentity $identity): EnrollOutcome
    {
        $turma->assertAcademicallyWritable();

        return DB::transaction(function () use ($turma, $identity) {
            // Mutex do pai ANTES de qualquer escrita (P-49): a cascata de
            // `DeleteTurmaAction` enumera e apaga `enrollments`, e sem este lock
            // uma matrícula criada na janela sobrevive ATIVA sob turma
            // arquivada. `lockForWrite` também RECUSA turma já arquivada — o
            // `lockRow` cru só serializaria.
            Turma::lockForWrite($turma->id);

            $client = $turma->contratanteClient(); // RF-TUR-03: cliente da cotação
            $resolution = $this->resolver->resolveByRut($identity, $client);

            $enrollment = Enrollment::withTrashed()
                ->where('turma_id', $turma->id)
                ->where('student_id', $resolution->student->id)
                ->first();

            if ($enrollment !== null && ! $enrollment->trashed()) {
                return new EnrollOutcome($enrollment, $resolution, alreadyEnrolled: true);
            }

            if ($enrollment !== null) {
                $enrollment->restore();
            } else {
                $enrollment = Enrollment::create([
                    'turma_id' => $turma->id,
                    'student_id' => $resolution->student->id,
                ]);
            }

            return new EnrollOutcome($enrollment, $resolution, alreadyEnrolled: false);
        });
    }
}
