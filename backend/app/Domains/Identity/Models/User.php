<?php

namespace App\Domains\Identity\Models;

use App\Domains\Commercial\Models\Client;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements Auditable
{
    /** @use HasFactory<UserFactory> */
    use AuditableTrait, HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

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
            if (empty($user->uuid)) {
                $user->uuid = (string) Str::uuid();
            }
        });
    }

    public function client(): HasOne
    {
        return $this->hasOne(Client::class);
    }

    public function redator(): HasOne
    {
        return $this->hasOne(Redator::class);
    }

    public function student(): HasOne
    {
        return $this->hasOne(Student::class);
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
