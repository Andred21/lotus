<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Support\TetosImpressos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Spec D15 do bloco 40: o certificado nunca corta texto, então o que não cabe é
 * recusado na ENTRADA. Cada porta que grava um campo impresso aplica o teto de
 * `TetosImpressos`, nomeando o campo na mensagem, na locale de quem escreveu.
 *
 * O teto é a fronteira: `teto` caracteres passam, `teto + 1` recebe 422 com
 * `validation.max.string` no idioma do `Accept-Language`.
 */
class TetosDeEntradaTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    /** @var list<string> */
    private const LOCALES = ['es-CL', 'pt-BR', 'en'];

    /**
     * porta (ver `requisicao()`), campo, teto.
     *
     * @return array<string, array{string, string, int}>
     */
    public static function campos(): array
    {
        return [
            'aluno: name' => ['aluno', 'name', TetosImpressos::NOME_ALUNO],
            'redator: name' => ['redator', 'name', TetosImpressos::NOME_ASSINANTE],
            'perfil: name' => ['perfil', 'name', TetosImpressos::NOME_ASSINANTE],
            'matrícula individual: name' => ['matricula', 'name', TetosImpressos::NOME_ALUNO],
            'cliente: legal_name' => ['cliente', 'legal_name', TetosImpressos::RAZAO_SOCIAL],
            'curso: name' => ['curso', 'name', TetosImpressos::NOME_CURSO],
            'curso: technical_name' => ['curso', 'technical_name', TetosImpressos::NOME_TECNICO],
            'curso: description' => ['curso', 'description', TetosImpressos::DESCRICAO_CURSO],
            'configuração: manager_name' => ['configuracao', 'manager_name', TetosImpressos::NOME_ASSINANTE],
            'configuração: manager_title' => ['configuracao', 'manager_title', TetosImpressos::CARGO_ASSINANTE],
        ];
    }

    /** @return array<string, array{string, string, int, string}> */
    public static function camposPorLocale(): array
    {
        $casos = [];

        foreach (self::campos() as $nome => [$porta, $campo, $teto]) {
            foreach (self::LOCALES as $locale) {
                $casos["{$nome} ({$locale})"] = [$porta, $campo, $teto, $locale];
            }
        }

        return $casos;
    }

    #[DataProvider('campos')]
    public function test_campo_no_teto_passa(string $porta, string $campo, int $teto): void
    {
        $this->actingAsSuperadmin();
        [$metodo, $uri, $payload] = $this->requisicao($porta);
        $payload[$campo] = str_repeat('a', $teto);

        $this->json($metodo, $uri, $payload)->assertSuccessful();
    }

    #[DataProvider('camposPorLocale')]
    public function test_campo_acima_do_teto_recebe_422_com_a_mensagem_nomeada(
        string $porta,
        string $campo,
        int $teto,
        string $locale,
    ): void {
        $this->actingAsSuperadmin();
        [$metodo, $uri, $payload] = $this->requisicao($porta);
        $payload[$campo] = str_repeat('a', $teto + 1);

        $loc = str_replace('-', '_', $locale);

        $this->withHeaders(['Accept-Language' => $locale])
            ->json($metodo, $uri, $payload)
            ->assertStatus(422)
            ->assertJsonPath("errors.{$campo}.0", __(
                'validation.max.string',
                ['attribute' => __("validation.attributes.{$campo}", [], $loc), 'max' => $teto],
                $loc,
            ));
    }

    /**
     * A porta, com o payload VÁLIDO mais simples: cada teste troca só o campo
     * sob prova. Rotas conferidas nos `routes.php` dos domínios.
     *
     * @return array{string, string, array<string, mixed>}
     */
    private function requisicao(string $porta): array
    {
        return match ($porta) {
            'aluno' => ['POST', '/api/students', [
                'name' => 'María González Rojas',
                'rut' => '12.345.678-5',
                'email' => 'mgonzalez@transelec.cl',
                'client_id' => $this->makeClientWithUser(['legal_name' => 'Transelec'])->id,
            ]],
            'redator' => ['POST', '/api/redatores', [
                'name' => 'Juan Morales',
                'rut' => '13.456.789-9',
                'email' => 'jm@lotus.cl',
            ]],
            'perfil' => ['PUT', '/api/profile', ['name' => 'Ana Nova']],
            'matricula' => ['POST', "/api/turmas/{$this->turma()->id}/alunos", [
                'rut' => '11.111.111-1',
                'name' => 'Juan Soto',
                'email' => 'juan@acme.cl',
            ]],
            'cliente' => ['POST', '/api/clients', [
                'name' => 'Nueva SpA',
                'legal_name' => 'Nueva SpA',
                'rut' => '77.222.000-6',
                'email' => 'nueva@example.test',
                'type' => 'client',
                'contacts' => [['name' => 'Ana', 'is_primary' => true]],
            ]],
            'curso' => ['POST', '/api/courses', [
                'name' => 'Alta Tensión',
                'technical_name' => 'AT-10',
                'description' => 'Curso regulado.',
                'workload_hours' => 40,
            ]],
            'configuracao' => ['PUT', '/api/certificate-settings', [
                'manager_name' => 'Ana Pérez',
                'manager_title' => 'Directora OTEC',
            ]],
        };
    }

    private function turma(): Turma
    {
        $budget = Budget::create([
            'client_id' => $this->makeClientWithUser(['legal_name' => 'ACME'], ['rut' => '22.333.444-K'])->id,
            'code' => 'Scap 1',
        ]);
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
}
