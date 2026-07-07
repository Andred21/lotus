<?php

namespace App\Domains\Commercial\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class ClientAddress extends Model implements Auditable
{   
    use SoftDeletes, AuditableTrait;
    
    protected $table = 'client_addresses';

    protected $fillable = [
        'client_id',
        'street',
        'street_complement',
        'number',
        'neighborhood',
        'city',
        'state',
        'zip_code',
        'is_primary',
    ];

    protected $auditInclude = [
        'client_id',
        'street',
        'street_complement',
        'number',
        'neighborhood',
        'city',
        'state',
        'zip_code',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

}