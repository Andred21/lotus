<?php

namespace Tests\Support;

use App\Domains\Catalog\Models\CourseCertificateTemplate;

/**
 * Criação de template em teste. Existe porque `version` saiu do `$fillable`
 * (spec D10): `CourseCertificateTemplate::create(['version' => 2, …])` para de
 * gravar o número e o INSERT quebra. O teste que precisa de uma versão
 * ESPECÍFICA (o resolver escolhe a mais nova, e isso é a regra sob teste) a
 * declara aqui, por atribuição explícita — o mesmo caminho da Action.
 */
trait CreatesCertificateTemplates
{
    /** @param  array<string,mixed>  $atributos */
    protected function makeTemplate(int $courseId, array $atributos = []): CourseCertificateTemplate
    {
        $template = new CourseCertificateTemplate;
        $template->course_id = $courseId;
        $template->version = $atributos['version'] ?? 1;
        $template->layout_config = $atributos['layout_config'] ?? [];
        $template->validity_months = $atributos['validity_months'] ?? null;
        $template->save();

        return $template;
    }
}
