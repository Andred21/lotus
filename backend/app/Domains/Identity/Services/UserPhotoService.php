<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\User;
use App\Shared\Files\ContentClass;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
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
     * Regras de validação da foto. Fonte única — os controllers consomem daqui
     * em vez de recopiar, e a política de tipo/tamanho vem do `ContentClass`
     * (spec D4 do hardening). Virou método porque expressão constante não
     * chama método, e a política deixou de ser um literal.
     *
     * @return array<string, array<int, string|object>>
     */
    public static function rules(): array
    {
        return ['photo' => ContentClass::Imagem->regras()];
    }

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
     * e NUNCA o delete de storage — esse é o débito do `UploadFileAction`,
     * fechado com `put`/`discard`, não com transação em volta do disco.
     */
    public function store(User $user, UploadedFile $photo): void
    {
        $old = $user->photo_path;
        $new = $photo->store("user-photos/{$user->id}", $this->disk());

        // `UploadedFile::store()` devolve `false` (não lança) quando a
        // escrita falha e o disco não está configurado com `throw`. Achado
        // real (2026-07-31): sem esta guarda, `false` virava `photo_path =
        // '0'` no banco (coerção de tipo) e o objeto ANTERIOR — que ainda
        // funcionava — era apagado, porque o código seguia como se o update
        // tivesse sido bem-sucedido. Abortar aqui, antes do update, é o que
        // preserva a garantia de D4: falha nunca corrompe o estado atual.
        if ($new === false) {
            throw new RuntimeException("Falha ao gravar a foto do usuário {$user->id} no disco.");
        }

        try {
            DB::transaction(fn () => $user->update(['photo_path' => $new]));
        } catch (Throwable $e) {
            // Compensação: o rollback desfez o UPDATE, então o objeto novo
            // está no bucket e ninguém aponta para ele.
            $this->deleteObject($new);

            throw $e;
        }

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
