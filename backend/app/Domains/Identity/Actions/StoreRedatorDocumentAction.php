<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Models\File;
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
    public function __construct(private FileUploader $fileUploader) {}

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
}
