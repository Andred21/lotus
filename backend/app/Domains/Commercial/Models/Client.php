<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Commercial\QueryBuilders\ClientQueryBuilder;
use App\Domains\Identity\Models\User;
use App\Shared\Data\ContratanteData;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Validation\ValidationException;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Cliente = empresa contratante. Extensão 1:1 do User via user_id
 * (NÃO subclasse de User). O RUT da empresa vive em users.rut.
 */
class Client extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'user_id',
        'legal_name',
        'type',
        'business_activity',
    ];

    protected $auditInclude = [
        'user_id',
        'legal_name',
        'type',
        'business_activity',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Client $client) {
            if (! $client->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                //
                // ENUMERA-E-APAGA: sem transação e sem mutex isto é check-then-act
                // — um contato criado depois do `get()` sobrevive ATIVO sob um
                // cliente arquivado. Quem fecha a janela é a `DeleteClientAction`,
                // que abre a transação e toma `Client::lockForWrite()` antes de
                // chamar `$client->delete()`. Não arquive cliente por fora dela.
                //
                // `markAndDelete` grava a marca com `saveQuietly()` ANTES do delete:
                // `SoftDeletes::runSoftDelete()` só persiste `deleted_at`/`updated_at`,
                // então um atributo sujo não chegaria ao banco pelo `delete()`. O
                // `saveQuietly` não emite evento, e por isso não polui a trilha com um
                // `updated` por filho — o evento que importa é o `deleted`, que o
                // `delete()` logo abaixo audita normalmente (ADR-08).
                $client->addresses()->get()->each(fn (ClientAddress $a) => self::markAndDelete($a));
                $client->contacts()->get()->each(fn (ClientContact $c) => self::markAndDelete($c));

                if ($client->user !== null) {
                    self::markAndDelete($client->user);
                }
            }
        });

        static::restored(function (Client $client) {
            // `restored`, não `restoring`: com `restoring` os filhos voltariam a
            // ativos enquanto o PAI ainda está arquivado. O par correto é
            // `deleting` (antes) / `restored` (depois) — os filhos saem antes do
            // pai e voltam depois dele.
            //
            // `onlyTrashed()` + a marca: só volta quem ESTA cascata arquivou.
            // Filho arquivado por vontade própria antes do pai não tem a marca e
            // fica onde está (spec D2).
            $client->addresses()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (ClientAddress $a) => self::restoreAndUnmark($a));
            $client->contacts()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (ClientContact $c) => self::restoreAndUnmark($c));

            $user = $client->user()->first();
            if ($user !== null && $user->trashed() && $user->archived_with_parent) {
                self::restoreAndUnmark($user);
            }
        });
    }

    /**
     * Restaura o filho e apaga a marca. `restore()` audita (ADR-08); o
     * `saveQuietly()` que limpa a marca não emite evento, pela mesma razão do
     * `markAndDelete`: o evento que importa é o `restored`.
     */
    private static function restoreAndUnmark(Model $child): void
    {
        $child->restore();
        $child->archived_with_parent = false;
        $child->saveQuietly();
    }

    /** Marca o filho como cascateado e o arquiva. Ver a nota no `deleting`. */
    private static function markAndDelete(Model $child): void
    {
        $child->archived_with_parent = true;
        $child->saveQuietly();
        $child->delete();
    }

    public function user(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(ClientAddress::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(ClientContact::class);
    }

    public function contratante(): ContratanteData
    {
        // Razão social (D12), não o nome do User de cadastro: é o `{{EMPRESA}}`
        // do documento oficial.
        return new ContratanteData(name: $this->legal_name, rut: $this->user->rut);
    }

    public function loadListingData(): static
    {
        return $this->load(ClientQueryBuilder::LISTING);
    }

    /**
     * Mutex por cliente: serializa TODA região crítica que escreve o cliente ou
     * sua coleção nested. Tem de ser tomado ANTES de qualquer escrita da
     * transação — tomá-lo depois inverte a ordem dos locks e produz
     * `SQLSTATE[40001] ... 1213 Deadlock found when trying to get lock`, medido
     * em 2026-08-11 contra MySQL real. Vale para o replace-total do cadastro, as
     * rotas nested (create/update/delete) E o arquivamento do próprio cliente:
     * escritor que não passa por aqui é escritor fora do mutex, e um só já
     * reabre a janela (review de 2026-08-11, Q-2).
     *
     * Devolve o cliente TRAVADO, não `void`: quem chama precisa do estado lido
     * sob o lock, e um retorno descartado tornava o mutex um no-op indetectável
     * — `first()` devolvendo null passava batido (Q-5).
     *
     * `withTrashed()` porque o lock tem de ser tomado mesmo sobre cliente
     * arquivado: pular a linha faria a operação seguir SEM mutex nenhum. Mas
     * seguir escrevendo sob ele é outra coisa — o binding de rota resolveu um
     * cliente VIVO, e descobrir sob o lock que ele foi arquivado no meio do
     * caminho significa que a escrita não pode prosseguir (senão o filho nasce
     * ativo sob pai arquivado).
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     * Quem prova que ele funciona é `PrimaryConcurrencyTest`, em MySQL.
     */
    public static function lockForWrite(int $clientId): static
    {
        $client = static::lockRow($clientId);

        if ($client->trashed()) {
            throw ValidationException::withMessages([
                'client' => 'Este cliente foi arquivado e não aceita mais alterações.',
            ]);
        }

        return $client;
    }

    /**
     * Trava a linha SEM julgar estado. `withTrashed()` porque o lock tem de ser
     * tomado mesmo sobre cliente arquivado — é o estado de quem vai ser
     * restaurado, e pular a linha faria a operação seguir SEM mutex nenhum.
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     * Quem prova que ele funciona é `PrimaryConcurrencyTest`, em MySQL.
     */
    public static function lockRow(int $clientId): static
    {
        /** @var static $client */
        $client = static::withTrashed()->whereKey($clientId)->lockForUpdate()->firstOrFail();

        return $client;
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): ClientQueryBuilder
    {
        return new ClientQueryBuilder($query);
    }
}
