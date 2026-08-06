<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
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

    /** @return Collection<int, int> */
    public function courseIdsWithTemplate(): Collection
    {
        return $this->availableTemplates()
            ->distinct()
            ->pluck('course_id');
    }

    /** @return Builder<CourseCertificateTemplate> */
    private function availableTemplates(): Builder
    {
        // Fonte única do critério: o SoftDeletingScope exclui templates
        // arquivados tanto da emissão quanto da lista de emitíveis.
        return CourseCertificateTemplate::query();
    }
}
