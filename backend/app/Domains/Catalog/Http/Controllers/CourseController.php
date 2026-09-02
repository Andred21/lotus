<?php

namespace App\Domains\Catalog\Http\Controllers;

use App\Domains\Catalog\Actions\ArchiveCourseAction;
use App\Domains\Catalog\Actions\CreateCourseAction;
use App\Domains\Catalog\Actions\RestoreCourseAction;
use App\Domains\Catalog\Actions\UpdateCourseAction;
use App\Domains\Catalog\Data\ArchivedCourseData;
use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchivedListing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CourseController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:catalog.course.view', only: ['index', 'show', 'archived']),
            new Middleware('permission:catalog.course.create', only: ['store']),
            new Middleware('permission:catalog.course.update', only: ['update']),
            new Middleware('permission:catalog.course.delete', only: ['destroy']),
            new Middleware('permission:catalog.course.restore', only: ['restore']),
        ];
    }

    /** @return array<CourseData> */
    public function index(): array
    {
        return Course::query()->withListingData()
            ->get()
            ->map(fn (Course $c) => CourseData::fromModel($c))
            ->all();
    }

    /** @return array<ArchivedCourseData> */
    public function archived(): array
    {
        return ArchivedListing::lista(
            Course::onlyTrashed()->withArchivedListingData()->get(),
            Course::class,
            fn (Course $c, string $em, ?string $por) => new ArchivedCourseData(
                course: CourseData::fromModel($c),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }

    // Ver a nota gêmea em `ClientController::restore`: `onlyTrashed()` à mão,
    // porque o binding padrão nunca acha um arquivado — e dá o 404 sobre ativo.
    // O 200 explícito tem a mesma razão de lá.
    public function restore(int $course, RestoreCourseAction $action): JsonResponse
    {
        $model = Course::onlyTrashed()->whereKey($course)->firstOrFail();

        return CourseData::fromModel($action->execute($model))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }

    public function store(CourseData $data, CreateCourseAction $action): CourseData
    {
        return CourseData::fromModel($action->execute($data));
    }

    public function show(Course $course): CourseData
    {
        return CourseData::fromModel($course->loadListingData());
    }

    public function update(CourseData $data, Course $course, UpdateCourseAction $action): CourseData
    {
        return CourseData::fromModel($action->execute($course, $data));
    }

    public function destroy(Course $course, ArchiveCourseAction $action): Response
    {
        $action->execute($course);

        return response()->noContent();
    }
}
