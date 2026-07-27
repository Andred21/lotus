<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Actions\UpdateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Data\StudentDetailData;
use App\Domains\Identity\Models\Student;
use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Cadastro de aluno. Sem `destroy` (D1 da spec): enrollments.student_id é
 * restrictOnDelete e o soft delete do Student arrasta o User — apagar aluno com
 * matrícula é perda de rastro com peso legal.
 *
 * Permissões: reusa identity.user.* como o RedatorController, a outra extensão
 * 1:1 de User na mesma tela (D8).
 */
class StudentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['index', 'show']),
            new Middleware('permission:identity.user.create', only: ['store']),
            new Middleware('permission:identity.user.update', only: ['update']),
        ];
    }

    /** @return array<StudentData> */
    public function index(): array
    {
        return Student::with(['user', 'currentClient'])
            ->withCount('enrollments')
            ->get()
            ->sortBy(fn (Student $s) => $s->user->name)
            ->values()
            ->map(fn (Student $s) => StudentData::fromModel($s))
            ->all();
    }

    public function store(StudentData $data, CreateStudentAction $action): StudentData
    {
        return StudentData::fromModel($action->execute($data));
    }

    public function show(Student $student): StudentDetailData
    {
        return StudentDetailData::fromModel($student->load([
            'user',
            'currentClient',
            'logs.client',
            'enrollments.turma.quote',
            'enrollments.turma.course',
        ]));
    }

    public function update(StudentData $data, Student $student, UpdateStudentAction $action): StudentData
    {
        return StudentData::fromModel($action->execute($student, $data));
    }
}
