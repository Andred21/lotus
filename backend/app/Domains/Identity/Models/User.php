<?php

namespace App\Domains\Identity\Models;

use App\Domains\Commercial\Models\Client;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
            'archived_with_parent' => 'boolean',
        ];
    }

    /**
     * `$auditInclude` filtra o DIFF, não só o evento: atributo de fora da
     * lista gera um audit de `old_values`/`new_values` vazios — sabe-se que
     * algo mudou, nunca O QUE mudou. `photo_path` entra por isso: trocar ou
     * remover a foto apaga o objeto anterior de forma irreversível (spec D4),
     * então qual objeto foi desvinculado é justamente o que precisa de rastro.
     */
    protected $auditInclude = [
        'name',
        'email',
        'rut',
        'phone',
        'type',
        'is_active',
        'photo_path',
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

    public function loginLogs(): HasMany
    {
        return $this->hasMany(LoginLog::class);
    }

    /**
     * Último acesso, DERIVADO do histórico — não existe coluna `last_login`.
     *
     * `latestOfMany()` e não `withMax(...)` por MODO DE FALHA, não por custo: o
     * `withMax` é mais barato (subselect, zero query extra) mas projeta `null`
     * quando o chamador esquece a carga, e a tela diria "nunca acessou" para
     * todo mundo sem erro em lugar nenhum. Esta relação estoura no
     * `Model::preventLazyLoading()`. Mesma direção da D-B3 de
     * `turma-habilitacao-listagem`, que matou um `??` por esconder query atrás
     * de fallback silencioso.
     *
     * As colunas são NOMEADAS de propósito. `latestOfMany()` sem argumento usa
     * `id` (conferido no vendor: `CanBeOneOfMany::latestOfMany($column = 'id')`),
     * e o campo se chama "último ACESSO" — ordenar por `created_at` é o que o
     * nome promete, e é o que o índice composto de `login_logs` serve. O `id`
     * entra como desempate porque `MAX` numa coluna só devolve DUAS linhas
     * quando dois logins caem no mesmo segundo, o que acontece em retry.
     */
    public function latestLogin(): HasOne
    {
        return $this->hasOne(LoginLog::class)->latestOfMany(['created_at', 'id']);
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
