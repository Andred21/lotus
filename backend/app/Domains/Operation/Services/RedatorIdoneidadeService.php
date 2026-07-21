<?php

namespace App\Domains\Operation\Services;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Exceptions\RedatorNaoElegivelException;
use Illuminate\Contracts\Database\Query\Builder;

/**
 * Gate de designação (RN-09): redator só assume turma se habilitado ao curso
 * (course_redator) E com REUF válido. `valid_until` nulo = vale sempre;
 * só REUF vencido reprova. CV/TÍTULO não bloqueiam (decisão João, 2026-07-21).
 */
class RedatorIdoneidadeService
{
    public function assertEligible(Redator $redator, Course $course): void
    {
        if (! $this->isHabilitado($redator, $course)) {
            throw RedatorNaoElegivelException::naoHabilitado();
        }
        if (! $this->temReufValido($redator)) {
            throw RedatorNaoElegivelException::reufInvalido();
        }
    }

    public function isEligible(Redator $redator, Course $course): bool
    {
        return $this->isHabilitado($redator, $course) && $this->temReufValido($redator);
    }

    private function isHabilitado(Redator $redator, Course $course): bool
    {
        return $course->redatores()->whereKey($redator->id)->exists();
    }

    private function temReufValido(Redator $redator): bool
    {
        // O soft-delete de `files` já exclui os documentos removidos.
        return $redator->documents()
            ->where('type', RedatorDocumentType::REUF->value)
            ->where(fn (Builder $q) => $q
                ->whereNull('valid_until')
                ->orWhereDate('valid_until', '>=', now()->toDateString()))
            ->exists();
    }
}
