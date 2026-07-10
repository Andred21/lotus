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
 * Atualiza usuário-redator + habilitação de cursos (sync) + documentos.
 * Documento chegando pelo multipart SUBSTITUI o do mesmo tipo (soft-delete do
 * anterior, binário fica no bucket) — a regra vive em StoreRedatorDocumentAction,
 * fonte única compartilhada com o create e com a rota aninhada.
 *
 * @param  array<string,UploadedFile>  $documents
 */
class UpdateRedatorAction
{
    public function __construct(
        private UserProvisioner $users,
        private StoreRedatorDocumentAction $documents,
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

            foreach ($documents as $type => $document) {
                $this->documents->execute($redator, RedatorDocumentType::from($type), $document);
            }

            return $redator->fresh()->load(['user', 'documents', 'courses']);
        });
    }
}
