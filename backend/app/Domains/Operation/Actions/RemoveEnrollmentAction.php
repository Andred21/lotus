<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Validation\ValidationException;

class RemoveEnrollmentAction
{
    public function execute(Enrollment $enrollment): void
    {
        if ($enrollment->turma->status !== TurmaStatus::EmAndamento) {
            throw ValidationException::withMessages([
                'turma' => 'Remoção de matrícula só é permitida com a turma em andamento.',
            ]);
        }

        $enrollment->delete(); // model, nunca builder — auditoria (lição #5)
    }
}
