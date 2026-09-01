<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Identity\Enums\RedatorDocumentType;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * A D-38 media UM sítio (`OperationMetricsQuery`); a varredura de 2026-08-29
 * achou QUATRO frases interpolando o código do enum cru. O teste guarda os
 * quatro: nenhuma descrição pode conter `EVALUACION_REDATOR`, `POSTGRADO` e
 * companhia depois deste bloco.
 */
class DescricaoLocalizadaTest extends TestCase
{
    private const CHAVES = [
        'dashboard.pending.quote_pending_approval',
        'dashboard.pending.quote_without_turma',
        'dashboard.pending.turma_without_redator',
        'dashboard.pending.turma_docs_incomplete',
        'dashboard.pending.turma_awaiting_conclusion',
        'dashboard.pending.turma_overdue',
        'dashboard.pending.certificates_pending',
        'dashboard.alert.certificate_expired',
        'dashboard.alert.certificate_expiring',
        'dashboard.alert.redator_document_expired',
        'dashboard.alert.redator_document_expiring',
        'dashboard.alert.document_expired',
        'dashboard.alert.document_expiring',
        'dashboard.filter.inverted_period',
    ];

    #[Test]
    public function as_catorze_descricoes_existem_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            foreach (self::CHAVES as $chave) {
                $this->assertNotSame($chave, __($chave, ['tipo' => 'X', 'tipos' => 'X']), "{$chave} falta em {$locale}.");
            }
        }
    }

    #[Test]
    public function a_descricao_de_documento_usa_rotulo_e_nao_codigo_de_enum(): void
    {
        app()->setLocale('es_CL');

        $frase = __('dashboard.alert.redator_document_expired', [
            'tipo' => __('identity.document_type.'.RedatorDocumentType::POSTGRADO->value),
        ]);

        $this->assertStringNotContainsString('POSTGRADO', $frase);
        $this->assertStringContainsString('Posgrado', $frase);
    }
}
