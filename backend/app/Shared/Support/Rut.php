<?php

namespace App\Shared\Support;

/**
 * RUT chileno (Rol Único Tributario). Value object: normaliza a entrada e
 * valida o dígito verificador (módulo 11). Serve para pessoa e empresa —
 * o formato/DV é o mesmo.
 */
final class Rut
{
    public function __construct(
        public readonly string $number,
        public readonly string $dv,
    ) {}

    public static function parse(string $raw): self
    {
        $clean = strtoupper((string) preg_replace('/[^0-9kK]/', '', $raw));

        if ($clean === '') {
            return new self('', '');
        }

        return new self(substr($clean, 0, -1), substr($clean, -1));
    }

    public function isValid(): bool
    {
        if ($this->number === '' || ! ctype_digit($this->number)) {
            return false;
        }

        return $this->computeDv($this->number) === $this->dv;
    }

    public function format(): string
    {
        return number_format((int) $this->number, 0, '', '.').'-'.$this->dv;
    }

    private function computeDv(string $number): string
    {
        $sum = 0;
        $factor = 2;

        for ($i = strlen($number) - 1; $i >= 0; $i--) {
            $sum += (int) $number[$i] * $factor;
            $factor = $factor === 7 ? 2 : $factor + 1;
        }

        $mod = 11 - ($sum % 11);

        return match ($mod) {
            11 => '0',
            10 => 'K',
            default => (string) $mod,
        };
    }
}
