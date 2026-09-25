<?php

namespace App\Shared\Support;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * Dono único do fuso do NEGÓCIO (P-59, spec D1 do item 29).
 *
 * O servidor grava e compara INSTANTES em UTC — `config/app.php` fixa
 * `'timezone' => 'UTC'` por decisão (spec D2), e nada já gravado é
 * reinterpretado. DATA DE CALENDÁRIO é outra coisa: o dia impresso num
 * certificado, o "hoje" de uma vigência, a data de um alerta são os do
 * cliente, em Santiago. Derivados do relógio UTC, eles erram o dia das 21h
 * (horário de verão; 20h no inverno) até a meia-noite locais — um certificado
 * emitido às 23h congelava a data de amanhã e, em 31/12 à noite, o código do
 * ano seguinte.
 *
 * Toda derivação de data a partir do relógio passa por aqui. A catraca
 * `tests/Unit/Shared/DataDeCalendarioTest.php` reprova `today()` e `now()`
 * projetado em data no resto de `app/`.
 */
final class FusoDoNegocio
{
    public const TIMEZONE = 'America/Santiago';

    /** O instante atual expresso no fuso do negócio: `->year` e `->toDateString()` são os locais. */
    public static function agora(): CarbonImmutable
    {
        return CarbonImmutable::now(self::TIMEZONE);
    }

    /**
     * A data de HOJE no fuso do negócio, como meia-noite no fuso da APLICAÇÃO.
     *
     * É a forma com que o cast `date` do Eloquent hidrata `valid_until`,
     * `start_date` e `valido_ate`: comparar `hoje()` com eles é comparar dia com
     * dia. Meia-noite DE Santiago seria outro instante (03:00 ou 04:00 UTC), e
     * `$validUntil->lessThan(...)` chamaria de vencido o documento que vence
     * hoje. Gravado num cast `date`, sai o mesmo `Y-m-d 00:00:00` de antes — só
     * o dia muda.
     */
    public static function hoje(): CarbonImmutable
    {
        return CarbonImmutable::parse(self::agora()->toDateString(), date_default_timezone_get());
    }

    /** A data, no fuso do negócio, em que um INSTANTE (`datetime`) caiu. */
    public static function dataDe(?CarbonInterface $instante): ?string
    {
        return $instante === null
            ? null
            : CarbonImmutable::instance($instante)->setTimezone(self::TIMEZONE)->toDateString();
    }
}
