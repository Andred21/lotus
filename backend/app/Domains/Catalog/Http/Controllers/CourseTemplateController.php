<?php

namespace App\Domains\Catalog\Http\Controllers;

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
    public function store(CertificateTemplateData $data, Course $course): CertificateTemplateData
    {
        $template = $course->certificateTemplates()->create($data->toArray());

        return CertificateTemplateData::from($template);
    }

    public function update(CertificateTemplateData $data, CourseCertificateTemplate $template): CertificateTemplateData
    {
        $template->update($data->toArray());

        return CertificateTemplateData::from($template->fresh());
    }

    public function destroy(CourseCertificateTemplate $template): Response
    {
        $template->delete();

        return response()->noContent();
    }
}
