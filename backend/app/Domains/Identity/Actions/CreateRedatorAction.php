<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserProvisioner;
use App\Shared\Audit\PivotAudit;
use App\Shared\Files\Actions\UploadFileAction;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;
use Throwable;

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
        private UploadFileAction $uploads,
    ) {}

    public function execute(RedatorData $data, array $documents = []): Redator
    {
        // Todos os binários sobem ANTES da transação (spec D3). Guardamos
        // path + metadados para registrar lá dentro; se a transação cair,
        // `discard` limpa cada objeto que ficou sem dono.
        $uploaded = [];

        try {
            foreach ($documents as $type => $document) {
                $uploaded[$type] = [
                    'meta' => $this->uploads->metadataOf($document),
                    // `putTo` e não `put`: o redator ainda não existe, então
                    // não há id para compor `redator/{id}`. O vínculo do
                    // arquivo é a linha em `files`, não o caminho.
                    'path' => $this->uploads->putTo('redator', $document),
                ];
            }

            return DB::transaction(function () use ($data, $uploaded) {
                $user = $this->users->provision(
                    type: 'redator',
                    name: $data->name,
                    rut: $data->rut,
                    email: $data->email,
                    phone: $data->phone instanceof Optional ? null : $data->phone,
                );

                $redator = $user->redator()->create([]);

                if (! $data->course_ids instanceof Optional) {
                    PivotAudit::sync($redator, 'courses', $data->course_ids);
                }

                foreach ($uploaded as $type => $upload) {
                    $this->documents->registerUploaded($redator, RedatorDocumentType::from($type), $upload['path'], $upload['meta']);
                }

                return $redator->load(['user', 'documents', 'courses']);
            });
        } catch (Throwable $e) {
            foreach ($uploaded as $upload) {
                $this->uploads->discard($upload['path']);
            }

            throw $e;
        }
    }
}
