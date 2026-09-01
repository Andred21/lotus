<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\AgendaData;
use App\Domains\Dashboard\Data\AgendaTurmaData;
use App\Domains\Dashboard\Data\PendingItemData;
use App\Domains\Dashboard\Data\TurmaComplianceData;
use App\Domains\Dashboard\Enums\DashboardModule;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Dashboard\Enums\PendingItemType;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

class OperationMetricsQuery
{
    /** @var Collection<int, Turma>|null */
    private ?Collection $emAndamento = null;

    public function __construct(
        private readonly TurmaHabilitacaoService $habilitacao,
    ) {}

    /** @return array{em_andamento:int, encerrando:int, atrasadas:int, conclusoes_por_confirmar:int} */
    public function kpis(): array
    {
        $today = CarbonImmutable::today();
        $query = Turma::query()->where('status', TurmaStatus::EmAndamento);

        return [
            'em_andamento' => (clone $query)->count(),
            'encerrando' => (clone $query)
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today)
                ->whereDate('end_date', '<=', DashboardWindows::turmaHorizon())
                ->count(),
            'atrasadas' => (clone $query)
                ->whereDate('end_date', '<', $today)
                ->count(),
            'conclusoes_por_confirmar' => $this->turmasEmAndamento()
                ->filter(fn (Turma $turma): bool => $this->habilitacao->for($turma)->isHabilitada())
                ->count(),
        ];
    }

    public function agenda(): AgendaData
    {
        $today = CarbonImmutable::today();
        $horizon = DashboardWindows::turmaHorizon();
        $turmas = $this->turmasEmAndamento();

        return new AgendaData(
            starting_soon: $turmas
                ->filter(fn (Turma $turma): bool => $turma->start_date->isAfter($today)
                    && $turma->start_date->lte($horizon))
                ->map(fn (Turma $turma): AgendaTurmaData => $this->agendaData($turma))
                ->values()
                ->all(),
            ending_soon: $turmas
                ->filter(fn (Turma $turma): bool => $turma->start_date->lte($today)
                    && $turma->end_date->gte($today)
                    && $turma->end_date->lte($horizon))
                ->map(fn (Turma $turma): AgendaTurmaData => $this->agendaData($turma))
                ->values()
                ->all(),
            in_progress: $turmas
                ->filter(fn (Turma $turma): bool => $turma->start_date->lte($today)
                    && $turma->end_date->gte($today))
                ->map(fn (Turma $turma): AgendaTurmaData => $this->agendaData($turma))
                ->values()
                ->all(),
            overdue: $turmas
                ->filter(fn (Turma $turma): bool => $turma->end_date->isBefore($today))
                ->map(fn (Turma $turma): AgendaTurmaData => $this->agendaData($turma))
                ->values()
                ->all(),
        );
    }

    /** @return TurmaComplianceData[] */
    public function complianceTurmas(): array
    {
        return $this->turmasEmAndamento()
            ->map(function (Turma $turma): TurmaComplianceData {
                $status = $this->habilitacao->for($turma);
                $present = $turma->documentacaoObrigatoria
                    ->pluck('type')
                    ->unique()
                    ->all();

                return new TurmaComplianceData(
                    turma_id: $turma->id,
                    course_name: $turma->course->name,
                    redatores: $turma->redatores
                        ->map(fn ($redator): string => $redator->user->name)
                        ->values()
                        ->all(),
                    start_date: $turma->start_date->toDateString(),
                    end_date: $turma->end_date->toDateString(),
                    present_types: array_values(array_filter(
                        TurmaDocumentType::cases(),
                        fn (TurmaDocumentType $case): bool => in_array($case->value, $present, true),
                    )),
                    missing_types: $status->missingTypes(),
                    habilitada: $status->isHabilitada(),
                );
            })
            ->values()
            ->all();
    }

    /** @return PendingItemData[] */
    public function pendencias(): array
    {
        $pendencias = [];

        foreach ($this->turmasEmAndamento() as $turma) {
            $status = $this->habilitacao->for($turma);

            if ($turma->redatores->isEmpty()) {
                $pendencias[] = $this->pendingItem(
                    $turma,
                    PendingItemType::TurmaWithoutRedator,
                    __('dashboard.pending.turma_without_redator'),
                    $turma->start_date->toDateString(),
                );
            }

            if ($status->missingTypes() !== []) {
                $pendencias[] = $this->pendingItem(
                    $turma,
                    PendingItemType::TurmaDocsIncomplete,
                    __('dashboard.pending.turma_docs_incomplete', [
                        'tipos' => implode(', ', array_map(
                            fn (TurmaDocumentType $tipo): string => __('operation.document_type.'.$tipo->value),
                            $status->missingTypes(),
                        )),
                    ]),
                    $turma->end_date->toDateString(),
                );
            }

            if ($status->isHabilitada()) {
                $pendencias[] = $this->pendingItem(
                    $turma,
                    PendingItemType::TurmaAwaitingConclusion,
                    __('dashboard.pending.turma_awaiting_conclusion'),
                    $turma->end_date->toDateString(),
                );
            }
        }

        return $pendencias;
    }

    /** @return Collection<int, Turma> */
    private function turmasEmAndamento(): Collection
    {
        return $this->emAndamento ??= Turma::query()
            ->where('status', TurmaStatus::EmAndamento)
            ->with([
                'documentacaoObrigatoria',
                'course',
                'redatores.user',
                'quote.budget.client',
            ])
            ->orderBy('start_date')
            ->orderBy('id')
            ->get();
    }

    private function agendaData(Turma $turma): AgendaTurmaData
    {
        return new AgendaTurmaData(
            turma_id: $turma->id,
            course_name: $turma->course->name,
            client_name: $turma->contratanteClient()->legal_name,
            start_date: $turma->start_date->toDateString(),
            end_date: $turma->end_date->toDateString(),
        );
    }

    private function pendingItem(
        Turma $turma,
        PendingItemType $type,
        string $description,
        string $date,
    ): PendingItemData {
        return new PendingItemData(
            module: DashboardModule::Operation,
            type: $type,
            severity: DashboardSeverity::Normal,
            entity_id: $turma->id,
            description: $description,
            date: $date,
            navigation: ['turma_id' => $turma->id],
        );
    }
}
