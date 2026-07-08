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

    protected $fillable = [
        'course_id',
        'version',
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
