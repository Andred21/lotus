<?php

namespace App\Domains\Dashboard\Data;

use Carbon\CarbonImmutable;
use Spatie\LaravelData\Data;

/**
 * Filtro de período do dashboard do admin. Só as séries e os rankings o
 * respeitam — o estado presente (KPIs, pendências, alertas, pipeline, agenda,
 * compliance) ignora o período por definição (spec §3, Drive §5).
 *
 * Sem `#[TypeScript]` de propósito: o contrato TS do bloco é o da Task 1, e
 * este é DTO de ENTRADA, montado pelo front como query string. Tipá-lo mexeria
 * no `generated.ts`, que não está entre os arquivos desta task.
 *
 * `after_or_equal` no fim: início depois do fim sobe `ValidationException`, que
 * o handler global converte em 422 RFC 7807 — nunca `abort()` à mão (ADR-03).
 */
class DashboardFilterData extends Data
{
    /** Janela default quando o chamador não pede período (plano, Task 6). */
    public const DEFAULT_MONTHS = 12;

    public function __construct(
        public ?string $period_start = null,
        public ?string $period_end = null,
    ) {}

    public static function rules(): array
    {
        return [
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
        ];
    }

    public function start(): CarbonImmutable
    {
        return $this->period_start !== null
            ? CarbonImmutable::parse($this->period_start)->startOfDay()
            : CarbonImmutable::today()->subMonths(self::DEFAULT_MONTHS)->startOfDay();
    }

    public function end(): CarbonImmutable
    {
        return $this->period_end !== null
            ? CarbonImmutable::parse($this->period_end)->endOfDay()
            : CarbonImmutable::today()->endOfDay();
    }
}
