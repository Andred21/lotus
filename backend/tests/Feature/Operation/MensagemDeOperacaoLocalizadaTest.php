<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Exceptions\RedatorNaoElegivelException;
use App\Domains\Operation\Exceptions\TurmaConfiguracaoException;
use App\Shared\Exceptions\TipoDeRecusa;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * As quatro recusas de Operation falam os três idiomas e declaram o tipo em
 * vez do status. Molde do `MensagemDeIdentidadeLocalizadaTest`.
 */
class MensagemDeOperacaoLocalizadaTest extends TestCase
{
    private const CHAVES = [
        'operation.turma.quote_not_approved',
        'operation.turma.already_exists',
        'operation.redator.not_qualified',
        'operation.redator.reuf_invalid',
    ];

    #[Test]
    public function as_quatro_recusas_tem_tres_traducoes_distintas(): void
    {
        foreach (self::CHAVES as $chave) {
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

    #[Test]
    public function a_frase_da_recusa_sai_de_lang_no_locale_corrente(): void
    {
        app()->setLocale('es_CL');

        $this->assertSame(
            __('operation.turma.quote_not_approved'),
            TurmaConfiguracaoException::cotacaoNaoAprovada()->getMessage(),
        );
        $this->assertSame(
            __('operation.turma.already_exists'),
            TurmaConfiguracaoException::turmaJaExiste()->getMessage(),
        );
        $this->assertSame(
            __('operation.redator.not_qualified'),
            RedatorNaoElegivelException::naoHabilitado()->getMessage(),
        );
        $this->assertSame(
            __('operation.redator.reuf_invalid'),
            RedatorNaoElegivelException::reufInvalido()->getMessage(),
        );
    }

    #[Test]
    public function as_quatro_recusam_por_regra_de_negocio(): void
    {
        foreach ([
            TurmaConfiguracaoException::cotacaoNaoAprovada(),
            TurmaConfiguracaoException::turmaJaExiste(),
            RedatorNaoElegivelException::naoHabilitado(),
            RedatorNaoElegivelException::reufInvalido(),
        ] as $recusa) {
            $this->assertSame(TipoDeRecusa::RegraDeNegocio, $recusa->tipo());
            $this->assertSame(422, $recusa->tipo()->status());
        }
    }
}
