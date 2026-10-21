<?php

namespace App\Domains\Operation\Services;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\MotivoInidoneidade;
use App\Shared\Support\FusoDoNegocio;
use Illuminate\Contracts\Database\Query\Builder;

/**
 * Idoneidade do redator para o curso da turma (RN-09). Não é mais trava: a
 * designação aceita o redator com motivo e audita o motivo (ruling em
 * `docs/superpowers/blocos/39-certificado-e-redator-sem-trava/ruling-rn09.md`).
 *
 * Os critérios seguem os de 2026-07-21: habilitado ao curso (course_redator) E
 * com REUF válido. `valid_until` nulo = vale sempre; só REUF vencido reprova.
 * CV/TÍTULO não contam.
 */
class RedatorIdoneidadeService
{
    /**
     * @return list<MotivoInidoneidade> vazio = idôneo; ordem fixa
     *                                  (NaoHabilitado, ReufInvalido)
     */
    public function motivos(Redator $redator, Course $course): array
    {
        $motivos = [];

        if (! $this->isHabilitado($redator, $course)) {
            $motivos[] = MotivoInidoneidade::NaoHabilitado;
        }
        if (! $this->temReufValido($redator)) {
            $motivos[] = MotivoInidoneidade::ReufInvalido;
        }

        return $motivos;
    }

    public function isEligible(Redator $redator, Course $course): bool
    {
        return $this->motivos($redator, $course) === [];
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
                ->orWhereDate('valid_until', '>=', FusoDoNegocio::hoje()->toDateString()))
            ->exists();
    }
}
