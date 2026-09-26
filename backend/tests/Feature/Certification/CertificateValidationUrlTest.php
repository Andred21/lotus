<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Exceptions\ValidacaoDeCertificadoNaoConfigurada;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateValidationUrl;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * P-79, spec D3 do item 29: a base do QR é conteúdo de documento, não
 * endereço de serviço. Fora de produção ela cai no `frontend_url`; em
 * produção é obrigatória e https, e não herda nada.
 */
class CertificateValidationUrlTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['app.frontend_url' => 'http://localhost:5173/']);
    }

    public function test_fora_de_producao_usa_a_chave_quando_preenchida(): void
    {
        config(['app.certificate_validation_url' => 'https://valida.example.test/']);

        $this->assertSame('https://valida.example.test', $this->url()->base());
    }

    public function test_fora_de_producao_sem_chave_cai_no_frontend_url(): void
    {
        config(['app.certificate_validation_url' => null]);

        $this->assertSame('http://localhost:5173', $this->url()->base());
    }

    public function test_em_producao_usa_a_chave_https(): void
    {
        $this->emProducao();
        config(['app.certificate_validation_url' => 'https://app.lotusotec.cl']);

        $this->assertSame('https://app.lotusotec.cl', $this->url()->base());
    }

    /**
     * O `frontend_url` https está posto DE PROPÓSITO: se produção herdasse o
     * fallback, estes casos passariam. Recusar mesmo assim é o que prova que a
     * regra do runbook virou mecanismo.
     */
    #[DataProvider('chavesQueProducaoRecusa')]
    public function test_em_producao_recusa_chave_ausente_vazia_ou_sem_https(?string $chave): void
    {
        $this->emProducao();
        config([
            'app.frontend_url' => 'https://app.lotusotec.cl',
            'app.certificate_validation_url' => $chave,
        ]);

        $this->expectException(ValidacaoDeCertificadoNaoConfigurada::class);

        $this->url()->base();
    }

    /** @return array<string, array{?string}> */
    public static function chavesQueProducaoRecusa(): array
    {
        return [
            'ausente' => [null],
            'vazia' => [''],
            'http cru, o EIP da fase sem DNS' => ['http://18.230.53.197'],
        ];
    }

    public function test_para_aponta_a_rota_publica_de_validacao_com_o_uuid(): void
    {
        config(['app.certificate_validation_url' => 'https://valida.example.test']);
        $certificate = new Certificate;
        $certificate->uuid = '5b0c7c1e-8d1f-4b8e-9d3a-2f6e1c0a9b77';

        $this->assertSame(
            'https://valida.example.test/validar/5b0c7c1e-8d1f-4b8e-9d3a-2f6e1c0a9b77',
            $this->url()->para($certificate),
        );
    }

    private function url(): CertificateValidationUrl
    {
        return $this->app->make(CertificateValidationUrl::class);
    }

    private function emProducao(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
    }
}
