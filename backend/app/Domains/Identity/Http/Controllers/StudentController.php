<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Certification\Services\StudentCertificateHistory;
use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Actions\UpdateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Data\StudentDetailData;
use App\Domains\Identity\Models\Student;
use App\Http\Controllers\Controller;
use App\Shared\Pagination\PageData;
use App\Shared\Pagination\PageRequest;
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

    /**
     * Página de alunos (spec D1): a lista cresce sem teto e ordenava em PHP.
     * `PageRequest` direto porque não há filtro nomeado — quem sabe buscar e
     * ordenar é o `StudentQueryBuilder`.
     *
     * @return PageData<StudentData>
     */
    public function index(PageRequest $request): PageData
    {
        return Student::query()
            ->withListingData()
            ->page($request, fn (Student $student) => StudentData::fromModel($student));
    }

    public function store(StudentData $data, CreateStudentAction $action): StudentData
    {
        return StudentData::fromModel($action->execute($data)->loadListingData());
    }

    /**
     * O detalhe traz os certificados junto (spec D2): endpoint separado
     * obrigaria o React a casar duas listas por `enrollment_id`, que é
     * composição no cliente. O gate é o mesmo `identity.user.view` — nenhuma
     * role atual vê aluno sem ver certificado (spec D11).
     */
    public function show(Student $student, StudentCertificateHistory $history): StudentDetailData
    {
        $student->load([
            'user',
            'currentClient',
            'logs.client',
            'enrollments.turma.quote',
            'enrollments.turma.course',
        ]);

        return StudentDetailData::fromModel(
            $student,
            $history->forEnrollments($student->enrollments->pluck('id')->all()),
        );
    }

    public function update(StudentData $data, Student $student, UpdateStudentAction $action): StudentData
    {
        return StudentData::fromModel($action->execute($student, $data)->loadListingData());
    }
}
