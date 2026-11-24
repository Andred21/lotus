<?php

namespace Tests\Feature\Shared;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * O site institucional (`lotusotec.cl`) consulta `api/publico/*` do navegador. Ele é
 * same-site com o app (`app.lotusotec.cl`), então credencial para ele levaria o cookie de
 * sessão de um admin logado. A política do site é outra, e só vale nessas rotas: origem
 * exata, sem credenciais, sem curinga.
 */
class PublicCorsTest extends TestCase
{
    use RefreshDatabase;

    private const SITE = 'https://lotusotec.cl';

    private const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

    private string $origemDoApp;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'cors.publico.allowed_origins' => [self::SITE],
            'sanctum.stateful' => ['app.lotusotec.cl'],
        ]);

        $this->origemDoApp = trim(explode(',', (string) env('FRONTEND_URL', 'http://localhost:5173'))[0]);
    }

    /**
     * Com UMA origem configurada o `CorsService` devolve essa origem a qualquer chamador
     * (a política do app, com um `FRONTEND_URL` só). O navegador a recusa por não bater com a
     * origem da página, então "não concedeu" é: header ausente ou diferente da origem pedida.
     */
    private function assertOrigemNaoConcedida(TestResponse $response, string $origem): void
    {
        $concedida = $response->headers->get('Access-Control-Allow-Origin');

        $this->assertTrue(
            $concedida === null || $concedida !== $origem,
            "A origem {$origem} não podia receber Access-Control-Allow-Origin, veio: ".var_export($concedida, true),
        );
    }

    #[Test]
    public function preflight_do_site_em_rota_publica_recebe_a_origem_exata_sem_credenciais(): void
    {
        $response = $this->call('OPTIONS', '/api/publico/certificados/consulta', [], [], [], $this->transporte([
            'Origin' => self::SITE,
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type',
        ]));

        $this->assertSame(self::SITE, $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Credentials'));
        $this->assertStringContainsString('POST', (string) $response->headers->get('Access-Control-Allow-Methods'));
    }

    #[Test]
    public function resposta_do_site_em_rota_publica_expoe_content_disposition(): void
    {
        $response = $this->withHeader('Origin', self::SITE)
            ->getJson('/api/publico/certificados/'.self::UUID_INEXISTENTE);

        $response->assertNotFound();
        $this->assertSame(self::SITE, $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Credentials'));
        $this->assertStringContainsString('Content-Disposition', (string) $response->headers->get('Access-Control-Expose-Headers'));
    }

    /** O site separa a espera de 1 min (IP) da de até 1 h (RUT) pelo `Retry-After` do 429. */
    #[Test]
    public function resposta_do_site_em_rota_publica_expoe_retry_after(): void
    {
        $response = $this->withHeader('Origin', self::SITE)
            ->getJson('/api/publico/certificados/'.self::UUID_INEXISTENTE);

        $this->assertStringContainsString('Retry-After', (string) $response->headers->get('Access-Control-Expose-Headers'));
    }

    #[Test]
    public function origem_do_site_em_rota_autenticada_nao_recebe_allow_origin(): void
    {
        $preflight = $this->call('OPTIONS', '/api/certificates', [], [], [], $this->transporte([
            'Origin' => self::SITE,
            'Access-Control-Request-Method' => 'GET',
        ]));
        $this->assertOrigemNaoConcedida($preflight, self::SITE);

        $get = $this->withHeader('Origin', self::SITE)->getJson('/api/certificates');
        $this->assertOrigemNaoConcedida($get, self::SITE);
    }

    #[Test]
    public function origem_do_app_mantem_a_politica_atual(): void
    {
        foreach (['/api/publico/certificados/'.self::UUID_INEXISTENTE, '/api/certificates'] as $rota) {
            $response = $this->withHeader('Origin', $this->origemDoApp)->getJson($rota);

            $this->assertSame($this->origemDoApp, $response->headers->get('Access-Control-Allow-Origin'), $rota);
            $this->assertSame('true', $response->headers->get('Access-Control-Allow-Credentials'), $rota);
        }
    }

    #[Test]
    public function origem_desconhecida_nao_recebe_nada(): void
    {
        $response = $this->withHeader('Origin', 'https://evil.example')
            ->getJson('/api/publico/certificados/'.self::UUID_INEXISTENTE);

        $this->assertOrigemNaoConcedida($response, 'https://evil.example');
    }

    #[Test]
    public function curinga_nas_origens_publicas_e_ignorado(): void
    {
        config(['cors.publico.allowed_origins' => ['*']]);

        $response = $this->withHeader('Origin', self::SITE)
            ->getJson('/api/publico/certificados/'.self::UUID_INEXISTENTE);

        $this->assertOrigemNaoConcedida($response, self::SITE);
        $this->assertNotSame('*', $response->headers->get('Access-Control-Allow-Origin'));
    }

    #[Test]
    public function curinga_nas_origens_publicas_nao_casa_nem_com_origin_literal(): void
    {
        // Sem o descarte das entradas com `*`, a igualdade estrita casaria `*` com `*` e o
        // `CorsService` responderia `Access-Control-Allow-Origin: *` (sem credenciais).
        config(['cors.publico.allowed_origins' => ['*']]);

        $response = $this->withHeader('Origin', '*')
            ->getJson('/api/publico/certificados/'.self::UUID_INEXISTENTE);

        $this->assertNotSame('*', $response->headers->get('Access-Control-Allow-Origin'));
    }

    #[Test]
    public function curinga_misturado_a_origem_exata_nao_abre_a_politica_do_site(): void
    {
        // O site casa pela entrada exata, mas o `*` da mesma lista não pode chegar ao
        // `CorsService`: ele ligaria `allowAllOrigins` e a resposta sairia `Allow-Origin: *`.
        config(['cors.publico.allowed_origins' => [self::SITE, '*']]);

        $response = $this->withHeader('Origin', self::SITE)
            ->getJson('/api/publico/certificados/'.self::UUID_INEXISTENTE);

        $this->assertSame(self::SITE, $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Credentials'));
    }

    #[Test]
    public function origem_com_curinga_embutido_nao_vira_padrao(): void
    {
        config(['cors.publico.allowed_origins' => ['https://*.cl']]);

        $response = $this->withHeader('Origin', self::SITE)
            ->getJson('/api/publico/certificados/'.self::UUID_INEXISTENTE);

        $this->assertOrigemNaoConcedida($response, self::SITE);
    }

    #[Test]
    public function o_site_nao_e_dominio_stateful(): void
    {
        $request = Request::create('/api/publico/certificados/consulta', 'POST', server: [
            'HTTP_ORIGIN' => self::SITE,
            'HTTP_REFERER' => self::SITE.'/validar/x',
        ]);

        $this->assertFalse(EnsureFrontendRequestsAreStateful::fromFrontend($request));
    }

    /**
     * @param  array<string, string>  $headers
     * @return array<string, string>
     */
    private function transporte(array $headers): array
    {
        $server = [];

        foreach ($headers as $nome => $valor) {
            $server['HTTP_'.strtoupper(str_replace('-', '_', $nome))] = $valor;
        }

        return $server;
    }
}
