<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Services\EmissionPanelQuery;
use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;
use Spatie\LaravelData\Data;

/**
 * A janela do painel de emissão (spec D7, §4 do bloco 62): `period_start` e
 * `period_end`, `Y-m-d`, ambos inclusivos sobre `turmas.end_date`.
 *
 * Início ausente = hoje (America/Santiago) menos `EmissionPanelQuery::JANELA_MESES`.
 * Fim ausente = sem limite superior (turma concluída hoje sempre entra).
 *
 * Janela invertida sobe `ValidationException` em `period_end`, que o handler
 * global converte em 422 RFC 7807 — nunca `abort()` à mão (ADR-03).
 */
class EmissionPanelQueryData extends Data
{
    public function __construct(
        public ?string $period_start = null,
        public ?string $period_end = null,
    ) {}

    /** @return array<string, array<int, string>> */
    public static function rules(): array
    {
        return [
            'period_start' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'period_end' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ];
    }

    /**
     * A comparação é da janela RESOLVIDA, não dos dois campos crus: o início
     * ausente tem default e o default participa da janela. Só `period_end`,
     * anterior ao default de início, passaria com 200 e uma janela invertida —
     * entrada inválida virando "não há turma" (molde `DashboardFilterData`).
     */
    public static function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            // Formato inválido já reprovou acima; sem isso o parse abaixo
            // estouraria em vez de somar sua mensagem à do campo.
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $payload = $validator->getData();
            $janela = new self(
                self::vazioParaNulo($payload['period_start'] ?? null),
                self::vazioParaNulo($payload['period_end'] ?? null),
            );

            $fim = $janela->fim();
            if ($fim !== null && $janela->inicio()->greaterThan($fim)) {
                $validator->errors()->add('period_end', __('certification.emission_panel.inverted_period'));
            }
        });
    }

    public function inicio(): CarbonImmutable
    {
        if ($this->period_start !== null && $this->period_start !== '') {
            return self::dia($this->period_start);
        }

        return CertificateDisplayStatus::hoje()->subMonths(EmissionPanelQuery::JANELA_MESES);
    }

    public function fim(): ?CarbonImmutable
    {
        return $this->period_end !== null && $this->period_end !== '' ? self::dia($this->period_end) : null;
    }

    private static function dia(string $ymd): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d', $ymd, CertificateDisplayStatus::TIMEZONE)->startOfDay();
    }

    private static function vazioParaNulo(mixed $valor): ?string
    {
        return is_string($valor) && $valor !== '' ? $valor : null;
    }
}
