<?php

namespace App\Domains\Catalog\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Módulo do curso (o "Item" do quadro da proposta). `contents` é texto livre —
 * a numeração 1.1/1.2 é conteúdo autoral, não dado consultável. Horas totais
 * NÃO são persistidas: derivam em CourseModuleData.
 */
class CourseModule extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'sort_order',
        'name',
        'learnings',
        'contents',
        'theory_hours',
        'practice_hours',
    ];

    protected $auditInclude = [
        'course_id',
        'sort_order',
        'name',
        'learnings',
        'contents',
        'theory_hours',
        'practice_hours',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'theory_hours' => 'integer',
            'practice_hours' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
