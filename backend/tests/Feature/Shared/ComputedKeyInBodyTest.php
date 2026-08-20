<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * D-12: `photo_url` é `#[Computed]` e tem rota própria de upload. Mandá-la no
 * corpo devolvia 200 e era engolida — a promoção no construtor do DTO desvia do
 * `CannotSetComputedValue`.
 *
 * `missing`, não `prohibited`: `validateProhibited` é `! validateRequired` no
 * vendor, então o campo presente mas VAZIO passava. É por isso que o segundo
 * ramo (`null`) existe aqui — o precedente é `ProfileUpdateData:28-35`.
 */
class ComputedKeyInBodyTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    #[DataProvider('valoresForjados')]
    public function test_photo_url_no_corpo_do_staff_e_422(mixed $valor): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'email' => 'alvo@lotus.cl']);
        $alvo->assignRole('admin');

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo',
            'email' => 'alvo@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
            'photo_url' => $valor,
        ])->assertStatus(422)->assertJsonPath('errors.photo_url.0', fn ($m) => $m !== null);
    }

    public static function valoresForjados(): array
    {
        return [
            'url forjada' => ['http://evil/x.png'],
            'null' => [null],
            'string vazia' => [''],
        ];
    }

    public function test_photo_url_no_corpo_do_cliente_e_422(): void
    {
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser(
            [],
            ['rut' => '12.345.678-5', 'email' => 'acme@lotus.cl'],
        );

        $this->putJson("/api/clients/{$client->id}", [
            'name' => 'ACME',
            'rut' => '12.345.678-5',
            'email' => 'acme@lotus.cl',
            'legal_name' => 'ACME S.A.',
            'type' => 'client',
            'photo_url' => 'http://evil/x.png',
        ])->assertStatus(422)->assertJsonPath('errors.photo_url.0', fn ($m) => $m !== null);
    }

    /**
     * O ramo `null` (presente e vazio) já está coberto para o staff acima —
     * `valoresForjados()` é reaproveitado aqui para não duplicar o raciocínio
     * do docblock da classe num quarto DTO.
     */
    #[DataProvider('valoresForjados')]
    public function test_photo_url_no_corpo_do_aluno_e_422(mixed $valor): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->create([
            'type' => 'aluno',
            'is_active' => false,
            'rut' => '13.456.789-9',
            'email' => 'aluno-ckb@lotus.cl',
        ]);
        $student = $user->student()->create([]);

        $this->putJson("/api/students/{$student->id}", [
            'name' => 'Aluno Editado',
            'rut' => '13.456.789-9',
            'email' => 'aluno-ckb@lotus.cl',
            'photo_url' => $valor,
        ])->assertStatus(422)->assertJsonPath('errors.photo_url.0', fn ($m) => $m !== null);
    }

    public function test_photo_url_no_corpo_do_redator_e_422(): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->redator()->create([
            'rut' => '12.345.678-5',
            'email' => 'redator-ckb@lotus.cl',
        ]);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator Editado',
            'rut' => '12.345.678-5',
            'email' => 'redator-ckb@lotus.cl',
            'photo_url' => 'http://evil/x.png',
        ])->assertStatus(422)->assertJsonPath('errors.photo_url.0', fn ($m) => $m !== null);
    }

    public function test_client_photo_url_no_corpo_da_turma_e_422(): void
    {
        $this->actingAsAdmin();
        $turma = $this->makeTurma();

        $this->putJson("/api/turmas/{$turma->id}", [
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-10',
            'client_photo_url' => 'http://evil/x.png',
        ])->assertStatus(422)->assertJsonPath('errors.client_photo_url.0', fn ($m) => $m !== null);
    }

    /**
     * `EnrollmentData` não tem rota PUT própria — `turmas/{turma}/alunos/
     * {enrollment}/resultado` usa `EnrollmentResultData`, um DTO diferente sem
     * `photo_url`. A ÚNICA porta HTTP que hidrata `EnrollmentData` do corpo é
     * o `store` (matrícula individual), por isso o teste é POST, não PUT — a
     * regra é a mesma (`ComputedFields::rejected('photo_url')` no `rules()`),
     * só a rota real é diferente das outras três.
     */
    public function test_photo_url_no_corpo_da_matricula_e_422(): void
    {
        $this->actingAsAdmin();
        $turma = $this->makeTurma();

        $this->postJson("/api/turmas/{$turma->id}/alunos", [
            'rut' => '11.111.111-1',
            'name' => 'Juan Soto',
            'email' => 'juan@acme.cl',
            'photo_url' => 'http://evil/x.png',
        ])->assertStatus(422)->assertJsonPath('errors.photo_url.0', fn ($m) => $m !== null);
    }

    /**
     * Turma mínima (D-12 só precisa de uma turma válida em `em_andamento` para
     * expor `update`/`alunos`) — mesmo arranjo de `TurmaCrudTest`/
     * `EnrollmentApiTest`, sem herdar o helper porque `CreatesDomainRecords`
     * deixa Budget/Quote/Turma de fora de propósito (spec D8).
     */
    private function makeTurma(): Turma
    {
        $clientId = $this->makeClientWithUser([], ['rut' => '44.555.666-1', 'email' => 'turma-client-ckb@lotus.cl'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap-CKB']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    /**
     * Q-1 da review do BD-14: a lei da D-12 é sobre chave `#[Computed]`, não
     * sobre a palavra `photo`. `last_login` é derivado da sessão e nunca foi
     * escrita de corpo — mandá-lo devolvia 200 e sumia, o mesmo silêncio que a
     * D-12 mediu na foto.
     */
    public function test_last_login_no_corpo_do_staff_e_422(): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'email' => 'alvo-ll@lotus.cl']);
        $alvo->assignRole('admin');

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo',
            'email' => 'alvo-ll@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
            'last_login' => '2026-01-01 00:00:00',
        ])->assertStatus(422)->assertJsonPath('errors.last_login.0', fn ($m) => $m !== null);
    }

    /**
     * `documents` NÃO entra na lista do redator, e a exceção é medida: é chave
     * multipart de escrita real (`RedatorData::prepareForPipeline` descarta o
     * valor bruto antes dos pipes), coberta por `RedatorCrudTest` e
     * `RedatorDocumentTest`. `missing` ali reprovaria o upload legítimo.
     */
    public function test_last_login_no_corpo_do_redator_e_422(): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->redator()->create([
            'rut' => '12.345.678-5',
            'email' => 'redator-ll@lotus.cl',
        ]);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator Editado',
            'rut' => '12.345.678-5',
            'email' => 'redator-ll@lotus.cl',
            'last_login' => '2026-01-01 00:00:00',
        ])->assertStatus(422)->assertJsonPath('errors.last_login.0', fn ($m) => $m !== null);
    }

    /**
     * O caso que dói: `current_client_id` é a PROJEÇÃO do vínculo, e
     * `UpdateStudentAction` não toca vínculo de propósito (D3 do bloco de
     * alunos). Quem mandava vínculo no PUT recebia 200 e nada acontecia. A
     * chave de escrita do vínculo é `client_id`, que segue aceita.
     */
    #[DataProvider('chavesComputadasDoAluno')]
    public function test_chave_computada_no_corpo_do_aluno_e_422(string $chave, mixed $valor): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->create([
            'type' => 'aluno',
            'is_active' => false,
            'rut' => '13.456.789-9',
            'email' => 'aluno-comp@lotus.cl',
        ]);
        $student = $user->student()->create([]);

        $this->putJson("/api/students/{$student->id}", [
            'name' => 'Aluno Editado',
            'rut' => '13.456.789-9',
            'email' => 'aluno-comp@lotus.cl',
            $chave => $valor,
        ])->assertStatus(422)->assertJsonPath("errors.{$chave}.0", fn ($m) => $m !== null);
    }

    public static function chavesComputadasDoAluno(): array
    {
        return [
            'current_client_id' => ['current_client_id', 7],
            'current_client_name' => ['current_client_name', 'ACME S.A.'],
            'enrollments_count' => ['enrollments_count', 99],
        ];
    }

    /**
     * Arch test: todo campo de foto dos DTOs é `#[Computed]`. Cobre também os
     * DTOs que só SAEM, onde `rules()` nunca roda.
     */
    public function test_todo_campo_de_foto_de_dto_e_computed(): void
    {
        $arquivos = glob(app_path('Domains/*/Data/*.php'));
        $faltando = [];
        $encontrados = 0;

        foreach ($arquivos as $arquivo) {
            $fonte = file_get_contents($arquivo);

            // `PREG_OFFSET_CAPTURE` mantém `$m[0]`/`$m[2]` no formato
            // [valor, offset], mas o que importa aqui é o VALOR do grupo 0 —
            // o match INTEIRO, do primeiro atributo até a declaração da
            // propriedade, capturado pelo `(#\[[^\]]+\]\s*)*` do próprio
            // regex. Checar `#[Computed]` dentro desse texto, e não numa
            // janela de tamanho fixo antes do offset, evita dois
            // falsos-negativos que uma janela cega comete: (1) o atributo de
            // uma propriedade IRMÃ (ex.: `RedatorData::$documents`,
            // `StudentData::$current_client_id`) cai dentro da janela e é
            // confundido com o da foto; (2) um docblock que CITA
            // "`#[Computed]`" em prosa (ex.: `SessionUserData::$photo_url`)
            // satisfaz `str_contains` sem o atributo real existir — o match
            // do regex nunca inclui o docblock, só a cadeia de atributos que
            // precede a propriedade sem interrupção.
            if (! preg_match_all(
                '/^\s*(#\[[^\]]+\]\s*)*public \?string \$(\w*photo_url)\s*[,=]/m',
                $fonte,
                $m,
                PREG_OFFSET_CAPTURE,
            )) {
                continue;
            }

            foreach ($m[0] as $indice => [$blocoAtributos]) {
                [$campo] = $m[2][$indice];
                $encontrados++;

                if (! str_contains($blocoAtributos, '#[Computed]')) {
                    $faltando[] = basename($arquivo).'::'.$campo;
                }
            }
        }

        // Sem isso, um regex que parasse de casar (atributo com "]" no
        // argumento, `public readonly ?string`, `Data` numa subpasta fora do
        // glob, um campo `string` não-nullable) passaria com `$faltando`
        // vazio e o teste ficaria verde sem ter olhado nada. 11 é a
        // contagem viva hoje — um número diferente aqui NÃO se ajusta no
        // escuro: ou o regex parou de enxergar um campo que existe, ou
        // nasceu campo de foto novo. Nos dois casos, olhe antes de mudar.
        $this->assertSame(
            11,
            $encontrados,
            "A varredura achou {$encontrados} campo(s) de foto, esperava 11.",
        );

        $this->assertSame([], $faltando, 'Campo de foto sem #[Computed]: '.implode(', ', $faltando));
    }
}
