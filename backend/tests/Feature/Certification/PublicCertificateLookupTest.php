<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\Certification\CertificadoPublico;
use Tests\TestCase;

/**
 * Consulta pública por código + RUT do aluno (bloco 61). Sem `actingAs` em
 * nenhum teste: quem confere o certificado no site não tem sessão.
 */
class PublicCertificateLookupTest extends TestCase
{
    use CertificadoPublico;
    use RefreshDatabase;

    private const URL = '/api/publico/certificados/consulta';

    private Certificate $certificate;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 14:30:00');
        $this->certificate = $this->certificadoPublico('LOT-2026-1000', '12.345.678-5');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function consultar(string $codigo, string $rut, string $ip = '10.0.0.1'): TestResponse
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson(self::URL, ['codigo' => $codigo, 'rut' => $rut]);
    }

    public function test_codigo_e_rut_certos_devolvem_200_com_payload_e_uuid_sem_rut(): void
    {
        $response = $this->consultar('LOT-2026-1000', '12.345.678-5');

        $response->assertStatus(200)
            ->assertJsonPath('uuid', $this->certificate->uuid)
            ->assertJsonPath('codigo', 'LOT-2026-1000')
            ->assertJsonPath('aluno.name', 'Juan Pérez Congelado')
            ->assertJsonMissingPath('aluno.rut');

        $cru = $response->getContent();
        $this->assertStringNotContainsString('12.345.678', $cru);
        $this->assertStringNotContainsString('12345678', $cru);
    }

    /** @return array<string, array{string}> */
    public static function formatosDeRut(): array
    {
        return [
            'sem pontuação' => ['123456785'],
            'com hífen' => ['12345678-5'],
            'com pontos' => ['12.345.678-5'],
            'com zero à esquerda' => ['012.345.678-5'],
        ];
    }

    #[DataProvider('formatosDeRut')]
    public function test_o_rut_vale_em_qualquer_formatacao(string $rut): void
    {
        $this->consultar('LOT-2026-1000', $rut)->assertStatus(200);
    }

    public function test_o_dv_k_minusculo_encontra(): void
    {
        $this->certificadoPublico('LOT-2026-1001', '1.000.005-K');

        $this->consultar('LOT-2026-1001', '1000005-k')->assertStatus(200);
    }

    public function test_codigo_em_minusculas_encontra(): void
    {
        $this->consultar('lot-2026-1000', '12.345.678-5')->assertStatus(200);
    }

    public function test_as_tres_falhas_sao_indistinguiveis(): void
    {
        $this->certificadoPublico('LOT-2026-1002', null);

        $inexistente = $this->consultar('LOT-2026-9999', '12.345.678-5');
        $rutErrado = $this->consultar('LOT-2026-1000', '9.876.543-3');
        $semRutNoSnapshot = $this->consultar('LOT-2026-1002', '9.876.543-3');

        foreach ([$inexistente, $rutErrado, $semRutNoSnapshot] as $falha) {
            $falha->assertStatus(404);
        }

        $this->assertSame($inexistente->json(), $rutErrado->json());
        $this->assertSame($inexistente->json(), $semRutNoSnapshot->json());
        $this->assertSame(
            $inexistente->headers->get('Content-Type'),
            $rutErrado->headers->get('Content-Type'),
        );
        $this->assertSame(
            $inexistente->headers->get('Content-Type'),
            $semRutNoSnapshot->headers->get('Content-Type'),
        );
    }

    public function test_formato_invalido_devolve_422_sem_consultar_certificados(): void
    {
        DB::enableQueryLog();

        $response = $this->consultar('ABC', '12.345.678-4');

        $response->assertStatus(422)->assertJsonValidationErrors(['codigo', 'rut'], 'errors');

        foreach (DB::getQueryLog() as $query) {
            $this->assertStringNotContainsString('certificates', $query['query']);
        }
        $this->assertStringNotContainsString('12.345.678-4', $response->getContent());
    }

    public function test_entrada_que_nao_e_string_devolve_422(): void
    {
        $this->postJson(self::URL, ['codigo' => ['x'], 'rut' => ['a' => 1]])->assertStatus(422);
    }

    /** @return array<string, array{string, string}> */
    public static function entradasHostis(): array
    {
        return [
            'tautologia no código' => ["LOT-2026-1000' OR '1'='1", '12.345.678-5'],
            'tautologia no rut' => ['LOT-2026-1000', '1 OR 1=1'],
            'drop table' => ["'; DROP TABLE certificates; --", '12.345.678-5'],
        ];
    }

    #[DataProvider('entradasHostis')]
    public function test_payloads_de_sql_injection_nunca_devolvem_500(string $codigo, string $rut): void
    {
        $antes = Certificate::count();

        $this->assertContains($this->consultar($codigo, $rut)->getStatusCode(), [404, 422]);
        $this->assertSame($antes, Certificate::count());
    }

    public function test_a_busca_usa_binding_e_o_rut_nao_vai_ao_sql(): void
    {
        DB::enableQueryLog();

        $this->consultar('LOT-2026-1000', '12.345.678-5')->assertStatus(200);

        $log = DB::getQueryLog();
        $buscas = array_filter($log, fn (array $q) => str_contains($q['query'], 'certificates'));
        $this->assertNotEmpty($buscas);

        $achouBinding = false;
        foreach ($buscas as $busca) {
            $this->assertStringNotContainsString('LOT-2026-1000', $busca['query']);
            $achouBinding = $achouBinding || in_array('LOT-2026-1000', $busca['bindings'], true);
        }
        $this->assertTrue($achouBinding, 'O código tem de ir como binding da busca em certificates.');

        foreach ($log as $query) {
            $this->assertStringNotContainsString('12345678', $query['query']);
            $this->assertStringNotContainsString('12345678', json_encode($query['bindings']));
        }
    }

    public function test_certificado_revogado_aparece_com_estado(): void
    {
        $this->certificadoPublico('LOT-2026-1003', '12.345.678-5', [
            'status' => CertificateStatus::Revocado,
            'revoked_at' => now(),
            'revocation_reason' => 'Emitido por engano',
        ]);

        $this->consultar('LOT-2026-1003', '12.345.678-5')
            ->assertStatus(200)
            ->assertJsonPath('status', 'revocado');
    }

    public function test_get_na_rota_da_consulta_devolve_405(): void
    {
        $this->getJson(self::URL)->assertStatus(405);
    }

    public function test_a_11a_consulta_do_mesmo_ip_no_minuto_recebe_429(): void
    {
        for ($i = 1; $i <= 10; $i++) {
            $this->consultar('LOT-2026-1000', '12.345.678-5', '10.0.0.9')->assertStatus(200);
        }

        $this->consultar('LOT-2026-1000', '12.345.678-5', '10.0.0.9')->assertStatus(429);
    }
}
