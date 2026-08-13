<?php

namespace App\Domains\Catalog\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Template de certificado de um curso. Config de layout versionada em JSON
 * (não anexo). Peso legal do certificado → auditável e soft-deletável.
 */
class CourseCertificateTemplate extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $table = 'course_certificate_templates';

    /**
     * `version` fica FORA de propósito (spec D10): o número é derivado pelo
     * `CreateCertificateTemplateAction`, sob lock, e gravado por atribuição
     * explícita. Fora do fillable, `create(['version' => 2])` de qualquer outro
     * ponto simplesmente não grava o número — o bypass morre no model. Mesmo
     * precedente do `created_at` de `LoginLog`: a data do acesso não se forja
     * por mass assignment, e o número de versão de um documento legal também
     * não. Segue no `$auditInclude` abaixo — não ser fillable não é não ser
     * auditável.
     */
    protected $fillable = [
        'course_id',
        'layout_config',
        'validity_months',
    ];

    protected $auditInclude = [
        'course_id',
        'version',
        'layout_config',
        'validity_months',
    ];

    protected $casts = [
        'layout_config' => 'array',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
