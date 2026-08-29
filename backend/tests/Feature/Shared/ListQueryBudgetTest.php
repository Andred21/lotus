<?php

namespace Tests\Feature\Shared;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Closure;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route as RouteFacade;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Role;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Catraca de N+1 por ROTA (spec D9): toda rota `GET api/*` de lista é
 * descoberta no roteador montado, semeada com N=2 e depois com N=20 do
 * agregado dela, e a contagem de queries do request tem de ser a MESMA.
 * Silêncio reprova, como em `ThrottledRouteRatchetTest`: rota nova sem
 * cenário aqui nem motivo em `ISENTAS` é vermelho.
 *
 * Por que contagem e não `preventLazyLoading`: a guarda só marca instância
 * vinda de `hydrate()` com mais de uma linha e não vê query feita NA relação
 * (`TurmaQueryBuilderTest:96`, `EnrollmentResultTest:94`). O
 * `RedatorLoadQuery` que o levantamento apontou como "2 count() por redator"
 * era `count()` de Collection carregada — N+1 se prova por contagem, não por
 * leitura (spec §1).
 *
 * As rotas com parâmetro de rota entram por lista explícita com o pai
 * semeado. `dashboard/metricas` entra por papel, com número fixo: o que a
 * spec pede é que o custo do Dashboard seja conhecido, não só constante.
 */
class ListQueryBudgetTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private const N_PEQUENO = 2;

    private const N_GRANDE = 20;

    /**
     * Rotas `GET api/*` sem parâmetro que NÃO são lista, com o motivo ao lado.
     *
     * @var array<string, string>
     */
    private const ISENTAS = [
        'api/user' => 'devolve o usuário autenticado, um registro — não há N que cresça com o uso',
        'api/me' => 'devolve a sessão corrente (usuário, papel, permissões), um registro por request',
        'api/profile' => 'o perfil de quem está logado: um usuário, os documentos dele são bounded pelo enum',
        'api/permissions' => 'catálogo estático de permissões (PermissionCatalog), não cresce com o uso',
    ];

    /**
     * Rotas com parâmetro de rota que SÃO lista: o pai é semeado uma vez e a
     * chave é o padrão de `$rota->uri()`.
     *
     * @var array<string, string>
     */
    private const COM_PAI = [
        'api/budgets/{budget}/quotes' => 'cotações de um orçamento — cresce com o número de cotações do pai',
        'api/budgets/{budget}/quotes/archived' => 'cotações arquivadas de um orçamento — mesma lista, lado arquivado',
        'api/turmas/{turma}/alunos' => 'matrículas de uma turma — cresce com o número de alunos matriculados',
        'api/turmas/{turma}/alunos/archived' => 'matrículas arquivadas de uma turma — mesma lista, lado arquivado',
        'api/turmas/{turma}/documents' => 'documentos de uma turma — cresce com o número de arquivos anexados',
    ];

    /**
     * Rotas com parâmetro que não são lista, com motivo.
     *
     * @var array<string, string>
     */
    private const COM_PAI_ISENTAS = [
        'api/turmas/{turma}/alunos/preview' => 'pré-visualização de UMA matrícula por RUT (query `rut`), não lista',
        'api/turmas/{turma}/manual' => 'gera um PDF de uma turma — resposta binária, não lista',
        'api/turmas/{turma}/manual/docx' => 'gera um DOCX de uma turma — resposta binária, não lista',
        'api/certificates/{certificate}/pdf' => 'gera o PDF de um certificado — resposta binária',
        'api/publico/certificados/{uuid}' => 'validação pública de UM certificado pelo uuid',
        'api/turmas/{turma}' => 'detalhe de UMA turma — o que cresce ali são as listas aninhadas, cobertas em COM_PAI',
        'api/certificates/{certificate}' => 'detalhe de UM certificado, lido pelo snapshot congelado na emissão',
        'api/courses/{course}' => 'detalhe de UM curso — módulos e templates são coleções bounded do próprio curso',
        'api/clients/{client}' => 'detalhe de UM cliente com seus endereços e contatos, coleções bounded do cadastro',
        'api/budgets/{budget}' => 'detalhe de UM orçamento — as cotações dele têm cenário próprio em COM_PAI',
        'api/quotes/{quote}' => 'detalhe de UMA cotação, com os arquivos anexados a ela',
        'api/redatores/{redator}' => 'detalhe de UM relator, com os documentos dele bounded pelo enum de tipo',
        'api/users/{user}' => 'detalhe de UM usuário do staff, com papel e permissões do catálogo estático',
        'api/students/{student}' => 'detalhe de UM aluno, com o histórico de vínculo com clientes',
    ];

    /**
     * Contagem fixa por papel de `dashboard/metricas`, MEDIDA (não estimada):
     * o admin monta as sete seções do painel inteiro, o relator só as turmas
     * dele. Número diferente aqui é mudança de propósito do endpoint —
     * atualize a constante no mesmo commit que a causou, nunca antes.
     */
    private const DASHBOARD = ['admin' => 40, 'redator' => 7];

    private int $seq = 0;

    private ?int $paiId = null;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-28 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ------------------------------------------------------------ descoberta

    public function test_toda_rota_get_de_lista_tem_cenario_ou_motivo(): void
    {
        $semCobertura = [];

        foreach ($this->rotasGet() as $uri) {
            $comParametro = str_contains($uri, '{');
            $coberta = $comParametro
                ? array_key_exists($uri, self::COM_PAI) || array_key_exists($uri, self::COM_PAI_ISENTAS)
                : array_key_exists($uri, $this->cenarios()) || array_key_exists($uri, self::ISENTAS) || $uri === 'api/dashboard/metricas';

            if (! $coberta) {
                $semCobertura[] = $uri;
            }
        }

        sort($semCobertura);

        $this->assertSame([], $semCobertura, implode("\n", array_merge(
            ['Rota GET api/* sem cenário em ListQueryBudgetTest nem motivo em ISENTAS/COM_PAI_ISENTAS:'],
            $semCobertura,
        )));
    }

    public function test_as_listas_de_isentas_estao_declaradas_com_motivo_e_sem_sobra(): void
    {
        $existentes = $this->rotasGet();

        foreach ([self::ISENTAS, self::COM_PAI, self::COM_PAI_ISENTAS] as $lista) {
            foreach ($lista as $uri => $motivo) {
                $this->assertContains($uri, $existentes, "Declarada e inexistente no roteador: {$uri}.");
                $this->assertGreaterThan(30, strlen(trim($motivo)), "Motivo curto demais para {$uri}.");
            }
        }
    }

    // --------------------------------------------------------------- orçamento

    /** @return array<string, array{0: string}> */
    public static function rotasSemParametro(): array
    {
        return array_map(fn (string $uri) => [$uri], array_combine(array_keys(self::CENARIOS_URIS), array_keys(self::CENARIOS_URIS)));
    }

    #[DataProvider('rotasSemParametro')]
    public function test_a_contagem_de_queries_nao_cresce_com_n(string $uri): void
    {
        $this->actingAsAdmin();
        $semear = $this->cenarios()[$uri];

        $semear(self::N_PEQUENO);
        $this->getJson('/'.$uri)->assertOk();          // aquecimento: cache de permissão, sessão
        $comDois = $this->contar($uri);

        $semear(self::N_GRANDE - self::N_PEQUENO);
        // Aquecimento também DESTE lado: `Role::create` e companhia esvaziam
        // o cache de permissões do spatie, e a recarga (2 queries) apareceria
        // como se a rota crescesse com N. O aquecimento não esconde N+1 — a
        // consulta por linha continua acontecendo na medição.
        $this->getJson('/'.$uri)->assertOk();
        $comVinte = $this->contar($uri);

        $this->assertSame($comDois, $comVinte, sprintf(
            "%s custa %d queries com N=%d e %d com N=%d — há consulta por linha.\nÚltimas queries:\n%s",
            $uri, $comDois, self::N_PEQUENO, $comVinte, self::N_GRANDE, implode("\n", $this->ultimas),
        ));
    }

    /** @return array<string, array{0: string}> */
    public static function rotasComPai(): array
    {
        return array_map(fn (string $uri) => [$uri], array_combine(array_keys(self::COM_PAI), array_keys(self::COM_PAI)));
    }

    #[DataProvider('rotasComPai')]
    public function test_a_contagem_de_queries_das_listas_aninhadas_nao_cresce_com_n(string $padrao): void
    {
        $this->actingAsAdmin();
        [$semearPai, $semearFilhos] = $this->cenariosComPai()[$padrao];

        $semearPai();
        $uri = str_replace(['{budget}', '{turma}'], (string) $this->paiId, $padrao);

        $semearFilhos(self::N_PEQUENO);
        $this->getJson('/'.$uri)->assertOk();
        $comDois = $this->contar($uri);

        $semearFilhos(self::N_GRANDE - self::N_PEQUENO);
        $this->getJson('/'.$uri)->assertOk();
        $comVinte = $this->contar($uri);

        $this->assertSame($comDois, $comVinte, "{$padrao}: {$comDois} queries com N=2, {$comVinte} com N=20.\n".implode("\n", $this->ultimas));
    }

    public function test_dashboard_do_admin_custa_um_numero_fixo(): void
    {
        $this->actingAsAdmin();
        $this->semearDashboard(self::N_PEQUENO);
        $this->getJson('/api/dashboard/metricas')->assertOk()->assertJsonPath('view', 'admin');
        $adminDois = $this->contar('api/dashboard/metricas');
        $this->semearDashboard(self::N_GRANDE - self::N_PEQUENO);
        $this->getJson('/api/dashboard/metricas')->assertOk();
        $adminVinte = $this->contar('api/dashboard/metricas');

        $this->assertSame($adminDois, $adminVinte, 'Dashboard do admin cresce com N.');
        $this->assertSame(self::DASHBOARD['admin'], $adminVinte, "Dashboard do admin custa {$adminVinte} queries; a constante diz ".self::DASHBOARD['admin'].'. Mudou de propósito? Atualize a constante no mesmo commit.');
    }

    /**
     * O relator em teste PRÓPRIO, e não na sequência do admin: a sessão do
     * primeiro autenticado sobrevive dentro do mesmo teste (os requests já
     * feitos deixaram a sessão montada no container), e um segundo `actingAs`
     * não a desfaz — o dashboard voltava `view: admin` com o relator
     * autenticado no processo do teste. Teste novo, app novo, sessão nova.
     */
    public function test_dashboard_do_redator_custa_um_numero_fixo(): void
    {
        $redator = $this->actingAsRedator();
        $this->semearDashboard(self::N_PEQUENO);
        Turma::query()->get()->each(fn (Turma $t) => $t->redatores()->syncWithoutDetaching([$redator->id]));
        $this->getJson('/api/dashboard/metricas')->assertOk()->assertJsonPath('view', 'redator');
        $redatorDois = $this->contar('api/dashboard/metricas');

        $this->semearDashboard(self::N_GRANDE - self::N_PEQUENO);
        Turma::query()->get()->each(fn (Turma $t) => $t->redatores()->syncWithoutDetaching([$redator->id]));
        $this->getJson('/api/dashboard/metricas')->assertOk();
        $redatorVinte = $this->contar('api/dashboard/metricas');

        $this->assertSame($redatorDois, $redatorVinte, 'Dashboard do relator cresce com N.');
        $this->assertSame(self::DASHBOARD['redator'], $redatorVinte, "Dashboard do relator custa {$redatorVinte} queries; a constante diz ".self::DASHBOARD['redator'].'.');
    }

    // ---------------------------------------------------------------- cenários

    /** Só as chaves, para o data provider (estático) — o corpo está em `cenarios()`. */
    private const CENARIOS_URIS = [
        'api/students' => 1, 'api/certificates' => 1, 'api/certificates/emission-panel' => 1,
        'api/turmas' => 1, 'api/turmas/archived' => 1, 'api/turmas/pendientes-configuracion' => 1,
        'api/courses' => 1, 'api/courses/archived' => 1,
        'api/clients' => 1, 'api/clients/archived' => 1,
        'api/budgets' => 1, 'api/budgets/archived' => 1,
        'api/redatores' => 1, 'api/redatores/archived' => 1,
        'api/users' => 1, 'api/users/archived' => 1,
        'api/roles' => 1,
    ];

    /**
     * Cada closure semeia MAIS `$n` exemplares completos do agregado — chamada
     * duas vezes, acumula 2 e depois 20. Cadeias inteiras (cliente→orçamento→
     * cotação→turma→matrícula), porque é a travessia da projeção que custa.
     *
     * @return array<string, Closure(int): void>
     */
    private function cenarios(): array
    {
        return [
            'api/students' => function (int $n): void {
                $client = $this->cliente();
                for ($i = 0; $i < $n; $i++) {
                    Student::create(['user_id' => $this->aluno()->id, 'current_client_id' => $client->id]);
                }
            },
            'api/certificates' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->certificado($this->cadeia());
                }
            },
            'api/certificates/emission-panel' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->cadeia();
                }
            },
            'api/turmas' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->comDocumentos($this->cadeia(concluida: false)->turmaModel());
                }
            },
            'api/turmas/archived' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->comDocumentos($this->cadeia(concluida: false)->turmaModel())->delete();
                }
            },
            'api/turmas/pendientes-configuracion' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->cotacaoAprovadaSemTurma();
                }
            },
            'api/courses' => fn (int $n) => $this->repetir($n, fn () => $this->curso()),
            'api/courses/archived' => fn (int $n) => $this->repetir($n, fn () => $this->curso()->delete()),
            'api/clients' => fn (int $n) => $this->repetir($n, fn () => $this->cliente()),
            'api/clients/archived' => fn (int $n) => $this->repetir($n, fn () => $this->cliente()->delete()),
            'api/budgets' => fn (int $n) => $this->repetir($n, fn () => $this->orcamento()),
            'api/budgets/archived' => fn (int $n) => $this->repetir($n, fn () => $this->orcamento()->delete()),
            'api/redatores' => fn (int $n) => $this->repetir($n, fn () => $this->redator()),
            'api/redatores/archived' => fn (int $n) => $this->repetir($n, fn () => $this->redator()->delete()),
            'api/users' => fn (int $n) => $this->repetir($n, fn () => $this->staff()),
            'api/users/archived' => fn (int $n) => $this->repetir($n, fn () => $this->staff()->delete()),
            'api/roles' => fn (int $n) => $this->repetir($n, fn () => Role::create(['name' => 'papel-'.(++$this->seq), 'guard_name' => 'web'])),
        ];
    }

    /**
     * @return array<string, array{0: Closure(): void, 1: Closure(int): void}>
     */
    private function cenariosComPai(): array
    {
        $orcamento = function (): void {
            $this->paiId = $this->orcamento()->id;
        };
        $turma = function (): void {
            $this->paiId = $this->cadeia(concluida: false)->turmaModel()->id;
        };

        return [
            'api/budgets/{budget}/quotes' => [$orcamento, fn (int $n) => $this->repetir($n, fn () => $this->cotacao(Budget::findOrFail($this->paiId)))],
            'api/budgets/{budget}/quotes/archived' => [$orcamento, fn (int $n) => $this->repetir($n, fn () => $this->cotacao(Budget::findOrFail($this->paiId))->delete())],
            'api/turmas/{turma}/alunos' => [$turma, fn (int $n) => $this->repetir($n, fn () => $this->matricula(Turma::findOrFail($this->paiId)))],
            'api/turmas/{turma}/alunos/archived' => [$turma, fn (int $n) => $this->repetir($n, fn () => $this->matricula(Turma::findOrFail($this->paiId))->delete())],
            'api/turmas/{turma}/documents' => [$turma, fn (int $n) => $this->repetir($n, fn () => $this->documento(Turma::findOrFail($this->paiId)))],
        ];
    }

    private function semearDashboard(int $n): void
    {
        for ($i = 0; $i < $n; $i++) {
            $builder = $this->cadeia();
            $this->certificado($builder);
            $this->comDocumentos($this->cadeia(concluida: false)->turmaModel());
            $this->cotacaoAprovadaSemTurma();
            $builder->redatorModel()->documents()->create([
                'type' => 'REUF', 'path' => 'r.pdf', 'original_name' => 'r.pdf', 'mime' => 'application/pdf', 'size' => 10,
                'valid_until' => '2026-09-10',
            ]);
        }
    }

    // ---------------------------------------------------------------- fixtures

    private function cadeia(bool $concluida = true): IssuableEnrollmentBuilder
    {
        $n = ++$this->seq;
        $pad = str_pad((string) $n, 4, '0', STR_PAD_LEFT);
        $builder = IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => "1.00{$pad}-0"])
            ->course(['name' => "Curso {$n}"])
            ->student(['rut' => "2.00{$pad}-0"])
            ->redatorUser(['rut' => "3.00{$pad}-0"])
            ->turma(['modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago', 'start_date' => '2026-07-20', 'end_date' => '2026-07-24']);

        return ($concluida ? $builder : $builder->turmaNaoConcluida())->create();
    }

    private function certificado(IssuableEnrollmentBuilder $builder): Certificate
    {
        $n = ++$this->seq;

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => 'LOT-2026-'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'snapshot' => ['schema_version' => 2, 'aluno' => ['name' => "Alumno {$n}", 'rut' => null], 'curso' => ['name' => "Curso {$n}"], 'emissor' => ['name' => 'Lotus']],
            'valido_ate' => '2026-09-15',
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }

    private function comDocumentos(Turma $turma): Turma
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->documento($turma, $type->value);
        }

        return $turma;
    }

    private function documento(Turma $turma, string $type = 'MANUAL'): File
    {
        return $turma->files()->create(['type' => $type, 'path' => 'x.pdf', 'original_name' => 'x.pdf', 'mime' => 'application/pdf', 'size' => 10]);
    }

    private function cliente(): Client
    {
        $n = ++$this->seq;

        return $this->makeClientWithUser(['legal_name' => "Cliente {$n} SpA"], ['name' => "Cliente {$n}", 'rut' => '7.'.str_pad((string) $n, 6, '0', STR_PAD_LEFT).'-0']);
    }

    private function curso(): Course
    {
        return $this->makeCourse(['name' => 'Curso '.(++$this->seq)]);
    }

    private function orcamento(): Budget
    {
        $n = ++$this->seq;

        return Budget::create(['client_id' => $this->cliente()->id, 'code' => "Scap {$n}"]);
    }

    private function cotacao(Budget $budget): Quote
    {
        return Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $this->curso()->id,
            'seq_in_budget' => $budget->quotes()->withTrashed()->count() + 1,
            'student_count' => 1, 'value_uf' => 10, 'status' => 'pending',
        ]);
    }

    private function cotacaoAprovadaSemTurma(): Quote
    {
        $quote = $this->cotacao($this->orcamento());
        $quote->forceFill(['status' => 'approved'])->save();

        return $quote;
    }

    private function aluno(): User
    {
        $n = ++$this->seq;

        return User::factory()->aluno()->create(['name' => "Alumno {$n}", 'rut' => '4.'.str_pad((string) $n, 6, '0', STR_PAD_LEFT).'-0']);
    }

    private function matricula(Turma $turma): Enrollment
    {
        $student = Student::create(['user_id' => $this->aluno()->id, 'current_client_id' => $turma->contratanteClient()->id]);

        return Enrollment::create(['turma_id' => $turma->id, 'student_id' => $student->id, 'approval_status' => EnrollmentApprovalStatus::Pendiente]);
    }

    private function redator(): Redator
    {
        $n = ++$this->seq;
        $user = User::factory()->redator()->create(['name' => "Relator {$n}", 'rut' => '5.'.str_pad((string) $n, 6, '0', STR_PAD_LEFT).'-0']);
        $user->loginLogs()->create([]);

        return Redator::create(['user_id' => $user->id]);
    }

    private function staff(): User
    {
        $user = User::factory()->create(['type' => 'admin', 'name' => 'Staff '.(++$this->seq)]);
        $user->loginLogs()->create([]);

        return $user;
    }

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true, 'rut' => '9.999.999-K']);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return Redator::create(['user_id' => $user->id]);
    }

    private function repetir(int $n, Closure $fn): void
    {
        for ($i = 0; $i < $n; $i++) {
            $fn();
        }
    }

    // ----------------------------------------------------------------- medição

    /** @var list<string> */
    private array $ultimas = [];

    private function contar(string $uri): int
    {
        $queries = [];
        $ouvinte = function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        };

        DB::listen($ouvinte);
        $this->getJson('/'.$uri)->assertOk();
        $this->ultimas = $queries;

        return count($queries);
    }

    /** @return list<string> uris `GET api/*` do roteador montado */
    private function rotasGet(): array
    {
        $uris = [];

        /** @var Route $rota */
        foreach (RouteFacade::getRoutes() as $rota) {
            if (in_array('GET', $rota->methods(), true) && str_starts_with($rota->uri(), 'api/')) {
                $uris[] = $rota->uri();
            }
        }

        return array_values(array_unique($uris));
    }
}
