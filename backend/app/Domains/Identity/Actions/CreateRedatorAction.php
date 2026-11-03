<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserProvisioner;
use App\Shared\Audit\PivotAudit;
use App\Shared\Files\Services\FileUploader;
use App\Shared\Files\Services\StoredFiles;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Optional;
use Throwable;

/**
 * Cria o redator (usuário-redator + redator + habilitação de cursos + documentos)
 * numa transação. O provisionamento do User é delegado ao UserProvisioner, e os
 * binários sobem pelo FileUploader, na mesma transação dos dados. O redator
 * nasce ativo (RN-01) e com a role `redator` (RF-ROL-05); a credencial dele
 * chega pelo convite.
 *
 * @param  array<string,UploadedFile>  $documents
 */
class CreateRedatorAction
{
    public function __construct(
        private UserProvisioner $users,
        private FileUploader $fileUploader,
        private SendRedatorAccessInvitationAction $invitations,
    ) {}

    public function execute(RedatorData $data, array $documents = []): Redator
    {
        // Dados e documentos entram juntos (spec D2): o `FileUploader` sobe os
        // binários, abre a transação e roda a escrita; se ela cair, descarta
        // todos os objetos e relança. O destino é o diretório `redator` e não o
        // model, porque o redator ainda não existe.
        $redator = $this->fileUploader->store($documents, 'redator', function (StoredFiles $stored) use ($data, $documents) {
            $user = $this->users->provision(
                type: 'redator',
                name: $data->name,
                rut: $data->rut,
                email: $data->email,
                phone: $data->phone instanceof Optional ? null : $data->phone,
            );

            // RF-ROL-05: a role corresponde ao tipo e é associada no
            // cadastro. Sem isto o redator autentica e não enxerga nada —
            // o gate de todo módulo é permissão, não `type`.
            $user->syncRoles(['redator']);

            $redator = $user->redator()->create([]);

            if (! $data->course_ids instanceof Optional) {
                PivotAudit::sync($redator, 'courses', $data->course_ids);
            }

            foreach (array_keys($documents) as $tipo) {
                $stored->replace($redator, $tipo, $tipo);
            }

            return $redator->load(['user', 'documents', 'courses']);
        });

        // Disparo FORA da transação e fora do try/catch dos uploads: e-mail
        // que falha não desfaz cadastro nem descarta binário já subido. Se
        // cair, o admin reenvia o convite pela tela — é justamente por isso
        // que o reenvio existe.
        try {
            $this->invitations->execute($redator->user);
        } catch (Throwable $e) {
            report($e);
        }

        return $redator;
    }
}
