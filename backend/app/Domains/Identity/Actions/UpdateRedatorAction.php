<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserProvisioner;
use App\Shared\Audit\PivotAudit;
use App\Shared\Data\WritableAttributes;
use App\Shared\Files\Services\FileUploader;
use App\Shared\Files\Services\StoredFiles;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Optional;

/**
 * Atualiza usuário-redator + habilitação de cursos (sync) + documentos.
 * Documento chegando pelo multipart SUBSTITUI o do mesmo tipo (soft-delete do
 * anterior, binário fica no bucket) — a regra vive em StoredFiles::replace,
 * a mesma do create e da rota aninhada.
 *
 * @param  array<string,UploadedFile>  $documents
 */
class UpdateRedatorAction
{
    public function __construct(
        private UserProvisioner $users,
        private FileUploader $fileUploader,
        private PurgeOtherSessionsAction $sessions,
    ) {}

    public function execute(Redator $redator, RedatorData $data, array $documents = []): Redator
    {
        // Dados e documentos entram juntos (spec D2): o `FileUploader` sobe os
        // binários, abre a transação e roda a escrita; se ela cair, descarta
        // todos os objetos e relança.
        return $this->fileUploader->store($documents, $redator, function (StoredFiles $stored) use ($redator, $data, $documents) {
            // Mutex do pai ANTES de qualquer escrita (P-49): `users` e
            // `redatores` são varridos pela cascata de `ArchiveRedatorAction`.
            Redator::lockForWrite($redator->id);

            // Unicidade DENTRO da transação que escreve. Consequência
            // aceita: os binários já subiram (ficam fora da transação por
            // decisão registrada, D3 da spec do redator), então um RUT
            // duplicado agora sobe e descarta — o `FileUploader` é a fonte
            // única desse descarte (RedatorDocumentRollbackTest).
            $rut = $this->users->ensureIdentityAvailable($data->rut, $data->email, $redator->user_id);

            // Revogação é transição, não estado: só purga quem estava
            // ativo e passou a inativo. Reenviar `false` para quem já
            // estava inativo não derruba sessão nenhuma.
            $revogando = ! $data->is_active instanceof Optional
                && $data->is_active === false
                && $redator->user->is_active === true;

            $this->users->writing(fn () => $redator->user->update(WritableAttributes::from([
                'name' => $data->name,
                'rut' => $rut,
                'email' => $data->email,
                'phone' => $data->phone,
                'is_active' => $data->is_active,
            ])));

            if ($revogando) {
                $this->sessions->all($redator->user);
            }

            if (! $data->course_ids instanceof Optional) {
                PivotAudit::sync($redator, 'courses', $data->course_ids);
            }

            foreach (array_keys($documents) as $tipo) {
                $stored->replace($redator, $tipo, $tipo);
            }

            return $redator->fresh()->load(['user', 'documents', 'courses']);
        });
    }
}
