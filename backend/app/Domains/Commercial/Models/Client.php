<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Client extends User implements Auditable
{

    use  SoftDeletes, AuditableTrait;

    protected $table = 'clients';

    protected $fillable = [
        'user_id',
        'social_reason',
        'type',
        'sector',
    ];

    protected $auditInclude = [
        'user_id',
        'social_reason',
        'type',
        'sector',
    ];

    public function addresses()
    {
        return $this->hasMany(ClientAddress::class, 'client_id');
    }

    public function contacts()
    {
        return $this->hasMany(ClientContact::class, 'client_id');
    }
}