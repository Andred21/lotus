<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Certification\Models\Certificate;
use App\Domains\Dashboard\Data\AlertData;
use App\Domains\Dashboard\Data\RedatorAgendaData;
use App\Domains\Dashboard\Data\RedatorAgendaTurmaData;
use App\Domains\Dashboard\Data\RedatorHistoricoData;
use App\Domains\Dashboard\Data\RedatorResumoData;
use App\Domains\Dashboard\Data\RedatorTurmaPendenciaData;
use App\Domains\Dashboard\Enums\DashboardAlertType;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Tudo que o dashboard do redator lê, já escopado ao próprio redator.
 *
 * O escopo entra ANTES de qualquer agregação (Drive §7.4): não existe aqui
 * método que consulte a base inteira e filtre depois, porque é justamente aí
 * que o dado do outro redator vaza. A porta única é `scoped()`, e todo método
 * público passa por ela.
 *
 * Ownership é `turma_redator` e nada mais — sem inferência por curso, por
 * cliente ou por quem assinou o certificado. Turma compartilhada pertence aos
 * dois: aparecer para um não a tira do outro.
 *
 * Zero UF, zero nome de cliente, zero dado de outro redator em qualquer
 * retorno. A agenda usa o par dedicado `RedatorAgendaData`/
 * `RedatorAgendaTurmaData` — o admin tem o seu, com `client_name`, e os dois
 * não se encontram (D5: vazamento é erro de tipo, não de runtime).
 */
class RedatorScopeQuery
{
    /** @var array<int, Collection<int, Turma>> */
    private array $emAndamento = [];

    public function __construct(
        private readonly TurmaHabilitacaoService $habilitacao,
    ) {}

    public function resumo(Redator $redator): RedatorResumoData
    {
        $today = CarbonImmutable::today();
        $turmas = $this->turmasEmAndamento($redator);

        // Os dois primeiros contadores partem o mesmo conjunto em dois, sem
        // sobreposição e sem sobra: turma que já começou (incluindo a atrasada,
        // que continua sendo trabalho aberto) e turma que ainda vai começar.
        // A agenda mais abaixo é que recorta janelas — aqui é o total.
        return new RedatorResumoData(
            turmas_em_andamento: $turmas
                ->filter(fn (Turma $turma): bool => $turma->start_date->lte($today))
                ->count(),
            proximas_turmas: $turmas
                ->filter(fn (Turma $turma): bool => $turma->start_date->isAfter($today))
                ->count(),
            pendencias_documentais: count($this->pendenciasDocumentais($redator)),
            documentos_vencendo: count($this->alertasDocumentos($redator)),
        );
    }

    public function agenda(Redator $redator): RedatorAgendaData
    {
        $today = CarbonImmutable::today();
        $horizon = DashboardWindows::turmaHorizon();
        $turmas = $this->turmasEmAndamento($redator);

        return new RedatorAgendaData(
            starting_soon: $this->agendaBucket(
                $turmas,
                fn (Turma $turma): bool => $turma->start_date->isAfter($today)
                    && $turma->start_date->lte($horizon),
            ),
            ending_soon: $this->agendaBucket(
                $turmas,
                fn (Turma $turma): bool => $turma->start_date->lte($today)
                    && $turma->end_date->gte($today)
                    && $turma->end_date->lte($horizon),
            ),
            in_progress: $this->agendaBucket(
                $turmas,
                fn (Turma $turma): bool => $turma->start_date->lte($today)
                    && $turma->end_date->gte($today),
            ),
            overdue: $this->agendaBucket(
                $turmas,
                fn (Turma $turma): bool => $turma->end_date->isBefore($today),
            ),
        );
    }

    /** @return RedatorTurmaPendenciaData[] */
    public function pendenciasDocumentais(Redator $redator): array
    {
        return $this->turmasEmAndamento($redator)
            ->map(fn (Turma $turma): array => [
                'turma' => $turma,
                'missing' => $this->habilitacao->for($turma)->missingTypes(),
            ])
            ->filter(fn (array $row): bool => $row['missing'] !== [])
            ->map(fn (array $row): RedatorTurmaPendenciaData => new RedatorTurmaPendenciaData(
                turma_id: $row['turma']->id,
                course_name: $row['turma']->course->name,
                end_date: $row['turma']->end_date->toDateString(),
                missing_types: $row['missing'],
            ))
            ->values()
            ->all();
    }

    /** @return AlertData[] */
    public function alertasDocumentos(Redator $redator): array
    {
        $today = CarbonImmutable::today();

        return $redator->documents()
            ->whereIn('type', RedatorDocumentType::values())
            ->whereNotNull('valid_until')
            ->whereDate('valid_until', '<=', DashboardWindows::expiryHorizon())
            ->orderBy('valid_until')
            ->orderBy('id')
            ->get(['id', 'type', 'valid_until'])
            ->map(function (File $document) use ($redator, $today): AlertData {
                $expired = $document->valid_until->isBefore($today);

                return new AlertData(
                    type: $expired
                        ? DashboardAlertType::RedatorDocumentExpired
                        : DashboardAlertType::RedatorDocumentExpiringSoon,
                    severity: $expired
                        ? DashboardSeverity::High
                        : DashboardSeverity::Medium,
                    entity_id: $document->id,
                    description: $expired
                        ? "Documento {$document->type} vencido."
                        : "Documento {$document->type} próximo a vencer.",
                    date: $document->valid_until->toDateString(),
                    navigation: ['redator_id' => $redator->id],
                );
            })
            ->all();
    }

    public function historico(Redator $redator): RedatorHistoricoData
    {
        // Certificado escopado pela TURMA do redator, não por
        // `certificates.redator_id`: `redator_id` guarda quem assinou aquele
        // documento, que é outra pergunta. O eixo de ownership deste dashboard
        // é `turma_redator`, o mesmo dos outros quatro métodos.
        //
        // Conta só `Emitido`: revogado deixou de ser um certificado emitido —
        // é o próprio enum do domínio que responde isso, não uma regra nova. O
        // `where` mora no `Certificate::scopeEmitidos()`, uma definição só para
        // as três leituras que contam emissão (Q-5).
        $certificados = Certificate::query()
            ->emitidos()
            ->whereIn(
                'enrollment_id',
                Enrollment::query()
                    ->select('id')
                    ->whereIn('turma_id', $this->scoped($redator)->select('turmas.id')),
            )
            ->count();

        return new RedatorHistoricoData(
            turmas_concluidas: $this->scoped($redator)
                ->where('status', TurmaStatus::Concluida)
                ->count(),
            certificados_emitidos: $certificados,
        );
    }

    /**
     * @param  Collection<int, Turma>  $turmas
     * @param  callable(Turma): bool  $filter
     * @return RedatorAgendaTurmaData[]
     */
    private function agendaBucket(Collection $turmas, callable $filter): array
    {
        return $turmas
            ->filter($filter)
            ->map(fn (Turma $turma): RedatorAgendaTurmaData => new RedatorAgendaTurmaData(
                turma_id: $turma->id,
                course_name: $turma->course->name,
                start_date: $turma->start_date->toDateString(),
                end_date: $turma->end_date->toDateString(),
            ))
            ->values()
            ->all();
    }

    /** @return Collection<int, Turma> */
    private function turmasEmAndamento(Redator $redator): Collection
    {
        return $this->emAndamento[$redator->id] ??= $this->scoped($redator)
            ->where('status', TurmaStatus::EmAndamento)
            ->with(['documentacaoObrigatoria', 'course'])
            ->orderBy('start_date')
            ->orderBy('id')
            ->get();
    }

    /**
     * A porta única do escopo. Todo caminho de leitura desta classe nasce
     * aqui, para que "só as turmas dele" seja uma propriedade da query e não
     * uma disciplina de quem escreve o método seguinte.
     *
     * @return Builder<Turma>
     */
    private function scoped(Redator $redator): Builder
    {
        return Turma::query()->whereHas(
            'redatores',
            fn (Builder $query): Builder => $query->whereKey($redator->id),
        );
    }
}
