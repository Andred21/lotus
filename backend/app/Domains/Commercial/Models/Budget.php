<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Commercial\QueryBuilders\BudgetQueryBuilder;
use App\Shared\Concerns\ArchivesChildren;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Validation\ValidationException;
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

    /**
     * Contraparte de instância do `withListingData()` — o mesmo molde de
     * `Client`, `Quote`, `Course`, `Turma` e `Enrollment`. É daqui que o
     * controller e as Actions carregam a projeção.
     */
    public function loadListingData(): static
    {
        return $this->load(BudgetQueryBuilder::LISTING);
    }

    /**
     * Trava o orçamento e recusa se ele estiver arquivado. É o lock de quem
     * ESCREVE FILHO do orçamento (`CreateQuoteAction`): `lockRow` sozinho
     * serializa contra o arquivamento, mas deixaria a cotação pousar ativa sob
     * orçamento recém-arquivado — o modo de falha que a cascata existe para
     * impedir (P-49, eixo cotação × orçamento; spec D5). Molde: `Client`.
     *
     * Ordem de lock do eixo (spec D4): orçamento primeiro, cotação depois.
     * Nenhum sítio trava cotação e depois orçamento.
     *
     * `withTrashed()` porque o lock tem de ser tomado mesmo sobre orçamento
     * arquivado: pular a linha faria a operação seguir SEM mutex nenhum. O
     * binding resolveu um orçamento VIVO; descobrir sob o lock que ele foi
     * arquivado no meio do caminho significa que a escrita não prossegue.
     *
     * Reusa a mensagem `commercial.quote.budget_archived`, a mesma do restore
     * da cotação. Fora de corrida o 422 não é alcançável pela API (o binding
     * já 404 sobre orçamento arquivado).
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     */
    public static function lockForWrite(int $budgetId): static
    {
        $budget = static::lockRow($budgetId);

        if ($budget->trashed()) {
            throw ValidationException::withMessages([
                'budget' => __('commercial.quote.budget_archived'),
            ]);
        }

        return $budget;
    }

    /**
     * Trava a linha SEM julgar estado. É o lock de quem ARQUIVA o orçamento
     * (`DeleteBudgetAction`) e de quem RESTAURA a cotação (`RestoreQuoteAction`,
     * que precisa LER o estado do pai sob o lock e recusa com a própria chave).
     * `withTrashed()` pelo mesmo motivo do `lockForWrite`.
     *
     * Devolve o orçamento TRAVADO, não `void`: quem chama decide sobre o
     * estado lido sob o lock.
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     */
    public static function lockRow(int $budgetId): static
    {
        /** @var static $budget */
        $budget = static::withTrashed()->whereKey($budgetId)->lockForUpdate()->firstOrFail();

        return $budget;
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): BudgetQueryBuilder
    {
        return new BudgetQueryBuilder($query);
    }
}
