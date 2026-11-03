<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Enums\AgendaBucket;
use App\Domains\Operation\Models\Turma;
use App\Shared\Support\FusoDoNegocio;
use Illuminate\Support\Collection;

/**
 * Classificador puro da agenda: cada turma em andamento cai em exatamente um
 * balde. Não consulta nem filtra status — o chamador entrega só `em_andamento`,
 * já escopadas.
 */
final class AgendaClassifier
{
    public static function bucketOf(Turma $turma): AgendaBucket
    {
        $hoje = FusoDoNegocio::hoje();

        if ($turma->start_date->startOfDay()->greaterThan($hoje)) {
            return AgendaBucket::Upcoming;
        }

        if ($turma->end_date->startOfDay()->lessThan($hoje)) {
            return AgendaBucket::Overdue;
        }

        if ($turma->end_date->lessThanOrEqualTo(DashboardWindows::turmaHorizon())) {
            return AgendaBucket::EndingSoon;
        }

        return AgendaBucket::InProgress;
    }

    /**
     * @param  Collection<int, Turma>  $turmas
     */
    public static function classify(Collection $turmas): AgendaBuckets
    {
        $grupos = $turmas->groupBy(fn (Turma $t): string => self::bucketOf($t)->value);

        $balde = fn (AgendaBucket $b): Collection => ($grupos->get($b->value) ?? new Collection)->values();

        return new AgendaBuckets(
            overdue: $balde(AgendaBucket::Overdue),
            upcoming: $balde(AgendaBucket::Upcoming),
            endingSoon: $balde(AgendaBucket::EndingSoon),
            inProgress: $balde(AgendaBucket::InProgress),
        );
    }
}
