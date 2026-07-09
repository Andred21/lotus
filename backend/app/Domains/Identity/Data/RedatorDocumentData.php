<?php

namespace App\Domains\Identity\Data;

use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Documento de idoneidade do redator (leitura). O status (vigente/por vencer/
 * vencido) é derivado no front a partir de valid_until.
 */
#[TypeScript]
class RedatorDocumentData extends Data
{
    public function __construct(
        public int $id,
        public string $type,
        public string $original_name,
        public ?string $valid_until,
        public string $download_url,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            valid_until: $file->valid_until?->toDateString(),
            download_url: app(UploadFileAction::class)->temporaryUrl($file),
        );
    }
}
