<?php

namespace App\Shared\Files\Data;

use App\Shared\Files\Models\File;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato genérico de anexo (tabela polimórfica `files`). Usado pelos anexos
 * do orçamento (fatura/comprovante) e da cotação (documento). Sem valid_until:
 * documentos financeiros não têm vigência (ao contrário dos de redator).
 */
#[TypeScript]
class FileData extends Data
{
    public function __construct(
        public int $id,
        public string $type,
        public string $original_name,
        public ?string $mime,
        public int $size,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            mime: $file->mime,
            size: $file->size,
        );
    }
}
