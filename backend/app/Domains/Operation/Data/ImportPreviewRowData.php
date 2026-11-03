<?php

namespace App\Domains\Operation\Data;

use App\Domains\Operation\Enums\ImportField;
use App\Domains\Operation\Enums\ImportRowStatus;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Uma linha da prévia. Os campos `registered_*` e `divergent` só existem em
 * linha `registered`/`moves`: são o cadastro vigente contra o qual a planilha
 * foi comparada (D9, D17).
 */
#[TypeScript]
class ImportPreviewRowData extends Data
{
    public function __construct(
        public int $row,
        public string $rut,
        public string $name,
        public ?string $email,
        public ?string $phone,
        public ImportRowStatus $status,
        public ?string $message,
        /** Por que o *Actualizar* desta linha não vale; a linha em si segue matriculável (D3). */
        public ?string $update_refusal,
        public ?string $current_client,
        public bool $archived,
        /** @var array<ImportField> */
        public array $divergent,
        public ?string $registered_name,
        public ?string $registered_email,
        public ?string $registered_phone,
    ) {}
}
