<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Actions\ImportStudentsAction;
use App\Domains\Operation\Actions\RecordEnrollmentResultAction;
use App\Domains\Operation\Actions\RemoveEnrollmentAction;
use App\Domains\Operation\Actions\RestoreEnrollmentAction;
use App\Domains\Operation\Data\ArchivedEnrollmentData;
use App\Domains\Operation\Data\EnrollmentData;
use App\Domains\Operation\Data\EnrollmentResultData;
use App\Domains\Operation\Data\EnrollPreviewData;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchiveTrailQuery;
use App\Shared\Rules\ValidRut;
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
            new Middleware('permission:operation.turma.view', only: ['index', 'archived']),
            new Middleware('permission:operation.enrollment.manage', only: ['store', 'import', 'destroy', 'preview']),
            // Separada de `manage` de propósito: o redator lança nota e presença
            // sem ganhar matricular/importar/remover (RN-02, spec D6). O escopo
            // por turma vem do binding, não daqui.
            new Middleware('permission:operation.enrollment.record_result', only: ['result']),
            new Middleware('permission:operation.enrollment.restore', only: ['restore']),
        ];
    }

    /** @return array<EnrollmentData> */
    public function index(Turma $turma): array
    {
        return $turma->enrollments()->withListingData()->get()
            ->map(fn (Enrollment $e) => EnrollmentData::fromModel($e))
            ->all();
    }

    /** @return array<ArchivedEnrollmentData> */
    public function archived(Turma $turma): array
    {
        // `withListingData()` sem `asOfArchiving`: matrícula é FOLHA — não tem
        // filho que a cascata leve junto, então a projeção ativa já mostra a
        // linha como ela estava (P4). O `student` é `withTrashed()` no model.
        $enrollments = $turma->enrollments()->onlyTrashed()
            ->withListingData()
            ->orderByStudentName()
            ->get();

        $autores = ArchiveTrailQuery::archivedBy(Enrollment::class, $enrollments->pluck('id')->all());

        return $enrollments
            ->map(fn (Enrollment $e) => new ArchivedEnrollmentData(
                enrollment: EnrollmentData::fromModel($e),
                archived_at: $e->deleted_at->toIso8601String(),
                archived_by: $autores[$e->id] ?? null,
            ))
            ->all();
    }

    public function preview(Request $request, Turma $turma, StudentResolver $resolver): EnrollPreviewData
    {
        $validated = $request->validate(['rut' => ['required', 'string', new ValidRut]]);

        return EnrollPreviewData::fromLookup(
            $resolver->previewByRut($validated['rut']),
            $turma->contratanteClient(),
        );
    }

    public function store(EnrollmentData $data, Turma $turma, EnrollStudentAction $action): JsonResponse
    {
        $outcome = $action->execute($turma, $data->rut, $data->name, $data->email, $data->phone);

        return EnrollmentData::fromModel($outcome->enrollment->loadListingData())
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

    public function result(
        EnrollmentResultData $data,
        Turma $turma,
        Enrollment $enrollment,
        RecordEnrollmentResultAction $action,
    ): EnrollmentData {
        $enrollment->setRelation('turma', $turma); // o binding aninhado não seta o pai

        return EnrollmentData::fromModel($action->execute($enrollment, $data)->loadListingData());
    }

    public function destroy(Turma $turma, Enrollment $enrollment, RemoveEnrollmentAction $action): Response
    {
        $action->execute($enrollment);

        return response()->noContent();
    }

    public function restore(Turma $turma, int $enrollment, RestoreEnrollmentAction $action): JsonResponse
    {
        // Resolvido à mão, e o motivo dobra no aninhado: `->scopeBindings()`
        // resolveria `{enrollment}` por `$turma->enrollments()`, que é escopada
        // por `deleted_at IS NULL` — uma matrícula arquivada daria 404 ANTES de
        // chegar à Action. `onlyTrashed()` sobre a MESMA relação mantém a posse
        // declarada (matrícula de outra turma continua 404) e ainda dá o 404 de
        // graça sobre registro ativo (spec D5).
        $model = $turma->enrollments()->onlyTrashed()->whereKey($enrollment)->firstOrFail();

        // 200, não 201: restaurar devolve um registro que já existia.
        return EnrollmentData::fromModel($action->execute($model))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }
}
