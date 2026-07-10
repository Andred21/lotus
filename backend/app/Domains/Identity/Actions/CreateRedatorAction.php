<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cria o redator (usuário-redator + redator + habilitação de cursos + documentos)
 * numa transação. O provisionamento do User é delegado ao UserProvisioner, e o
 * upload de documento ao StoreRedatorDocumentAction — mesma regra de replace do
 * update e da rota aninhada. is_active=false até o fluxo de ativação.
 *
 * @param  array<string,UploadedFile>  $documents
 */
class CreateRedatorAction
{
    public function __construct(
        private UserProvisioner $users,
        private StoreRedatorDocumentAction $documents,
    ) {}

    public function execute(RedatorData $data, array $documents = []): Redator
    {
        return DB::transaction(function () use ($data, $documents) {
            $user = $this->users->provision(
                type: 'redator',
                name: $data->name,
                rut: $data->rut,
                email: $data->email,
                phone: $data->phone instanceof Optional ? null : $data->phone,
            );

            $redator = $user->redator()->create([]);

            if (! $data->course_ids instanceof Optional) {
                $redator->courses()->sync($data->course_ids);
            }

            foreach ($documents as $type => $document) {
                $this->documents->execute($redator, RedatorDocumentType::from($type), $document);
            }

            return $redator->load(['user', 'documents', 'courses']);
        });
    }
}
