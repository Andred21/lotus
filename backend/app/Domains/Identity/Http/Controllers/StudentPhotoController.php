<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Foto do aluno. A foto é do `User` por trás dele (spec D3). */
class StudentPhotoController extends Controller
{
    public function store(Request $request, Student $student, UserPhotoService $service): Response
    {
        $request->validate(UserPhotoService::RULES);
        $service->store($student->user, $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(Student $student, UserPhotoService $service): Response
    {
        $service->remove($student->user);

        return response()->noContent();
    }
}
