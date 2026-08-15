<?php

namespace App\Domains\Dashboard\Data;

use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;
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
 * Janela invertida sobe `ValidationException`, que o handler global converte em
 * 422 RFC 7807 — nunca `abort()` à mão (ADR-03).
 */
class DashboardFilterData extends Data
{
    /** Janela default quando o chamador não pede período (plano, Task 6). */
    public const DEFAULT_MONTHS = 12;

    public const PERIODO_INVERTIDO = 'La fecha de término no puede ser anterior a la de inicio.';

    public function __construct(
        public ?string $period_start = null,
        public ?string $period_end = null,
    ) {}

    public static function rules(): array
    {
        return [
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date'],
        ];
    }

    /**
     * A comparação é da janela RESOLVIDA, não dos dois campos crus, porque cada
     * limite ausente tem um default e o default participa da janela. Um
     * `after_or_equal:period_start` só compara quando os dois vieram: com
     * `period_end` sozinho e anterior ao default de início, a request passava
     * com 200 e uma janela invertida, e séries e rankings voltavam vazios —
     * entrada inválida virando "não há dado" (Q-2, mesma classe da lição
     * `falha-vs-lista-vazia`).
     */
    public static function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            // Formato inválido já reprovou acima; sem isso o `parse` abaixo
            // estouraria em vez de somar sua mensagem à do campo.
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $payload = $validator->getData();
            $filtro = new self(
                $payload['period_start'] ?? null,
                $payload['period_end'] ?? null,
            );

            if ($filtro->start()->greaterThan($filtro->end())) {
                $validator->errors()->add('period_end', self::PERIODO_INVERTIDO);
            }
        });
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
