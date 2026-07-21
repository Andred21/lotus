<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Actions\ImportStudentsAction;
use App\Domains\Operation\Actions\RemoveEnrollmentAction;
use App\Domains\Operation\Data\EnrollmentData;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class EnrollmentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index']),
            new Middleware('permission:operation.enrollment.manage', only: ['store', 'import', 'destroy']),
        ];
    }

    /** @return array<EnrollmentData> */
    public function index(Turma $turma): array
    {
        return $turma->enrollments()->with('student.user')->get()
            ->map(fn (Enrollment $e) => EnrollmentData::fromModel($e))
            ->all();
    }

    public function store(EnrollmentData $data, Turma $turma, EnrollStudentAction $action): JsonResponse
    {
        $outcome = $action->execute($turma, $data->rut, $data->name, $data->email, $data->phone);

        return EnrollmentData::fromModel($outcome->enrollment->load('student.user'))
            ->toResponse(request())
            ->setStatusCode(201);
    }

    public function import(Request $request, Turma $turma, ImportStudentsAction $action): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:10240'],
        ]);

        return $action->execute($turma, $validated['file'])
            ->toResponse(request())
            ->setStatusCode(200);
    }

    public function destroy(Turma $turma, Enrollment $enrollment, RemoveEnrollmentAction $action): Response
    {
        $action->execute($enrollment);

        return response()->noContent();
    }
}
