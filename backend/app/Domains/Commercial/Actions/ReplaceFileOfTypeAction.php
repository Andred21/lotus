<?php

namespace App\Domains\Commercial\Actions;

use App\Shared\Files\Models\File;
use App\Shared\Files\Services\FileStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Anexa um arquivo ao orçamento ou à cotação mantendo UM arquivo vivo por
 * tipo: o upload novo soft-deleta todo arquivo vivo do mesmo tipo (replace).
 * O binário antigo fica no bucket, rastreável pela auditoria.
 *
 * Sem lock do pai (spec 4.8): upload concorrente do mesmo tipo é raro com ~10
 * usuários e, se acontecer, o próximo upload varre os duplicados.
 */
class ReplaceFileOfTypeAction
{
    public function __construct(private FileStorage $uploads) {}

    public function execute(Model $owner, UploadedFile $file, string $type): File
    {
        // Escrita no disco ANTES da transação: um rollback dentro dela derrubaria
        // a linha e deixaria o binário no bucket sem rastro. O que sobra em caso
        // de falha é objeto órfão, que o `discard` abaixo apaga.
        $meta = $this->uploads->metadataOf($file);
        $path = $this->uploads->put($owner, $file);

        try {
            return DB::transaction(function () use ($owner, $type, $path, $meta) {
                // Soft-delete por instância, não pelo query builder: sem eventos
                // de model o owen-it não grava a linha em `audits`, e a
                // rastreabilidade do arquivo substituído é requisito.
                $owner->files()->where('type', $type)->get()
                    ->each(fn (File $antigo) => $antigo->delete());

                return $this->uploads->register($owner, $path, $meta, $type);
            });
        } catch (Throwable $e) {
            $this->uploads->discard($path);

            throw $e;
        }
    }
}
