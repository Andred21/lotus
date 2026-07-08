<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Identity\Models\User;
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
                $client->addresses()->delete();
                $client->contacts()->delete();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(ClientAddress::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(ClientContact::class);
    }
}
