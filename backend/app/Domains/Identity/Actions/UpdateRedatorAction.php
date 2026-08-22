<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserProvisioner;
use App\Shared\Audit\PivotAudit;
use App\Shared\Data\WritableAttributes;
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
        private PurgeOtherSessionsAction $sessions,
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
                // Mutex do pai ANTES de qualquer escrita (P-49): `users` e
                // `redatores` são varridos pela cascata de `ArchiveRedatorAction`.
                Redator::lockForWrite($redator->id);

                // Unicidade DENTRO da transação que escreve. Consequência
                // aceita: os binários já subiram (eles ficam fora da transação
                // por decisão registrada, D3 da spec do redator), então um RUT
                // duplicado agora sobe e descarta. O `catch` abaixo já é a
                // fonte única desse descarte — RedatorDocumentRollbackTest.
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
