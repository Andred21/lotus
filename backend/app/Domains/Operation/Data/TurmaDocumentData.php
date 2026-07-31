<?php

namespace App\Domains\Operation\Data;

use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Documento da turma (leitura). Núcleo comum de `FileData` (spec D5): `mime`
 * decide a pré-visualização no front e `download_url` é a URL pré-assinada
 * temporária (ADR-11) — antes desta sprint a turma listava o documento sem
 * conseguir baixá-lo.
 */
#[TypeScript]
class TurmaDocumentData extends Data
{
    public function __construct(
        public int $id,
        public string $type,
        public string $original_name,
        public ?string $mime,
        public int $size,
        public string $created_at,
        public string $download_url,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            mime: $file->mime,
            size: $file->size,
            created_at: $file->created_at->toISOString(),
            download_url: app(UploadFileAction::class)->temporaryUrl($file),
        );
    }
}
