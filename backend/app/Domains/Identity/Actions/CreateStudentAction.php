<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Services\StudentClientLinkService;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Cadastro manual de aluno (D2/D3 da spec).
 *
 * NÃO delega ao StudentResolver de propósito: o resolver tem semântica
 * "existe? associa : cria", correta para a planilha de matrícula e errada aqui,
 * onde RUT já cadastrado deve virar 422 em vez de associação silenciosa. A
 * unicidade e o vínculo continuam saindo dos mesmos serviços-fonte
 * (UserProvisioner, StudentClientLinkService), então a regra não duplica.
 */
class CreateStudentAction
{
    public function __construct(
        private readonly UserProvisioner $provisioner,
        private readonly StudentClientLinkService $linkService,
    ) {}

    public function execute(StudentData $data): Student
    {
        return DB::transaction(function () use ($data) {
            if ($data->client_id instanceof Optional || $data->client_id === null) {
                throw ValidationException::withMessages([
                    'client_id' => __('identity.errors.student_client_required'),
                ]);
            }

            // `find` + 422, não `findOrFail`: cliente inexistente é erro de
            // preenchimento (422 com a causa no campo), não recurso ausente (404).
            $client = Client::find($data->client_id);

            if ($client === null) {
                throw ValidationException::withMessages([
                    'client_id' => __('identity.errors.student_client_not_found'),
                ]);
            }

            $user = $this->provisioner->provision(
                type: 'aluno',
                name: $data->name,
                rut: $data->rut,
                email: $data->email,
                phone: $data->phone instanceof Optional ? null : $data->phone,
            );

            $student = Student::create(['user_id' => $user->id]);

            $this->linkService->link($student, $client);

            return $student->refresh();
        });
    }
}
