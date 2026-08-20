<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\QueryBuilders\QuoteQueryBuilder;
use App\Domains\Operation\Models\Turma;
use App\Shared\Concerns\ArchivesChildren;
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
    use ArchivesChildren, AuditableTrait, SoftDeletes;

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
        // Marca da cascata (spec D8). FORA do `$fillable`: quem escreve é hook.
        'archived_with_parent' => 'boolean',
    ];

    /**
     * Hook NOVO (spec D9): a cotação não tinha cascata nenhuma, então arquivá-la
     * deixava os anexos ATIVOS sob um pai que ninguém mais alcança — o mesmo
     * modo de falha que a `DeleteClientAction` existe para impedir.
     *
     * Roda nas duas entradas: `DeleteQuoteAction` (arquivar a cotação sozinha) e
     * a cascata do orçamento, que chama `$quote->delete()`.
     */
    protected static function booted(): void
    {
        static::deleting(function (Quote $quote) {
            if (! $quote->isForceDeleting()) {
                $quote->files()->get()->each(fn (File $f) => self::markAndDelete($f));
            }
        });

        static::restored(function (Quote $quote) {
            $quote->files()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (File $f) => self::restoreAndUnmark($f));
        });
    }

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

    /**
     * Trava a linha SEM julgar estado. `withTrashed()` porque o lock tem de ser
     * tomado mesmo sobre cotação arquivada — o restore da turma pergunta sobre
     * uma cotação que pode estar em qualquer estado, e pular a linha faria a
     * operação seguir SEM mutex nenhum.
     *
     * A COTAÇÃO é o recurso disputado do gate da spec D1, não a turma:
     * `turmas.active_quote_id` é UNIQUE sobre `quote_id`, e os dois lados que
     * decidem sobre ela — `CreateTurmaAction` e `RestoreTurmaAction` — travam
     * ESTA linha. Lock de um lado só não fecha janela nenhuma (P-47).
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     * Molde: `Client::lockRow()`.
     */
    public static function lockRow(int $quoteId): static
    {
        /** @var static $quote */
        $quote = static::withTrashed()->whereKey($quoteId)->lockForUpdate()->firstOrFail();

        return $quote;
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): QuoteQueryBuilder
    {
        return new QuoteQueryBuilder($query);
    }
}
