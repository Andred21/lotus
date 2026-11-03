<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\User;
use App\Shared\Files\Services\FileUploader;
use App\Shared\Files\Services\StoredFiles;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Foto de perfil das entidades derivadas de User (staff, redator, aluno,
 * cliente). Vive em `users.photo_path`, FORA da tabela `files`: foto não é
 * documento — não vence, não habilita turma, não entra em certificado (spec
 * D3). A auditoria vem de graça porque `User` é Auditable.
 */
class UserPhotoService
{
    /**
     * Sobe a foto, aponta `photo_path` para ela e só então apaga o objeto
     * anterior (spec D4/J-02: delete imediato, sem retenção).
     *
     * A ORDEM não é detalhe. Apagar o antigo antes do update deixa a linha
     * apontando para um objeto morto se o update falhar — referência mentindo.
     * Apagar depois, e falhar, deixa órfão de storage: custo, não mentira.
     *
     * O UPDATE roda em `DB::transaction` (P-24): a auditoria é síncrona
     * (`audit.queue.enable = false`) e o evento `updated` do owen-it dispara
     * DEPOIS do SQL UPDATE, dentro da mesma chamada. Sem transação, uma
     * auditoria que lança deixava a coluna gravada e a compensação apagava um
     * objeto que o banco já referenciava. A transação cobre UPDATE + auditoria
     * e NUNCA o delete de storage — esse é o débito do `FileStorage`,
     * fechado com `put`/`discard`, não com transação em volta do disco.
     */
    public function store(User $user, UploadedFile $photo): void
    {
        $old = $user->photo_path;

        // O `FileUploader` grava o binário FORA da transação, roda o UPDATE
        // (e a auditoria síncrona) DENTRO dela e, se ela falhar, descarta o
        // objeto novo e relança. O storage nunca fica dentro da transação.
        app(FileUploader::class)->store(
            ['photo' => $photo],
            "user-photos/{$user->id}",
            fn (StoredFiles $stored) => $user->update(['photo_path' => $stored->path('photo')]),
        );

        if ($old !== null) {
            $this->deleteObject($old);
        }
    }

    /** Remove a foto. Sem foto, é no-op — não é erro. */
    public function remove(User $user): void
    {
        $old = $user->photo_path;

        if ($old === null) {
            return;
        }

        $user->update(['photo_path' => null]);
        $this->deleteObject($old);
    }

    private function disk(): string
    {
        return config('filesystems.default');
    }

    /**
     * Falha ao apagar deixa órfão de storage e é registrada, nunca propagada:
     * o update já commitou, e derrubar a requisição aqui faria o usuário achar
     * que a troca não aconteceu quando ela aconteceu.
     */
    private function deleteObject(string $path): void
    {
        try {
            Storage::disk($this->disk())->delete($path);
        } catch (Throwable $e) {
            Log::warning('Falha ao apagar objeto de foto de usuário', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
