<?php

namespace App\Domains\Certification\Services;

/**
 * Texto do certificado no formato chileno. Sem dependências: os meses vêm de
 * um array próprio, para não depender de locale do Carbon nem de ICU.
 */
final class TextoDoCertificado
{
    private const MESES = [
        1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril',
        5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto',
        9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre',
    ];

    /** '2026-10-28' → '28 de octubre de 2026'. */
    public static function fechaLarga(string $iso): string
    {
        [$ano, $mes, $dia] = self::partes($iso);

        return "{$dia} de ".self::MESES[$mes]." de {$ano}";
    }

    public static function periodo(?string $inicio, ?string $termino): ?string
    {
        if ($inicio === null || $termino === null) {
            return null;
        }

        [$anoI, $mesI, $diaI] = self::partes($inicio);
        [$anoT, $mesT, $diaT] = self::partes($termino);

        if ($anoI === $anoT && $mesI === $mesT && $diaI === $diaT) {
            return 'el '.self::fechaLarga($termino);
        }

        if ($anoI === $anoT) {
            return "entre el {$diaI} de ".self::MESES[$mesI]." y el {$diaT} de ".self::MESES[$mesT]." de {$anoT}";
        }

        return 'entre el '.self::fechaLarga($inicio).' y el '.self::fechaLarga($termino);
    }

    public static function nota(int|float|string $nota): string
    {
        return self::decimal($nota);
    }

    public static function asistencia(string $pct): string
    {
        return self::decimal($pct).' %';
    }

    public static function parrafo(?string $periodo, ?string $descricao, ?string $nota, ?string $asistencia): ?string
    {
        $frases = [];

        if ($descricao !== null) {
            $descricao = trim($descricao);
            if (! str_ends_with($descricao, '.') && ! str_ends_with($descricao, '!') && ! str_ends_with($descricao, '?')) {
                $descricao .= '.';
            }
        }

        if ($periodo !== null && $descricao !== null) {
            $frases[] = "La actividad, realizada {$periodo}, abordó los siguientes contenidos: {$descricao}";
        } elseif ($periodo !== null) {
            $frases[] = "La actividad fue realizada {$periodo}.";
        } elseif ($descricao !== null) {
            $frases[] = "La actividad abordó los siguientes contenidos: {$descricao}";
        }

        if ($nota !== null && $asistencia !== null) {
            $frases[] = "El trabajador logró aprobar el curso con nota {$nota} y una asistencia de {$asistencia}.";
        } elseif ($nota !== null) {
            $frases[] = "El trabajador logró aprobar el curso con nota {$nota}.";
        } elseif ($asistencia !== null) {
            $frases[] = "El trabajador registró una asistencia de {$asistencia}.";
        }

        return $frases === [] ? null : implode(' ', $frases);
    }

    /** @return array{0: int, 1: int, 2: int} ano, mês, dia */
    private static function partes(string $iso): array
    {
        [$ano, $mes, $dia] = array_map('intval', explode('-', substr($iso, 0, 10)));

        return [$ano, $mes, $dia];
    }

    private static function decimal(int|float|string $valor): string
    {
        $texto = str_replace(',', '.', trim((string) $valor));

        if (str_contains($texto, '.')) {
            $texto = rtrim(rtrim($texto, '0'), '.');
        }

        return str_replace('.', ',', $texto);
    }
}
