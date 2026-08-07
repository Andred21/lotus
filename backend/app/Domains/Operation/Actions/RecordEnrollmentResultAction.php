<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Data\EnrollmentResultData;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Support\Facades\DB;

class RecordEnrollmentResultAction
{
    public function execute(Enrollment $enrollment, EnrollmentResultData $data): Enrollment
    {
        return DB::transaction(function () use ($enrollment, $data): Enrollment {
            $enrollment->turma->assertAcademicallyWritable();

            $enrollment->fill([
                'grades' => $data->grades,
                'attendance_pct' => $data->attendance_pct,
                'approval_status' => $data->approval_status,
            ])->save();

            return $enrollment->refresh();
        });
    }
}
