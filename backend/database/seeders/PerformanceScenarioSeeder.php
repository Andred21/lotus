<?php

namespace Database\Seeders;

use App\Domains\Identity\Models\Student;
use App\Shared\Support\Rut;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Cenário de MEDIÇÃO (spec D11): ~5.000 alunos, ~200 clientes, ~50 redatores,
 * ~500 turmas em cinco anos, ~8.000 matrículas, ~6.000 certificados e ~20.000
 * logins. Serve ao `EXPLAIN` e à latência da Task 12 — nunca à suíte, que
 * segue com N pequeno.
 *
 * Duas diferenças deliberadas do `OperationDemoSeeder`:
 *
 * 1. **Insert em lote, não Actions.** 5k `bcrypt` por Action inviabiliza; o
 *    hash de senha é UM, calculado uma vez. Não há evento de model, então não
 *    há auditoria — este dado não tem peso legal, é volume.
 * 2. **Não entra no `DatabaseSeeder`.** Só por comando explícito:
 *    `php artisan db:seed --class=PerformanceScenarioSeeder`.
 *
 * O que NÃO é sintético: todo RUT tem DV válido (módulo 11, pelo `Rut`), toda
 * matrícula tem turma e aluno, todo certificado tem matrícula aprovada de
 * turma concluída e `snapshot` apresentável, todo aluno tem vínculo aberto.
 * As contagens que os endpoints mostram batem com as linhas reais.
 */
class PerformanceScenarioSeeder extends Seeder
{
    private const CLIENTES = 200;

    private const REDATORES = 50;

    private const ALUNOS = 5000;

    private const TURMAS = 500;

    private const ANOS = 5;

    private const LOGINS = 20000;

    private const LOTE = 500;

    private const CURSOS = [
        ['Trabajos en líneas energizadas 220kV', 40],
        ['Seguridad en alta tensión', 24],
        ['Mantenimiento de subestaciones', 32],
        ['Operación de redes de distribución', 16],
        ['Rescate en altura', 8],
    ];

    private const NOMES = ['Camila', 'Matías', 'Valentina', 'Sebastián', 'Javiera', 'Diego', 'Antonia', 'Cristóbal', 'Fernanda', 'Nicolás', 'Catalina', 'Ignacio', 'Josefa', 'Vicente', 'Isidora', 'Tomás', 'Martina', 'Benjamín', 'Sofía', 'Lucas'];

    private const SOBRENOMES = ['Aguilera', 'Bustamante', 'Cárdenas', 'Donoso', 'Escobar', 'Fuenzalida', 'Gallardo', 'Hormazábal', 'Inostroza', 'Jaramillo', 'Lagos', 'Maldonado', 'Navarro', 'Ortega', 'Pizarro', 'Quiroga', 'Riquelme', 'Salazar', 'Toledo', 'Urrutia'];

    public function run(): void
    {
        if (! app()->environment(['local', 'demo'])) {
            $this->command?->warn('PerformanceScenarioSeeder ignorado: só roda em local/demo.');

            return;
        }

        if (Student::query()->withTrashed()->count() > 1000) {
            $this->command?->warn('PerformanceScenarioSeeder ignorado: já há mais de 1.000 alunos. Rode `migrate:fresh --seed` antes.');

            return;
        }

        $inicio = microtime(true);
        $senha = Hash::make('senha123');
        $agora = now()->toDateTimeString();
        $seq = (int) (DB::table('users')->max('id') ?? 0) + 1;

        DB::transaction(function () use ($senha, $agora, &$seq): void {
            $cursos = $this->cursos($agora);
            $clientes = $this->clientes($senha, $agora, $seq);
            $redatores = $this->redatores($senha, $agora, $seq);
            $alunos = $this->alunos($senha, $agora, $seq, $clientes);
            [$turmas, $redatorPorTurma] = $this->turmas($agora, $cursos, $clientes, $redatores);
            $matriculas = $this->matriculas($agora, $turmas, $alunos);
            $this->certificados($agora, $turmas, $matriculas, $redatorPorTurma, $alunos, $cursos);
            $this->logins($agora, $redatores);
        });

        $this->command?->info(sprintf('PerformanceScenarioSeeder: %d alunos, %d turmas, %d matrículas, %d certificados em %.1fs.',
            DB::table('students')->count(), DB::table('turmas')->count(), DB::table('enrollments')->count(), DB::table('certificates')->count(), microtime(true) - $inicio));
    }

    /** @return array<int, array{id: int, workload: int}> */
    private function cursos(string $agora): array
    {
        $ids = [];
        foreach (self::CURSOS as [$name, $workload]) {
            $ids[] = ['id' => DB::table('courses')->insertGetId(['name' => $name, 'workload_hours' => $workload, 'created_at' => $agora, 'updated_at' => $agora]), 'workload' => $workload];
        }

        return $ids;
    }

    /** @return list<int> ids de `clients` */
    private function clientes(string $senha, string $agora, int &$seq): array
    {
        $ids = [];
        for ($i = 1; $i <= self::CLIENTES; $i++) {
            $n = $seq++;
            $userId = DB::table('users')->insertGetId([
                'uuid' => (string) Str::uuid(), 'name' => "Empresa Eléctrica {$i} S.A.", 'rut' => $this->rut(76000000 + $n),
                'email' => "empresa{$n}@perf.demo.cl", 'password' => $senha, 'type' => 'cliente', 'is_active' => false,
                'created_at' => $agora, 'updated_at' => $agora,
            ]);
            $ids[] = DB::table('clients')->insertGetId(['user_id' => $userId, 'legal_name' => "Empresa Eléctrica {$i} S.A.", 'type' => 'client', 'created_at' => $agora, 'updated_at' => $agora]);
        }

        return $ids;
    }

    /** @return list<int> ids de `redatores` */
    private function redatores(string $senha, string $agora, int &$seq): array
    {
        $ids = [];
        $userIds = [];
        for ($i = 1; $i <= self::REDATORES; $i++) {
            $n = $seq++;
            $userId = DB::table('users')->insertGetId([
                'uuid' => (string) Str::uuid(), 'name' => $this->nome($n), 'rut' => $this->rut(15000000 + $n),
                'email' => "relator{$n}@perf.demo.cl", 'password' => $senha, 'type' => 'redator', 'is_active' => true,
                'created_at' => $agora, 'updated_at' => $agora,
            ]);
            $userIds[] = $userId;
            $ids[] = DB::table('redatores')->insertGetId(['user_id' => $userId, 'created_at' => $agora, 'updated_at' => $agora]);
        }

        // A role `redator` é o que abre `GET /api/turmas` (middleware `permission:`);
        // sem ela o cenário mede 403 e não o escopo do `visibleTo`. Insert em lote
        // porque `syncRoles()` por usuário custaria duas queries em cada um.
        $roleId = DB::table('roles')->where('name', 'redator')->value('id');
        if ($roleId !== null) {
            DB::table('model_has_roles')->insert(array_map(
                fn (int $userId) => ['role_id' => $roleId, 'model_type' => 'user', 'model_id' => $userId],
                $userIds,
            ));
        }

        return $ids;
    }

    /**
     * @param  list<int>  $clientes
     * @return list<array{id: int, client_id: int, name: string, rut: string}>
     */
    private function alunos(string $senha, string $agora, int &$seq, array $clientes): array
    {
        $alunos = [];
        $lote = [];
        $primeiroUserId = null;

        for ($i = 1; $i <= self::ALUNOS; $i++) {
            $n = $seq++;
            $lote[] = [
                'uuid' => (string) Str::uuid(), 'name' => $this->nome($n), 'rut' => $this->rut(16000000 + $n),
                'email' => "alumno{$n}@perf.demo.cl", 'password' => $senha, 'type' => 'aluno', 'is_active' => false,
                'created_at' => $agora, 'updated_at' => $agora,
            ];
            if (count($lote) === self::LOTE || $i === self::ALUNOS) {
                DB::table('users')->insert($lote);
                $lote = [];
            }
        }

        // Recupera os ids pelos e-mails sintéticos: insert em lote não devolve ids.
        $users = DB::table('users')->where('email', 'like', 'alumno%@perf.demo.cl')->orderBy('id')->get(['id', 'name', 'rut']);
        $students = [];
        foreach ($users as $k => $user) {
            $students[] = ['user_id' => $user->id, 'current_client_id' => $clientes[$k % count($clientes)], 'created_at' => $agora, 'updated_at' => $agora];
        }
        foreach (array_chunk($students, self::LOTE) as $chunk) {
            DB::table('students')->insert($chunk);
        }

        $rows = DB::table('students')->join('users', 'users.id', '=', 'students.user_id')
            ->where('users.email', 'like', 'alumno%@perf.demo.cl')->orderBy('students.id')
            ->get(['students.id', 'students.current_client_id', 'users.name', 'users.rut']);

        $logs = [];
        foreach ($rows as $row) {
            $alunos[] = ['id' => $row->id, 'client_id' => $row->current_client_id, 'name' => $row->name, 'rut' => $row->rut];
            $logs[] = ['student_id' => $row->id, 'client_id' => $row->current_client_id, 'started_on' => '2021-01-04', 'ended_on' => null, 'created_at' => $agora, 'updated_at' => $agora];
        }
        foreach (array_chunk($logs, self::LOTE) as $chunk) {
            DB::table('student_client_logs')->insert($chunk);
        }

        return $alunos;
    }

    /**
     * Cinco anos de turmas: 100 por ano, 70% concluídas (as do passado), com
     * documentação completa em 60% das em andamento. Cada turma nasce de um
     * orçamento do cliente (um `Scap` por cliente, cotações sequenciais).
     *
     * @param  list<array{id: int, workload: int}>  $cursos
     * @param  list<int>  $clientes
     * @param  list<int>  $redatores
     * @return array{0: list<array{id: int, course_id: int, client_id: int, concluida: bool, end: string}>, 1: array<int, int>}
     */
    private function turmas(string $agora, array $cursos, array $clientes, array $redatores): array
    {
        $orcamentoPorCliente = [];
        $seqPorOrcamento = [];
        $turmas = [];
        $redatorPorTurma = [];
        $porAno = intdiv(self::TURMAS, self::ANOS);

        for ($i = 0; $i < self::TURMAS; $i++) {
            $ano = 2021 + intdiv($i, $porAno) % self::ANOS;
            $dia = 1 + ($i * 7) % 340;
            $inicio = CarbonImmutable::create($ano, 1, 1)->addDays($dia);
            $fim = $inicio->addDays(5);
            $concluida = $fim->lessThan(now()->subDays(14));
            $clientId = $clientes[$i % count($clientes)];
            $curso = $cursos[$i % count($cursos)];

            $budgetId = $orcamentoPorCliente[$clientId] ??= DB::table('budgets')->insertGetId([
                'client_id' => $clientId, 'code' => 'Scap '.(1000 + count($orcamentoPorCliente)), 'payment_terms' => '30 días', 'created_at' => $agora, 'updated_at' => $agora,
            ]);
            $seqPorOrcamento[$budgetId] = ($seqPorOrcamento[$budgetId] ?? 0) + 1;

            $quoteId = DB::table('quotes')->insertGetId([
                'budget_id' => $budgetId, 'course_id' => $curso['id'], 'seq_in_budget' => $seqPorOrcamento[$budgetId],
                'student_count' => 16, 'planned_start_date' => $inicio->toDateString(), 'planned_end_date' => $fim->toDateString(),
                'value_uf' => '120.0000', 'status' => 'approved', 'approved_at' => $inicio->subDays(20)->toDateTimeString(),
                'created_at' => $agora, 'updated_at' => $agora,
            ]);

            $turmaId = DB::table('turmas')->insertGetId([
                'quote_id' => $quoteId, 'course_id' => $curso['id'], 'modalidade' => $i % 3 === 0 ? 'online' : 'presencial',
                'local_aplicacao' => $i % 3 === 0 ? null : 'Santiago', 'start_date' => $inicio->toDateString(), 'end_date' => $fim->toDateString(),
                'status' => $concluida ? 'concluida' : 'em_andamento', 'concluded_at' => $concluida ? $fim->addDay()->toDateTimeString() : null,
                'created_at' => $inicio->subDays(10)->toDateTimeString(), 'updated_at' => $agora,
            ]);

            $redatorId = $redatores[$i % count($redatores)];
            DB::table('turma_redator')->insert(['turma_id' => $turmaId, 'redator_id' => $redatorId, 'created_at' => $agora, 'updated_at' => $agora]);
            $redatorPorTurma[$turmaId] = $redatorId;

            $tipos = $concluida || $i % 5 < 3 ? ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR'] : ['MANUAL'];
            foreach ($tipos as $tipo) {
                DB::table('files')->insert([
                    'fileable_type' => 'turma', 'fileable_id' => $turmaId, 'type' => $tipo, 'path' => "perf/turma-{$turmaId}-{$tipo}.pdf",
                    'original_name' => strtolower($tipo).'.pdf', 'mime' => 'application/pdf', 'size' => 1024, 'created_at' => $agora, 'updated_at' => $agora,
                ]);
            }

            $turmas[] = ['id' => $turmaId, 'course_id' => $curso['id'], 'client_id' => $clientId, 'concluida' => $concluida, 'end' => $fim->toDateString()];
        }

        return [$turmas, $redatorPorTurma];
    }

    /**
     * 16 alunos por turma (≈8.000), sempre alunos do MESMO cliente da turma —
     * o vínculo é a regra de negócio. `aprobado` em 80% das concluídas.
     *
     * @param  list<array{id: int, course_id: int, client_id: int, concluida: bool, end: string}>  $turmas
     * @param  list<array{id: int, client_id: int, name: string, rut: string}>  $alunos
     * @return array<int, list<array{id: int, student_id: int, aprovada: bool}>> turma_id => matrículas
     */
    private function matriculas(string $agora, array $turmas, array $alunos): array
    {
        $porCliente = [];
        foreach ($alunos as $aluno) {
            $porCliente[$aluno['client_id']][] = $aluno['id'];
        }

        $cursor = [];
        $lote = [];
        $chaves = [];
        foreach ($turmas as $turma) {
            $pool = $porCliente[$turma['client_id']];
            $cursor[$turma['client_id']] = $cursor[$turma['client_id']] ?? 0;
            for ($k = 0; $k < 16; $k++) {
                $studentId = $pool[($cursor[$turma['client_id']]++) % count($pool)];
                $aprovada = $turma['concluida'] && $k % 5 !== 0;
                $lote[] = [
                    'turma_id' => $turma['id'], 'student_id' => $studentId,
                    'approval_status' => $turma['concluida'] ? ($aprovada ? 'aprobado' : 'reprobado') : 'pendiente',
                    'attendance_pct' => $turma['concluida'] ? '90.00' : null, 'grades' => $turma['concluida'] ? json_encode(['final' => $aprovada ? 6.0 : 3.5]) : null,
                    'created_at' => $agora, 'updated_at' => $agora,
                ];
                $chaves[] = [$turma['id'], $studentId, $aprovada];
            }
        }
        foreach (array_chunk($lote, self::LOTE) as $chunk) {
            DB::table('enrollments')->insert($chunk);
        }

        $ids = DB::table('enrollments')->orderBy('id')->get(['id', 'turma_id', 'student_id'])->keyBy(fn ($e) => "{$e->turma_id}:{$e->student_id}");
        $resultado = [];
        foreach ($chaves as [$turmaId, $studentId, $aprovada]) {
            $resultado[$turmaId][] = ['id' => $ids["{$turmaId}:{$studentId}"]->id, 'student_id' => $studentId, 'aprovada' => $aprovada];
        }

        return $resultado;
    }

    /**
     * Um certificado por matrícula aprovada de turma concluída (≈6.000), com
     * validade de 24 meses a partir do fim da turma: assim o cenário tem
     * vigentes, por vencer, vencidos — e 5% revogados.
     *
     * @param  list<array{id: int, course_id: int, client_id: int, concluida: bool, end: string}>  $turmas
     * @param  array<int, list<array{id: int, student_id: int, aprovada: bool}>>  $matriculas
     * @param  array<int, int>  $redatorPorTurma
     * @param  list<array{id: int, client_id: int, name: string, rut: string}>  $alunos
     * @param  list<array{id: int, workload: int}>  $cursos
     */
    private function certificados(string $agora, array $turmas, array $matriculas, array $redatorPorTurma, array $alunos, array $cursos): void
    {
        $alunoPorId = array_column($alunos, null, 'id');
        $cursoPorId = array_column(self::CURSOS, 0);
        $lote = [];
        $seq = 0;

        foreach ($turmas as $turma) {
            if (! $turma['concluida']) {
                continue;
            }
            $ano = substr($turma['end'], 0, 4);
            foreach ($matriculas[$turma['id']] ?? [] as $m) {
                if (! $m['aprovada']) {
                    continue;
                }
                $seq++;
                $revogado = $seq % 20 === 0;
                $aluno = $alunoPorId[$m['student_id']];
                $lote[] = [
                    'uuid' => (string) Str::uuid(), 'enrollment_id' => $m['id'], 'course_id' => $turma['course_id'], 'redator_id' => $redatorPorTurma[$turma['id']],
                    'codigo' => sprintf('LOT-%s-%05d', $ano, $seq),
                    'snapshot' => json_encode([
                        'schema_version' => 2,
                        'aluno' => ['name' => $aluno['name'], 'rut' => $aluno['rut']],
                        'curso' => ['name' => $cursoPorId[array_search($turma['course_id'], array_column($cursos, 'id'), true)], 'workload_hours' => 16, 'modules' => []],
                        'emissor' => ['name' => 'Lotus Capacitación'],
                        'turma' => ['id' => $turma['id'], 'end_date' => $turma['end']],
                    ]),
                    'valido_ate' => CarbonImmutable::parse($turma['end'])->addMonths(24)->toDateString(),
                    'status' => $revogado ? 'revocado' : 'emitido',
                    'revoked_at' => $revogado ? $agora : null, 'revocation_reason' => $revogado ? 'Cenário de medição' : null,
                    'created_at' => CarbonImmutable::parse($turma['end'])->addDays(3)->toDateTimeString(), 'updated_at' => $agora,
                ];
            }
        }
        foreach (array_chunk($lote, self::LOTE) as $chunk) {
            DB::table('certificates')->insert($chunk);
        }
    }

    /**
     * Logins dos redatores espalhados por cinco anos — é o que a poda da
     * P-66 varre por `created_at`.
     *
     * @param  list<int>  $redatores
     */
    private function logins(string $agora, array $redatores): void
    {
        $userIds = DB::table('redatores')->whereIn('id', $redatores)->pluck('user_id')->all();
        $lote = [];
        for ($i = 0; $i < self::LOGINS; $i++) {
            $lote[] = [
                'user_id' => $userIds[$i % count($userIds)], 'ip_address' => '10.0.0.'.($i % 250 + 1), 'user_agent' => 'perf',
                'created_at' => now()->subDays($i % (365 * self::ANOS))->toDateTimeString(),
            ];
            if (count($lote) === self::LOTE) {
                DB::table('login_logs')->insert($lote);
                $lote = [];
            }
        }
        if ($lote !== []) {
            DB::table('login_logs')->insert($lote);
        }
    }

    private function nome(int $n): string
    {
        return self::NOMES[$n % count(self::NOMES)].' '.self::SOBRENOMES[intdiv($n, count(self::NOMES)) % count(self::SOBRENOMES)].' '.self::SOBRENOMES[$n % count(self::SOBRENOMES)];
    }

    /** DV calculado pelo validador do projeto — nunca hardcoded (molde `OperationDemoSeeder::rut`). */
    private function rut(int $number): string
    {
        foreach ([...range(0, 9), 'K'] as $dv) {
            $candidate = Rut::parse($number.$dv);
            if ($candidate->isValid()) {
                return $candidate->format();
            }
        }

        throw new \RuntimeException("Nenhum dígito verificador válido para o RUT {$number}.");
    }
}
