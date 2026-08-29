<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Services\EmissionPanelQuery;
use Carbon\CarbonImmutable;
use Spatie\LaravelData\Data;

/**
 * A janela do painel de emissão (spec D7): `concluidas_desde`, `Y-m-d`.
 * Ausente = hoje (America/Santiago) menos `EmissionPanelQuery::JANELA_MESES`.
 */
class EmissionPanelRequest extends Data
{
    public function __construct(
        public ?string $concluidas_desde = null,
    ) {}

    /** @return array<string, array<int, string>> */
    public static function rules(): array
    {
        return [
            'concluidas_desde' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ];
    }

    public function desde(): CarbonImmutable
    {
        if ($this->concluidas_desde !== null && $this->concluidas_desde !== '') {
            return CarbonImmutable::createFromFormat('Y-m-d', $this->concluidas_desde, CertificateDisplayStatus::TIMEZONE)->startOfDay();
        }

        return CertificateDisplayStatus::hoje()->subMonths(EmissionPanelQuery::JANELA_MESES);
    }
}
