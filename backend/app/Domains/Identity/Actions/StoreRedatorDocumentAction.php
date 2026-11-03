<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Models\File;
use App\Shared\Files\Services\FileStorage;
use App\Shared\Files\Services\FileUploader;
use App\Shared\Files\Services\StoredFiles;
use Carbon\CarbonInterface;
use Illuminate\Http\UploadedFile;

/**
 * Adiciona ou substitui um documento do redator. Se já existe um doc ativo do
 * mesmo tipo, ele é soft-deletado antes (replace) — o binário fica no bucket,
 * rastreável pela auditoria.
 */
class StoreRedatorDocumentAction
{
    public function __construct(private FileStorage $uploads, private FileUploader $fileUploader) {}

    public function execute(Redator $redator, RedatorDocumentType $type, UploadedFile $file, ?CarbonInterface $validUntil = null): File
    {
        return $this->fileUploader->store(
            ['file' => $file],
            $redator,
            function (StoredFiles $stored) use ($redator, $type, $validUntil) {
                // Mutex do pai (P-49) guardando o INSERT, não o upload: o
                // binário sobe fora da transação (decisão D3 da spec do
                // redator) e o `FileUploader` o descarta se ela cair.
                Redator::lockForWrite($redator->id);

                return $stored->replace($redator, 'file', $type->value, $validUntil);
            },
        );
    }

    /**
     * Para quem JÁ segura a transação e JÁ fez o `put` — hoje, o
     * `CreateRedatorAction`. Faz o replace do documento ativo do mesmo tipo e
     * registra o novo.
     *
     * @param  array{original_name: string, mime: string, size: int}  $meta
     */
    public function registerUploaded(Redator $redator, RedatorDocumentType $type, string $path, array $meta, ?CarbonInterface $validUntil = null): File
    {
        // Soft-delete por instância, não pelo query builder: `->delete()` no
        // builder emite um UPDATE direto, sem eventos de model — e sem
        // eventos o owen-it não grava a linha em `audits`. A rastreabilidade
        // do documento removido é requisito (o binário fica no bucket).
        $redator->documents()->where('type', $type->value)->get()
            ->each(fn (File $antigo) => $antigo->delete());

        return $this->uploads->register($redator, $path, $meta, $type->value, $validUntil);
    }
}
