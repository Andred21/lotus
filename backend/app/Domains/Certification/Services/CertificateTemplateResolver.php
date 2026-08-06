<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class CertificateTemplateResolver
{
    public function latestForCourse(int $courseId): ?CourseCertificateTemplate
    {
        return $this->availableTemplates()
            ->where('course_id', $courseId)
            ->orderByDesc('version')
            ->first();
    }

    /**
     * O template vigente de cada curso, indexado por `course_id`. Uma consulta
     * só: o `issuable` precisa da chave (o curso tem template?) e do próprio
     * template (a cidade é válida?) na mesma passada.
     *
     * @return Collection<int, CourseCertificateTemplate>
     */
    public function latestByCourse(): Collection
    {
        // Ascendente + keyBy: em chave repetida o `keyBy` guarda a ÚLTIMA,
        // que aqui é a maior `version`.
        return $this->availableTemplates()
            ->orderBy('course_id')
            ->orderBy('version')
            ->get()
            ->keyBy('course_id');
    }

    /**
     * Cidade de emissão do documento, ou `null` quando não há uma válida.
     * A turma presencial manda pelo `local_aplicacao`; a online cai para a
     * cidade fixa do template — **nunca** para o endereço do cliente (D12).
     * Fonte única: a emissão recusa por aqui e o `issuable` esconde por aqui,
     * senão a lista promete um certificado que o POST recusa com 422.
     */
    public function emissionCityFor(Turma $turma, CourseCertificateTemplate $template): ?string
    {
        if ($turma->local_aplicacao !== null) {
            return $turma->local_aplicacao;
        }

        $city = $template->layout_config['city'] ?? null;

        return is_string($city) && trim($city) !== '' ? $city : null;
    }

    /** @return Builder<CourseCertificateTemplate> */
    private function availableTemplates(): Builder
    {
        // Fonte única do critério: o SoftDeletingScope exclui templates
        // arquivados tanto da emissão quanto da lista de emitíveis.
        return CourseCertificateTemplate::query();
    }
}
