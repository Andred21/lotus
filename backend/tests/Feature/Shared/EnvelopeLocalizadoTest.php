<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\Exceptions\ProblemDetails;
use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * A MESMA falha nos três locales: três envelopes distintos, nenhum devolvendo
 * chave crua e nenhum devolvendo inglês de framework quando o locale pedido não
 * é `en`. É o DoD do bloco expresso em teste — o que se prova no navegador
 * depois é este mesmo contrato contra a API real.
 */
class EnvelopeLocalizadoTest extends TestCase
{
    use RefreshDatabase;

    private const LOCALES = ['es-CL', 'pt-BR', 'en'];

    /** @return array<string, mixed> */
    private function envelope(string $locale, string $metodo, string $rota): array
    {
        return $this->withHeaders(['Accept-Language' => $locale])
            ->json($metodo, $rota)
            ->json();
    }

    #[Test]
    public function o_401_tem_title_e_detail_localizados_e_distintos_por_locale(): void
    {
        $titulos = [];
        $detalhes = [];

        foreach (self::LOCALES as $locale) {
            $corpo = $this->envelope($locale, 'GET', '/api/me');
            $titulos[] = $corpo['title'];
            $detalhes[] = $corpo['detail'];

            $this->assertStringNotContainsString('problem.', $corpo['title']);
            $this->assertStringNotContainsString('problem.', $corpo['detail']);
        }

        $this->assertCount(3, array_unique($titulos), 'Os três locales devolveram o mesmo title.');
        $this->assertCount(3, array_unique($detalhes), 'Os três locales devolveram o mesmo detail.');
    }

    #[Test]
    public function o_403_nao_devolve_mais_a_mensagem_em_ingles_do_framework(): void
    {
        // O 403 real deste repositório nasce do RBAC do spatie/laravel-permission
        // (`UnauthorizedException`), não de `Illuminate\Auth\Access\AuthorizationException`
        // — checar só o tipo do Illuminate deixaria este teste passar sem exercer
        // o caminho real (ProblemDetails::isForbidden).
        $redator = User::factory()->redator()->create();

        $titulos = [];
        $detalhes = [];

        foreach (self::LOCALES as $locale) {
            $corpo = $this->actingAs($redator)
                ->withHeaders(['Accept-Language' => $locale])
                ->json('GET', '/api/users')
                ->json();

            $this->assertSame(403, $corpo['status']);
            $this->assertNotSame('This action is unauthorized.', $corpo['detail']);
            $this->assertStringNotContainsString('unauthorized', strtolower($corpo['detail']));
            $this->assertStringNotContainsString('right permissions', strtolower($corpo['detail']));
            $this->assertStringNotContainsString('problem.', $corpo['title']);
            $this->assertStringNotContainsString('problem.', $corpo['detail']);

            $titulos[] = $corpo['title'];
            $detalhes[] = $corpo['detail'];
        }

        $this->assertCount(3, array_unique($titulos), 'Os três locales devolveram o mesmo title no 403.');
        $this->assertCount(3, array_unique($detalhes), 'Os três locales devolveram o mesmo detail no 403.');
    }

    #[Test]
    public function o_404_e_o_500_mascarado_saem_no_locale_pedido(): void
    {
        // `turmas/{turma}` vive no grupo `auth.active` (backend-ddd.md): sem
        // sessão a rota nem chega a resolver o binding, devolve 401. Autentica
        // com permissão de visualização para alcançar o 404 do
        // `resolveRouteBinding` que este teste quer provar.
        $this->actingAsAdmin();

        $titulos404 = [];
        foreach (self::LOCALES as $locale) {
            $corpo = $this->envelope($locale, 'GET', '/api/turmas/999999');
            $this->assertSame(404, $corpo['status']);
            $titulos404[] = $corpo['title'];
        }
        $this->assertCount(3, array_unique($titulos404));
    }

    /**
     * O envelope de uma recusa de domínio sai do MAPA, não de um status que a
     * exceção fixou. As duas recusas do enum são medidas pela mesma porta:
     * `RegraDeNegocio` mantém o par 422/`problem.title.http` que o braço
     * `HttpExceptionInterface` produzia, e `AcaoProibida` mantém o par
     * 403/`problem.title.forbidden` que o `isForbidden()` produzia — é o
     * contrato que os testes de endpoint existentes afirmam.
     */
    #[Test]
    public function a_recusa_de_dominio_tira_status_titulo_e_tipo_do_mapa(): void
    {
        $regra = new class extends RecusaDeDominio
        {
            public function tipo(): TipoDeRecusa
            {
                return TipoDeRecusa::RegraDeNegocio;
            }
        };

        $proibida = new class extends RecusaDeDominio
        {
            public function tipo(): TipoDeRecusa
            {
                return TipoDeRecusa::AcaoProibida;
            }
        };

        $envelope = fn (\Throwable $e) => ProblemDetails::fromException(
            $e,
            Request::create('/api/qualquer'),
        )->getData(true);

        $este = $envelope($regra);
        $this->assertSame(422, $este['status']);
        $this->assertSame(__('problem.title.http'), $este['title']);
        $this->assertSame('https://lotus.cl/errors/http', $este['type']);

        $aquele = $envelope($proibida);
        $this->assertSame(403, $aquele['status']);
        $this->assertSame(__('problem.title.forbidden'), $aquele['title']);
        $this->assertSame('https://lotus.cl/errors/forbidden', $aquele['type']);
    }
}
