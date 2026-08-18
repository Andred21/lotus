<?php

namespace App\Domains\Catalog\Models;

use App\Domains\Catalog\QueryBuilders\CourseQueryBuilder;
use App\Domains\Identity\Models\Redator;
use App\Shared\Concerns\ArchivesChildren;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Curso do catálogo. NÃO tem valor (preço vive na cotação). Templates de
 * certificado são config versionada (não `files`). Habilitação redator↔curso
 * (idoneidade) via pivot puro `course_redator`.
 */
class Course extends Model implements Auditable
{
    use ArchivesChildren, AuditableTrait, SoftDeletes;

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
                // `markAndDelete` vem do trait `ArchivesChildren` (Shared) —
                // ver a nota lá, inclusive a guarda do filho já arquivado.
                $course->certificateTemplates()->get()->each(fn (CourseCertificateTemplate $t) => self::markAndDelete($t));
                $course->modules()->get()->each(fn (CourseModule $m) => self::markAndDelete($m));
            }
        });

        static::restored(function (Course $course) {
            // Ver a nota gêmea em `Client::booted()`: `restored` e não
            // `restoring`, e só o filho que ESTA cascata arquivou.
            $course->certificateTemplates()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (CourseCertificateTemplate $t) => self::restoreAndUnmark($t));
            $course->modules()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (CourseModule $m) => self::restoreAndUnmark($m));
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

    public function loadListingData(): static
    {
        return $this->load(CourseQueryBuilder::LISTING);
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): CourseQueryBuilder
    {
        return new CourseQueryBuilder($query);
    }
}
