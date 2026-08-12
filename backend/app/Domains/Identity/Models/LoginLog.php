<?php

namespace App\Domains\Identity\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Log append-only de logins bem-sucedidos. Uma linha por acesso concedido.
 *
 * NÃO é `Auditable` e não entra no morph map (ADR-10): não é polimórfico, e
 * auditar um log append-only seria guardar rastro de que o rastro nasceu.
 *
 * Sem `updated_at`: a linha nasce e não muda. Registro de tentativa FALHA e de
 * logout ficaram fora por decisão registrada (D2 da spec) — tentativa falha é
 * feature de segurança com regra própria, e o par login/logout ficaria
 * incompleto em silêncio porque expiração de sessão não passa pelo controller.
 */
class LoginLog extends Model
{
    public const UPDATED_AT = null;

    /**
     * `user_id` fica FORA de propósito, pela mesma razão que `created_at`: num
     * log de segurança nem a data nem o dono do acesso se forjam por mass
     * assignment. O único escritor é a `RecordLoginAction`, que grava por
     * `$user->loginLogs()->create([...])` — a relação define a FK.
     */
    protected $fillable = [
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
