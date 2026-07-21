<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;

/**
 * Fonte única da RN-16: "documentação completa habilita". Habilitada NÃO é
 * estado persistido (spec 6d, D3) — deriva de haver ≥1 doc ativo de CADA tipo
 * numa turma em andamento. Consumida pelo gate de conclusão e pelo TurmaData.
 */
class TurmaHabilitacaoService
{
    public function isHabilitada(Turma $turma): bool
    {
        return $turma->status === TurmaStatus::EmAndamento
            && $this->missingTypes($turma) === [];
    }

    /** @return array<string> valores de TurmaDocumentType sem doc ativo (soft-delete não conta). */
    public function missingTypes(Turma $turma): array
    {
        $all = array_column(TurmaDocumentType::cases(), 'value');

        $present = $turma->files()
            ->whereIn('type', $all)
            ->distinct()
            ->pluck('type')
            ->all();

        return array_values(array_diff($all, $present));
    }
}
