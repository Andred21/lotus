<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use App\Shared\Files\Data\PhotoUploadData;
use Illuminate\Http\Response;

/** Foto do aluno. A foto é do `User` por trás dele (spec D3). */
class StudentPhotoController extends Controller
{
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
