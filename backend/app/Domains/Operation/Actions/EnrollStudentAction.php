<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\EnrollOutcome;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Fonte única da matrícula: o individual e CADA linha do import passam aqui.
 * Turma fora de em_andamento recusa (D4). Reincidência é idempotente; matrícula
 * soft-deletada RESTAURA (o unique inclui removidos — D7/lição #8).
 */
class EnrollStudentAction
{
    public function __construct(private readonly StudentResolver $resolver) {}

    public function execute(Turma $turma, string $rut, string $name, ?string $email, ?string $phone): EnrollOutcome
    {
        if ($turma->status !== TurmaStatus::EmAndamento) {
            throw ValidationException::withMessages([
                'turma' => 'Matrícula só é permitida com a turma em andamento.',
            ]);
        }

        return DB::transaction(function () use ($turma, $rut, $name, $email, $phone) {
            $client = $turma->quote->budget->client; // RF-TUR-03: cliente da cotação
            $resolution = $this->resolver->resolveByRut($rut, $name, $email, $phone, $client);

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
