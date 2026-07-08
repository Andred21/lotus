<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserProvisioner;
use App\Shared\Files\Actions\UploadFileAction;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Atualiza usuário-redator + habilitação de cursos (sync) + anexa novos
 * documentos. Documentos existentes NÃO são removidos (append-only, evita
 * apagar arquivos do S3). Espelha o UpdateClientAction.
 *
 * @param  array<UploadedFile>  $documents
 */
class UpdateRedatorAction
{
    public function __construct(
        private UserProvisioner $users,
        private UploadFileAction $uploads,
    ) {}

    public function execute(Redator $redator, RedatorData $data, array $documents = []): Redator
    {
        $rut = $this->users->ensureRutAvailable($data->rut, $redator->user_id);

        return DB::transaction(function () use ($redator, $data, $rut, $documents) {
            $redator->user->update([
                'name' => $data->name,
                'rut' => $rut,
                'email' => $data->email,
                'phone' => $data->phone instanceof Optional ? null : $data->phone,
            ]);

            if (! $data->course_ids instanceof Optional) {
                $redator->courses()->sync($data->course_ids);
            }

            foreach ($documents as $document) {
                $this->uploads->execute($redator, $document, 'documento');
            }

            return $redator->fresh()->load(['user', 'documents', 'courses']);
        });
    }
}
