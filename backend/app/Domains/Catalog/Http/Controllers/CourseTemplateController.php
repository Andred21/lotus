<?php

namespace App\Domains\Catalog\Http\Controllers;

use App\Domains\Catalog\Actions\CreateCertificateTemplateAction;
use App\Domains\Catalog\Data\CertificateTemplateData;
use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

/**
 * Gestão individual dos templates de certificado de um curso (endpoint próprio,
 * espelha o padrão nested de client_addresses/contacts).
 */
class CourseTemplateController extends Controller
{
    public function store(
        CertificateTemplateData $data,
        Course $course,
        CreateCertificateTemplateAction $action,
    ): CertificateTemplateData {
        return CertificateTemplateData::from($action->execute($course, $data));
    }

    /**
     * Edita a MESMA linha (D9): `layout_config` e `validity_months`. `version`
     * é imutável e `id` nunca vem do corpo — mesma leitura do `sort_order` de
     * módulo, que também é ignorado quando chega no payload.
     */
    public function update(CertificateTemplateData $data, CourseCertificateTemplate $template): CertificateTemplateData
    {
        $template->update($data->except('id', 'version')->toArray());

        return CertificateTemplateData::from($template->fresh());
    }

    public function destroy(CourseCertificateTemplate $template): Response
    {
        $template->delete();

        return response()->noContent();
    }
}
