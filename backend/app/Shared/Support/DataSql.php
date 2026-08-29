<?php

namespace App\Shared\Support;

use Carbon\CarbonInterface;
use Illuminate\Database\Connection;

/**
 * Uma data como literal comparável a uma coluna `date`, por driver.
 *
 * O cast `date` do Eloquent GRAVA `Y-m-d 00:00:00` (`getDateFormat()`), e no
 * sqlite da suíte a coluna é texto: `valido_ate < '2026-08-05'` compara
 * strings e erra a borda (`'2026-08-05 00:00:00' < '2026-08-05'` é falso). No
 * MySQL a coluna é `DATE` e `'2026-08-05'` é o literal que deixa o índice
 * vivo — `DATE(valido_ate)` (o que `whereDate` gera) o mata.
 *
 * Usado pelo `CASE` de `display_status` e pela janela do painel de emissão.
 * Não é helper de formatação de tela: é a única forma de o mesmo SQL ser
 * verdadeiro nos dois engines sem uma segunda implementação por driver.
 */
final class DataSql
{
    public static function literal(Connection $connection, CarbonInterface $date): string
    {
        return $connection->getDriverName() === 'sqlite'
            ? $date->format('Y-m-d 00:00:00')
            : $date->format('Y-m-d');
    }
}
