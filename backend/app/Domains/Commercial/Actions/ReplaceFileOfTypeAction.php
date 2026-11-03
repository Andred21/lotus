<?php

namespace App\Domains\Commercial\Actions;

use App\Shared\Files\Models\File;
use App\Shared\Files\Services\FileUploader;
use App\Shared\Files\Services\StoredFiles;
use App\Shared\Files\TipoDeArquivo;
use BackedEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;

/**
 * Anexa um arquivo ao orçamento ou à cotação mantendo UM arquivo vivo por
 * tipo: o upload novo soft-deleta todo arquivo vivo do mesmo tipo (replace,
 * por instância para a auditoria gravar). O binário antigo fica no bucket,
 * rastreável pela auditoria. O binário sobe fora da transação e o `files`
 * dentro, via `FileUploader`.
 *
 * Sem lock do pai (spec 4.8): upload concorrente do mesmo tipo é raro com ~10
 * usuários e, se acontecer, o próximo upload varre os duplicados.
 */
class ReplaceFileOfTypeAction
{
    public function __construct(private FileUploader $uploader) {}

    public function execute(Model $owner, UploadedFile $file, TipoDeArquivo&BackedEnum $type): File
    {
        return $this->uploader->store(
            ['file' => $file],
            $owner,
            fn (StoredFiles $stored) => $stored->replace($owner, 'file', $type->value),
        );
    }
}
