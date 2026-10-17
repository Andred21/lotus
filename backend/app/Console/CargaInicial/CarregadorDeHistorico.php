<?php

namespace App\Console\CargaInicial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Data\Snapshot\CertificateSnapshotData;
use App\Domains\Certification\Data\Snapshot\SnapshotCourseData;
use App\Domains\Certification\Data\Snapshot\SnapshotModuleData;
use App\Domains\Certification\Data\Snapshot\SnapshotPartyData;
use App\Domains\Certification\Data\Snapshot\SnapshotResultData;
use App\Domains\Certification\Data\Snapshot\SnapshotTemplateData;
use App\Domains\Certification\Data\Snapshot\SnapshotTurmaData;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Audit\PivotAudit;
use App\Shared\Support\Rut;
use Illuminate\Support\Str;

/**
 * A segunda metade da carga: orçamentos, cotações, turmas, matrículas e
 * certificados do recorte. O orquestrador abre a transação em volta; esta
 * classe só grava e conta.
 *
 * Cada bloco contorna uma Action do fluxo vivo, e o motivo está ao lado dele
 * (spec §5.1, coluna "Contorna"). O que nenhum bloco contorna: a auditoria.
 * Tudo grava por Eloquent (`new Model` + `forceFill` + `save`), que aceita
 * `created_at`/`updated_at` explícitos e dispara o owen-it; o pivot grava só
 * por `PivotAudit`. Toda data de calendário vira instante por `Instante`,
 * nunca pelo relógio do servidor.
 *
 * Casar com o que já existe nunca altera nada: registro igual é contado como
 * existente, registro diferente vira conflito. Dependência em conflito (cliente
 * nulo, curso, aluno ou redator fora do mapa) pula a entidade sem nova linha: o
 * conflito já foi contado pela etapa que o gerou.
 */
final class CarregadorDeHistorico
{
    /**
     * @param  array<string, mixed>  $carga  o `carga.json` já conferido pelo `ArquivoDeCarga`
     */
    public function carregar(array $carga, Cadastros $cadastros, Contagem $contagem): void
    {
        if ($cadastros->cliente === null) {
            return;
        }

        foreach ($carga['orcamentos'] as $dados) {
            $budget = $this->orcamento($dados, $cadastros->cliente, $contagem);
            $curso = $cadastros->cursos[$dados['cotacao']['curso']] ?? null;

            if ($budget === null || $curso === null) {
                continue;
            }

            $quote = $this->cotacao($dados, $budget, $curso, $contagem);

            if ($quote === null || $dados['turma'] === null) {
                continue;
            }

            $this->turma($dados['turma'], $quote, $cadastros, $contagem);
        }
    }

    /**
     * Contorna `CreateBudgetAction`: o id vem da SCAP do legado, não do
     * autoincremento, e o `code` é o `Scap n` que a Action derivaria dele.
     *
     * @param  array<string, mixed>  $dados
     */
    private function orcamento(array $dados, Client $cliente, Contagem $contagem): ?Budget
    {
        $scap = $dados['scap'];
        $code = "Scap {$scap}";
        $budget = Budget::withTrashed()->find($scap);

        if ($budget !== null) {
            if ($budget->client_id !== $cliente->id || $budget->code !== $code) {
                $contagem->conflito(sprintf('orçamento %s: já existe com outro cliente ou outro código', $code));

                return null;
            }

            $contagem->existente('orcamentos');

            return $budget;
        }

        $quando = Instante::meioDia($dados['data']);
        $budget = new Budget;
        $budget->forceFill([
            'id' => $scap,
            'client_id' => $cliente->id,
            'code' => $code,
            'created_at' => $quando,
            'updated_at' => $quando,
        ])->save();
        $contagem->criado('orcamentos');

        return $budget;
    }

    /**
     * Contorna `CreateQuoteAction` (deriva `seq_in_budget` sob lock) e
     * `ApproveQuoteAction` (aprova com a data de hoje): a cotação nasce já no
     * status final, com `approved_at` na data histórica, e `seq_in_budget = 1`
     * atribuído direto (está fora do fillable).
     *
     * @param  array<string, mixed>  $dados
     */
    private function cotacao(array $dados, Budget $budget, Course $curso, Contagem $contagem): ?Quote
    {
        $cotacao = $dados['cotacao'];
        $status = QuoteStatus::from($cotacao['status']);
        $quote = Quote::withTrashed()->where('budget_id', $budget->id)->where('seq_in_budget', 1)->first();

        if ($quote !== null) {
            if ($quote->course_id !== $curso->id || $quote->status !== $status) {
                $contagem->conflito(sprintf('cotação %s - Cot 1: já existe com outro curso ou outro status', $budget->code));

                return null;
            }

            $contagem->existente('cotacoes');

            return $quote;
        }

        $quando = Instante::meioDia($dados['data']);
        $quote = new Quote;
        $quote->forceFill([
            'budget_id' => $budget->id,
            'course_id' => $curso->id,
            'seq_in_budget' => 1,
            'student_count' => $cotacao['student_count'],
            'value_uf' => $cotacao['value_uf'],
            'status' => $status,
            'approved_at' => $cotacao['approved_on'] === null ? null : Instante::meioDia($cotacao['approved_on']),
            'created_at' => $quando,
            'updated_at' => $quando,
        ])->save();
        $contagem->criado('cotacoes');

        return $quote;
    }

    /**
     * Contorna `CreateTurmaAction` (turma nasce `em_andamento`, datada pelo
     * relógio) e `ConcludeTurmaAction` (RN-16 conclui com a data de hoje): a
     * turma nasce `concluida`, com `concluded_at` no último dia do curso. O
     * redator contorna `DesignateRedatorAction` (RN-09 confere a idoneidade
     * contra a data de hoje): a designação grava só o pivot, por `PivotAudit`.
     *
     * @param  array<string, mixed>  $dados
     */
    private function turma(array $dados, Quote $quote, Cadastros $cadastros, Contagem $contagem): void
    {
        $curso = $cadastros->cursos[$dados['curso']] ?? null;
        $redator = $cadastros->redatores[$dados['redator']] ?? null;

        if ($curso === null || $redator === null) {
            return;
        }

        $turma = Turma::withTrashed()->where('quote_id', $quote->id)->first();

        if ($turma !== null) {
            if ($turma->course_id !== $curso->id || $turma->start_date->toDateString() !== $dados['start_date']) {
                $contagem->conflito(sprintf('turma da cotação %s: já existe com outro curso ou outra data', $quote->code));

                return;
            }

            $contagem->existente('turmas');
        } else {
            $quando = Instante::meioDia($dados['start_date']);
            $turma = new Turma;
            $turma->forceFill([
                'quote_id' => $quote->id,
                'course_id' => $curso->id,
                'modalidade' => TurmaModalidade::Presencial,
                'local_aplicacao' => $dados['local_aplicacao'],
                'start_date' => $dados['start_date'],
                'end_date' => $dados['end_date'],
                'status' => TurmaStatus::Concluida,
                'concluded_at' => Instante::meioDia($dados['end_date']),
                'created_at' => $quando,
                'updated_at' => $quando,
            ])->save();
            PivotAudit::syncWithoutDetaching($turma, 'redatores', [$redator->id]);
            $contagem->criado('turmas');
        }

        foreach ($dados['matriculas'] as $linha) {
            $aluno = $cadastros->alunos[Rut::parse($linha['aluno'])->format()] ?? null;

            if ($aluno === null) {
                continue;
            }

            $enrollment = $this->matricula($linha, $turma, $aluno, $dados['start_date'], $contagem);
            $this->certificado($linha['certificado'], $enrollment, $turma, $curso, $redator, $cadastros, $contagem);
        }
    }

    /**
     * Contorna `ImportStudentsAction` (matricula só em turma `em_andamento`) e
     * o lançamento do resultado acadêmico: a matrícula nasce já com a nota e o
     * `approval_status` da planilha, na data de início da turma.
     *
     * @param  array<string, mixed>  $linha
     */
    private function matricula(array $linha, Turma $turma, Student $aluno, string $inicio, Contagem $contagem): Enrollment
    {
        $enrollment = Enrollment::withTrashed()->where('turma_id', $turma->id)->where('student_id', $aluno->id)->first();

        if ($enrollment !== null) {
            $contagem->existente('matriculas');

            return $enrollment;
        }

        $quando = Instante::meioDia($inicio);
        $enrollment = new Enrollment;
        $enrollment->forceFill([
            'turma_id' => $turma->id,
            'student_id' => $aluno->id,
            'grades' => $linha['nota'] === null ? null : ['final' => $linha['nota']],
            'approval_status' => $linha['approval_status'],
            'attendance_pct' => null,
            'created_at' => $quando,
            'updated_at' => $quando,
        ])->save();
        $contagem->criado('matriculas');

        return $enrollment;
    }

    /**
     * Contorna `IssueCertificateAction`: as portas de elegibilidade e a
     * numeração (`CertificateNumberService`) não valem para um documento que já
     * foi emitido com código próprio. O `codigo` vem da planilha, e a
     * `certificate_sequences` não é tocada. O snapshot nasce da LINHA da
     * planilha (o que foi impresso), não do curso de hoje (spec §6); o que não
     * passa em `isPresentable()` é conflito e não se grava.
     *
     * @param  array<string, mixed>  $dados
     */
    private function certificado(array $dados, Enrollment $enrollment, Turma $turma, Course $curso, Redator $redator, Cadastros $cadastros, Contagem $contagem): void
    {
        $codigo = $dados['codigo'];
        $certificate = Certificate::where('codigo', $codigo)->first();

        if ($certificate !== null) {
            if ($certificate->enrollment_id !== $enrollment->id) {
                $contagem->conflito(sprintf('certificado %s: o código já pertence a outra matrícula', $codigo));

                return;
            }

            $contagem->existente('certificados');

            return;
        }

        if (Certificate::where('enrollment_id', $enrollment->id)->exists()) {
            $contagem->conflito(sprintf('certificado %s: a matrícula já tem certificado com outro código', $codigo));

            return;
        }

        $snapshot = $this->snapshot($dados, $enrollment, $turma, $curso, $redator, $cadastros->cliente);

        if (! $snapshot->isPresentable()) {
            $contagem->conflito(sprintf('certificado %s: o snapshot não é apresentável (aluno ou curso impresso em branco)', $codigo));

            return;
        }

        $quando = Instante::meioDia($dados['emitido_em']);
        $certificate = new Certificate;
        $certificate->forceFill([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $turma->course_id,
            'redator_id' => $redator->id,
            'codigo' => $codigo,
            'snapshot' => $snapshot,
            'valido_ate' => $dados['valido_ate'],
            'status' => CertificateStatus::Emitido,
            'created_at' => $quando,
            'updated_at' => $quando,
        ])->save();
        $contagem->criado('certificados');
    }

    /**
     * O documento da spec §6, da linha da planilha. O `technical_name` fica
     * nulo de propósito: o Blade imprime os dois nomes, e o impresso já é o
     * técnico. Sem versão de template, a cidade é a impressa.
     *
     * @param  array<string, mixed>  $dados
     */
    private function snapshot(array $dados, Enrollment $enrollment, Turma $turma, Course $curso, Redator $redator, Client $cliente): CertificateSnapshotData
    {
        $modulos = $curso->modules()->orderBy('sort_order')->get()
            ->map(fn ($m) => new SnapshotModuleData($m->sort_order, $m->name, $m->contents))
            ->all();

        return new CertificateSnapshotData(
            schema_version: CertificateSnapshotData::CURRENT_VERSION,
            aluno: new SnapshotPartyData($dados['aluno_impresso'], Rut::parse($enrollment->student->user->rut)->format()),
            curso: new SnapshotCourseData($dados['curso_impresso'], null, $dados['horas_impressas'], $curso->description, $modulos),
            turma: new SnapshotTurmaData($turma->id, $turma->start_date->toDateString(), $turma->end_date->toDateString(), TurmaModalidade::Presencial->value),
            cliente: new SnapshotPartyData($dados['cliente_impresso'], $dados['cliente_rut_impresso']),
            emissor: new SnapshotPartyData((string) config('app.certificate_issuer.name'), config('app.certificate_issuer.rut')),
            redator: new SnapshotPartyData($dados['redator_impresso'], $redator->user->rut),
            resultado: new SnapshotResultData($enrollment->grades, $enrollment->approval_status->value, null),
            template: new SnapshotTemplateData(null, $dados['cidade']),
            ciudad_emision: $dados['cidade'],
            emitido_em: $dados['emitido_em'],
        );
    }
}
