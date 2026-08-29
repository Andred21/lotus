<?php

namespace App\Shared\Pagination;

use Spatie\LaravelData\Data;

/**
 * Entrada de toda lista paginada (spec §4.1). Injetado direto no controller
 * (`index(PageRequest $request)`): o laravel-data lê a query string, valida por
 * `rules()` e coage `"10"` para `int` — provado em `PageRequestTest`.
 *
 * Acima do teto é 422, não clamp (spec D3): recusar é o padrão do projeto
 * (RFC 7807, nunca silêncio). O teto existe para a API não voltar a devolver
 * tudo por um parâmetro.
 *
 * A allowlist de `sort` NÃO mora aqui: é de cada lista (`Paginates::SORTABLE`
 * no builder). Os requests com filtro nomeado ESTENDEM esta classe e chamam
 * `parent::rules()` — `CertificatePageRequest`, `TurmaPageRequest`.
 */
class PageRequest extends Data
{
    public const PER_PAGE_DEFAULT = 25;

    public const PER_PAGE_MAX = 100;

    public const Q_MAX = 100;

    public function __construct(
        public int $page = 1,
        public int $per_page = self::PER_PAGE_DEFAULT,
        public ?string $q = null,
        public ?string $sort = null,
    ) {}

    /** @return array<string, array<int, string>> */
    public static function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:'.self::PER_PAGE_MAX],
            'q' => ['sometimes', 'nullable', 'string', 'max:'.self::Q_MAX],
            'sort' => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }
}
