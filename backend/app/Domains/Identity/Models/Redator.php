<?php

namespace App\Domains\Identity\Models;

use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Redator = professor. Extensão 1:1 do User via user_id. Documentos de
 * idoneidade (CV, REUF, título, pós) via relação polimórfica (files, ADR-10).
 */
class Redator extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $table = 'redatores';

    protected $fillable = ['user_id'];

    protected $auditInclude = ['user_id'];

    protected static function booted(): void
    {
        static::deleting(function (Redator $redator) {
            if (! $redator->isForceDeleting()) {
                $redator->documents()->delete();
                $redator->user?->delete();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }
}
