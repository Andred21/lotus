<?php

namespace App\Domains\Commercial\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;    

class ClientContact extends Model implements Auditable
{
   
    use SoftDeletes, AuditableTrait;
    
    protected $table = 'client_contacts';

    protected $fillable = [
        'client_id',
        'name',
        'email',
        'phone',
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