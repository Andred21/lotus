<?php

namespace App\Domains\Certification\Data\Snapshot;

use Illuminate\Support\Carbon;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A turma que originou o certificado. As datas são `Y-m-d` como gravadas; a
 * formatação do documento (`d-m-Y`) sai do acessor, não do Blade.
 */
#[TypeScript]
class SnapshotTurmaData extends Data
{
    public function __construct(
        public ?int $id,
        public ?string $start_date,
        public ?string $end_date,
        public ?string $modalidade,
    ) {}

    /** @param array<string, mixed>|null $raw */
    public static function fromArray(?array $raw): self
    {
        $id = data_get($raw, 'id');

        return new self(
            id: $id === null ? null : (int) $id,
            start_date: self::nullableString(data_get($raw, 'start_date')),
            end_date: self::nullableString(data_get($raw, 'end_date')),
            modalidade: self::nullableString(data_get($raw, 'modalidade')),
        );
    }

    /**
     * O período da capacitação como o documento oficial o escreve, ou `null`
     * quando falta data — aí a linha inteira é omitida, em vez de imprimir
     * "entre el  y el " (D-P7).
     */
    public function periodo(): ?string
    {
        $inicio = $this->formatted($this->start_date);
        $termino = $this->formatted($this->end_date);

        if ($inicio === null || $termino === null) {
            return null;
        }

        return $inicio === $termino
            ? "el día {$inicio}"
            : "entre el {$inicio} y el {$termino}";
    }

    private function formatted(?string $iso): ?string
    {
        return $iso === null ? null : Carbon::parse($iso)->format('d-m-Y');
    }

    private static function nullableString(mixed $value): ?string
    {
        return $value === null ? null : (string) $value;
    }
}
