<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\RedatorLoadData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Carga de trabalho por redator, seção do admin (D2 / spec §3.7).
 *
 * Lista TODO redator, inclusive o que não tem turma nenhuma. Sumir da lista
 * por estar sem carga esconderia exatamente quem está ocioso, que é metade da
 * pergunta que esta seção responde.
 *
 * Turma concluída não é carga: já saiu da mesa. Só `em_andamento` conta, e a
 * partição é a mesma do `RedatorScopeQuery::resumo()` — já começou (`current`)
 * ou ainda vai começar (`upcoming`) —, para que o redator e o admin vejam o
 * mesmo número sobre o mesmo redator.
 */
class RedatorLoadQuery
{
    /** @return RedatorLoadData[] */
    public function get(): array
    {
        $today = CarbonImmutable::today();
        $horizon = DashboardWindows::expiryHorizon();
        $porRedator = $this->turmasEmAndamentoPorRedator();

        return Redator::query()
            ->with([
                'user',
                // Só documento de idoneidade conta como vencido/vencendo — a
                // mesma lista canônica que o alerta do admin e o do próprio
                // redator usam. Sem o filtro de tipo, qualquer arquivo do
                // redator com `valid_until` inflava a contagem e o número do
                // admin divergia do que o redator via (Q-8).
                'documents' => fn ($query) => $query
                    ->whereIn('type', RedatorDocumentType::values())
                    ->whereNotNull('valid_until'),
            ])
            ->get()
            ->map(function (Redator $redator) use ($today, $horizon, $porRedator): RedatorLoadData {
                $turmas = $porRedator[$redator->id] ?? ['current' => 0, 'upcoming' => 0];

                return new RedatorLoadData(
                    redator_id: $redator->id,
                    name: $redator->user->name,
                    current_turmas: $turmas['current'],
                    upcoming_turmas: $turmas['upcoming'],
                    expired_documents: $redator->documents
                        ->filter(fn (File $doc): bool => $doc->valid_until->isBefore($today))
                        ->count(),
                    expiring_documents: $redator->documents
                        ->filter(fn (File $doc): bool => $doc->valid_until->gte($today)
                            && $doc->valid_until->lte($horizon))
                        ->count(),
                );
            })
            ->sortBy(fn (RedatorLoadData $linha): string => $linha->name)
            ->values()
            ->all();
    }

    /**
     * Uma query só para toda a equipe, agrupada em PHP. Contar turma por
     * redator com subquery por linha devolveria o N+1 que o `preventLazyLoading`
     * existe para barrar.
     *
     * @return array<int, array{current:int, upcoming:int}>
     */
    private function turmasEmAndamentoPorRedator(): array
    {
        $today = CarbonImmutable::today();
        $porRedator = [];

        /** @var Collection<int, Turma> $turmas */
        $turmas = Turma::query()
            ->where('status', TurmaStatus::EmAndamento)
            ->with('redatores:id')
            ->get(['id', 'start_date']);

        foreach ($turmas as $turma) {
            $balde = $turma->start_date->lte($today) ? 'current' : 'upcoming';

            foreach ($turma->redatores as $redator) {
                $porRedator[$redator->id] ??= ['current' => 0, 'upcoming' => 0];
                $porRedator[$redator->id][$balde]++;
            }
        }

        return $porRedator;
    }
}
