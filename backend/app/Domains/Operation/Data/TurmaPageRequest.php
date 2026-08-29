<?php

namespace App\Domains\Operation\Data;

use App\Domains\Operation\Enums\TurmaDisplayStatus;
use App\Shared\Pagination\PageRequest;
use Illuminate\Validation\Rule;

/** `PageRequest` + o filtro de estado do hub de turmas (ativo e arquivado). */
class TurmaPageRequest extends PageRequest
{
    public function __construct(
        int $page = 1,
        int $per_page = PageRequest::PER_PAGE_DEFAULT,
        ?string $q = null,
        ?string $sort = null,
        public ?TurmaDisplayStatus $status = null,
    ) {
        parent::__construct($page, $per_page, $q, $sort);
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            ...parent::rules(),
            'status' => ['sometimes', 'nullable', Rule::enum(TurmaDisplayStatus::class)],
        ];
    }
}
