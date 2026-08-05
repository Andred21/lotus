<?php

namespace App\Domains\Certification\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use OwenIt\Auditing\Auditable;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;

class Certificate extends Model implements AuditableContract
{
    use Auditable;

    protected $fillable = [
        'uuid',
        'enrollment_id',
        'course_id',
        'redator_id',
        'codigo',
        'snapshot',
        'valido_ate',
        'status',
        'revoked_at',
        'revocation_reason',
    ];

    protected $auditInclude = [
        'uuid',
        'enrollment_id',
        'course_id',
        'redator_id',
        'codigo',
        'snapshot',
        'valido_ate',
        'status',
        'revoked_at',
        'revocation_reason',
    ];

    protected $casts = [
        'snapshot' => 'array',
        'valido_ate' => 'date',
        'revoked_at' => 'datetime',
        'status' => CertificateStatus::class,
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class)->withTrashed();
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class)->withTrashed();
    }

    public function redator(): BelongsTo
    {
        return $this->belongsTo(Redator::class)->withTrashed();
    }
}
