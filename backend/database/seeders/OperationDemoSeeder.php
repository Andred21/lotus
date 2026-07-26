<?php

namespace Database\Seeders;

use App\Domains\Catalog\Actions\CreateCourseAction;
use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Actions\ApproveQuoteAction;
use App\Domains\Commercial\Actions\CreateBudgetAction;
use App\Domains\Commercial\Actions\CreateClientAction;
use App\Domains\Commercial\Actions\CreateQuoteAction;
use App\Domains\Commercial\Actions\RejectQuoteAction;
use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Actions\ConcludeTurmaAction;
use App\Domains\Operation\Actions\CreateTurmaAction;
use App\Domains\Operation\Actions\DesignateRedatorAction;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Models\Turma;
use App\Shared\Support\Rut;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Cenário operacional ponta a ponta para dar realidade à UI do módulo Operação
 * (spec `2026-07-21-bloco6-frontend-operacao-design.md` §7). SÓ RODA EM
 * local/demo — nunca em produção.
 *
 * Duas regras governam este seeder:
 *
 * 1. **Zero dado órfão.** Toda turma tem cliente, curso, orçamento, cotação
 *    aprovada de origem, alunos matriculados e (salvo o caso deliberado
 *    "sin asignar") redator idôneo. Todo aluno tem RUT válido e vínculo aberto
 *    com o cliente da cotação. Todo redator tem REUF válido e habilitação nos
 *    cursos que conduz. As contagens que a UI mostra batem com as linhas reais.
 *
 * 2. **Passa pelas Actions do domínio, não pelo Eloquent cru.** O cenário nasce
 *    pelos mesmos caminhos de escrita da aplicação (`CreateClientAction`,
 *    `CreateQuoteAction`, `CreateTurmaAction`, `EnrollStudentAction`, ...), com
 *    os DTOs hidratados por `validateAndCreate` — a validação (inclusive
 *    `ValidRut`) roda de verdade. Dado que não passa pelo gate do domínio não
 *    entra aqui. Exceção declarada: `enrollments.approval_status` é escrito
 *    direto no model porque o endpoint de resultado acadêmico é da sprint do
 *    redator e ainda não existe; `grades`/`attendance_pct` ficam NULL de
 *    propósito (não se inventa registro acadêmico com peso legal).
 */
class OperationDemoSeeder extends Seeder
{
    /** Cursos, na ordem em que aparecem no protótipo. Chave = apelido interno. */
    private const COURSES = [
        'lineas220' => [
            'name' => 'Trabajos en líneas energizadas 220kV',
            'technical_name' => 'Trabajos en líneas energizadas de alta tensión 220kV',
            'description' => 'Capacitación para intervención de líneas energizadas de 220kV: procedimientos, distancias de seguridad y uso de equipamiento de alta tensión.',
            'workload_hours' => 40,
            'modules' => [
                ['name' => 'Marco normativo y análisis de riesgo', 'theory_hours' => 8, 'practice_hours' => 4],
                ['name' => 'Equipamiento y distancias de seguridad', 'theory_hours' => 6, 'practice_hours' => 10],
                ['name' => 'Maniobras en línea energizada', 'theory_hours' => 4, 'practice_hours' => 8],
            ],
        ],
        'seguridad' => [
            'name' => 'Seguridad en alta tensión',
            'technical_name' => 'Seguridad aplicada a instalaciones de alta tensión',
            'description' => 'Fundamentos de seguridad eléctrica en instalaciones de alta tensión: bloqueo, señalización y respuesta a emergencias.',
            'workload_hours' => 24,
            'modules' => [
                ['name' => 'Riesgo eléctrico y bloqueo/etiquetado', 'theory_hours' => 8, 'practice_hours' => 4],
                ['name' => 'Respuesta a emergencias eléctricas', 'theory_hours' => 4, 'practice_hours' => 8],
            ],
        ],
        'mantenimiento' => [
            'name' => 'Mantenimiento de subestaciones',
            'technical_name' => 'Mantenimiento preventivo y correctivo de subestaciones eléctricas',
            'description' => 'Mantenimiento preventivo y correctivo de subestaciones: inspección de equipos, ensayos y puesta en servicio.',
            'workload_hours' => 32,
            'modules' => [
                ['name' => 'Topología y equipos de subestación', 'theory_hours' => 6, 'practice_hours' => 4],
                ['name' => 'Ensayos y mediciones en terreno', 'theory_hours' => 4, 'practice_hours' => 8],
                ['name' => 'Puesta en servicio y registro', 'theory_hours' => 4, 'practice_hours' => 6],
            ],
        ],
    ];

    /**
     * Redatores. `courses` fecha as contagens de habilitação do protótipo:
     * lineas220 = 3 · seguridad = 5 · mantenimiento = 2.
     * Os `rut` são só o NÚMERO — o dígito verificador é calculado (ver rut()).
     */
    private const REDATORES = [
        ['name' => 'Juan Morales',   'rut' => 15100001, 'courses' => ['lineas220', 'seguridad']],
        ['name' => 'Pedro Soto',     'rut' => 15100002, 'courses' => ['mantenimiento', 'seguridad']],
        ['name' => 'Ana Reyes',      'rut' => 15100003, 'courses' => ['seguridad', 'lineas220']],
        ['name' => 'Carlos Fuentes', 'rut' => 15100004, 'courses' => ['lineas220']],
        ['name' => 'Marcela Rojas',  'rut' => 15100005, 'courses' => ['mantenimiento']],
        ['name' => 'Rodrigo Vargas', 'rut' => 15100006, 'courses' => ['seguridad']],
        ['name' => 'Ignacio Pérez',  'rut' => 15100007, 'courses' => ['seguridad']],
    ];

    /**
     * Clientes. `students` = quantos alunos o cliente tem (e, por construção,
     * quantos entram na turma dele). `rut` é só o número (DV calculado).
     */
    private const CLIENTS = [
        'norte' => [
            'name' => 'Subestación Norte S.A.',
            'rut' => 76123456,
            'domain' => 'subestacionnorte',
            'business_activity' => 'Transmisión y operación de subestaciones eléctricas',
            'students' => 12,
            'address' => [
                'line1' => 'Avenida Balmaceda', 'number' => '2450',
                'commune' => 'Antofagasta', 'city' => 'Antofagasta',
                'region' => 'Antofagasta', 'zip_code' => '1240000',
            ],
            'contacts' => [
                ['name' => 'Marcela Herrera', 'job_title' => 'Jefa de Capacitación', 'is_primary' => true],
                ['name' => 'Rodrigo Cáceres', 'job_title' => 'Prevención de Riesgos', 'is_primary' => false],
            ],
        ],
        'transelec' => [
            'name' => 'Transelec',
            'rut' => 78987654,
            'domain' => 'transelec',
            'business_activity' => 'Transmisión de energía eléctrica de alta tensión',
            'students' => 8,
            'address' => [
                'line1' => 'Avenida Providencia', 'number' => '1760',
                'commune' => 'Providencia', 'city' => 'Santiago',
                'region' => 'Metropolitana de Santiago', 'zip_code' => '7500000',
            ],
            'contacts' => [
                ['name' => 'Andrés Villalobos', 'job_title' => 'Gerente de Operaciones', 'is_primary' => true],
                ['name' => 'Paula Sepúlveda', 'job_title' => 'Capacitación y Desarrollo', 'is_primary' => false],
                ['name' => 'Cristián Muñoz', 'job_title' => 'Jefe de Mantenimiento', 'is_primary' => false],
            ],
        ],
        'enel' => [
            'name' => 'Enel Distribución',
            'rut' => 77555333,
            'domain' => 'eneldistribucion',
            'business_activity' => 'Distribución de energía eléctrica',
            'students' => 15,
            'address' => [
                'line1' => 'Avenida Santa Rosa', 'number' => '340',
                'commune' => 'Santiago', 'city' => 'Santiago',
                'region' => 'Metropolitana de Santiago', 'zip_code' => '8330000',
            ],
            'contacts' => [
                ['name' => 'Carolina Bravo', 'job_title' => 'Coordinadora de Formación', 'is_primary' => true],
            ],
        ],
        'cge' => [
            'name' => 'CGE',
            'rut' => 76555111,
            'domain' => 'cge',
            'business_activity' => 'Distribución de energía eléctrica',
            'students' => 10,
            'address' => [
                'line1' => 'Avenida Vicuña Mackenna', 'number' => '1370',
                'commune' => 'Ñuñoa', 'city' => 'Santiago',
                'region' => 'Metropolitana de Santiago', 'zip_code' => '7770000',
            ],
            'contacts' => [
                ['name' => 'Felipe Cárdenas', 'job_title' => 'Jefe de Personas', 'is_primary' => true],
            ],
        ],
    ];

    /**
     * Orçamentos e cotações. `quotes[].status` = estado final desejado; a
     * cotação sempre nasce `pending` pela Action e é movida por
     * Approve/RejectQuoteAction. `turma` (quando presente) é a turma que
     * nasce dessa cotação; ausente = cotação aprovada SEM turma, que alimenta
     * o painel "Cotizaciones aprobadas pendientes de configuración".
     */
    private const BUDGETS = [
        // Orçamento de exemplo do protótipo: 3 cotações, uma de cada estado.
        [
            'client' => 'norte',
            'payment_terms' => '30 días contra factura',
            'quotes' => [
                ['course' => 'lineas220', 'students' => 12, 'start' => '2026-06-10', 'end' => '2026-06-14', 'value_uf' => '120.0000', 'purchase_order' => 'OC-2026-0451', 'status' => 'approved'],
                ['course' => 'mantenimiento', 'students' => 8, 'start' => '2026-06-20', 'end' => '2026-06-22', 'value_uf' => '80.0000', 'purchase_order' => null, 'status' => 'rejected'],
                ['course' => 'seguridad', 'students' => 15, 'start' => '2026-07-06', 'end' => '2026-07-10', 'value_uf' => '250.0000', 'purchase_order' => null, 'status' => 'pending'],
            ],
        ],
        // 2ª cotação aprovada sem turma (painel de pendentes, linha 2).
        [
            'client' => 'transelec',
            'payment_terms' => '30 días contra factura',
            'quotes' => [
                ['course' => 'mantenimiento', 'students' => 8, 'start' => '2026-06-24', 'end' => '2026-06-26', 'value_uf' => '80.0000', 'purchase_order' => 'OC-2026-0473', 'status' => 'approved'],
            ],
        ],
        // Origem da turma "TR-45" do protótipo.
        [
            'client' => 'norte',
            'payment_terms' => '50% anticipo, 50% al cierre',
            'quotes' => [
                [
                    'course' => 'lineas220', 'students' => 12, 'start' => '2026-07-20', 'end' => '2026-08-14',
                    'value_uf' => '120.0000', 'purchase_order' => 'OC-2026-0512', 'status' => 'approved',
                    'turma' => [
                        'modalidade' => 'presencial',
                        'local_aplicacao' => 'Subestación Norte — Patio de maniobras 220kV, Antofagasta',
                        'redator' => 'Juan Morales',
                        'documents' => ['MANUAL'],
                        'conclude' => false,
                        'approval' => ['pendiente' => 12],
                    ],
                ],
            ],
        ],
        // Origem da turma "TR-44": habilitada (documentação 3/3, derivada).
        [
            'client' => 'transelec',
            'payment_terms' => '30 días contra factura',
            'quotes' => [
                [
                    'course' => 'mantenimiento', 'students' => 8, 'start' => '2026-07-13', 'end' => '2026-08-07',
                    'value_uf' => '80.0000', 'purchase_order' => 'OC-2026-0520', 'status' => 'approved',
                    'turma' => [
                        'modalidade' => 'presencial',
                        'local_aplicacao' => 'Transelec — Centro de Entrenamiento, Providencia, Santiago',
                        'redator' => 'Pedro Soto',
                        'documents' => ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR'],
                        'conclude' => false,
                        'approval' => ['pendiente' => 6, 'aprobado' => 1, 'reprobado' => 1],
                    ],
                ],
            ],
        ],
        // Origem da turma "TR-43": online e concluída.
        [
            'client' => 'enel',
            'payment_terms' => '45 días contra factura',
            'quotes' => [
                [
                    'course' => 'seguridad', 'students' => 15, 'start' => '2026-06-01', 'end' => '2026-06-26',
                    'value_uf' => '250.0000', 'purchase_order' => 'OC-2026-0388', 'status' => 'approved',
                    'turma' => [
                        'modalidade' => 'online',
                        'local_aplicacao' => null,
                        'redator' => 'Ana Reyes',
                        // PRUEBAS repetido: N arquivos por tipo (6d/D8) — as provas
                        // dos alunos são plural real.
                        'documents' => ['MANUAL', 'PRUEBAS', 'PRUEBAS', 'EVALUACION_REDATOR'],
                        'conclude' => true,
                        'approval' => ['aprobado' => 13, 'reprobado' => 2],
                    ],
                ],
            ],
        ],
        // Origem da turma "TR-42": em curso e SEM redator designado.
        [
            'client' => 'cge',
            'payment_terms' => '30 días contra factura',
            'quotes' => [
                [
                    'course' => 'lineas220', 'students' => 10, 'start' => '2026-07-06', 'end' => '2026-07-31',
                    'value_uf' => '100.0000', 'purchase_order' => 'OC-2026-0499', 'status' => 'approved',
                    'turma' => [
                        'modalidade' => 'presencial',
                        'local_aplicacao' => 'CGE — Recinto de capacitación Ñuñoa, Santiago',
                        'redator' => null,   // "— Sin asignar" no hub, de propósito
                        'documents' => ['MANUAL', 'PRUEBAS'],
                        'conclude' => false,
                        'approval' => ['pendiente' => 10],
                    ],
                ],
            ],
        ],
    ];

    /** Pools de nome de aluno (15 × 12 = 180 combinações; usamos 45, todas distintas). */
    private const STUDENT_FIRST_NAMES = [
        'Camila', 'Matías', 'Valentina', 'Sebastián', 'Javiera', 'Diego', 'Antonia',
        'Cristóbal', 'Fernanda', 'Nicolás', 'Catalina', 'Ignacio', 'Josefa', 'Vicente', 'Isidora',
    ];

    private const STUDENT_LAST_NAMES = [
        'Aguilera', 'Bustamante', 'Cárdenas', 'Donoso', 'Escobar', 'Fuenzalida',
        'Gallardo', 'Hormazábal', 'Inostroza', 'Jaramillo', 'Lagos', 'Maldonado',
    ];

    /** Primeiro RUT (número) da faixa sintética de alunos; incrementa de 1 em 1. */
    private const STUDENT_RUT_BASE = 16200001;

    public function run(): void
    {
        if (! app()->environment(['local', 'demo'])) {
            $this->command?->warn('OperationDemoSeeder ignorado: só roda em local/demo.');

            return;
        }

        if (Client::query()->withTrashed()->exists()) {
            $this->command?->warn('OperationDemoSeeder ignorado: já existem clientes. Rode `migrate:fresh --seed` para recriar o cenário.');

            return;
        }

        // O DatabaseSeeder usa WithoutModelEvents, e isso zera o dispatcher de
        // model para TODA a árvore de seeders que ele chama. Este cenário DEPENDE
        // dos eventos: `User::creating` gera o `uuid` (NOT NULL UNIQUE) e o
        // owen-it grava a auditoria. Religamos só no escopo deste seeder e
        // devolvemos o dispatcher anterior no finally.
        $previous = Model::getEventDispatcher();
        Model::setEventDispatcher(app('events'));

        try {
            DB::transaction(fn () => $this->seed());
        } finally {
            $previous === null
                ? Model::unsetEventDispatcher()
                : Model::setEventDispatcher($previous);
        }

        $this->command?->info('OperationDemoSeeder: cenário operacional criado.');
    }

    private function seed(): void
    {
        $courses = $this->seedCourses();
        $this->seedRedatores($courses);
        $clients = $this->seedClients();
        $this->seedBudgets($clients, $courses);
    }

    /** @return array<string,Course> */
    private function seedCourses(): array
    {
        $action = app(CreateCourseAction::class);
        $courses = [];

        foreach (self::COURSES as $key => $spec) {
            $courses[$key] = $action->execute(CourseData::validateAndCreate([
                'name' => $spec['name'],
                'technical_name' => $spec['technical_name'],
                'description' => $spec['description'],
                'workload_hours' => $spec['workload_hours'],
                'modules' => $spec['modules'],
            ]));
        }

        return $courses;
    }

    /**
     * Redator = User + habilitação a cursos + REUF com validade futura (o gate
     * RN-09 do `RedatorIdoneidadeService` exige REUF não vencido).
     *
     * @param  array<string,Course>  $courses
     */
    private function seedRedatores(array $courses): void
    {
        $create = app(CreateRedatorAction::class);
        $storeDocument = app(StoreRedatorDocumentAction::class);

        foreach (self::REDATORES as $spec) {
            $redator = $create->execute(RedatorData::validateAndCreate([
                'name' => $spec['name'],
                'rut' => $this->rut($spec['rut']),
                'email' => $this->email($spec['name'], 'lotus.cl'),
                'phone' => $this->phone($spec['rut']),
                'course_ids' => array_map(fn (string $c) => $courses[$c]->id, $spec['courses']),
            ]));

            $storeDocument->execute(
                $redator,
                RedatorDocumentType::REUF,
                $this->pdf('reuf-'.Str::slug($spec['name']).'.pdf', 'REUF — '.$spec['name']),
                now()->addYears(2)->startOfDay(),
            );
        }
    }

    /**
     * Cliente + endereço principal + contatos, e os alunos do cliente. Os alunos
     * NÃO são criados aqui: eles nascem na matrícula, pelo `StudentResolver`
     * (fonte única do vínculo RN-10). Aqui só se fixa a lista nominal.
     *
     * @return array<string,Client>
     */
    private function seedClients(): array
    {
        $action = app(CreateClientAction::class);
        $clients = [];

        foreach (self::CLIENTS as $key => $spec) {
            $clients[$key] = $action->execute(ClientData::validateAndCreate([
                // `name` (usuário-empresa) e `legal_name` (razón social) recebem o
                // mesmo texto do protótipo de propósito: a UI de Operação lê
                // `legal_name` (TurmaData::$client_name) e a de Cadastros lê `name`.
                'name' => $spec['name'],
                'legal_name' => $spec['name'],
                'rut' => $this->rut($spec['rut']),
                'email' => 'contacto@'.$spec['domain'].'.demo.cl',
                'phone' => $this->phone($spec['rut']),
                'type' => 'client',
                'business_activity' => $spec['business_activity'],
                'addresses' => [$spec['address'] + ['is_primary' => true]],
                'contacts' => array_map(fn (array $c, int $i) => $c + [
                    'email' => $this->email($c['name'], $spec['domain'].'.demo.cl'),
                    'phone' => $this->phone($spec['rut'] + $i + 1),
                ], $spec['contacts'], array_keys($spec['contacts'])),
            ]));
        }

        return $clients;
    }

    /**
     * @param  array<string,Client>  $clients
     * @param  array<string,Course>  $courses
     */
    private function seedBudgets(array $clients, array $courses): void
    {
        $createBudget = app(CreateBudgetAction::class);
        $createQuote = app(CreateQuoteAction::class);
        $approve = app(ApproveQuoteAction::class);
        $reject = app(RejectQuoteAction::class);

        // Cursor de nome/RUT de aluno por cliente: garante que cada aluno é
        // criado uma única vez e sempre sob o cliente certo.
        $studentCursor = 0;

        foreach (self::BUDGETS as $spec) {
            $client = $clients[$spec['client']];

            $budget = $createBudget->execute(BudgetData::validateAndCreate([
                'client_id' => $client->id,
                'payment_terms' => $spec['payment_terms'],
            ]));

            foreach ($spec['quotes'] as $quoteSpec) {
                $quote = $createQuote->execute($budget, QuoteData::validateAndCreate([
                    'course_id' => $courses[$quoteSpec['course']]->id,
                    'student_count' => $quoteSpec['students'],
                    'value_uf' => $quoteSpec['value_uf'],
                    'purchase_order' => $quoteSpec['purchase_order'],
                    'planned_start_date' => $quoteSpec['start'],
                    'planned_end_date' => $quoteSpec['end'],
                ]));

                match ($quoteSpec['status']) {
                    'approved' => $approve->execute($quote),
                    'rejected' => $reject->execute($quote),
                    'pending' => null,
                };

                if (! isset($quoteSpec['turma'])) {
                    continue;
                }

                $this->seedTurma(
                    $quote->refresh(),
                    $quoteSpec,
                    $spec['client'],
                    $studentCursor,
                );
            }
        }
    }

    /**
     * Turma completa: configuração a partir da cotação aprovada, redator
     * idôneo (quando houver), alunos matriculados, documentos e conclusão.
     *
     * @param  array<string,mixed>  $quoteSpec
     * @param  int  $studentCursor  índice global do próximo aluno (por referência)
     */
    private function seedTurma(Quote $quote, array $quoteSpec, string $clientKey, int &$studentCursor): void
    {
        $spec = $quoteSpec['turma'];

        $turma = app(CreateTurmaAction::class)->execute($quote, TurmaData::validateAndCreate([
            'modalidade' => $spec['modalidade'],
            'local_aplicacao' => $spec['local_aplicacao'],
            'start_date' => $quoteSpec['start'],
            'end_date' => $quoteSpec['end'],
        ]));

        if ($spec['redator'] !== null) {
            app(DesignateRedatorAction::class)->execute($turma, $this->redatorByName($spec['redator']));
        }

        $this->enroll($turma, $quoteSpec['students'], $clientKey, $spec['approval'], $studentCursor);
        $this->attachDocuments($turma, $spec['documents']);

        if ($spec['conclude']) {
            app(ConcludeTurmaAction::class)->execute($turma);
        }
    }

    /**
     * Matricula `$count` alunos novos na turma pela Action real (que provisiona
     * o User, cria o Student e abre o vínculo com o cliente da cotação), e
     * distribui os `approval_status` pedidos pela spec.
     *
     * @param  array<string,int>  $approval  valor de EnrollmentApprovalStatus => quantos
     */
    private function enroll(Turma $turma, int $count, string $clientKey, array $approval, int &$studentCursor): void
    {
        if (array_sum($approval) !== $count) {
            throw new RuntimeException("Turma da cotação {$turma->quote_id}: a soma de approval_status (".array_sum($approval).") não fecha com os {$count} alunos contratados.");
        }

        $domain = self::CLIENTS[$clientKey]['domain'].'.demo.cl';
        $enroll = app(EnrollStudentAction::class);
        $enrollments = [];

        for ($i = 0; $i < $count; $i++) {
            $index = $studentCursor++;
            $name = self::STUDENT_FIRST_NAMES[$index % count(self::STUDENT_FIRST_NAMES)]
                .' '.self::STUDENT_LAST_NAMES[$index % count(self::STUDENT_LAST_NAMES)];

            $enrollments[] = $enroll->execute(
                $turma,
                $this->rut(self::STUDENT_RUT_BASE + $index),
                $name,
                $this->email($name, $domain),
                $this->phone(self::STUDENT_RUT_BASE + $index),
            )->enrollment;
        }

        // approval_status direto no model: o endpoint de resultado acadêmico é
        // da sprint do redator. `grades`/`attendance_pct` ficam NULL — não se
        // inventa registro acadêmico com peso legal (RN-16).
        $offset = 0;
        foreach ($approval as $status => $quantity) {
            foreach (array_slice($enrollments, $offset, $quantity) as $enrollment) {
                $enrollment->update(['approval_status' => EnrollmentApprovalStatus::from($status)]);
            }
            $offset += $quantity;
        }
    }

    /** @param  array<string>  $types  valores de TurmaDocumentType (repetíveis — N arquivos por tipo) */
    private function attachDocuments(Turma $turma, array $types): void
    {
        $action = app(StoreTurmaDocumentAction::class);
        $seen = [];

        foreach ($types as $value) {
            $type = TurmaDocumentType::from($value);
            $seen[$value] = ($seen[$value] ?? 0) + 1;
            $suffix = $seen[$value] > 1 ? '-'.$seen[$value] : '';

            $action->execute(
                $turma,
                $type,
                $this->pdf(
                    Str::slug($value).$suffix.'-turma-'.$turma->id.'.pdf',
                    $value.' — '.$turma->course->name.' ('.$turma->quote->code.')',
                ),
            );
        }
    }

    private function redatorByName(string $name): Redator
    {
        return Redator::query()
            ->whereHas('user', fn ($q) => $q->where('name', $name))
            ->firstOrFail();
    }

    /**
     * Devolve o RUT formatado a partir do NÚMERO, com o dígito verificador
     * calculado pelo validador do projeto (`Rut`). Nunca se hardcoda o DV: os
     * três RUTs do protótipo Figma (76.123.456-7, 78.987.654-3, 77.555.333-1)
     * tinham DV inválido, e é este método que os corrige (-0, -1, -2).
     */
    private function rut(int $number): string
    {
        foreach ([...range(0, 9), 'K'] as $dv) {
            $candidate = Rut::parse($number.$dv);

            if ($candidate->isValid()) {
                return $candidate->format();
            }
        }

        throw new RuntimeException("Nenhum dígito verificador válido para o RUT {$number}.");
    }

    /** E-mail determinístico e sem acento a partir do nome. Domínios `.demo.cl` = dado sintético. */
    private function email(string $name, string $domain): string
    {
        return Str::slug(Str::ascii($name), '.').'@'.$domain;
    }

    /** Telefone chileno determinístico (não é dado real). */
    private function phone(int $seed): string
    {
        return '+56 9 '.substr((string) (60000000 + $seed % 30000000), 0, 4)
            .' '.substr((string) (60000000 + $seed % 30000000), 4);
    }

    /**
     * PDF de uma página, mínimo mas VÁLIDO (xref com offsets calculados), para
     * o documento não ser um arquivo quebrado no bucket. Embrulhado em
     * UploadedFile com `$test: true` — não veio de um upload HTTP, e é assim
     * que passa pelo `UploadFileAction` real.
     */
    private function pdf(string $filename, string $title): UploadedFile
    {
        $path = sys_get_temp_dir().'/lotus-demo-'.Str::random(16).'.pdf';
        file_put_contents($path, $this->renderPdf($title));

        return new UploadedFile($path, $filename, 'application/pdf', null, true);
    }

    private function renderPdf(string $title): string
    {
        $text = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $title);
        $stream = "BT /F1 12 Tf 56 780 Td ({$text}) Tj ET\n";

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($stream)." >>\nstream\n".$stream.'endstream',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];

        foreach ($objects as $i => $body) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n".$body."\nendobj\n";
        }

        $size = count($objects) + 1;
        $startxref = strlen($pdf);

        $pdf .= "xref\n0 {$size}\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= "trailer\n<< /Size {$size} /Root 1 0 R >>\nstartxref\n{$startxref}\n%%EOF\n";

        return $pdf;
    }
}
