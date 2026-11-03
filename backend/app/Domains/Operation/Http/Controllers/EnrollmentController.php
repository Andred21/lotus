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
use App\Domains\Operation\Data\ImportConfirmData;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\ImportPreviewService;
use App\Domains\Operation\Services\SpreadsheetTemplate;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchivedListing;
use App\Shared\Files\ContentClass;
use App\Shared\Http\RespostaDeRecurso;
use App\Shared\Rules\ValidRut;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EnrollmentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index', 'archived']),
            new Middleware('permission:operation.enrollment.manage', only: ['store', 'import', 'previewImport', 'destroy', 'preview', 'template']),
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

        return ArchivedListing::lista(
            $enrollments,
            Enrollment::class,
            fn (Enrollment $e, string $em, ?string $por) => new ArchivedEnrollmentData(
                enrollment: EnrollmentData::fromModel($e),
                archived_at: $em,
                archived_by: $por,
            ),
        );
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

    /**
     * Modelo `.xlsx` da importação. Não carrega dado da turma (o `{turma}` só
     * posiciona a rota sob a permissão de matricular) e sai de arquivo
     * temporário apagado após o envio.
     */
    public function template(Turma $turma, SpreadsheetTemplate $template): BinaryFileResponse
    {
        $path = tempnam(sys_get_temp_dir(), 'plantilla');
        $template->write($path);

        return response()
            ->download($path, 'plantilla-alumnos.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend();
    }

    /** Prévia da planilha: classifica as linhas sem escrever nada (spec D9/D10). */
    public function previewImport(Request $request, Turma $turma, ImportPreviewService $service): JsonResponse
    {
        $validated = $request->validate([
            'file' => ContentClass::Planilha->regras(),
        ]);

        // 200, não 201: POST que lê e não cria nada (o Data devolvido cru sairia 201).
        return RespostaDeRecurso::ok($service->preview($turma, $validated['file'], $request->user()));
    }

    /** Confirmação JSON linha a linha: o servidor revalida cada uma (spec D13). */
    public function import(ImportConfirmData $data, Request $request, Turma $turma, ImportStudentsAction $action): JsonResponse
    {
        return RespostaDeRecurso::ok($action->execute($turma, $data, $request->user()));
    }

    public function result(
        EnrollmentResultData $data,
        Turma $turma,
        Enrollment $enrollment,
        Request $request,
        RecordEnrollmentResultAction $action,
    ): EnrollmentData {
        return EnrollmentData::fromModel($action->execute($enrollment, $data, $request->user())->loadListingData());
    }

    public function destroy(Turma $turma, Enrollment $enrollment, RemoveEnrollmentAction $action): Response
    {
        $action->execute($enrollment);

        return response()->noContent();
    }

    public function restore(Turma $turma, int $enrollment, RestoreEnrollmentAction $action): JsonResponse
    {
        // A origem é a relação, não a classe: resolver sobre `$turma->enrollments()`
        // mantém a posse declarada — matrícula de outra turma continua 404.
        $model = ArchivedListing::resolveArquivado($turma->enrollments(), $enrollment);

        return RespostaDeRecurso::ok(EnrollmentData::fromModel($action->execute($model)));
    }
}
