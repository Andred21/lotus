<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use App\Shared\Files\Data\PhotoUploadData;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/** Foto do aluno. A foto é do `User` por trás dele (spec D3). */
class StudentPhotoController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:identity.user.update')];
    }

    public function store(PhotoUploadData $data, Student $student, UserPhotoService $service): Response
    {
        $service->store($student->user, $data->photo);

        return response()->noContent();
    }

    public function destroy(Student $student, UserPhotoService $service): Response
    {
        $service->remove($student->user);

        return response()->noContent();
    }
}
