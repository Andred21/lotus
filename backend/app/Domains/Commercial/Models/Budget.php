<?php

namespace App\Domains\Commercial\Models;

use App\Shared\Concerns\ArchivesChildren;
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
    use ArchivesChildren, AuditableTrait, SoftDeletes;

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
                //
                // `markAndDelete` (trait `ArchivesChildren`) grava a marca antes
                // do delete e IGNORA filho já arquivado — sem a guarda, a
                // cotação arquivada de propósito voltaria junto no restore e
                // ainda teria o `deleted_at` reescrito.
                //
                // A cadeia desce sozinha: cada `$quote->delete()` dispara o
                // `deleting` da cotação, que arquiva os anexos DELA. Este hook
                // não enxerga o terceiro nível e não precisa.
                $budget->quotes()->get()->each(fn (Quote $q) => self::markAndDelete($q));
                $budget->files()->get()->each(fn (File $f) => self::markAndDelete($f));
            }
        });

        static::restored(function (Budget $budget) {
            // `restored`, não `restoring`: com `restoring` os filhos voltariam a
            // ativos enquanto o PAI ainda está arquivado. O par correto é
            // `deleting` (antes) / `restored` (depois).
            //
            // `onlyTrashed()` + a marca: só volta quem ESTA cascata arquivou.
            $budget->quotes()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (Quote $q) => self::restoreAndUnmark($q));
            $budget->files()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (File $f) => self::restoreAndUnmark($f));
        });
    }

    public function client(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Client::class)->withTrashed();
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
