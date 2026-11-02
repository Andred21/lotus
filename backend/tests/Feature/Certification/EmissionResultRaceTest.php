<?php

namespace Tests\Feature\Certification;

use App\Domains\Identity\Models\User;
use Illuminate\Database\Connection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\ProbesMysqlConcurrency;
use Tests\TestCase;

/**
 * P-103: a emissão e a correção do resultado da MESMA matrícula, em processos
 * concorrentes. Antes do bloco 48 só um sentido era protegido: a correção
 * esperava a emissão (via `ResultLock`), mas a emissão decidia a porta 2 e
 * montava o snapshot com a matrícula carregada ANTES da transação — uma
 * correção que commitasse nessa janela deixava sair certificado `aprobado` de
 * um aluno já reprovado, documento de peso legal.
 *
 * O fechamento é a ordem de lock: os DOIS lados releem a matrícula com
 * `lockForUpdate` como primeira coisa da transação, e só depois tocam em
 * `certificates`. Estes casos provam os dois sentidos com o gate segurando o
 * outro lado, e a espera é correlacionada em `enrollments` — não em qualquer
 * tabela — para o teste reprovar quando um dos escritores deixar de pedir o lock.
 *
 * Só MySQL: em sqlite `lockForUpdate()` é no-op e nenhuma serialização é
 * observável (ver `ProbesMysqlConcurrency`).
 */
class EmissionResultRaceTest extends TestCase
{
    use ProbesMysqlConcurrency;
    use RefreshDatabase;

    private const GATE = 'emission_result_race_gate';

    /**
     * Linhas COMMITADAS pela fixture, por tabela. Os processos filhos não
     * enxergam a transação do `RefreshDatabase`, então a fixture nasce na
     * conexão do gate e o `finally` a apaga.
     *
     * @var array<string, list<int>>
     */
    private array $seeded = [];

    public function test_emissao_espera_a_correcao_e_ve_o_resultado_novo(): void
    {
        $this->skipUnlessMysql();

        $gate = $this->mysqlGateConnection(self::GATE);
        $process = null;

        try {
            $fixture = $this->seedCommitted($gate);

            $process = $this->childProcess(<<<'PHP'
$enrollment = App\Domains\Operation\Models\Enrollment::findOrFail((int) $argv[2]);
$redator = App\Domains\Identity\Models\Redator::findOrFail((int) $argv[3]);
try {
    $app->make(App\Domains\Certification\Actions\IssueCertificateAction::class)->execute($enrollment, $redator);
    fwrite(STDOUT, "ISSUED\n");
} catch (Illuminate\Validation\ValidationException $e) {
    fwrite(STDOUT, 'REFUSED '.$e->validator->errors()->first()."\n");
}
PHP, [(string) $fixture['enrollment'], (string) $fixture['redator']]);

            // A correção em curso: o gate já travou a matrícula e gravou o
            // resultado novo, sem commit.
            $gate->beginTransaction();
            $gate->selectOne('SELECT id FROM enrollments WHERE id = ? FOR UPDATE', [$fixture['enrollment']]);
            $gate->update("UPDATE enrollments SET approval_status = 'reprobado' WHERE id = ?", [$fixture['enrollment']]);

            $this->startAndBudget($process);
            $this->waitUntilProcessesAreWaitingForMysqlLock($gate, [$process], 1, 'enrollments');

            $gate->commit();

            $this->assertSame(0, $process->wait(), $process->getErrorOutput());

            $mensagem = __('certification.eligibility.enrollment_not_approved');
            fwrite(STDOUT, "\nmensagem da recusa: {$mensagem}\n");

            $this->assertStringContainsString(
                "REFUSED {$mensagem}",
                $process->getOutput(),
                'a emissão não viu o resultado corrigido: '.$process->getOutput(),
            );
            $this->assertSame(
                0,
                $gate->table('certificates')->where('enrollment_id', $fixture['enrollment'])->count(),
                'saiu certificado de uma matrícula reprovada',
            );
        } finally {
            $this->tearDownProbe($gate, $process);
        }
    }

    public function test_correcao_espera_a_emissao_e_recebe_result_locked(): void
    {
        $this->skipUnlessMysql();

        $gate = $this->mysqlGateConnection(self::GATE);
        $process = null;

        try {
            $fixture = $this->seedCommitted($gate);
            $adminId = $this->seedAdminWithManagePermission($gate);

            $process = $this->childProcess(<<<'PHP'
$enrollment = App\Domains\Operation\Models\Enrollment::findOrFail((int) $argv[2]);
$actor = App\Domains\Identity\Models\User::findOrFail((int) $argv[3]);
$data = new App\Domains\Operation\Data\EnrollmentResultData(
    ['final' => 3.0],
    '50.00',
    App\Domains\Operation\Enums\EnrollmentApprovalStatus::Reprobado,
);
try {
    $app->make(App\Domains\Operation\Actions\RecordEnrollmentResultAction::class)->execute($enrollment, $data, $actor);
    fwrite(STDOUT, "UPDATED\n");
} catch (Illuminate\Validation\ValidationException $e) {
    fwrite(STDOUT, 'REFUSED '.$e->validator->errors()->first()."\n");
}
PHP, [(string) $fixture['enrollment'], (string) $adminId]);

            // A emissão em curso: o gate já travou a matrícula (é o primeiro
            // lock dela) e inseriu o certificado vigente, sem commit.
            $gate->beginTransaction();
            $gate->selectOne('SELECT id FROM enrollments WHERE id = ? FOR UPDATE', [$fixture['enrollment']]);
            $this->insertEmittedCertificate($gate, $fixture);

            $this->startAndBudget($process);
            $this->waitUntilProcessesAreWaitingForMysqlLock($gate, [$process], 1, 'enrollments');

            $gate->commit();

            $this->assertSame(0, $process->wait(), $process->getErrorOutput());
            $this->assertStringContainsString(
                'REFUSED '.__('operation.enrollment.result_locked'),
                $process->getOutput(),
                'a correção passou por cima do certificado emitido: '.$process->getOutput(),
            );
            $this->assertSame(
                'aprobado',
                $gate->table('enrollments')->where('id', $fixture['enrollment'])->value('approval_status'),
                'o resultado mudou apesar do certificado vigente',
            );
        } finally {
            $this->tearDownProbe($gate, $process);
        }
    }

    // ── fixture commitada ───────────────────────────────────────────────────

    /**
     * O cenário "matrícula emitível" pelo builder da suíte, mas gravado na
     * conexão do gate (sem transação): é a única que os filhos enxergam. O
     * builder escreve na conexão padrão, então ela é trocada só durante a
     * criação. A relação de tabelas tocadas vem das linhas que o próprio
     * builder devolve.
     *
     * @return array{enrollment: int, redator: int, course: int}
     */
    private function seedCommitted(Connection $gate): array
    {
        $original = DB::getDefaultConnection();
        DB::setDefaultConnection(self::GATE);

        try {
            $built = IssuableEnrollmentBuilder::make()->create();
        } finally {
            DB::setDefaultConnection($original);
        }

        $enrollment = $built->enrollmentModel();
        $turma = $built->turmaModel();
        $student = $enrollment->student;
        $client = $built->clientModel();
        $quote = $turma->quote;

        $this->seeded = [
            'enrollments' => [$enrollment->id],
            'turma_redator' => [$turma->id],
            'turmas' => [$turma->id],
            'quotes' => [$quote->id],
            'budgets' => [$quote->budget_id],
            'students' => [$student->id],
            'redatores' => [$built->redatorModel()->id],
            'clients' => [$client->id],
            'courses' => [$built->courseModel()->id],
            'users' => [
                $student->user_id,
                $built->redatorModel()->user_id,
                $client->user_id,
            ],
        ];

        return [
            'enrollment' => $enrollment->id,
            'redator' => $built->redatorModel()->id,
            'course' => $built->courseModel()->id,
        ];
    }

    /**
     * Admin mínimo: só a permissão que a correção consulta numa turma
     * concluída. Semear o RBAC inteiro commitaria dezenas de linhas.
     */
    private function seedAdminWithManagePermission(Connection $gate): int
    {
        $userId = $gate->table('users')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'name' => 'SONDA-ADMIN',
            'email' => 'sonda-corrida-emissao@lotus.cl',
            'password' => bin2hex(random_bytes(16)),
            'type' => 'admin',
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->seeded['users'][] = $userId;

        $permissionId = $gate->table('permissions')->insertGetId([
            'name' => 'operation.enrollment.manage',
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->seeded['permissions'] = [$permissionId];

        $gate->table('model_has_permissions')->insert([
            'permission_id' => $permissionId,
            'model_type' => (new User)->getMorphClass(),
            'model_id' => $userId,
        ]);
        $this->seeded['model_has_permissions'] = [$permissionId];

        return $userId;
    }

    /** @param  array{enrollment: int, redator: int, course: int}  $fixture */
    private function insertEmittedCertificate(Connection $gate, array $fixture): void
    {
        $gate->table('certificates')->insert([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $fixture['enrollment'],
            'course_id' => $fixture['course'],
            'redator_id' => $fixture['redator'],
            'codigo' => 'SONDA-'.Str::upper(Str::random(8)),
            'snapshot' => '{}',
            'status' => 'emitido',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function childProcess(string $regiaoCritica, array $args): Process
    {
        return $this->mysqlChildProcess($this->mysqlChildPreamble().$regiaoCritica, $args);
    }

    private function startAndBudget(Process $process): void
    {
        $process->start();

        $this->assertTrue(
            $process->waitUntil(fn (): bool => preg_match($this->mysqlReadyPattern(), $process->getOutput()) === 1),
            "processo não bootou:\nstdout:\n{$process->getOutput()}\nstderr:\n{$process->getErrorOutput()}",
        );

        // Depois do bootstrap, a espera pelo lock ganha orçamento próprio; o
        // idle timeout ainda detecta processo pendurado.
        $process->setTimeout(null);
        $process->setIdleTimeout(60);
    }

    private function tearDownProbe(Connection $gate, ?Process $process): void
    {
        if ($gate->transactionLevel() > 0) {
            $gate->rollBack();
        }

        if ($process !== null && $process->isRunning()) {
            $process->stop();
        }

        $this->cleanSeeded($gate);
        DB::disconnect(self::GATE);
    }

    /**
     * Apaga o que a fixture commitou — e o que o app escreveu por cima dela
     * (certificados, auditoria). FK desligada nesta sessão do gate para não
     * depender da ordem; a tabela é a de um banco de teste dedicado.
     */
    private function cleanSeeded(Connection $gate): void
    {
        if ($this->seeded === []) {
            return;
        }

        $gate->statement('SET FOREIGN_KEY_CHECKS = 0');

        try {
            $gate->table('certificates')->whereIn('enrollment_id', $this->seeded['enrollments'])->delete();

            foreach ($this->seeded as $table => $ids) {
                $column = match ($table) {
                    'turma_redator' => 'turma_id',
                    'model_has_permissions' => 'permission_id',
                    default => 'id',
                };
                $gate->table($table)->whereIn($column, $ids)->delete();
            }

            $gate->table('audits')->delete();
        } finally {
            $gate->statement('SET FOREIGN_KEY_CHECKS = 1');
            $this->seeded = [];
        }
    }
}
