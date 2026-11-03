<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Collection;

/**
 * Turmas em andamento repartidas em baldes disjuntos (ordem de entrada preservada).
 */
final readonly class AgendaBuckets
{
    /**
     * @param  Collection<int, Turma>  $overdue
     * @param  Collection<int, Turma>  $upcoming
     * @param  Collection<int, Turma>  $endingSoon
     * @param  Collection<int, Turma>  $inProgress
     */
    public function __construct(
        public Collection $overdue,
        public Collection $upcoming,
        public Collection $endingSoon,
        public Collection $inProgress,
    ) {}

    /** Turmas que já começaram: tudo menos `upcoming`. */
    public function startedCount(): int
    {
        return $this->overdue->count() + $this->endingSoon->count() + $this->inProgress->count();
    }
}
