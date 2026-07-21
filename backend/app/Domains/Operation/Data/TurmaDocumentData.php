<?php

namespace App\Domains\Operation\Data;

use App\Shared\Files\Models\File;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Documento da turma (leitura). Sem download_url por ora — a listagem serve o
 * checklist RN-16; o download entra com a tela (6-frontend) se necessário.
 */
#[TypeScript]
class TurmaDocumentData extends Data
{
    public function __construct(
        public int $id,
        public string $type,
        public string $original_name,
        public int $size,
        public string $created_at,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            size: $file->size,
            created_at: $file->created_at->toISOString(),
        );
    }
}
