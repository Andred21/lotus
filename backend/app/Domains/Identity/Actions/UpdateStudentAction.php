<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Services\UserProvisioner;
use App\Shared\Data\WritableAttributes;
use Illuminate\Support\Facades\DB;

/**
 * Edita os dados pessoais do aluno. NÃO toca vínculo (D3 da spec): trocar aluno
 * de cliente continua sendo ato da matrícula, pelo StudentClientLinkService.
 * `client_id` que venha no payload é ignorado de propósito.
 */
class UpdateStudentAction
{
    public function __construct(private readonly UserProvisioner $provisioner) {}

    public function execute(Student $student, StudentData $data): Student
    {
        return DB::transaction(function () use ($student, $data) {
            $user = $student->user;

            $rut = $this->provisioner->ensureIdentityAvailable($data->rut, $data->email, $user->id);

            $user->update(WritableAttributes::from([
                'name' => $data->name,
                'rut' => $rut,
                'email' => $data->email,
                'phone' => $data->phone,
            ]));

            return $student->refresh();
        });
    }
}
