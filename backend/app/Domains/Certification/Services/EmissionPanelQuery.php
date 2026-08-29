<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Data\EmissionPanelTurmaData;
use App\Domains\Certification\Enums\EmissionBlockReason;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Support\DataSql;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * A projeção de LISTAGEM da tela de emissão: toda turma concluída, com todos os
 * alunos e o motivo de bloqueio quando existe.
 *
 * Não é uma segunda fonte de verdade sobre quem pode receber certificado — as
 * portas do `CertificateEligibility` continuam donas disso, e o POST continua
 * sendo quem decide. O que este serviço faz é REPORTAR o mesmo motivo, pelo
 * mesmo colaborador (`CertificateTemplateResolver`), para a tela não precisar
 * re-derivar nada: cidade de emissão (porta 5) e redator designado (porta 6)
 * não são deriváveis do payload, e derivá-los no cliente é exatamente o bug que
 * as portas fecharam — a lista promete o que o POST recusa.
 */
class EmissionPanelQuery
{
    /**
     * Default da janela (spec D7): emissão acontece logo depois da conclusão,
     * e turma mais antiga continua alcançável por `concluidas_desde`. O front
     * preenche o seletor com o MESMO número (`emissionWindow.ts`), para a tela
     * mostrar a data antes de o primeiro GET voltar — os dois apontam um para
     * o outro; mudar um sem o outro faz a tela prometer uma janela e a API
     * responder outra.
     */
    public const JANELA_MESES = 12;

    public function __construct(
        private readonly CertificateTemplateResolver $templates,
        private readonly CertificateVigenciaResolver $vigencia,
    ) {}

    /** @return array<EmissionPanelTurmaData> */
    public function get(CarbonImmutable $desde): array
    {
        $templates = $this->templates->latestByCourse();

        $turmas = Turma::query()
            ->where('status', TurmaStatus::Concluida)
            // A janela (spec D7). `DataSql::literal`, não `whereDate`: o
            // `DATE(end_date)` que `whereDate` gera cega o índice candidato
            // `turmas(status, end_date)` da Task 12, e o literal cru erra a
            // borda no sqlite da suíte.
            ->where('end_date', '>=', DataSql::literal(Turma::query()->getModel()->getConnection(), $desde))
            ->with([
                'course',
                // `.client.user`, não só `.client`: o seam `Turma::contratante()`
                // lê o RUT do User do contratante (B4). Parar em `.client` deixa
                // um SELECT por turma — guarda em `ContratanteEagerLoadTest`.
                'quote.budget.client.user',
                'redatores.user',
                // `withListingData()` e não `with('student.user')`: a lista do
                // que a projeção de matrícula carrega é do `EnrollmentQueryBuilder`.
                // `orderByStudentName()` pelo mesmo motivo — a travessia
                // matrícula→aluno→user é de Operation, e ordenar no ORDER BY do
                // eager-load não custa consulta nenhuma a mais.
                'enrollments' => fn ($query) => $query->withListingData()->orderByStudentName(),
            ])
            ->orderByDesc('end_date')
            // Desempate: turmas concluídas no mesmo dia sairiam em ordem
            // indefinida do banco e podiam trocar de posição entre dois
            // requests da mesma tela. `id` desc mantém a mais recente no topo.
            ->orderByDesc('id')
            ->get();

        $vigentes = $this->certificadosVigentes($turmas);

        return $turmas
            ->map(function (Turma $turma) use ($templates, $vigentes): EmissionPanelTurmaData {
                $template = $templates->get($turma->course_id);

                return EmissionPanelTurmaData::fromModel(
                    $turma,
                    $template,
                    $this->emissionBlockedFor($turma, $template),
                    $vigentes,
                );
            })
            ->all();
    }

    /**
     * Por que a emissão recusaria esta turma inteira, ou `null`. A ordem é a das
     * portas 4→5→6: sem template não há cidade que valha, e sem cidade o redator
     * não salva o documento.
     *
     * As portas por MATRÍCULA (aprovação, certificado vigente) não entram aqui —
     * elas são visíveis linha a linha, em `approval_status` e `certificate`.
     */
    private function emissionBlockedFor(Turma $turma, ?CourseCertificateTemplate $template): ?EmissionBlockReason
    {
        if ($template === null) {
            return EmissionBlockReason::SinPlantilla;
        }

        if ($this->templates->emissionCityFor($turma, $template) === null) {
            return EmissionBlockReason::PlantillaSinCiudad;
        }

        if ($turma->redatores->isEmpty()) {
            return EmissionBlockReason::SinRedactor;
        }

        return null;
    }

    /**
     * Os certificados vigentes de TODAS as matrículas da página, numa consulta
     * só. Resolver por turma devolveria o N+1 numa tela que lista o histórico
     * inteiro de turmas concluídas.
     *
     * O critério de "vigente" NÃO mora aqui: é do `CertificateVigenciaResolver`,
     * o mesmo que a porta 3 do `CertificateEligibility` consulta. Reimplementá-lo
     * era a terceira cópia da regra — e no dia em que "vigente" passar a incluir
     * a validade, o painel exibiria como atual um certificado que o POST já
     * considera vencido.
     *
     * @param  Collection<int, Turma>  $turmas
     * @return Collection<int, Certificate> keyBy `enrollment_id`
     */
    private function certificadosVigentes(Collection $turmas): Collection
    {
        $enrollmentIds = $turmas
            ->flatMap(fn (Turma $turma) => $turma->enrollments->pluck('id'))
            ->all();

        return $this->vigencia->byEnrollment($enrollmentIds);
    }
}
