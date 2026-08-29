<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Shared\Pagination\PageRequest;
use Illuminate\Validation\Rule;

/** `PageRequest` + o filtro nomeado do Historial. Valor fora do enum é 422. */
class CertificatePageRequest extends PageRequest
{
    public function __construct(
        int $page = 1,
        int $per_page = PageRequest::PER_PAGE_DEFAULT,
        ?string $q = null,
        ?string $sort = null,
        public ?CertificateDisplayStatus $display_status = null,
    ) {
        parent::__construct($page, $per_page, $q, $sort);
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            ...parent::rules(),
            'display_status' => ['sometimes', 'nullable', Rule::enum(CertificateDisplayStatus::class)],
        ];
    }
}
