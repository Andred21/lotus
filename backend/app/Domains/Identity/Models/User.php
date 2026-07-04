<?php

namespace App\Domains\Identity\Models;

use Database\Factories\UserFactory;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable; 

class User extends Authenticatable implements Auditable
{
    /** @use HasFactory<UserFactory> */
    use  HasApiTokens, HasFactory, Notifiable, SoftDeletes, AuditableTrait;

    protected $fillable = [
        'uuid',
        'name',
        'rut',
        'email',
        'phone',
        'photo_path',
        'password',
        'type',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    protected $auditInclude = [
        'name',
        'email',
        'rut',
        'phone',
        'type',
        'is_active',
    ];

    public static function booted(): void
    {
        static::creating(function (User $user) {
            if(empty($user->uuid)) {
                $user->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Model fora de App\Models, então o Laravel não acha a factory pela
     * convenção padrão — precisa apontar explicitamente.
     */
    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }
}
