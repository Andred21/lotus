<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\AgendaData;
use App\Domains\Dashboard\Data\AgendaTurmaData;
use App\Domains\Dashboard\Data\PendingItemData;
use App\Domains\Dashboard\Data\TurmaComplianceData;
use App\Domains\Dashboard\Enums\DashboardModule;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Dashboard\Enums\PendingItemType;
use App\Domains\Operation\Enums\TurmaDisplayStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

class OperationMetricsQuery
{
    /** @var Collection<int, Turma>|null */
    private ?Collection $emAndamento = null;

    private ?AgendaBuckets $baldes = null;

    public function __construct(
        private readonly TurmaHabilitacaoService $habilitacao,
    ) {}

    /**
     * `em_andamento` é o TOTAL (o funil de `PipelineQuery` conta as futuras);
     * `iniciadas` é o que o card do admin mostra — só as que já começaram.
     * `encerrando`/`atrasadas` têm o tamanho do balde da agenda: mesma
     * classificação, uma definição só. `conclusoes_por_confirmar` é a pergunta
     * "habilitada" em SQL, a mesma do filtro da lista de turmas.
     *
     * @return array{em_andamento:int, iniciadas:int, encerrando:int, atrasadas:int, conclusoes_por_confirmar:int}
     */
    public function kpis(): array
    {
        $turmas = $this->turmasEmAndamento();
        $baldes = $this->baldes();

        return [
            'em_andamento' => $turmas->count(),
            'iniciadas' => $baldes->startedCount(),
            'encerrando' => $baldes->endingSoon->count(),
            'atrasadas' => $baldes->overdue->count(),
            'conclusoes_por_confirmar' => Turma::query()
                ->whereDisplayStatus(TurmaDisplayStatus::Habilitada)
                ->count(),
        ];
    }

    public function agenda(): AgendaData
    {
        $baldes = $this->baldes();
        $mapear = fn (Collection|SupportCollection $turmas): array => $turmas
            ->map(fn (Turma $turma): AgendaTurmaData => $this->agendaData($turma))
            ->values()
            ->all();

        return new AgendaData(
            starting_soon: $mapear($baldes->upcoming),
            ending_soon: $mapear($baldes->endingSoon),
            in_progress: $mapear($baldes->inProgress),
            overdue: $mapear($baldes->overdue),
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

    private function baldes(): AgendaBuckets
    {
        return $this->baldes ??= AgendaClassifier::classify($this->turmasEmAndamento());
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
