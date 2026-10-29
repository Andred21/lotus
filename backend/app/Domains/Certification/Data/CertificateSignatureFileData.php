<?php

namespace App\Domains\Certification\Data;

use App\Shared\Files\Models\File;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** A imagem de assinatura da gerente (leitura). Só saída. */
#[TypeScript]
class CertificateSignatureFileData extends Data
{
    public function __construct(
        public string $original_name,
        public int $size,
        public ?string $created_at,
        #[WithTransformer(SignedUrlTransformer::class, 10)]
        public string $download_url,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            original_name: $file->original_name,
            size: $file->size,
            created_at: $file->created_at?->toIso8601String(),
            download_url: $file->path,
        );
    }
}
