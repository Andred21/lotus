<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Identity\Models\User;
use App\Shared\Data\ContratanteData;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
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
                $client->addresses()->get()->each(fn (ClientAddress $a) => $a->delete());
                $client->contacts()->get()->each(fn (ClientContact $c) => $c->delete());
                $client->user?->delete();
            }
        });
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
}
