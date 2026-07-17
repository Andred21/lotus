<?php

namespace App\Domains\Catalog\Models;

use App\Domains\Identity\Models\Redator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Curso do catálogo. NÃO tem valor (preço vive na cotação). Templates de
 * certificado são config versionada (não `files`). Habilitação redator↔curso
 * (idoneidade) via pivot puro `course_redator`.
 */
class Course extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'name',
        'technical_name',
        'description',
        'workload_hours',
    ];

    protected $auditInclude = [
        'name',
        'technical_name',
        'description',
        'workload_hours',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Course $course) {
            if (! $course->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                $course->certificateTemplates()->get()->each(fn (CourseCertificateTemplate $t) => $t->delete());
                $course->modules()->get()->each(fn (CourseModule $m) => $m->delete());
            }
        });
    }

    public function certificateTemplates(): HasMany
    {
        return $this->hasMany(CourseCertificateTemplate::class);
    }

    public function modules(): HasMany
    {
        return $this->hasMany(CourseModule::class)->orderBy('sort_order');
    }

    public function redatores(): BelongsToMany
    {
        return $this->belongsToMany(Redator::class, 'course_redator')->withTimestamps();
    }
}
