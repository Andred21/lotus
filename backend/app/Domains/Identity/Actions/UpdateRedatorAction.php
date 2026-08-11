<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserProvisioner;
use App\Shared\Files\Actions\UploadFileAction;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;
use Throwable;

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
        private UploadFileAction $uploads,
    ) {}

    public function execute(Redator $redator, RedatorData $data, array $documents = []): Redator
    {
        // Todos os binários sobem ANTES da transação (mesmo padrão de
        // CreateRedatorAction, spec D3): StoreRedatorDocumentAction::execute()
        // abriria sua PRÓPRIA transação aninhada (savepoint) dentro desta, e um
        // rollback aqui fora desfaria o registro de um documento anterior no
        // mesmo loop sem descartar o binário dele. Guardamos path + metadados
        // para registrar dentro da transação via registerUploaded(); se ela
        // cair, discard() limpa cada objeto que ficou sem dono.
        $uploaded = [];

        try {
            foreach ($documents as $type => $document) {
                $uploaded[$type] = [
                    'meta' => $this->uploads->metadataOf($document),
                    'path' => $this->uploads->put($redator, $document),
                ];
            }

            return DB::transaction(function () use ($redator, $data, $uploaded) {
                // Unicidade DENTRO da transação que escreve. Consequência
                // aceita: os binários já subiram (eles ficam fora da transação
                // por decisão registrada, D3 da spec do redator), então um RUT
                // duplicado agora sobe e descarta. O `catch` abaixo já é a
                // fonte única desse descarte — RedatorDocumentRollbackTest.
                $rut = $this->users->ensureRutAvailable($data->rut, $redator->user_id);

                $redator->user->update([
                    'name' => $data->name,
                    'rut' => $rut,
                    'email' => $data->email,
                    'phone' => $data->phone instanceof Optional ? null : $data->phone,
                ]);

                if (! $data->course_ids instanceof Optional) {
                    $redator->courses()->sync($data->course_ids);
                }

                foreach ($uploaded as $type => $upload) {
                    $this->documents->registerUploaded($redator, RedatorDocumentType::from($type), $upload['path'], $upload['meta']);
                }

                return $redator->fresh()->load(['user', 'documents', 'courses']);
            });
        } catch (Throwable $e) {
            foreach ($uploaded as $upload) {
                $this->uploads->discard($upload['path']);
            }

            throw $e;
        }
    }
}
