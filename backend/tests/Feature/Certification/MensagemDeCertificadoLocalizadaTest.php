<?php

namespace Tests\Feature\Certification;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagemDeCertificadoLocalizadaTest extends TestCase
{
    #[Test]
    public function as_duas_recusas_tem_tres_traducoes_distintas(): void
    {
        foreach ([
            'certification.certificate.already_revoked',
            'certification.enrollment.not_found',
            'certification.snapshot.not_presentable',
        ] as $chave) {
            $valores = [];
            foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
                app()->setLocale($locale);
                $valor = __($chave);
                $this->assertNotSame($chave, $valor, "{$chave} falta em {$locale}.");
                $valores[] = $valor;
            }
            $this->assertCount(3, array_unique($valores), "{$chave} repete texto entre locales.");
        }
    }
}
