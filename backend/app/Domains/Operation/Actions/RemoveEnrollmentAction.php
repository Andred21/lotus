<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Enrollment;

class RemoveEnrollmentAction
{
    public function execute(Enrollment $enrollment): void
    {
        $enrollment->turma->assertAcademicallyWritable();

        $enrollment->delete(); // model, nunca builder — auditoria (lição #5)
    }
}
