<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Anexa um documento à turma (RN-16). Append puro — N docs por tipo (D8),
 * sem replace: as provas dos alunos são plural real. Doc de turma não vence
 * (sem valid_until).
 *
 * O `uploads->execute()` de uma chamada só virou put/register separados por
 * causa da P-49: o INSERT em `files` precisa da transação para o
 * `Turma::lockForWrite()` valer, e o binário NÃO pode entrar nela — rollback
 * derrubaria a linha e deixaria o objeto no bucket, documento sem rastro (D3 da
 * spec do redator, e aqui o dado tem peso legal). Molde exato:
 * `StoreRedatorDocumentAction`.
 */
class StoreTurmaDocumentAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(Turma $turma, TurmaDocumentType $type, UploadedFile $file): File
    {
        $turma->assertAcademicallyWritable();   // RN-15

        $meta = $this->uploads->metadataOf($file);
        $path = $this->uploads->put($turma, $file);

        try {
            return DB::transaction(function () use ($turma, $type, $path, $meta) {
                Turma::lockForWrite($turma->id);

                return $this->uploads->register($turma, $path, $meta, $type->value);
            });
        } catch (Throwable $e) {
            $this->uploads->discard($path);

            throw $e;
        }
    }
}
