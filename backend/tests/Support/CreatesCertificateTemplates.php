<?php

namespace Tests\Support;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use InvalidArgumentException;

/**
 * Criação de template em teste. Existe porque `version` saiu do `$fillable`
 * (spec D10): `CourseCertificateTemplate::create(['version' => 2, …])` para de
 * gravar o número e o INSERT quebra. O teste que precisa de uma versão
 * ESPECÍFICA (o resolver escolhe a mais nova, e isso é a regra sob teste) a
 * declara aqui, por atribuição explícita — o mesmo caminho da Action.
 *
 * Chave desconhecida ESTOURA em vez de ser ignorada. A primeira escrita lia os
 * três campos com `??` e engolia o resto: `makeTemplate($id, ['versao' => 2])`
 * criava a versão 1 calada, e o teste passava provando outra coisa. Um helper
 * de cenário que aceita o que não entende mente sobre o cenário montado
 * (review de 2026-08-12, Q-5).
 */
trait CreatesCertificateTemplates
{
    /** @param  array<string,mixed>  $atributos */
    protected function makeTemplate(int $courseId, array $atributos = []): CourseCertificateTemplate
    {
        $padrao = ['version' => 1, 'layout_config' => [], 'validity_months' => null];
        $desconhecidos = array_diff(array_keys($atributos), array_keys($padrao));

        if ($desconhecidos !== []) {
            throw new InvalidArgumentException(
                'makeTemplate() nao conhece: '.implode(', ', $desconhecidos)
                .'. Aceita: '.implode(', ', array_keys($padrao)).'.'
            );
        }

        $valores = array_merge($padrao, $atributos);

        $template = new CourseCertificateTemplate;
        $template->course_id = $courseId;
        $template->version = $valores['version'];
        $template->layout_config = $valores['layout_config'];
        $template->validity_months = $valores['validity_months'];
        $template->save();

        return $template;
    }
}
