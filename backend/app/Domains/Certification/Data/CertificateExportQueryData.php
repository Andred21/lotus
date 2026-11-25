<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Shared\Pagination\PageQueryData;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Os filtros do Historial que a exportação respeita: os MESMOS três da
 * listagem (`q`, `display_status`, `quote_id`), com as mesmas regras. Sem
 * `page`/`per_page`/`sort`: a exportação leva todas as páginas, em ordem de
 * `codigo` (spec §5.3).
 */
#[TypeScript]
class CertificateExportQueryData extends Data
{
    public function __construct(
        public ?string $q = null,
        public ?CertificateDisplayStatus $display_status = null,
        public ?int $quote_id = null,
    ) {}

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            'q' => ['sometimes', 'nullable', 'string', 'max:'.PageQueryData::Q_MAX],
            'display_status' => ['sometimes', 'nullable', Rule::enum(CertificateDisplayStatus::class)],
            // `exists` ignora o soft delete de propósito, como na listagem.
            'quote_id' => ['sometimes', 'nullable', 'integer', 'exists:quotes,id'],
        ];
    }
}
