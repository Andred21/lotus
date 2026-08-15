<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Enums\DocumentValidityStatus;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Shared\Files\Models\File;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Um slot documental do perfil do redator. Existe um por tipo, SEMPRE — sem
 * documento, `status` é `Ausente` e os metadados são nulos. A tela não precisa
 * saber quais tipos existem para desenhar a lista, e "não enviou" nunca se
 * confunde com "não existe esse tipo".
 */
#[TypeScript]
class RedatorProfileDocumentData extends Data
{
    public function __construct(
        public RedatorDocumentType $type,
        public DocumentValidityStatus $status,
        /** `false` no REUF: a spec D5 chega ao front como dado, não como regra. */
        public bool $self_service,
        public ?string $valid_until = null,
        public ?string $original_name = null,
        public ?int $size = null,
        public ?string $created_at = null,
        // `null` nunca chega ao transformer: TransformedDataResolver devolve
        // null antes de chamá-lo. Mesmo arranjo de `SessionUserData::$photo_url`.
        #[WithTransformer(SignedUrlTransformer::class, 10)]
        public ?string $download_url = null,
    ) {}

    public static function slot(RedatorDocumentType $type, ?File $file): self
    {
        return new self(
            type: $type,
            status: DocumentValidityStatus::for($file?->valid_until, presente: $file !== null),
            self_service: $type->isSelfService(),
            valid_until: $file?->valid_until?->toDateString(),
            original_name: $file?->original_name,
            size: $file?->size,
            created_at: $file?->created_at?->toIso8601String(),
            download_url: $file?->path,
        );
    }
}
