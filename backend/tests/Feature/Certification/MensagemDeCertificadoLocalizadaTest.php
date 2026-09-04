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
            // As seis portas de elegibilidade saíram de literal es-CL dentro do
            // serviço no Q-7 do review de 2026-09-03: aqui se prova que elas
            // ganharam três traduções DE VERDADE, e não a mesma frase copiada.
            'certification.eligibility.turma_not_concluded',
            'certification.eligibility.enrollment_not_approved',
            'certification.eligibility.certificate_already_active',
            'certification.eligibility.template_not_approved',
            'certification.eligibility.template_city_invalid',
            'certification.eligibility.redator_not_designated',
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
