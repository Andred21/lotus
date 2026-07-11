<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Cotação = parte aprovável do orçamento (1 curso). `seq_in_budget` é atômico
 * por orçamento (ADR-17). Cliente vem do orçamento (não é coluna própria).
 */
class Quote extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'budget_id',
        'course_id',
        'seq_in_budget',
        'student_count',
        'planned_start_date',
        'planned_end_date',
        'purchase_order',
        'value_uf',
        'status',
        'approved_at',
    ];

    protected $auditInclude = [
        'budget_id', 'course_id', 'seq_in_budget', 'student_count',
        'planned_start_date', 'planned_end_date', 'purchase_order',
        'value_uf', 'status', 'approved_at',
    ];

    protected $casts = [
        'status' => QuoteStatus::class,
        'approved_at' => 'datetime',
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'value_uf' => 'decimal:4',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }
}
