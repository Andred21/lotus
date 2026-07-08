<?php

namespace App\Domains\Catalog\Http\Controllers;

use App\Domains\Catalog\Actions\CreateCourseAction;
use App\Domains\Catalog\Actions\UpdateCourseAction;
use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CourseController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:catalog.course.view', only: ['index', 'show']),
            new Middleware('permission:catalog.course.create', only: ['store']),
            new Middleware('permission:catalog.course.update', only: ['update']),
            new Middleware('permission:catalog.course.delete', only: ['destroy']),
        ];
    }

    /** @return array<CourseData> */
    public function index(): array
    {
        return Course::with(['certificateTemplates', 'redatores'])
            ->get()
            ->map(fn (Course $c) => CourseData::fromModel($c))
            ->all();
    }

    public function store(CourseData $data, CreateCourseAction $action): CourseData
    {
        return CourseData::fromModel($action->execute($data));
    }

    public function show(Course $course): CourseData
    {
        return CourseData::fromModel($course->load(['certificateTemplates', 'redatores']));
    }

    public function update(CourseData $data, Course $course, UpdateCourseAction $action): CourseData
    {
        return CourseData::fromModel($action->execute($course, $data));
    }

    public function destroy(Course $course): Response
    {
        $course->delete();

        return response()->noContent();
    }
}
