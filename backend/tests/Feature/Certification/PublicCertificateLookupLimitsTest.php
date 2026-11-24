<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Models\Certificate;
use App\Shared\Logging\EventoDeSeguranca;
use App\Shared\RateLimiting\RateLimits;
use App\Shared\Support\Rut;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use Monolog\Handler\TestHandler;
use Tests\Support\Certification\CertificadoPublico;
use Tests\TestCase;

/**
 * Limitadores de FALHA da consulta pública (bloco 61): 20/h por IP e 10/h por
 * RUT, contando só o 404 uniforme. O 429 sai ANTES de qualquer query e o acerto
 * nunca toca contador. Os pedidos de um mesmo IP vão em blocos de dez com
 * `travel(61)`, para o limitador por minuto não mascarar o por hora.
 */
class PublicCertificateLookupLimitsTest extends TestCase
{
    use CertificadoPublico;
    use RefreshDatabase;

    private const URL = '/api/publico/certificados/consulta';

    private const RUT_DO_ALUNO = '12.345.678-5';

    private Certificate $certificate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->certificate = $this->certificadoPublico('LOT-2026-1000', self::RUT_DO_ALUNO);
    }

    private function consultar(string $codigo, string $rut, string $ip = '10.0.0.1'): TestResponse
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson(self::URL, ['codigo' => $codigo, 'rut' => $rut]);
    }

    private function rutValido(int $n): string
    {
        foreach (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'] as $dv) {
            if (Rut::parse("$n-$dv")->isValid()) {
                return "$n-$dv";
            }
        }

        $this->fail("Nenhum DV válido para $n.");
    }

    /** Estoura o limite de falhas do RUT: dez falhas de IPs distintos, cada uma contra um código inexistente. */
    private function estourarFalhasDoRut(string $rut): void
    {
        for ($i = 0; $i < RateLimits::FALHAS_CONSULTA_POR_RUT; $i++) {
            $this->consultar('LOT-2026-'.(2000 + $i), $rut, "10.0.1.$i")->assertStatus(404);
        }
    }

    public function test_a_21a_falha_do_mesmo_ip_na_hora_recebe_429_mesmo_com_o_par_certo(): void
    {
        for ($i = 0; $i < RateLimits::FALHAS_CONSULTA_POR_IP; $i++) {
            if ($i > 0 && $i % 10 === 0) {
                $this->travel(61)->seconds();
            }
            $this->consultar('LOT-2026-9999', $this->rutValido(20000000 + $i), '10.0.0.9')->assertStatus(404);
        }
        $this->travel(61)->seconds();

        $bloqueado = $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.0.9');

        $bloqueado->assertStatus(429);
        // Mais de 60 s prova que foi o limitador da HORA, não o do minuto.
        $this->assertGreaterThan(60, (int) $bloqueado->headers->get('Retry-After'));
        $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.0.10')->assertStatus(200);
    }

    public function test_a_11a_falha_do_mesmo_rut_recebe_429_de_qualquer_ip(): void
    {
        $this->estourarFalhasDoRut(self::RUT_DO_ALUNO);

        $bloqueado = $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.1.99');

        $bloqueado->assertStatus(429);
        $this->assertGreaterThan(0, (int) $bloqueado->headers->get('Retry-After'));
    }

    public function test_o_429_de_falha_recusa_antes_de_consultar_certificados(): void
    {
        $this->estourarFalhasDoRut(self::RUT_DO_ALUNO);

        DB::enableQueryLog();
        $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.1.99')->assertStatus(429);

        foreach (DB::getQueryLog() as $query) {
            $this->assertStringNotContainsString('certificates', $query['query']);
        }
    }

    public function test_falhas_de_um_rut_nao_travam_outro_rut_no_mesmo_codigo(): void
    {
        for ($i = 0; $i < RateLimits::FALHAS_CONSULTA_POR_RUT; $i++) {
            $this->consultar('LOT-2026-1000', '9.876.543-3', "10.0.2.$i")->assertStatus(404);
        }

        $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.2.99')->assertStatus(200);
    }

    public function test_acerto_nao_conta_como_falha(): void
    {
        for ($i = 0; $i < 25; $i++) {
            if ($i > 0 && $i % 10 === 0) {
                $this->travel(61)->seconds();
            }
            $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.0.7')->assertStatus(200);
        }

        $this->assertSame(0, RateLimiter::attempts(RateLimits::chaveDeFalhaPorIp('10.0.0.7')));
        $this->assertSame(0, RateLimiter::attempts(RateLimits::chaveDeFalhaPorRut(Rut::parse(self::RUT_DO_ALUNO))));
    }

    public function test_um_acerto_no_meio_nao_zera_o_contador_de_falhas(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->consultar('LOT-2026-'.(2000 + $i), self::RUT_DO_ALUNO, "10.0.1.$i")->assertStatus(404);
        }
        $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.1.50')->assertStatus(200);
        for ($i = 5; $i < RateLimits::FALHAS_CONSULTA_POR_RUT; $i++) {
            $this->consultar('LOT-2026-'.(2000 + $i), self::RUT_DO_ALUNO, "10.0.1.$i")->assertStatus(404);
        }

        $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.1.99')->assertStatus(429);
    }

    public function test_a_janela_de_falhas_e_de_uma_hora(): void
    {
        $this->estourarFalhasDoRut(self::RUT_DO_ALUNO);
        $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.1.99')->assertStatus(429);

        $this->travel(RateLimits::JANELA_FALHAS_CONSULTA + 1)->seconds();

        $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO, '10.0.1.99')->assertStatus(200);
    }

    public function test_a_falha_conta_na_chave_hmac(): void
    {
        $this->consultar('LOT-2026-9999', self::RUT_DO_ALUNO)->assertStatus(404);

        $this->assertSame(1, RateLimiter::attempts(RateLimits::chaveDeFalhaPorRut(Rut::parse(self::RUT_DO_ALUNO))));
        $this->assertSame(1, RateLimiter::attempts(RateLimits::chaveDeFalhaPorIp('10.0.0.1')));
    }

    public function test_nenhum_rut_vai_ao_log(): void
    {
        $registros = [];
        Log::listen(function (MessageLogged $evento) use (&$registros): void {
            $registros[] = $evento->message.' '.json_encode($evento->context);
        });

        $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO)->assertStatus(200);
        $this->consultar('LOT-2026-9999', self::RUT_DO_ALUNO)->assertStatus(404);
        $this->consultar('ABC', '9.876.543-3')->assertStatus(422);
        for ($i = 0; $i < RateLimits::FALHAS_CONSULTA_POR_RUT; $i++) {
            $this->consultar('LOT-2026-'.(2000 + $i), '9.876.543-3', "10.0.1.$i");
        }
        $this->consultar('LOT-2026-1000', '9.876.543-3', '10.0.1.99')->assertStatus(429);

        $this->assertNotEmpty($registros, 'O 429 tem de ter gerado ao menos o evento de taxa.');
        foreach ($registros as $linha) {
            foreach (['12345678', '12.345.678', '9876543', '9.876.543'] as $rut) {
                $this->assertStringNotContainsString($rut, $linha);
            }
        }
    }

    public function test_o_429_de_falha_vira_taxa_excedida(): void
    {
        $handler = new TestHandler;
        Log::channel(EventoDeSeguranca::CANAL)->getLogger()->setHandlers([$handler]);

        $this->consultar('LOT-2026-1000', self::RUT_DO_ALUNO)->assertStatus(200);
        $this->assertSame([], $handler->getRecords(), 'O acerto não gera evento de segurança.');

        $this->estourarFalhasDoRut('9.876.543-3');
        $this->consultar('LOT-2026-1000', '9.876.543-3', '10.0.1.99')->assertStatus(429);

        $eventos = array_values(array_filter(
            array_map(fn ($r) => $r->context, $handler->getRecords()),
            fn (array $contexto) => ($contexto['evento'] ?? null) === 'taxa.excedida',
        ));
        $this->assertCount(1, $eventos);
        $this->assertSame('api/publico/certificados/consulta', $eventos[0]['rota']);
    }
}
