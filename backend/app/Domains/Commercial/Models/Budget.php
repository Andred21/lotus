<?php

namespace App\Domains\Commercial\Models;

use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Orçamento = agrupador comercial de cotações independentes. `code` ("Scap {id}")
 * é gerado na Action (ADR-17). Status e totais NÃO são colunas: derivados das
 * cotações (BudgetSummaryService).
 */
class Budget extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'client_id',
        'code',
        'payment_terms',
    ];

    protected $auditInclude = [
        'client_id',
        'code',
        'payment_terms',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Budget $budget) {
            if (! $budget->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita (ADR-08).
                $budget->quotes()->get()->each(fn (Quote $q) => $q->delete());
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }
}
