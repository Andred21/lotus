<?php

namespace App\Domains\Commercial\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class ClientContact extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'client_id',
        'name',
        'email',
        'phone',
        'is_primary',
    ];

    protected $auditInclude = [
        'client_id',
        'name',
        'email',
        'phone',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
