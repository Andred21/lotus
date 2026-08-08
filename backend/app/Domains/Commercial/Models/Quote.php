<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\QueryBuilders\QuoteQueryBuilder;
use App\Domains\Operation\Models\Turma;
use App\Shared\Data\ContratanteData;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
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
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Budget::class)->withTrashed();
    }

    /** Composto calculado (ADR-17), nunca persistido — fonte única do "código" da cotação. */
    public function getCodeAttribute(): string
    {
        return "Scap {$this->budget_id} - Cot {$this->seq_in_budget}";
    }

    public function course(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Course::class)->withTrashed();
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }

    /** Turma nascida desta cotação (1:1). Ausente até a config manual (6b). */
    public function turma(): HasOne
    {
        return $this->hasOne(Turma::class);
    }

    public function contratante(): ContratanteData
    {
        return $this->budget->client->contratante();
    }

    public function loadListingData(): static
    {
        return $this->load(QuoteQueryBuilder::LISTING);
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): QuoteQueryBuilder
    {
        return new QuoteQueryBuilder($query);
    }
}
